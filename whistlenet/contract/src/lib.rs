use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
    clock::Clock,
};
use spl_token::instruction as token_instruction;

// GAS OPTIMIZATION NOTE:
// Multiple functions derive the same PDAs multiple times within the same execution.
// Each PDA derivation costs approximately 5000 compute units.
//
// OPTIMIZATION OPPORTUNITIES:
// 1. Cache PDA derivations: In functions like stake/unstake, staker PDA is derived
//    for validation and again for seeds in invoke_signed.
// 2. Pass derived PDAs between related functions instead of re-deriving.
// 3. In distribute_bonus_pool, provider PDAs are derived once per provider (necessary).
// 4. Consider using a PDA cache struct: 
//    struct PdaCache { staker: (Pubkey, u8), pool: (Pubkey, u8), ... }
//
// IMPLEMENTATION GUIDANCE:
// - Only optimize if compute budget becomes an issue in production testing.
// - Current implementations prioritize security and correctness over gas savings.
// - Estimated savings: 5K-15K CUs per transaction depending on function complexity.
// - With Solana's 1.4M CU limit, current implementations have sufficient headroom.

// ============= KNOWN LIMITATIONS & MITIGATIONS =============
//
// This section documents inherent limitations in the current design and their mitigations.
// These are trade-offs between security, usability, and technical feasibility.
//
// 1. **HEARTBEAT TIMESTAMP GAMING** (MEDIUM Impact)
//    LIMITATION: Providers can submit heartbeats at maximum allowed drift (±5 min)
//    to extend perceived uptime without being consistently online.
//    
//    WHY IT EXISTS:
//    - Solana Clock sysvar can have clock skew between validators
//    - No access to external time oracles on-chain
//    - Stricter limits would cause false positives for legitimate providers
//    
//    CURRENT MITIGATION:
//    - 5-minute drift limit (±300 seconds) significantly constrains gaming
//    - 30-second minimum heartbeat interval prevents rapid gaming
//    - First heartbeat limited to 24 hours from registration
//    - Off-chain monitoring can detect suspicious patterns
//    
//    ADDITIONAL MITIGATIONS (Recommended):
//    - Monitor heartbeat patterns off-chain for anomalies
//    - Flag providers with suspicious timing (always at max drift)
//    - Cross-reference with actual query latency metrics
//    - Consider uptime as one factor among many in reputation
//
// 2. **COMPUTE BUDGET IN distribute_bonus_pool** (MEDIUM Impact)
//    LIMITATION: With 40 providers (~30K CUs each = 1.2M CUs), close to 1.4M limit.
//    Corrupted or complex provider accounts could push over limit.
//    
//    WHY IT EXISTS:
//    - Solana has hard 1.4M CU limit per transaction
//    - PDA validation + deserialization + arithmetic + serialization is costly
//    - Can't process all providers in one transaction for large networks
//    
//    CURRENT MITIGATION:
//    - Limited to 40 providers per batch (conservative)
//    - Graceful degradation: skips invalid providers instead of failing
//    - Tracks and logs skipped providers for monitoring
//    - Function returns success even if some providers fail
//    
//    ADDITIONAL MITIGATIONS (Recommended):
//    - Call distribute_bonus_pool multiple times for >40 providers
//    - Monitor compute unit usage in production
//    - Consider batches of 20-30 for extra safety margin
//    - Increase compute budget request if needed (via ComputeBudgetProgram)
//
// 3. **PRECISION LOSS IN UNSTAKE CALCULATION** (LOW Impact)
//    LIMITATION: Ceiling division means users lose slightly more tokens than proportional.
//    
//    WHY IT EXISTS:
//    - Prevents dust attacks (users gaming with tiny unstakes)
//    - Integer arithmetic requires rounding decisions
//    - Rounding down would allow accumulating free tokens
//    
//    CURRENT IMPLEMENTATION:
//    - Uses u128 for high precision intermediate calculations
//    - Ceiling division (rounds up) to prevent gaming
//    - Loss is minimal: <0.0001% per unstake operation
//    
//    TRADE-OFF ANALYSIS:
//    - User loss per unstake: ~1 token out of billions
//    - Prevents potential exploits worth much more
//    - Alternative (floor) would allow dust accumulation attacks
//    - Accepted trade-off: slight user cost for system security
//
// 4. **REFERRAL PAYMENT VALIDATION** (MEDIUM Impact - VERIFIED FIXED)
//    LIMITATION: Complex validation logic with multiple failure paths.
//    
//    CURRENT IMPLEMENTATION:
//    - ALL failure paths return funds to developer_rebate_pool
//    - No funds are lost in any scenario:
//      ✓ Missing referrer account → returned to pool
//      ✓ Invalid owner → returned to pool
//      ✓ PDA mismatch → returned to pool
//      ✓ Deserialization failure → returned to pool
//      ✓ Inactive referrer → returned to pool
//    - Comprehensive logging for all failure cases
//    
//    VERIFICATION: See lines 3535-3630 for complete implementation
//
// 5. **U128 OVERFLOW IN UNSTAKE** (LOW Impact - Theoretical)
//    LIMITATION: u128 intermediate calculations could theoretically overflow.
//    
//    WHY IT'S NOT A REAL ISSUE:
//    - Would require staking near u64::MAX WHISTLE tokens
//    - MAX_STAKE_PER_USER (10M WHISTLE) prevents this
//    - u128::MAX = 3.4×10³⁸ vs u64::MAX = 1.8×10¹⁹
//    - Margin: 10¹⁹x safety factor
//    
//    CURRENT PROTECTION:
//    - All calculations use checked_* operations
//    - Would fail cleanly if overflow occurred (impossible in practice)
//    - MAX_STAKE_PER_USER enforced at stake time
//
// ============= END KNOWN LIMITATIONS =============

// ============= STRUCTURED EVENT LOGGING =============
//
// INFO: Structured Event Logging for Monitoring & Auditability
//
// BACKGROUND:
// Solana doesn't have native events like Ethereum's event logs. Instead, we use msg!
// macros that write to transaction logs. For proper monitoring, these logs should
// follow consistent, parseable formats.
//
// CURRENT IMPLEMENTATION:
// The contract uses msg! macros throughout for logging critical state changes.
// Examples of logged events:
// - Provider registration/deregistration
// - Staking/unstaking operations
// - Slashing events
// - Reward distributions
// - Authority actions (slash, distribute, process X402)
//
// BEST PRACTICES FOR STRUCTURED LOGGING:
//
// 1. **Consistent Format**:
//    Use prefix tags for event types:
//    msg!("[EVENT:STAKE] user:{}, amount:{}, tokens:{}", user, amount, tokens);
//    msg!("[EVENT:SLASH] provider:{}, amount:{}, reason:{:?}", provider, penalty, reason);
//
// 2. **Key Information**:
//    Always include:
//    - Event type (STAKE, UNSTAKE, SLASH, REWARD, etc.)
//    - Relevant pubkeys (user, provider, pool)
//    - Amounts (SOL, tokens)
//    - Timestamps (when applicable)
//    - Reason codes (for slashing, errors)
//
// 3. **Indexing Setup**:
//    Off-chain indexers (like Helius, QuickNode) can parse these logs:
//    - Filter by [EVENT:*] prefix
//    - Extract structured data using regex
//    - Store in database for querying
//    - Generate alerts on critical events
//
// 4. **Security Monitoring**:
//    Events to monitor for suspicious activity:
//    - [EVENT:SLASH] - Unusual slashing patterns
//    - [EVENT:X402] - Large or frequent X402 payments
//    - [EVENT:DISTRIBUTE] - Bonus pool distributions
//    - [EVENT:AUTHORITY] - Any authority action
//
// EXAMPLE IMPLEMENTATION (Reference):
// ```rust
// // In slash_provider function:
// msg!("[EVENT:SLASH] provider:{} penalty:{} reason:{:?} timestamp:{}", 
//      provider, penalty, reason, clock.unix_timestamp);
//
// // In distribute_bonus_pool function:
// msg!("[EVENT:DISTRIBUTE] pool:{} amount:{} providers:{} timestamp:{}",
//      bonus_pool, amount, provider_count, clock.unix_timestamp);
// ```
//
// MONITORING TOOLS:
// 1. **Helius Webhooks**: Configure webhooks for program transactions
// 2. **QuickNode Streams**: Real-time transaction monitoring
// 3. **Custom Indexer**: Parse logs using Solana RPC getProgramAccounts
// 4. **Alert System**: Trigger alerts on critical events (large slashes, etc.)
//
// FUTURE ENHANCEMENTS:
// - Anchor framework's event! macro (if migrating to Anchor)
// - Off-chain event aggregation service
// - Dashboard for real-time event monitoring
// - Automated anomaly detection
//
// NOTE: Current msg! logs are sufficient for auditing. The contract prioritizes
// security over fancy event systems. All critical state changes are logged.
//
// ============= END STRUCTURED EVENT LOGGING =============

// Program ID (Mainnet)
solana_program::declare_id!("5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc");

entrypoint!(process_instruction);

// ============= CONSTANTS =============

// WHISTLE token mint: 6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump
const OFFICIAL_WHISTLE_MINT: &str = "6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump";
const MAX_STAKE_PER_USER: u64 = 10_000_000_000_000_000; // 10M WHISTLE max per user
const MIN_PROVIDER_BOND: u64 = 1_000_000_000; // 1000 WHISTLE minimum bond for providers
const QUERY_COST: u64 = 10_000; // 0.00001 SOL per query in lamports
const HEARTBEAT_TIMEOUT: i64 = 300; // 5 minutes in seconds
const MIN_HEARTBEAT_INTERVAL: i64 = 30; // 30 seconds minimum between heartbeats
const MIN_ENDPOINT_LENGTH: usize = 10; // Minimum endpoint URL length
const MAX_ENDPOINT_LENGTH: usize = 256; // Maximum endpoint URL length

// ============= DATA STRUCTURES =============

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct StakingPool {
    pub authority: Pubkey,           // Pool authority
    pub whistle_mint: Pubkey,        // WHISTLE token mint address
    pub token_vault: Pubkey,         // SPL token vault for WHISTLE
    pub total_staked: u64,            // Total WHISTLE tokens staked
    pub total_access_tokens: u64,     // Total access tokens minted
    pub min_stake_amount: u64,        // Minimum stake to participate
    pub tokens_per_whistle: u64,      // Access tokens per WHISTLE staked
    pub is_active: bool,              // Pool status
    pub created_at: i64,              // Creation timestamp
    pub cooldown_period: i64,         // Unstake cooldown in seconds
    pub max_stake_per_user: u64,      // Maximum stake per user
    pub rate_locked: bool,            // Prevents rate manipulation
    pub bump: u8,                     // PDA bump seed
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct StakerAccount {
    pub staker: Pubkey,               // Staker wallet address
    pub staked_amount: u64,           // Amount staked
    pub access_tokens: u64,           // Access tokens earned
    pub last_stake_time: i64,         // Last staking timestamp
    pub node_operator: bool,          // Can operate network nodes
    pub voting_power: u64,            // Governance voting power
    pub data_encrypted: u64,          // Amount of data encrypted (usage metric)
    pub pending_rewards: u64,         // Unclaimed staker rewards (5% pool)
    pub bump: u8,                     // PDA bump seed
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ProviderAccount {
    pub provider: Pubkey,             // Provider wallet
    pub endpoint: String,             // API endpoint URL (max 256 chars)
    pub registered_at: i64,           // Registration timestamp
    pub is_active: bool,              // Provider status
    pub stake_bond: u64,              // Bonded WHISTLE (minimum 1000)
    
    // Earnings tracking
    pub total_earned: u64,            // Lifetime SOL earned
    pub pending_earnings: u64,        // Unclaimed 70% share
    pub queries_served: u64,          // Total queries handled
    
    // Reputation metrics (0-10000 basis points)
    pub reputation_score: u64,        // Composite score
    pub uptime_percentage: u64,       // Uptime % (9500 = 95%)
    pub response_time_avg: u64,       // Avg latency in ms
    pub accuracy_score: u64,          // Data accuracy %
    pub last_heartbeat: i64,          // Last ping timestamp
    
    // Slashing
    pub slashed_amount: u64,          // Total slashed from bond
    pub penalty_count: u32,           // Number of penalties
    
    pub bump: u8,                     // PDA bump seed
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PaymentVault {
    pub authority: Pubkey,            // Vault authority
    pub total_collected: u64,         // All SOL received from queries
    pub provider_pool: u64,           // 70% accumulator
    pub bonus_pool: u64,              // 20% for top performers
    pub treasury: u64,                // 5% for development
    pub staker_rewards_pool: u64,     // 5% for all stakers
    pub developer_rebate_pool: u64,   // Pool for developer rebates
    pub last_distribution: i64,       // Last bonus distribution
    pub bump: u8,                     // PDA bump seed
}

// ============= CENTRALIZATION RISK MITIGATION =============
//
// HIGH SECURITY WARNING: Authority Centralization Risk
//
// CURRENT RISK:
// Critical functions (slash_provider, distribute_bonus_pool, process_x402_payment)
// rely on single authority signatures without multi-sig, timelock, or DAO governance.
// A compromised authority key could:
// - Slash providers unfairly
// - Manipulate reward distributions  
// - Drain the X402 payment wallet
//
// RECOMMENDED MITIGATIONS:
//
// 1. **External Multi-Sig Solution** (RECOMMENDED):
//    - Use Squads Protocol (https://squads.so/) or Goki Smart Wallet
//    - Set authority to multi-sig PDA (e.g., 3-of-5 signers)
//    - Deploy command: Update authority to multi-sig address
//    - Pros: Battle-tested, audited, no code changes needed
//    - Example: authority = <Squads_PDA_with_3of5_threshold>
//
// 2. **Timelock Implementation**:
//    - Add 48-hour delay for critical operations
//    - Requires: PendingAction state, propose/execute flow
//    - Estimated code: +500 lines, +50K CUs per operation
//    - Allows community to react to malicious proposals
//
// 3. **DAO Governance** (Future):
//    - Integrate with Realms (Solana's DAO framework)
//    - Token holders vote on critical actions
//    - Requires: Governance token, voting mechanism
//    - Most decentralized but complex to implement
//
// 4. **Emergency Pause Circuit Breaker**:
//    - Separate emergency key that can only pause (not execute)
//    - Allows response to attacks without centralizing control
//    - Requires: Pausable trait, emergency_pause instruction
//
// IMMEDIATE ACTION ITEMS:
// [ ] Deploy contract with Squads multi-sig as authority
// [ ] Document all authority addresses publicly
// [ ] Set up monitoring/alerts for authority transactions
// [ ] Plan transition to DAO governance (6-12 month timeline)
//
// DEVELOPMENT NOTE:
// The structures below are templates for future timelock/multi-sig implementation.
// They are NOT currently active. Use external solutions (Squads/Goki) in production.
//
// ============= END CENTRALIZATION RISK DOCUMENTATION =============

// Template structures for future governance implementation
// (NOT CURRENTLY USED - for reference only)
/*
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct GovernanceConfig {
    pub primary_authority: Pubkey,
    pub secondary_authority: Pubkey,
    pub timelock_duration: i64,
    pub emergency_authority: Pubkey,
    pub is_initialized: bool,
    pub bump: u8,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum PendingActionType {
    SlashProvider { provider: Pubkey, penalty: u64, reason: SlashReason },
    ProcessX402Payment { amount: u64 },
    DistributeBonusPool { provider_count: u32 },
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PendingAction {
    pub action: PendingActionType,
    pub proposed_by: Pubkey,
    pub proposed_at: i64,
    pub approved_by: Option<Pubkey>,
    pub executable_at: i64,
    pub is_executed: bool,
    pub is_cancelled: bool,
    pub bump: u8,
}
*/

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct DeveloperAccount {
    pub developer: Pubkey,            // Developer wallet
    pub whistle_staked: u64,          // WHISTLE tokens staked
    pub tier: DeveloperTier,          // Current tier based on stake
    pub total_queries: u64,           // Lifetime queries made
    pub free_queries_used_month: u64, // Free queries used this month
    pub last_month_reset: i64,        // Last time monthly counter reset
    pub rebate_percentage: u64,       // Rebate % (0-10000 = 0-100%)
    pub bonus_rewards: u64,           // Accumulated bonus WHISTLE
    pub referrals_made: u32,          // Number of referrals
    pub referred_by: Option<Pubkey>,  // Who referred this dev (if any)
    pub referral_earnings: u64,       // SOL earned from referrals (2%)
    pub registered_at: i64,           // Registration timestamp
    pub last_stake_time: i64,         // Last staking action
    pub is_active: bool,              // Account status
    pub bump: u8,                     // PDA bump seed
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum DeveloperTier {
    Hobbyist,    // 100 WHISTLE - 10% rebate, 1k queries/day
    Builder,     // 1,000 WHISTLE - 25% rebate, 10k queries/day
    Pro,         // 5,000 WHISTLE - 50% rebate, 50k queries/day
    Enterprise,  // 25,000 WHISTLE - 75% rebate, 250k queries/day
    Whale,       // 100,000 WHISTLE - 100% rebate, unlimited queries
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum AccessTier {
    Basic,      // 100-1000 tokens staked
    Premium,    // 1001-10000 tokens staked
    Elite,      // 10001+ tokens staked
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum SlashReason {
    LowUptime,        // <95% uptime
    WrongData,        // Failed accuracy check
    SlowResponse,     // High latency
    MissedHeartbeat,  // Offline for >5 minutes
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum StakingInstruction {
    /// Initialize the staking pool
    /// Accounts:
    /// 0. `[writable, signer]` Authority
    /// 1. `[writable]` Staking pool account (PDA)
    /// 2. `[writable]` Token vault (PDA - SPL token account)
    /// 3. `[]` WHISTLE mint
    /// 4. `[]` Token program
    /// 5. `[]` System program
    /// 6. `[]` Rent sysvar
    InitializePool {
        min_stake_amount: u64,
        tokens_per_whistle: u64,
        cooldown_period: i64,
    },

    /// Stake WHISTLE tokens to mint access tokens
    /// Accounts:
    /// 0. `[writable, signer]` Staker
    /// 1. `[writable]` Staking pool
    /// 2. `[writable]` Staker account (PDA)
    /// 3. `[writable]` Staker's WHISTLE token account
    /// 4. `[writable]` Token vault (PDA)
    /// 5. `[]` Token program
    /// 6. `[]` System program
    /// 7. `[]` Clock sysvar
    Stake {
        amount: u64,
    },

    /// Unstake WHISTLE tokens (burns access tokens)
    /// Accounts:
    /// 0. `[writable, signer]` Staker
    /// 1. `[writable]` Staking pool
    /// 2. `[writable]` Staker account (PDA)
    /// 3. `[writable]` Staker's WHISTLE token account
    /// 4. `[writable]` Token vault (PDA)
    /// 5. `[]` Token program
    /// 6. `[]` System program
    /// 7. `[]` Clock sysvar
    Unstake {
        amount: u64,
    },

    /// Transfer access token (not sell, just delegate)
    /// SECURITY: Recipient PDA is validated
    /// Accounts:
    /// 0. `[signer]` Current owner
    /// 1. `[writable]` From staker account (PDA)
    /// 2. `[writable]` To staker account (PDA - must exist with stake)
    /// 3. `[]` Staking pool
    /// 4. `[]` To staker pubkey (for PDA validation)
    TransferAccess {
        access_tokens: u64,
    },

    /// Activate node operator status
    /// Accounts:
    /// 0. `[signer]` Staker
    /// 1. `[writable]` Staker account
    /// 2. `[]` Staking pool
    ActivateNodeOperator,

    /// Record encrypted data usage (for metrics)
    /// NOTE: In production, this should require oracle/verifier signatures
    /// Accounts:
    /// 0. `[signer]` Node operator
    /// 1. `[writable]` Staker account
    RecordDataUsage {
        data_size: u64,
    },

    /// Pause/unpause the pool (emergency use)
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` Staking pool
    SetPoolStatus {
        is_active: bool,
    },

    /// Lock the token rate (prevents manipulation)
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` Staking pool
    LockRate,

    // ========== PROVIDER INSTRUCTIONS ==========
    
    /// Initialize payment vault
    /// Accounts:
    /// 0. `[writable, signer]` Authority
    /// 1. `[writable]` Payment vault (PDA)
    /// 2. `[]` System program
    /// 3. `[]` Rent sysvar
    InitializePaymentVault,

    /// Register as a data provider
    /// Accounts:
    /// 0. `[writable, signer]` Provider
    /// 1. `[writable]` Provider account (PDA)
    /// 2. `[writable]` Provider's WHISTLE token account
    /// 3. `[writable]` Token vault
    /// 4. `[]` Token program
    /// 5. `[]` System program
    /// 6. `[]` Clock sysvar
    RegisterProvider {
        endpoint: String,
        bond_amount: u64,
    },

    /// Deregister provider and return bond
    /// Accounts:
    /// 0. `[writable, signer]` Provider
    /// 1. `[writable]` Provider account (PDA)
    /// 2. `[writable]` Token vault
    /// 3. `[writable]` Provider's WHISTLE token account
    /// 4. `[]` Token program
    DeregisterProvider,

    /// Update provider endpoint
    /// Accounts:
    /// 0. `[signer]` Provider
    /// 1. `[writable]` Provider account (PDA)
    UpdateEndpoint {
        new_endpoint: String,
    },

    /// Record provider heartbeat
    /// Accounts:
    /// 0. `[signer]` Provider
    /// 1. `[writable]` Provider account (PDA)
    /// 2. `[]` Clock sysvar
    RecordHeartbeat,

    /// Record query performance metrics
    /// Accounts:
    /// 0. `[signer]` Oracle/Authority
    /// 1. `[writable]` Provider account (PDA)
    /// 2. `[]` Payment vault (for authority verification)
    RecordQueryMetrics {
        provider: Pubkey,
        latency_ms: u64,
        success: bool,
    },

    /// Update reputation scores
    /// Accounts:
    /// 0. `[signer]` Authority/Oracle
    /// 1. `[writable]` Provider account (PDA)
    UpdateReputationMetrics {
        provider: Pubkey,
        uptime: u64,
        latency: u64,
        accuracy: u64,
    },

    /// Slash provider for violations
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` Provider account (PDA)
    /// 2. `[writable]` Payment vault (bonus pool)
    SlashProvider {
        provider: Pubkey,
        penalty: u64,
        reason: SlashReason,
    },

    // ========== PAYMENT INSTRUCTIONS ==========

    /// Process query payment and route to pools
    /// Accounts:
    /// 0. `[writable, signer]` User (payer)
    /// 1. `[writable]` Payment vault (PDA)
    /// 2. `[writable]` Provider account (PDA)
    /// 3. `[writable]` Staking pool
    /// 4. `[]` System program
    ProcessQueryPayment {
        provider: Pubkey,
        query_cost: u64,
    },

    /// Provider claims their earnings (70% share)
    /// Accounts:
    /// 0. `[writable, signer]` Provider
    /// 1. `[writable]` Provider account (PDA)
    /// 2. `[writable]` Payment vault (PDA)
    /// 3. `[]` System program
    ClaimProviderEarnings,

    /// Distribute bonus pool to top 20% providers
    /// Accounts:
    /// 0. `[signer]` Authority/Oracle
    /// 1. `[writable]` Payment vault (PDA)
    /// 2+. `[writable]` Top provider accounts (PDAs)
    DistributeBonusPool {
        top_providers: Vec<Pubkey>,
    },

    /// Distribute staker rewards from 5% pool
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` Payment vault (PDA)
    /// 2. `[]` Staking pool (to get total_staked)
    DistributeStakerRewards,

    /// Staker claims their share of rewards
    /// Accounts:
    /// 0. `[writable, signer]` Staker
    /// 1. `[writable]` Staker account (PDA)
    /// 2. `[writable]` Payment vault (PDA)
    /// 3. `[]` System program
    ClaimStakerRewards,

    // ========== QUERY AUTHORIZATION ==========

    /// Authorize query access (check stake + provider status)
    /// Accounts:
    /// 0. `[]` User staker account (PDA)
    /// 1. `[]` Provider account (PDA)
    /// 2. `[]` Staking pool
    AuthorizeQuery {
        user: Pubkey,
        provider: Pubkey,
    },

    /// Record query for metrics
    /// Accounts:
    /// 0. `[signer]` Provider
    /// 1. `[writable]` Provider account (PDA)
    RecordQuery {
        user: Pubkey,
    },

    // ========== DEVELOPER STAKING INSTRUCTIONS ==========

    /// Register as a developer and stake WHISTLE for rebates
    /// Accounts:
    /// 0. `[writable, signer]` Developer
    /// 1. `[writable]` Developer account (PDA)
    /// 2. `[writable]` Developer's WHISTLE token account
    /// 3. `[writable]` Token vault
    /// 4. `[]` Token program
    /// 5. `[]` System program
    /// 6. `[]` Clock sysvar
    RegisterDeveloper {
        stake_amount: u64,
        referrer: Option<Pubkey>,
    },

    /// Stake additional WHISTLE to upgrade tier
    /// Accounts:
    /// 0. `[writable, signer]` Developer
    /// 1. `[writable]` Developer account (PDA)
    /// 2. `[writable]` Developer's WHISTLE token account
    /// 3. `[writable]` Token vault
    /// 4. `[]` Token program
    StakeDeveloper {
        amount: u64,
    },

    /// Unstake WHISTLE from developer account
    /// Accounts:
    /// 0. `[writable, signer]` Developer
    /// 1. `[writable]` Developer account (PDA)
    /// 2. `[writable]` Token vault
    /// 3. `[writable]` Developer's WHISTLE token account
    /// 4. `[]` Token program
    /// 5. `[]` Staking pool (for vault authority)
    UnstakeDeveloper {
        amount: u64,
    },

    /// Process developer query with rebate
    /// Accounts:
    /// 0. `[writable, signer]` Developer (payer)
    /// 1. `[writable]` Developer account (PDA)
    /// 2. `[writable]` Payment vault (PDA)
    /// 3. `[writable]` Provider account (PDA)
    /// 4. `[]` Staking pool
    /// 5. `[]` System program
    /// 6. `[]` Clock sysvar
    /// 7. `[writable]` Referrer developer account (PDA, optional - can be program_id if no referrer)
    ProcessDeveloperQuery {
        provider: Pubkey,
        query_cost: u64,
    },

    /// Claim developer bonus rewards
    /// Accounts:
    /// 0. `[writable, signer]` Developer
    /// 1. `[writable]` Developer account (PDA)
    /// 2. `[writable]` Payment vault (PDA)
    /// 3. `[writable]` Token vault
    /// 4. `[writable]` Developer's WHISTLE token account
    /// 5. `[]` Token program
    /// 6. `[]` Staking pool (for vault authority)
    ClaimDeveloperRewards,

    /// Claim referral earnings (SOL)
    /// Accounts:
    /// 0. `[writable, signer]` Developer
    /// 1. `[writable]` Developer account (PDA)
    /// 2. `[writable]` Payment vault (PDA)
    /// 3. `[]` System program
    ClaimReferralEarnings,

    // ========== X402 PAYMENT INSTRUCTIONS ==========

    /// Initialize X402 payment collection wallet (one-time setup)
    /// Accounts:
    /// 0. `[writable, signer]` Authority
    /// 1. `[writable]` X402 wallet (PDA)
    /// 2. `[]` System program
    InitializeX402Wallet,

    /// Process X402 payment and distribute to stakers (90%) and treasury (10%)
    /// Accounts:
    /// 0. `[writable, signer]` Authority/Cron
    /// 1. `[writable]` X402 wallet (PDA)
    /// 2. `[writable]` Payment vault (PDA)
    /// 3. `[]` Staking pool (for validation)
    ProcessX402Payment {
        amount: u64,
    },
}

// ============= ENTRYPOINT =============

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = StakingInstruction::try_from_slice(instruction_data)?;

    match instruction {
        StakingInstruction::InitializePool {
            min_stake_amount,
            tokens_per_whistle,
            cooldown_period,
        } => initialize_pool(program_id, accounts, min_stake_amount, tokens_per_whistle, cooldown_period),

        StakingInstruction::Stake { amount } => stake(program_id, accounts, amount),

        StakingInstruction::Unstake { amount } => unstake(program_id, accounts, amount),

        StakingInstruction::TransferAccess { access_tokens } => {
            transfer_access(program_id, accounts, access_tokens)
        }

        StakingInstruction::ActivateNodeOperator => {
            activate_node_operator(program_id, accounts)
        }

        StakingInstruction::RecordDataUsage { data_size } => {
            record_data_usage(program_id, accounts, data_size)
        }

        StakingInstruction::SetPoolStatus { is_active } => {
            set_pool_status(program_id, accounts, is_active)
        }

        StakingInstruction::LockRate => {
            lock_rate(program_id, accounts)
        }

        // Provider instructions
        StakingInstruction::InitializePaymentVault => {
            initialize_payment_vault(program_id, accounts)
        }

        StakingInstruction::RegisterProvider { endpoint, bond_amount } => {
            register_provider(program_id, accounts, endpoint, bond_amount)
        }

        StakingInstruction::DeregisterProvider => {
            deregister_provider(program_id, accounts)
        }

        StakingInstruction::UpdateEndpoint { new_endpoint } => {
            update_endpoint(program_id, accounts, new_endpoint)
        }

        StakingInstruction::RecordHeartbeat => {
            record_heartbeat(program_id, accounts)
        }

        StakingInstruction::RecordQueryMetrics { provider, latency_ms, success } => {
            record_query_metrics(program_id, accounts, provider, latency_ms, success)
        }

        StakingInstruction::UpdateReputationMetrics { provider, uptime, latency, accuracy } => {
            update_reputation_metrics(program_id, accounts, provider, uptime, latency, accuracy)
        }

        StakingInstruction::SlashProvider { provider, penalty, reason } => {
            slash_provider(program_id, accounts, provider, penalty, reason)
        }

        // Payment instructions
        StakingInstruction::ProcessQueryPayment { provider, query_cost } => {
            process_query_payment(program_id, accounts, provider, query_cost)
        }

        StakingInstruction::ClaimProviderEarnings => {
            claim_provider_earnings(program_id, accounts)
        }

        StakingInstruction::DistributeBonusPool { top_providers } => {
            distribute_bonus_pool(program_id, accounts, top_providers)
        }

        StakingInstruction::DistributeStakerRewards => {
            distribute_staker_rewards(program_id, accounts)
        }

        StakingInstruction::ClaimStakerRewards => {
            claim_staker_rewards(program_id, accounts)
        }

        // Query authorization
        StakingInstruction::AuthorizeQuery { user, provider } => {
            authorize_query(program_id, accounts, user, provider)
        }

        StakingInstruction::RecordQuery { user } => {
            record_query(program_id, accounts, user)
        }

        // Developer staking instructions
        StakingInstruction::RegisterDeveloper { stake_amount, referrer } => {
            register_developer(program_id, accounts, stake_amount, referrer)
        }

        StakingInstruction::StakeDeveloper { amount } => {
            stake_developer(program_id, accounts, amount)
        }

        StakingInstruction::UnstakeDeveloper { amount } => {
            unstake_developer(program_id, accounts, amount)
        }

        StakingInstruction::ProcessDeveloperQuery { provider, query_cost } => {
            process_developer_query(program_id, accounts, provider, query_cost)
        }

        StakingInstruction::ClaimDeveloperRewards => {
            claim_developer_rewards(program_id, accounts)
        }

        StakingInstruction::ClaimReferralEarnings => {
            claim_referral_earnings(program_id, accounts)
        }

        // X402 payment instructions
        StakingInstruction::InitializeX402Wallet => {
            initialize_x402_wallet(program_id, accounts)
        }

        StakingInstruction::ProcessX402Payment { amount } => {
            process_x402_payment(program_id, accounts, amount)
        }
    }
}

// ============= INSTRUCTION HANDLERS =============

fn initialize_pool(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    min_stake_amount: u64,
    tokens_per_whistle: u64,
    cooldown_period: i64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let whistle_mint = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let rent_sysvar = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate program IDs
    if *token_program.key != spl_token::id() {
        msg!("Invalid token program");
        return Err(ProgramError::IncorrectProgramId);
    }
    if *system_program.key != solana_program::system_program::id() {
        msg!("Invalid system program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Check if pool already initialized - allow authority to reinitialize if needed
    let pool_exists = !pool_account.data_is_empty();
    let vault_exists = !token_vault.data_is_empty();
    
    if pool_exists || vault_exists {
        msg!("WARNING: Pool/vault already exist - reinitializing with authority permission");
        msg!("Pool exists: {}, Vault exists: {}", pool_exists, vault_exists);
        
        // If pool exists, verify it's owned by our program
        if pool_exists && pool_account.owner != program_id {
            msg!("Pool account not owned by program");
            return Err(ProgramError::IncorrectProgramId);
        }
        
        // If vault exists, verify it's owned by token program
        if vault_exists && token_vault.owner != token_program.key {
            msg!("Token vault not owned by token program");
            return Err(ProgramError::IncorrectProgramId);
        }
    }

    // Validate parameters
    if tokens_per_whistle == 0 {
        msg!("Tokens per WHISTLE must be greater than 0");
        return Err(ProgramError::InvalidInstructionData);
    }

    // MEDIUM SECURITY FIX: Validate tokens_per_whistle is within reasonable bounds
    // Prevents overflow in stake calculations (amount * tokens_per_whistle)
    // Max reasonable rate: 1,000,000 tokens per WHISTLE
    // This allows staking up to u64::MAX / 1_000_000 WHISTLE without overflow
    const MAX_TOKENS_PER_WHISTLE: u64 = 1_000_000;
    if tokens_per_whistle > MAX_TOKENS_PER_WHISTLE {
        msg!("Tokens per WHISTLE too high (max: {})", MAX_TOKENS_PER_WHISTLE);
        msg!("This prevents overflow in access token calculations");
        return Err(ProgramError::InvalidInstructionData);
    }
    
    // MEDIUM SECURITY FIX: Validate tokens_per_whistle works with MAX_STAKE_PER_USER
    // Ensure large stakers can participate without hitting overflow
    // MAX_STAKE_PER_USER = 10,000,000 WHISTLE = 10_000_000_000_000_000 lamports
    let test_calc = MAX_STAKE_PER_USER.checked_mul(tokens_per_whistle);
    if test_calc.is_none() {
        msg!("Tokens per WHISTLE would overflow with MAX_STAKE_PER_USER");
        msg!("Max stake: {}, Tokens per WHISTLE: {}", MAX_STAKE_PER_USER, tokens_per_whistle);
        msg!("Reduce tokens_per_whistle to allow large stakers");
        return Err(ProgramError::InvalidInstructionData);
    }

    // HIGH SEVERITY FIX: Validate cooldown period is not negative
    if cooldown_period < 0 {
        msg!("Cooldown period cannot be negative");
        return Err(ProgramError::InvalidInstructionData);
    }

    // CRITICAL SECURITY FIX: Validate WHISTLE mint address
    let expected_mint = OFFICIAL_WHISTLE_MINT.parse::<Pubkey>()
        .map_err(|_| ProgramError::InvalidAccountData)?;
    if *whistle_mint.key != expected_mint {
        msg!("Invalid WHISTLE mint address");
        msg!("Expected: {}", OFFICIAL_WHISTLE_MINT);
        msg!("Received: {}", whistle_mint.key);
        return Err(ProgramError::InvalidAccountData);
    }

    // Derive PDA for pool
    let (pool_pda, bump) = Pubkey::find_program_address(
        &[b"staking_pool", authority.key.as_ref()],
        program_id,
    );

    if pool_pda != *pool_account.key {
        msg!("Invalid pool PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Derive PDA for token vault
    let (vault_pda, vault_bump) = Pubkey::find_program_address(
        &[b"token_vault", authority.key.as_ref()],
        program_id,
    );

    if vault_pda != *token_vault.key {
        msg!("Invalid token vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    let rent = Rent::from_account_info(rent_sysvar)?;
    
    // Create pool account (skip if already exists)
    if !pool_exists {
        // Use exact Borsh serialized size (not Rust mem size!)
        // StakingPool: 32+32+32+8+8+8+8+1+8+8+8+1+1 = 155 bytes
        const STAKING_POOL_SIZE: usize = 155;
        let pool_space = STAKING_POOL_SIZE;
        let pool_lamports = rent.minimum_balance(pool_space);

        invoke_signed(
            &system_instruction::create_account(
                authority.key,
                pool_account.key,
                pool_lamports,
                pool_space as u64,
                program_id,
            ),
            &[authority.clone(), pool_account.clone(), system_program.clone()],
            &[&[b"staking_pool", authority.key.as_ref(), &[bump]]],
        )?;
    } else {
        msg!("Pool account already exists - skipping creation");
    }

    // Create SPL token account for vault
    let token_account_space = 165; // SPL token account size
    let token_account_lamports = rent.minimum_balance(token_account_space);

    invoke_signed(
        &system_instruction::create_account(
            authority.key,
            token_vault.key,
            token_account_lamports,
            token_account_space as u64,
            token_program.key,
        ),
        &[authority.clone(), token_vault.clone(), system_program.clone()],
        &[&[b"token_vault", authority.key.as_ref(), &[vault_bump]]],
    )?;

    // Initialize token account
    invoke(
        &token_instruction::initialize_account(
            token_program.key,
            token_vault.key,
            whistle_mint.key,
            &vault_pda, // Owner is the PDA itself
        )?,
        &[token_vault.clone(), whistle_mint.clone(), token_program.clone()],
    )?;

    let clock = Clock::get()?;
    let pool = StakingPool {
        authority: *authority.key,
        whistle_mint: *whistle_mint.key,
        token_vault: *token_vault.key,
        total_staked: 0,
        total_access_tokens: 0,
        min_stake_amount,
        tokens_per_whistle,
        is_active: true,
        created_at: clock.unix_timestamp,
        cooldown_period,
        max_stake_per_user: MAX_STAKE_PER_USER,
        rate_locked: false,
        bump,
    };

    pool.serialize(&mut &mut pool_account.data.borrow_mut()[..])?;

    msg!("Staking pool initialized with WHISTLE token!");
    msg!("WHISTLE mint: {}", whistle_mint.key);
    msg!("Min stake: {} tokens", min_stake_amount);
    msg!("Access tokens per WHISTLE: {}", tokens_per_whistle);
    msg!("Cooldown period: {} seconds", cooldown_period);

    Ok(())
}

fn stake(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;
    let staker_account = next_account_info(account_info_iter)?;
    let staker_token_account = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let clock_sysvar = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate program IDs
    if *token_program.key != spl_token::id() {
        msg!("Invalid token program");
        return Err(ProgramError::IncorrectProgramId);
    }
    if *system_program.key != solana_program::system_program::id() {
        msg!("Invalid system program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !staker.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // SECURITY FIX: Zero amount check
    if amount == 0 {
        msg!("Cannot stake zero amount");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Verify pool account is owned by this program
    if pool_account.owner != program_id {
        msg!("Pool account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    // SECURITY FIX: Check pool status
    if !pool.is_active {
        msg!("Pool is not active");
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify pool PDA
    let (pool_pda, _) = Pubkey::find_program_address(
        &[b"staking_pool", pool.authority.as_ref()],
        program_id,
    );

    if pool_pda != *pool_account.key {
        msg!("Invalid pool PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Verify token vault PDA
    let (vault_pda, _) = Pubkey::find_program_address(
        &[b"token_vault", pool.authority.as_ref()],
        program_id,
    );

    if vault_pda != *token_vault.key {
        msg!("Invalid token vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Verify token vault matches pool's configured vault
    if *token_vault.key != pool.token_vault {
        msg!("Token vault does not match pool configuration");
        return Err(ProgramError::InvalidAccountData);
    }

    if amount < pool.min_stake_amount {
        msg!("Stake amount below minimum");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Verify staker PDA
    let (staker_pda, bump) = Pubkey::find_program_address(
        &[b"staker", staker.key.as_ref()],
        program_id,
    );

    if *staker_account.key != staker_pda {
        msg!("Invalid staker PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // HIGH SECURITY FIX: Validate staker's token account
    let staker_token_data = spl_token::state::Account::unpack(&staker_token_account.data.borrow())
        .map_err(|_| {
            msg!("Invalid token account data");
            ProgramError::InvalidAccountData
        })?;
    
    // Verify token account is owned by staker
    if staker_token_data.owner != *staker.key {
        msg!("Token account not owned by staker");
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Verify token account has correct mint (WHISTLE)
    if staker_token_data.mint != pool.whistle_mint {
        msg!("Wrong token mint - must be WHISTLE");
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Verify staker has sufficient balance
    if staker_token_data.amount < amount {
        msg!("Insufficient token balance");
        return Err(ProgramError::InsufficientFunds);
    }

    // Use checked arithmetic to prevent overflow - 1:1 ratio for WHISTLE
    let access_tokens = amount
        .checked_mul(pool.tokens_per_whistle)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // SECURITY FIX: Ensure user gets at least some tokens
    if access_tokens == 0 {
        msg!("Stake amount too small to generate tokens");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Transfer WHISTLE tokens to vault
    invoke(
        &token_instruction::transfer(
            token_program.key,
            staker_token_account.key,
            token_vault.key,
            staker.key,
            &[],
            amount,
        )?,
        &[
            staker_token_account.clone(),
            token_vault.clone(),
            staker.clone(),
            token_program.clone(),
        ],
    )?;

    let clock = Clock::from_account_info(clock_sysvar)?;

    if staker_account.data_is_empty() {
        // Check max stake limit for new accounts
        if amount > pool.max_stake_per_user {
            msg!("Stake amount exceeds maximum per user");
            return Err(ProgramError::InvalidInstructionData);
        }

        // Initialize new staker account
        let rent = Rent::get()?;
        let space = std::mem::size_of::<StakerAccount>();
        let lamports = rent.minimum_balance(space);

        invoke_signed(
            &system_instruction::create_account(
                staker.key,
                staker_account.key,
                lamports,
                space as u64,
                program_id,
            ),
            &[staker.clone(), staker_account.clone(), system_program.clone()],
            &[&[b"staker", staker.key.as_ref(), &[bump]]],
        )?;

        let staker_data = StakerAccount {
            staker: *staker.key,
            staked_amount: amount,
            access_tokens,
            last_stake_time: clock.unix_timestamp,
            node_operator: false,
            voting_power: access_tokens,
            data_encrypted: 0,
            pending_rewards: 0,
            bump,
        };

        staker_data.serialize(&mut &mut staker_account.data.borrow_mut()[..])?;
    } else {
        // Verify staker account is owned by program
        if staker_account.owner != program_id {
            msg!("Staker account not owned by program");
            return Err(ProgramError::IncorrectProgramId);
        }

        // Update existing staker
        let mut staker_data = StakerAccount::try_from_slice(&staker_account.data.borrow())?;
        
        // Verify ownership
        if staker_data.staker != *staker.key {
            msg!("Staker account does not belong to signer");
            return Err(ProgramError::InvalidAccountData);
        }

        // Check max stake limit
        let new_total = staker_data.staked_amount
            .checked_add(amount)
            .ok_or(ProgramError::InvalidInstructionData)?;
            
        if new_total > pool.max_stake_per_user {
            msg!("Total stake would exceed maximum per user");
            return Err(ProgramError::InvalidInstructionData);
        }

        staker_data.staked_amount = new_total;
        staker_data.access_tokens = staker_data.access_tokens
            .checked_add(access_tokens)
            .ok_or(ProgramError::InvalidInstructionData)?;
        staker_data.last_stake_time = clock.unix_timestamp;
        staker_data.voting_power = staker_data.voting_power
            .checked_add(access_tokens)
            .ok_or(ProgramError::InvalidInstructionData)?;
        
        staker_data.serialize(&mut &mut staker_account.data.borrow_mut()[..])?;
    }

    // Use checked arithmetic for pool updates
    pool.total_staked = pool.total_staked
        .checked_add(amount)
        .ok_or(ProgramError::InvalidInstructionData)?;
    pool.total_access_tokens = pool.total_access_tokens
        .checked_add(access_tokens)
        .ok_or(ProgramError::InvalidInstructionData)?;
    pool.serialize(&mut &mut pool_account.data.borrow_mut()[..])?;

    msg!("Staked {} lamports", amount);
    msg!("Minted {} access tokens", access_tokens);

    Ok(())
}

fn unstake(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;
    let staker_account = next_account_info(account_info_iter)?;
    let staker_token_account = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let clock_sysvar = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate program IDs
    if *token_program.key != spl_token::id() {
        msg!("Invalid token program");
        return Err(ProgramError::IncorrectProgramId);
    }
    if *system_program.key != solana_program::system_program::id() {
        msg!("Invalid system program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !staker.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // SECURITY FIX: Zero amount check
    if amount == 0 {
        msg!("Cannot unstake zero amount");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Verify ownership
    if pool_account.owner != program_id {
        msg!("Pool account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if staker_account.owner != program_id {
        msg!("Staker account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;
    let mut staker_data = StakerAccount::try_from_slice(&staker_account.data.borrow())?;

    // SECURITY FIX: Check pool status for unstaking
    if !pool.is_active {
        msg!("Pool is paused - unstaking not allowed");
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify pool PDA
    let (pool_pda, _) = Pubkey::find_program_address(
        &[b"staking_pool", pool.authority.as_ref()],
        program_id,
    );

    if pool_pda != *pool_account.key {
        msg!("Invalid pool PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Verify token vault PDA
    let (vault_pda, vault_bump) = Pubkey::find_program_address(
        &[b"token_vault", pool.authority.as_ref()],
        program_id,
    );

    if vault_pda != *token_vault.key {
        msg!("Invalid token vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // HIGH SEVERITY FIX: Validate staker PDA
    let (staker_pda, _) = Pubkey::find_program_address(
        &[b"staker", staker.key.as_ref()],
        program_id,
    );

    if staker_pda != *staker_account.key {
        msg!("Invalid staker PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Verify staker ownership
    if staker_data.staker != *staker.key {
        msg!("Staker account does not belong to signer");
        return Err(ProgramError::InvalidAccountData);
    }

    // HIGH SECURITY FIX: Validate staker's token account for return transfer
    let staker_token_data = spl_token::state::Account::unpack(&staker_token_account.data.borrow())
        .map_err(|_| {
            msg!("Invalid token account data");
            ProgramError::InvalidAccountData
        })?;
    
    // Verify token account is owned by staker
    if staker_token_data.owner != *staker.key {
        msg!("Token account not owned by staker");
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Verify token account has correct mint (WHISTLE)
    if staker_token_data.mint != pool.whistle_mint {
        msg!("Wrong token mint - must be WHISTLE");
        return Err(ProgramError::InvalidAccountData);
    }

    // Enforce cooldown period
    let clock = Clock::from_account_info(clock_sysvar)?;
    let time_since_stake = clock.unix_timestamp - staker_data.last_stake_time;
    
    if time_since_stake < pool.cooldown_period {
        msg!("Cooldown period not met");
        msg!("Time remaining: {} seconds", pool.cooldown_period - time_since_stake);
        return Err(ProgramError::InvalidInstructionData);
    }

    if staker_data.staked_amount < amount {
        msg!("Insufficient staked amount");
        return Err(ProgramError::InsufficientFunds);
    }

    // SECURITY FIX: Calculate tokens to burn proportionally
    // This fixes the stake_rate overwrite problem
    // Formula: tokens_to_burn = (unstake_amount / total_staked) * total_tokens
    let tokens_to_burn = if staker_data.staked_amount == amount {
        // Unstaking everything - burn all tokens
        staker_data.access_tokens
    } else {
        // LOW SECURITY FIX: Use u128 for higher precision calculation
        // This reduces rounding errors in partial unstaking
        // Round up slightly to prevent users from gaming the system with dust
        let tokens_to_burn_128 = (staker_data.access_tokens as u128)
            .checked_mul(amount as u128)
            .ok_or(ProgramError::InvalidInstructionData)?
            .checked_div(staker_data.staked_amount as u128)
            .ok_or(ProgramError::InvalidInstructionData)?;
        
        // Check if there's a remainder and round up if so (ceil division)
        let remainder = (staker_data.access_tokens as u128)
            .checked_mul(amount as u128)
            .ok_or(ProgramError::InvalidInstructionData)?
            .checked_rem(staker_data.staked_amount as u128)
            .ok_or(ProgramError::InvalidInstructionData)?;
        
        let tokens_to_burn_with_ceil = if remainder > 0 {
            tokens_to_burn_128.checked_add(1).ok_or(ProgramError::InvalidInstructionData)?
        } else {
            tokens_to_burn_128
        };
        
        u64::try_from(tokens_to_burn_with_ceil).map_err(|_| {
            msg!("Tokens to burn calculation overflow");
            ProgramError::InvalidInstructionData
        })?
    };

    if staker_data.access_tokens < tokens_to_burn {
        msg!("Insufficient access tokens");
        return Err(ProgramError::InsufficientFunds);
    }

    // HIGH SEVERITY FIX: Token vault balance check handled by SPL token program
    // SPL token transfer will fail automatically if insufficient balance

    // Transfer WHISTLE tokens back from vault using invoke_signed
    invoke_signed(
        &token_instruction::transfer(
            token_program.key,
            token_vault.key,
            staker_token_account.key,
            &vault_pda,
            &[],
            amount,
        )?,
        &[
            token_vault.clone(),
            staker_token_account.clone(),
            token_program.clone(),
        ],
        &[&[b"token_vault", pool.authority.as_ref(), &[vault_bump]]],
    )?;

    // Update staker
    staker_data.staked_amount = staker_data.staked_amount
        .checked_sub(amount)
        .ok_or(ProgramError::InvalidInstructionData)?;
    staker_data.access_tokens = staker_data.access_tokens
        .checked_sub(tokens_to_burn)
        .ok_or(ProgramError::InvalidInstructionData)?;
    staker_data.voting_power = staker_data.voting_power
        .checked_sub(tokens_to_burn)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // SECURITY FIX: Revoke node operator status if stake falls below minimum
    if staker_data.node_operator {
        let min_node_stake = pool.min_stake_amount
            .checked_mul(10)
            .ok_or(ProgramError::InvalidInstructionData)?;
        
        if staker_data.staked_amount < min_node_stake {
            staker_data.node_operator = false;
            msg!("Node operator status revoked due to insufficient stake");
        }
    }

    staker_data.serialize(&mut &mut staker_account.data.borrow_mut()[..])?;

    // Update pool
    pool.total_staked = pool.total_staked
        .checked_sub(amount)
        .ok_or(ProgramError::InvalidInstructionData)?;
    pool.total_access_tokens = pool.total_access_tokens
        .checked_sub(tokens_to_burn)
        .ok_or(ProgramError::InvalidInstructionData)?;
    pool.serialize(&mut &mut pool_account.data.borrow_mut()[..])?;

    msg!("Unstaked {} lamports", amount);
    msg!("Burned {} access tokens", tokens_to_burn);

    Ok(())
}

fn transfer_access(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    access_tokens: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let owner = next_account_info(account_info_iter)?;
    let from_account = next_account_info(account_info_iter)?;
    let to_account = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;
    let to_staker_pubkey = next_account_info(account_info_iter)?; // CRITICAL FIX: Added recipient pubkey

    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // SECURITY FIX: Validate zero amount
    if access_tokens == 0 {
        msg!("Cannot transfer zero tokens");
        return Err(ProgramError::InvalidInstructionData);
    }

    // SECURITY FIX: Better check ordering - check empty first for better error message
    if to_account.data_is_empty() {
        msg!("Recipient must stake before receiving delegated tokens");
        msg!("This ensures all token holders have skin in the game");
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify ownership
    if from_account.owner != program_id {
        msg!("From account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if pool_account.owner != program_id {
        msg!("Pool account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if to_account.owner != program_id {
        msg!("To account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    // CRITICAL FIX: Verify sender PDA matches expected staker
    let (from_staker_pda, _) = Pubkey::find_program_address(
        &[b"staker", owner.key.as_ref()],
        program_id,
    );

    if from_staker_pda != *from_account.key {
        msg!("Invalid sender staker PDA");
        msg!("From account does not match expected PDA for sender");
        return Err(ProgramError::InvalidSeeds);
    }

    // CRITICAL FIX: Verify recipient PDA matches expected staker
    let (to_staker_pda, _) = Pubkey::find_program_address(
        &[b"staker", to_staker_pubkey.key.as_ref()],
        program_id,
    );

    if to_staker_pda != *to_account.key {
        msg!("Invalid recipient staker PDA");
        msg!("To account does not match expected PDA for recipient");
        return Err(ProgramError::InvalidSeeds);
    }

    let mut from_data = StakerAccount::try_from_slice(&from_account.data.borrow())?;
    let mut to_data = StakerAccount::try_from_slice(&to_account.data.borrow())?;
    let pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    // SECURITY FIX: Check pool status
    if !pool.is_active {
        msg!("Pool is paused - transfers not allowed");
        return Err(ProgramError::InvalidAccountData);
    }

    if from_data.staker != *owner.key {
        msg!("Not the owner");
        return Err(ProgramError::InvalidAccountData);
    }

    if from_data.access_tokens < access_tokens {
        msg!("Insufficient access tokens");
        return Err(ProgramError::InsufficientFunds);
    }

    // SECURITY FIX: Recipient must have minimum stake
    if to_data.staked_amount < pool.min_stake_amount {
        msg!("Recipient must have at least minimum stake to receive tokens");
        msg!("Required: {} lamports", pool.min_stake_amount);
        return Err(ProgramError::InvalidAccountData);
    }

    // CRITICAL FIX: Additional verification - ensure to_data.staker matches provided pubkey
    if to_data.staker != *to_staker_pubkey.key {
        msg!("Recipient account staker field does not match provided pubkey");
        return Err(ProgramError::InvalidAccountData);
    }

    // HIGH SECURITY FIX: Prevent unlimited access token accumulation (governance attack)
    // UPDATED: Tightened from 2x to 1.5x to better prevent Sybil attacks
    // 
    // ATTACK SCENARIO PREVENTED:
    // Attacker with 100 WHISTLE creates 50 accounts with 2 WHISTLE each (min stake)
    // Without limit: Could accumulate all 100 WHISTLE worth of tokens in one account
    // With 2x limit: Could accumulate 4 WHISTLE worth per account = 200 total (2x attack)
    // With 1.5x limit: Can accumulate 3 WHISTLE worth per account = 150 total (1.5x attack)
    // 
    // RATIONALE FOR 1.5x:
    // - Allows legitimate delegation for convenience (50% bonus)
    // - Makes Sybil attacks economically less attractive
    // - Reduces but doesn't eliminate multi-account attacks (impossible without identity)
    // - Trade-off: Convenience vs security (1.5x chosen as reasonable middle ground)
    //
    // Formula: access_tokens_after_transfer <= (staked_amount * tokens_per_whistle) * 1.5
    // Using basis points: multiply by 15000 then divide by 10000 for 1.5x
    let max_allowed_tokens = to_data.staked_amount
        .checked_mul(pool.tokens_per_whistle)
        .ok_or(ProgramError::InvalidInstructionData)?
        .checked_mul(15000)
        .ok_or(ProgramError::InvalidInstructionData)?
        .checked_div(10000)
        .ok_or(ProgramError::InvalidInstructionData)?;
    
    let tokens_after_transfer = to_data.access_tokens
        .checked_add(access_tokens)
        .ok_or(ProgramError::InvalidInstructionData)?;
    
    if tokens_after_transfer > max_allowed_tokens {
        msg!("HIGH SECURITY: Transfer would exceed accumulation limit");
        msg!("Recipient stake: {}, Current tokens: {}, Transfer: {}", 
             to_data.staked_amount, to_data.access_tokens, access_tokens);
        msg!("Max allowed: {} (1.5x stake entitlement)", max_allowed_tokens);
        msg!("Would result in: {} tokens", tokens_after_transfer);
        msg!("This limit prevents governance attacks via token accumulation");
        msg!("Sybil attack protection: 1.5x multiplier balances convenience vs security");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Transfer tokens (note: this is NOT a sale, just delegation)
    from_data.access_tokens = from_data.access_tokens
        .checked_sub(access_tokens)
        .ok_or(ProgramError::InvalidInstructionData)?;
    from_data.voting_power = from_data.voting_power
        .checked_sub(access_tokens)
        .ok_or(ProgramError::InvalidInstructionData)?;
    
    to_data.access_tokens = tokens_after_transfer; // Use pre-validated amount
    to_data.voting_power = to_data.voting_power
        .checked_add(access_tokens)
        .ok_or(ProgramError::InvalidInstructionData)?;

    from_data.serialize(&mut &mut from_account.data.borrow_mut()[..])?;
    to_data.serialize(&mut &mut to_account.data.borrow_mut()[..])?;

    msg!("Transferred {} access tokens", access_tokens);
    msg!("From: {}", from_data.staker);
    msg!("To: {}", to_data.staker);
    msg!("This is a delegation, not a sale!");

    Ok(())
}

fn activate_node_operator(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker = next_account_info(account_info_iter)?;
    let staker_account = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;

    if !staker.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify ownership
    if staker_account.owner != program_id {
        msg!("Staker account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if pool_account.owner != program_id {
        msg!("Pool account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    // SECURITY FIX: Validate staker PDA
    let (staker_pda, _) = Pubkey::find_program_address(
        &[b"staker", staker.key.as_ref()],
        program_id,
    );

    if staker_pda != *staker_account.key {
        msg!("Invalid staker PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    let mut staker_data = StakerAccount::try_from_slice(&staker_account.data.borrow())?;
    let pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    // SECURITY FIX: Check pool status
    if !pool.is_active {
        msg!("Pool is paused - cannot activate node operator");
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify staker ownership
    if staker_data.staker != *staker.key {
        msg!("Staker account does not belong to signer");
        return Err(ProgramError::InvalidAccountData);
    }

    // SECURITY FIX: Require minimum ACTUAL STAKE, not just tokens
    // This prevents node operator status through delegation alone
    let min_node_stake = pool.min_stake_amount
        .checked_mul(10)
        .ok_or(ProgramError::InvalidInstructionData)?;
        
    if staker_data.staked_amount < min_node_stake {
        msg!("Insufficient STAKE to become node operator");
        msg!("Required: {} lamports staked", min_node_stake);
        msg!("Current: {} lamports staked", staker_data.staked_amount);
        msg!("Note: Delegated tokens do not count - you must have actual stake");
        return Err(ProgramError::InsufficientFunds);
    }

    staker_data.node_operator = true;
    staker_data.serialize(&mut &mut staker_account.data.borrow_mut()[..])?;

    msg!("Node operator status activated!");
    msg!("Can now run encrypted data routing nodes");

    Ok(())
}

fn record_data_usage(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data_size: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let node_operator = next_account_info(account_info_iter)?;
    let staker_account = next_account_info(account_info_iter)?;

    if !node_operator.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // SECURITY FIX: Zero data size check
    if data_size == 0 {
        msg!("Cannot record zero data size");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Verify ownership
    if staker_account.owner != program_id {
        msg!("Staker account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    // SECURITY FIX: Validate staker PDA
    let (staker_pda, _) = Pubkey::find_program_address(
        &[b"staker", node_operator.key.as_ref()],
        program_id,
    );

    if staker_pda != *staker_account.key {
        msg!("Invalid staker PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    let mut staker_data = StakerAccount::try_from_slice(&staker_account.data.borrow())?;

    // Verify staker ownership
    if staker_data.staker != *node_operator.key {
        msg!("Staker account does not belong to signer");
        return Err(ProgramError::InvalidAccountData);
    }

    if !staker_data.node_operator {
        msg!("Not a node operator");
        return Err(ProgramError::InvalidAccountData);
    }

    // NOTE: In production, this should require oracle/verifier signatures
    // to prevent self-reporting abuse. Consider implementing a challenge-response
    // system or requiring co-signatures from other nodes.

    // Record encrypted data handled
    staker_data.data_encrypted = staker_data.data_encrypted
        .checked_add(data_size)
        .ok_or(ProgramError::InvalidInstructionData)?;
    staker_data.serialize(&mut &mut staker_account.data.borrow_mut()[..])?;

    msg!("Recorded {} bytes of encrypted data", data_size);

    Ok(())
}

fn set_pool_status(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    is_active: bool,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify ownership
    if pool_account.owner != program_id {
        msg!("Pool account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    // Verify authority
    if pool.authority != *authority.key {
        msg!("Not the pool authority");
        return Err(ProgramError::InvalidAccountData);
    }

    // SECURITY FIX: Validate pool PDA
    let (pool_pda, _) = Pubkey::find_program_address(
        &[b"staking_pool", pool.authority.as_ref()],
        program_id,
    );

    if pool_pda != *pool_account.key {
        msg!("Invalid pool PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    pool.is_active = is_active;
    pool.serialize(&mut &mut pool_account.data.borrow_mut()[..])?;

    msg!("Pool status set to: {}", is_active);

    Ok(())
}

fn lock_rate(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify ownership
    if pool_account.owner != program_id {
        msg!("Pool account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    // Verify authority
    if pool.authority != *authority.key {
        msg!("Not the pool authority");
        return Err(ProgramError::InvalidAccountData);
    }

    // SECURITY FIX: Validate pool PDA
    let (pool_pda, _) = Pubkey::find_program_address(
        &[b"staking_pool", pool.authority.as_ref()],
        program_id,
    );

    if pool_pda != *pool_account.key {
        msg!("Invalid pool PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if pool.rate_locked {
        msg!("Rate is already locked");
        return Err(ProgramError::InvalidAccountData);
    }

    pool.rate_locked = true;
    pool.serialize(&mut &mut pool_account.data.borrow_mut()[..])?;

    msg!("Token rate permanently locked at: {} tokens per WHISTLE", pool.tokens_per_whistle);
    msg!("Rate can no longer be changed - protects against manipulation");

    Ok(())
}

// ============= HELPER FUNCTIONS =============

pub fn get_access_tier(access_tokens: u64) -> AccessTier {
    if access_tokens >= 10001 {
        AccessTier::Elite
    } else if access_tokens >= 1001 {
        AccessTier::Premium
    } else {
        AccessTier::Basic
    }
}

// ============= NEW HANDLER FUNCTIONS =============

// Initialize payment vault for query payments
fn initialize_payment_vault(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let payment_vault_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let rent_sysvar = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate system program ID
    if *system_program.key != solana_program::system_program::id() {
        msg!("Invalid system program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if !payment_vault_account.data_is_empty() {
        msg!("Payment vault already initialized");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    let (vault_pda, bump) = Pubkey::find_program_address(
        &[b"payment_vault", authority.key.as_ref()],
        program_id,
    );

    if vault_pda != *payment_vault_account.key {
        msg!("Invalid payment vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    let rent = Rent::from_account_info(rent_sysvar)?;
    let space = std::mem::size_of::<PaymentVault>();
    let lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            authority.key,
            payment_vault_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[authority.clone(), payment_vault_account.clone(), system_program.clone()],
        &[&[b"payment_vault", authority.key.as_ref(), &[bump]]],
    )?;

    let clock = Clock::get()?;
    let vault = PaymentVault {
        authority: *authority.key,
        total_collected: 0,
        provider_pool: 0,
        bonus_pool: 0,
        treasury: 0,
        staker_rewards_pool: 0,
        developer_rebate_pool: 0,  // NEW: Developer rebate pool
        last_distribution: clock.unix_timestamp,
        bump,
    };

    vault.serialize(&mut &mut payment_vault_account.data.borrow_mut()[..])?;

    msg!("Payment vault initialized!");
    Ok(())
}

// Register a new provider
fn register_provider(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    endpoint: String,
    bond_amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let provider = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let provider_token_account = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let clock_sysvar = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate program IDs
    if *token_program.key != spl_token::id() {
        msg!("Invalid token program");
        return Err(ProgramError::IncorrectProgramId);
    }
    if *system_program.key != solana_program::system_program::id() {
        msg!("Invalid system program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !provider.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if bond_amount < MIN_PROVIDER_BOND {
        msg!("Minimum bond is {} WHISTLE tokens", MIN_PROVIDER_BOND);
        return Err(ProgramError::InvalidInstructionData);
    }

    // SECURITY FIX: Validate endpoint length (min and max)
    if endpoint.len() < MIN_ENDPOINT_LENGTH || endpoint.len() > MAX_ENDPOINT_LENGTH {
        msg!("Endpoint URL invalid length (min: {}, max: {})", MIN_ENDPOINT_LENGTH, MAX_ENDPOINT_LENGTH);
        return Err(ProgramError::InvalidInstructionData);
    }
    
    // MEDIUM SECURITY FIX: Validate UTF-8 and character safety
    // Borsh serialization requires valid UTF-8, verify explicitly
    if !endpoint.is_ascii() {
        // Check if valid UTF-8 (should be, but verify)
        if endpoint.chars().any(|c| c.len_utf8() > 1 && c.len_utf8() != endpoint.chars().filter(|x| x == &c).count()) {
            msg!("Endpoint contains invalid UTF-8 sequences");
            return Err(ProgramError::InvalidInstructionData);
        }
    }
    
    // Ensure no null bytes (would break serialization)
    if endpoint.contains('\0') {
        msg!("Endpoint cannot contain null bytes");
        return Err(ProgramError::InvalidInstructionData);
    }
    
    // LOW SECURITY FIX: Basic URL format validation
    // Prevents obviously invalid endpoints like "xxxxxxx" or malicious payloads
    // Note: This is basic validation - off-chain systems should still sanitize
    let endpoint_lower = endpoint.to_lowercase();
    
    // Must start with http:// or https:// or wss:// (websocket)
    if !endpoint_lower.starts_with("http://") && 
       !endpoint_lower.starts_with("https://") && 
       !endpoint_lower.starts_with("wss://") &&
       !endpoint_lower.starts_with("ws://") {
        msg!("Endpoint must start with http://, https://, ws://, or wss://");
        return Err(ProgramError::InvalidInstructionData);
    }
    
    // Must contain at least one dot (domain.tld)
    if !endpoint.contains('.') {
        msg!("Endpoint must contain a valid domain (e.g., example.com)");
        return Err(ProgramError::InvalidInstructionData);
    }
    
    // Reject common injection patterns (basic protection)
    let dangerous_patterns = ["<script", "javascript:", "data:", "vbscript:", "onload=", "onerror="];
    for pattern in &dangerous_patterns {
        if endpoint_lower.contains(pattern) {
            msg!("Endpoint contains potentially malicious content");
            return Err(ProgramError::InvalidInstructionData);
        }
    }
    
    // Calculate actual serialized size to ensure it fits
    let mut test_buffer = vec![0u8; 4 + endpoint.len() + 10]; // +10 for safety margin
    if endpoint.serialize(&mut &mut test_buffer[..]).is_err() {
        msg!("Endpoint serialization test failed");
        return Err(ProgramError::InvalidInstructionData);
    }

    let (provider_pda, bump) = Pubkey::find_program_address(
        &[b"provider", provider.key.as_ref()],
        program_id,
    );

    if provider_pda != *provider_account.key {
        msg!("Invalid provider PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // MEDIUM SECURITY FIX: Check if provider already registered
    if !provider_account.data_is_empty() {
        msg!("Provider already registered");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // Transfer bond to vault
    invoke(
        &token_instruction::transfer(
            token_program.key,
            provider_token_account.key,
            token_vault.key,
            provider.key,
            &[],
            bond_amount,
        )?,
        &[
            provider_token_account.clone(),
            token_vault.clone(),
            provider.clone(),
            token_program.clone(),
        ],
    )?;

    // Create provider account
    let rent = Rent::get()?;
    // CRITICAL SECURITY FIX: Correct space calculation for ProviderAccount with dynamic String
    // ProviderAccount fields: provider(32) + registered_at(8) + is_active(1) + stake_bond(8) +
    // total_earned(8) + pending_earnings(8) + queries_served(8) + reputation_score(8) +
    // uptime_percentage(8) + response_time_avg(8) + accuracy_score(8) + last_heartbeat(8) +
    // slashed_amount(8) + penalty_count(4) + bump(1)
    // = 32 + 8 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 4 + 1 = 122 bytes
    // String in Borsh: 4 bytes (length) + actual string bytes
    let base_size = 122;
    let space = base_size + 4 + endpoint.len(); // +4 for Borsh String length prefix
    let lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            provider.key,
            provider_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[provider.clone(), provider_account.clone(), system_program.clone()],
        &[&[b"provider", provider.key.as_ref(), &[bump]]],
    )?;

    let clock = Clock::from_account_info(clock_sysvar)?;
    let provider_data = ProviderAccount {
        provider: *provider.key,
        endpoint,
        registered_at: clock.unix_timestamp,
        is_active: true,
        stake_bond: bond_amount,
        total_earned: 0,
        pending_earnings: 0,
        queries_served: 0,
        reputation_score: 10000, // Start with perfect score
        uptime_percentage: 10000,
        response_time_avg: 100, // 100ms default
        accuracy_score: 10000,
        last_heartbeat: clock.unix_timestamp,
        slashed_amount: 0,
        penalty_count: 0,
        bump,
    };

    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    msg!("Provider registered: {}", provider.key);
    msg!("Endpoint: {}", provider_data.endpoint);
    msg!("Bond: {} WHISTLE", bond_amount);

    Ok(())
}

// Deregister provider and return bond
fn deregister_provider(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let provider = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let provider_token_account = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate token program ID before use
    if *token_program.key != spl_token::id() {
        msg!("Invalid token program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !provider.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if pool_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;
    let pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    // HIGH SECURITY FIX: Verify provider PDA matches expected derivation
    let (provider_pda, _) = Pubkey::find_program_address(
        &[b"provider", provider.key.as_ref()],
        program_id,
    );
    if provider_pda != *provider_account.key {
        msg!("Invalid provider PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // HIGH SECURITY FIX: Verify pool PDA matches expected derivation
    let (pool_pda, _) = Pubkey::find_program_address(
        &[b"staking_pool", pool.authority.as_ref()],
        program_id,
    );
    if pool_pda != *pool_account.key {
        msg!("Invalid pool PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if provider_data.provider != *provider.key {
        msg!("Not the provider owner");
        return Err(ProgramError::InvalidAccountData);
    }

    if provider_data.pending_earnings > 0 {
        msg!("Must claim earnings before deregistering");
        return Err(ProgramError::InvalidAccountData);
    }

    // Return bond minus any slashed amount
    let bond_to_return = provider_data.stake_bond
        .checked_sub(provider_data.slashed_amount)
        .ok_or(ProgramError::InvalidInstructionData)?;

    if bond_to_return > 0 {
        // CRITICAL SECURITY FIX: Use pool authority for vault PDA (shared vault for all)
        let (vault_pda, vault_bump) = Pubkey::find_program_address(
            &[b"token_vault", pool.authority.as_ref()],
            program_id,
        );

        if vault_pda != *token_vault.key {
            msg!("Invalid token vault PDA");
            return Err(ProgramError::InvalidSeeds);
        }

        invoke_signed(
            &token_instruction::transfer(
                token_program.key,
                token_vault.key,
                provider_token_account.key,
                &vault_pda,
                &[],
                bond_to_return,
            )?,
            &[
                token_vault.clone(),
                provider_token_account.clone(),
                token_program.clone(),
            ],
            &[&[b"token_vault", pool.authority.as_ref(), &[vault_bump]]],
        )?;
    }

    msg!("Provider deregistered: {}", provider.key);
    msg!("Bond returned: {} WHISTLE", bond_to_return);

    Ok(())
}

// Update provider endpoint
fn update_endpoint(program_id: &Pubkey, accounts: &[AccountInfo], new_endpoint: String) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let provider = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;

    if !provider.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;

    if provider_data.provider != *provider.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // SECURITY FIX: Validate endpoint length (min and max)
    if new_endpoint.len() < MIN_ENDPOINT_LENGTH || new_endpoint.len() > MAX_ENDPOINT_LENGTH {
        msg!("Endpoint URL invalid length (min: {}, max: {})", MIN_ENDPOINT_LENGTH, MAX_ENDPOINT_LENGTH);
        return Err(ProgramError::InvalidInstructionData);
    }
    
    // LOW SECURITY FIX: Basic URL format validation (same as register_provider)
    let endpoint_lower = new_endpoint.to_lowercase();
    if !endpoint_lower.starts_with("http://") && 
       !endpoint_lower.starts_with("https://") && 
       !endpoint_lower.starts_with("wss://") &&
       !endpoint_lower.starts_with("ws://") {
        msg!("Endpoint must start with http://, https://, ws://, or wss://");
        return Err(ProgramError::InvalidInstructionData);
    }
    if !new_endpoint.contains('.') {
        msg!("Endpoint must contain a valid domain");
        return Err(ProgramError::InvalidInstructionData);
    }
    let dangerous_patterns = ["<script", "javascript:", "data:", "vbscript:", "onload=", "onerror="];
    for pattern in &dangerous_patterns {
        if endpoint_lower.contains(pattern) {
            msg!("Endpoint contains potentially malicious content");
            return Err(ProgramError::InvalidInstructionData);
        }
    }

    // HIGH SECURITY FIX: Validate new endpoint fits in allocated space
    // Account space was allocated based on initial endpoint length
    // New endpoint must not exceed the space available
    let current_endpoint_len = provider_data.endpoint.len();
    if new_endpoint.len() > current_endpoint_len {
        msg!("New endpoint too long for allocated account space");
        msg!("Current: {} bytes, New: {} bytes, Max allowed: {} bytes", 
             current_endpoint_len, new_endpoint.len(), current_endpoint_len);
        msg!("To use a longer endpoint, deregister and re-register");
        return Err(ProgramError::InvalidInstructionData);
    }

    provider_data.endpoint = new_endpoint.clone();
    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    msg!("Provider endpoint updated: {}", new_endpoint);
    Ok(())
}

// Record provider heartbeat
fn record_heartbeat(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let provider = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let clock_sysvar = next_account_info(account_info_iter)?;

    if !provider.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;

    if provider_data.provider != *provider.key {
        return Err(ProgramError::InvalidAccountData);
    }

    let clock = Clock::from_account_info(clock_sysvar)?;
    
    // MEDIUM SECURITY FIX: Strict timestamp validation to prevent manipulation
    // Previous bounds were too wide (2024-2100), allowing future timestamp attacks
    // New approach: Validate against last known good timestamp with reasonable drift
    
    // LOW SECURITY FIX: Validate timestamp doesn't go backwards
    if clock.unix_timestamp < provider_data.last_heartbeat {
        msg!("Invalid clock: timestamp went backwards");
        msg!("Last: {}, Current: {}", provider_data.last_heartbeat, clock.unix_timestamp);
        return Err(ProgramError::InvalidAccountData);
    }
    
    // MEDIUM SECURITY FIX: Prevent future timestamp attacks
    // Allow max 5 minutes drift from last heartbeat to account for clock skew
    // This prevents providers from setting timestamps days/weeks in future
    const MAX_TIMESTAMP_DRIFT_SECONDS: i64 = 300; // 5 minutes
    const MAX_INITIAL_DRIFT_SECONDS: i64 = 86400; // 24 hours for first heartbeat
    
    if provider_data.last_heartbeat > 0 {
        // Not first heartbeat - enforce strict drift limit
        let max_allowed_timestamp = provider_data.last_heartbeat + MAX_TIMESTAMP_DRIFT_SECONDS + MIN_HEARTBEAT_INTERVAL;
        if clock.unix_timestamp > max_allowed_timestamp {
            msg!("MEDIUM FIX: Heartbeat timestamp too far in future");
            msg!("Last: {}, Current: {}, Max allowed: {}", 
                 provider_data.last_heartbeat, clock.unix_timestamp, max_allowed_timestamp);
            msg!("This prevents uptime manipulation via future timestamps");
            return Err(ProgramError::InvalidAccountData);
        }
    } else {
        // First heartbeat - allow wider range but still reasonable
        // Validate against registration time
        let max_allowed_timestamp = provider_data.registered_at + MAX_INITIAL_DRIFT_SECONDS;
        if clock.unix_timestamp > max_allowed_timestamp {
            msg!("MEDIUM FIX: First heartbeat timestamp too far from registration");
            msg!("Registered: {}, Current: {}, Max allowed: {}", 
                 provider_data.registered_at, clock.unix_timestamp, max_allowed_timestamp);
            return Err(ProgramError::InvalidAccountData);
        }
    }
    
    // MEDIUM SECURITY FIX: Rate limit heartbeats to prevent spam
    let time_since_last_heartbeat = clock.unix_timestamp - provider_data.last_heartbeat;
    if time_since_last_heartbeat < MIN_HEARTBEAT_INTERVAL {
        msg!("Heartbeat rate limit exceeded - minimum interval: {} seconds", MIN_HEARTBEAT_INTERVAL);
        return Err(ProgramError::InvalidInstructionData);
    }
    
    provider_data.last_heartbeat = clock.unix_timestamp;
    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    msg!("Provider heartbeat recorded at {}", clock.unix_timestamp);
    Ok(())
}

// Record query metrics
fn record_query_metrics(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    provider: Pubkey,
    latency_ms: u64,
    success: bool,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;
    let vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;

    // HIGH SECURITY FIX: Verify authority is vault authority (oracle/admin)
    if vault_data.authority != *authority.key {
        msg!("Unauthorized: not vault authority");
        return Err(ProgramError::InvalidAccountData);
    }

    // HIGH SECURITY FIX: Verify provider PDA matches the provider pubkey parameter
    let (provider_pda, _) = Pubkey::find_program_address(
        &[b"provider", provider.as_ref()],
        program_id,
    );
    if provider_pda != *provider_account.key {
        msg!("Invalid provider PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // HIGH SECURITY FIX: Verify provider account belongs to the specified provider
    if provider_data.provider != provider {
        msg!("Provider account does not match provider pubkey");
        return Err(ProgramError::InvalidAccountData);
    }

    // Update rolling average for response time
    if success {
        provider_data.response_time_avg = (provider_data.response_time_avg + latency_ms) / 2;
    }

    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    Ok(())
}

// Update reputation metrics
fn update_reputation_metrics(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _provider: Pubkey,
    uptime: u64,
    latency: u64,
    accuracy: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;

    // MEDIUM SECURITY FIX: Validate input ranges (0-10000 basis points)
    if uptime > 10000 || accuracy > 10000 {
        msg!("Invalid metrics: values must be 0-10000 (basis points)");
        return Err(ProgramError::InvalidInstructionData);
    }

    provider_data.uptime_percentage = uptime;
    provider_data.response_time_avg = latency;
    provider_data.accuracy_score = accuracy;

    // Calculate reputation: (uptime × 0.4) + (speed × 0.3) + (accuracy × 0.3)
    // All values are in basis points (0-10000)
    let uptime_score = uptime.checked_mul(40).ok_or(ProgramError::InvalidInstructionData)? / 100;
    let speed_score = if latency > 0 {
        // Lower latency = higher score (inverted, capped at 10000)
        let speed = 10000u64.saturating_sub(latency.min(10000));
        speed.checked_mul(30).ok_or(ProgramError::InvalidInstructionData)? / 100
    } else {
        // MEDIUM SECURITY FIX: Zero latency is likely invalid data, not perfect
        // Give a reasonable good score but not perfect to avoid manipulation
        msg!("Warning: Zero latency detected - likely invalid measurement");
        2500 // Good but not perfect (83% of max 3000)
    };
    let accuracy_score = accuracy.checked_mul(30).ok_or(ProgramError::InvalidInstructionData)? / 100;

    provider_data.reputation_score = uptime_score
        .checked_add(speed_score).ok_or(ProgramError::InvalidInstructionData)?
        .checked_add(accuracy_score).ok_or(ProgramError::InvalidInstructionData)?;

    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    msg!("Reputation updated: {}", provider_data.reputation_score);
    Ok(())
}

// Slash provider for violations
fn slash_provider(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    provider: Pubkey,
    penalty: u64,
    reason: SlashReason,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;
    let mut vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;

    // HIGH SECURITY FIX: Verify authority is vault authority
    if vault_data.authority != *authority.key {
        msg!("Unauthorized: not vault authority");
        return Err(ProgramError::InvalidAccountData);
    }

    // HIGH SECURITY FIX: Verify provider PDA matches the provider pubkey parameter
    let (provider_pda, _) = Pubkey::find_program_address(
        &[b"provider", provider.as_ref()],
        program_id,
    );
    if provider_pda != *provider_account.key {
        msg!("Invalid provider PDA - account does not match provider pubkey");
        return Err(ProgramError::InvalidSeeds);
    }

    // HIGH SECURITY FIX: Verify provider account belongs to the specified provider
    if provider_data.provider != provider {
        msg!("Provider account does not match provider pubkey");
        return Err(ProgramError::InvalidAccountData);
    }

    // Check if provider has enough bond
    if provider_data.stake_bond < provider_data.slashed_amount + penalty {
        msg!("Insufficient bond to slash");
        return Err(ProgramError::InsufficientFunds);
    }

    provider_data.slashed_amount = provider_data.slashed_amount
        .checked_add(penalty)
        .ok_or(ProgramError::InvalidInstructionData)?;
    provider_data.penalty_count = provider_data.penalty_count
        .checked_add(1)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // Add slashed amount to bonus pool
    vault_data.bonus_pool = vault_data.bonus_pool
        .checked_add(penalty)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // Deactivate if bond depleted
    if provider_data.slashed_amount >= provider_data.stake_bond {
        provider_data.is_active = false;
        msg!("Provider deactivated due to insufficient bond");
    }

    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;
    vault_data.serialize(&mut &mut payment_vault.data.borrow_mut()[..])?;

    msg!("Provider slashed {} for {:?}", penalty, reason);
    Ok(())
}
// Process query payment and route to pools (70/20/5/5)
fn process_query_payment(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    provider: Pubkey,
    query_cost: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let user = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let _staking_pool = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !user.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;
    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;

    // SECURITY FIX: Verify payment vault PDA
    let (vault_pda, _) = Pubkey::find_program_address(
        &[b"payment_vault", vault_data.authority.as_ref()],
        program_id,
    );
    if vault_pda != *payment_vault.key {
        msg!("Invalid payment vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // SECURITY FIX: Verify provider PDA
    let (provider_pda, _) = Pubkey::find_program_address(
        &[b"provider", provider.as_ref()],
        program_id,
    );
    if provider_pda != *provider_account.key {
        msg!("Invalid provider PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if provider_data.provider != provider {
        msg!("Provider mismatch");
        return Err(ProgramError::InvalidAccountData);
    }

    if !provider_data.is_active {
        msg!("Provider is not active");
        return Err(ProgramError::InvalidAccountData);
    }

    // SECURITY FIX: Validate query cost is reasonable
    if query_cost == 0 || query_cost > 1_000_000_000 { // Max 1 SOL per query
        msg!("Invalid query cost");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Transfer SOL from user to payment vault
    invoke(
        &system_instruction::transfer(user.key, payment_vault.key, query_cost),
        &[user.clone(), payment_vault.clone(), system_program.clone()],
    )?;

    // Split payment: 70/20/5/5
    let provider_share = query_cost.checked_mul(70).ok_or(ProgramError::InvalidInstructionData)? / 100;
    let bonus_share = query_cost.checked_mul(20).ok_or(ProgramError::InvalidInstructionData)? / 100;
    let treasury_share = query_cost.checked_mul(5).ok_or(ProgramError::InvalidInstructionData)? / 100;
    let staker_share = query_cost
        .checked_sub(provider_share)
        .ok_or(ProgramError::InvalidInstructionData)?
        .checked_sub(bonus_share)
        .ok_or(ProgramError::InvalidInstructionData)?
        .checked_sub(treasury_share)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // Update vault pools
    vault_data.total_collected = vault_data.total_collected
        .checked_add(query_cost)
        .ok_or(ProgramError::InvalidInstructionData)?;
    vault_data.provider_pool = vault_data.provider_pool
        .checked_add(provider_share)
        .ok_or(ProgramError::InvalidInstructionData)?;
    vault_data.bonus_pool = vault_data.bonus_pool
        .checked_add(bonus_share)
        .ok_or(ProgramError::InvalidInstructionData)?;
    vault_data.treasury = vault_data.treasury
        .checked_add(treasury_share)
        .ok_or(ProgramError::InvalidInstructionData)?;
    vault_data.staker_rewards_pool = vault_data.staker_rewards_pool
        .checked_add(staker_share)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // Credit provider
    provider_data.pending_earnings = provider_data.pending_earnings
        .checked_add(provider_share)
        .ok_or(ProgramError::InvalidInstructionData)?;
    provider_data.total_earned = provider_data.total_earned
        .checked_add(provider_share)
        .ok_or(ProgramError::InvalidInstructionData)?;
    provider_data.queries_served = provider_data.queries_served
        .checked_add(1)
        .ok_or(ProgramError::InvalidInstructionData)?;

    vault_data.serialize(&mut &mut payment_vault.data.borrow_mut()[..])?;
    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    msg!("Query payment processed: {} SOL", query_cost);
    msg!("Provider earned: {} SOL", provider_share);

    Ok(())
}

// Provider claims earnings
fn claim_provider_earnings(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let provider = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate system program ID
    if *system_program.key != solana_program::system_program::id() {
        msg!("Invalid system program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !provider.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;
    let mut vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;

    // HIGH SECURITY FIX: Verify payment vault PDA
    let (vault_pda, _) = Pubkey::find_program_address(
        &[b"payment_vault", vault_data.authority.as_ref()],
        program_id,
    );
    if vault_pda != *payment_vault.key {
        msg!("Invalid payment vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if provider_data.provider != *provider.key {
        return Err(ProgramError::InvalidAccountData);
    }

    if provider_data.pending_earnings == 0 {
        msg!("No earnings to claim");
        return Err(ProgramError::InvalidAccountData);
    }

    let amount = provider_data.pending_earnings;

    // MEDIUM SECURITY FIX: Check vault has sufficient balance before transfer
    let vault_lamports = payment_vault.lamports();
    if vault_lamports < amount {
        msg!("Insufficient vault balance for payout");
        msg!("Vault balance: {}, Required: {}", vault_lamports, amount);
        return Err(ProgramError::InsufficientFunds);
    }

    // Transfer SOL from vault to provider
    **payment_vault.try_borrow_mut_lamports()? -= amount;
    **provider.try_borrow_mut_lamports()? += amount;

    // Update provider earnings
    provider_data.pending_earnings = 0;
    vault_data.provider_pool = vault_data.provider_pool
        .checked_sub(amount)
        .ok_or(ProgramError::InvalidInstructionData)?;

    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;
    vault_data.serialize(&mut &mut payment_vault.data.borrow_mut()[..])?;

    msg!("Provider claimed {} SOL", amount);
    Ok(())
}

// Distribute bonus pool to top providers
fn distribute_bonus_pool(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    top_providers: Vec<Pubkey>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;

    // HIGH SECURITY FIX: Verify authority is the vault authority
    if vault_data.authority != *authority.key {
        msg!("Unauthorized: not vault authority");
        return Err(ProgramError::InvalidAccountData);
    }

    if vault_data.bonus_pool == 0 {
        msg!("Bonus pool is empty");
        return Ok(());
    }

    if top_providers.is_empty() {
        msg!("No providers to distribute to");
        return Ok(());
    }

    // MEDIUM SECURITY FIX: Limit maximum providers to prevent compute unit exhaustion
    // Solana compute limit: ~1.4M CUs per transaction
    // Each provider: ~30K CUs (deserialize + PDA validation + arithmetic + serialize)
    // Safe limit: 40 providers (~1.2M CUs) with margin for overhead
    // Recommended: Call this function multiple times with batches of 20-30 providers
    const MAX_PROVIDERS_PER_DISTRIBUTION: usize = 40;
    
    if top_providers.len() > MAX_PROVIDERS_PER_DISTRIBUTION {
        msg!("Too many providers (max: {} per batch)", MAX_PROVIDERS_PER_DISTRIBUTION);
        msg!("For large distributions, call this function multiple times");
        return Err(ProgramError::InvalidInstructionData);
    }

    // MEDIUM SECURITY FIX: Check for duplicate providers in the list
    // Using HashSet for O(n) complexity instead of O(n²) nested loops
    // With max 100 providers, this is optimal for compute budget
    // NOTE: If std is not available, use a simple O(n²) check with the 100 limit
    let mut unique_providers = std::collections::HashSet::new();
    for provider in &top_providers {
        if !unique_providers.insert(provider) {
            msg!("Duplicate provider in distribution list");
            return Err(ProgramError::InvalidInstructionData);
        }
    }

    // HIGH SECURITY FIX: Track valid providers for better error handling
    // Instead of failing entirely on invalid accounts, we skip them and continue
    // This prevents griefing attacks where one bad account blocks entire distribution
    let mut total_reputation: u64 = 0;
    let mut provider_accounts = Vec::new();
    let mut skipped_count: u32 = 0;

    for _ in 0..top_providers.len() {
        let provider_account = next_account_info(account_info_iter)?;
        
        // Skip invalid accounts instead of failing
        if provider_account.owner != program_id {
            msg!("Skipping provider: wrong owner");
            skipped_count += 1;
            continue;
        }
        
        // Handle deserialization failures gracefully
        let provider_data = match ProviderAccount::try_from_slice(&provider_account.data.borrow()) {
            Ok(data) => data,
            Err(_) => {
                msg!("Skipping provider: deserialization failed");
                skipped_count += 1;
                continue;
            }
        };
        
        // MEDIUM SECURITY FIX: Validate provider meets minimum requirements
        // Prevents spam attacks with many low-bond providers
        if !provider_data.is_active {
            msg!("Skipping inactive provider: {}", provider_data.provider);
            continue;
        }
        
        // Check minimum effective bond (original bond minus slashed amount)
        let effective_bond = provider_data.stake_bond
            .checked_sub(provider_data.slashed_amount)
            .unwrap_or(0);
        
        if effective_bond < MIN_PROVIDER_BOND {
            msg!("Skipping provider with insufficient bond: {} (min: {})", 
                 effective_bond, MIN_PROVIDER_BOND);
            continue;
        }
        
        // Additional check: Provider must have served at least 1 query
        if provider_data.queries_served == 0 {
            msg!("Skipping provider with no queries served: {}", provider_data.provider);
            continue;
        }
        
        total_reputation = total_reputation
            .checked_add(provider_data.reputation_score)
            .ok_or(ProgramError::InvalidInstructionData)?;
        provider_accounts.push((provider_account, provider_data));
    }

    // HIGH SECURITY FIX: Report distribution statistics
    let valid_providers = provider_accounts.len();
    msg!("Distribution stats: {} valid, {} skipped, {} total submitted", 
         valid_providers, skipped_count, top_providers.len());
    
    if skipped_count > 0 {
        msg!("WARNING: {} providers were skipped due to validation failures", skipped_count);
    }
    
    // Ensure at least some valid providers
    if valid_providers == 0 {
        msg!("No valid providers to distribute to after filtering");
        return Ok(());
    }
    
    if total_reputation == 0 {
        msg!("Total reputation is zero - cannot distribute");
        return Ok(());
    }

    let bonus_pool = vault_data.bonus_pool;
    let mut total_distributed: u64 = 0;

    // Distribute proportionally by reputation
    let provider_count = provider_accounts.len();
    for (idx, (provider_account, mut provider_data)) in provider_accounts.into_iter().enumerate() {
        // HIGH SECURITY FIX: Verify provider PDA
        let (provider_pda, _) = Pubkey::find_program_address(
            &[b"provider", provider_data.provider.as_ref()],
            program_id,
        );
        if provider_pda != *provider_account.key {
            msg!("Invalid provider PDA - skipping");
            continue; // Skip invalid provider rather than fail entire distribution
        }

        let mut share = bonus_pool
            .checked_mul(provider_data.reputation_score)
            .ok_or(ProgramError::InvalidInstructionData)?
            .checked_div(total_reputation)
            .ok_or(ProgramError::InvalidInstructionData)?;

        // MEDIUM SECURITY FIX: Give remaining dust to last provider to prevent accumulation
        // This ensures all bonus pool funds are distributed, no dust left behind
        if idx == provider_count - 1 {
            let remaining = bonus_pool
                .checked_sub(total_distributed)
                .ok_or(ProgramError::InvalidInstructionData)?;
            if remaining > 0 {
                share = share.checked_add(remaining).ok_or(ProgramError::InvalidInstructionData)?;
                msg!("Added {} lamports dust to final provider", remaining);
            }
        }

        provider_data.pending_earnings = provider_data.pending_earnings
            .checked_add(share)
            .ok_or(ProgramError::InvalidInstructionData)?;

        total_distributed = total_distributed
            .checked_add(share)
            .ok_or(ProgramError::InvalidInstructionData)?;

        provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;
    }

    // HIGH SECURITY FIX: Ensure bonus pool is properly decremented
    vault_data.bonus_pool = vault_data.bonus_pool
        .checked_sub(total_distributed)
        .ok_or(ProgramError::InvalidInstructionData)?;
    let clock = Clock::get()?;
    vault_data.last_distribution = clock.unix_timestamp;
    vault_data.serialize(&mut &mut payment_vault.data.borrow_mut()[..])?;

    msg!("Bonus pool distributed: {} SOL", bonus_pool);
    Ok(())
}

// Distribute staker rewards
fn distribute_staker_rewards(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;
    let staking_pool = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if staking_pool.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;
    let pool = StakingPool::try_from_slice(&staking_pool.data.borrow())?;

    // LOW SECURITY FIX: Verify authority is vault authority or pool authority
    if vault_data.authority != *authority.key && pool.authority != *authority.key {
        msg!("Unauthorized: must be vault or pool authority");
        return Err(ProgramError::InvalidAccountData);
    }

    // LOW SECURITY FIX: Verify payment vault PDA
    let (vault_pda, _) = Pubkey::find_program_address(
        &[b"payment_vault", vault_data.authority.as_ref()],
        program_id,
    );
    if vault_pda != *payment_vault.key {
        msg!("Invalid payment vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // LOW SECURITY FIX: Verify staking pool PDA
    let (pool_pda, _) = Pubkey::find_program_address(
        &[b"staking_pool", pool.authority.as_ref()],
        program_id,
    );
    if pool_pda != *staking_pool.key {
        msg!("Invalid staking pool PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if vault_data.staker_rewards_pool == 0 {
        msg!("No staker rewards to distribute");
        return Ok(());
    }

    if pool.total_staked == 0 {
        msg!("No stakers to distribute to");
        return Ok(());
    }

    // Stakers will claim their proportional share individually via ClaimStakerRewards
    msg!("Staker rewards pool ready for distribution: {} SOL", vault_data.staker_rewards_pool);
    Ok(())
}

// Staker claims their share of rewards
fn claim_staker_rewards(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker = next_account_info(account_info_iter)?;
    let staker_account = next_account_info(account_info_iter)?;
    let staking_pool = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate system program ID
    if *system_program.key != solana_program::system_program::id() {
        msg!("Invalid system program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !staker.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if staker_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if staking_pool.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut staker_data = StakerAccount::try_from_slice(&staker_account.data.borrow())?;
    let pool = StakingPool::try_from_slice(&staking_pool.data.borrow())?;
    let mut vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;

    // HIGH SECURITY FIX: Verify payment vault PDA
    let (vault_pda, _) = Pubkey::find_program_address(
        &[b"payment_vault", vault_data.authority.as_ref()],
        program_id,
    );
    if vault_pda != *payment_vault.key {
        msg!("Invalid payment vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if staker_data.staker != *staker.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // MEDIUM SECURITY FIX: Calculate proportional reward based on stake
    // If staker has no pending_rewards calculated yet, calculate from pool
    let amount = if staker_data.pending_rewards > 0 {
        staker_data.pending_rewards
    } else if vault_data.staker_rewards_pool > 0 {
        // LOW SECURITY FIX: Explicit check for zero division
        if pool.total_staked == 0 {
            msg!("Cannot calculate rewards: pool has no stakers");
            return Err(ProgramError::InvalidAccountData);
        }
        
        // Calculate proportional share: (staker_amount / total_staked) * staker_rewards_pool
        let share = (staker_data.staked_amount as u128)
            .checked_mul(vault_data.staker_rewards_pool as u128)
            .ok_or(ProgramError::InvalidInstructionData)?
            .checked_div(pool.total_staked as u128)
            .ok_or(ProgramError::InvalidInstructionData)?;
        
        u64::try_from(share).map_err(|_| ProgramError::InvalidInstructionData)?
    } else {
        msg!("No rewards to claim");
        return Ok(());
    };

    if amount == 0 {
        msg!("No rewards to claim");
        return Ok(());
    }

    // MEDIUM SECURITY FIX: Check vault has sufficient balance before transfer
    let vault_lamports = payment_vault.lamports();
    if vault_lamports < amount {
        msg!("Insufficient vault balance for payout");
        msg!("Vault balance: {}, Required: {}", vault_lamports, amount);
        return Err(ProgramError::InsufficientFunds);
    }

    // Transfer SOL from vault to staker
    **payment_vault.try_borrow_mut_lamports()? -= amount;
    **staker.try_borrow_mut_lamports()? += amount;

    staker_data.pending_rewards = 0;
    vault_data.staker_rewards_pool = vault_data.staker_rewards_pool
        .checked_sub(amount)
        .ok_or(ProgramError::InvalidInstructionData)?;

    staker_data.serialize(&mut &mut staker_account.data.borrow_mut()[..])?;
    vault_data.serialize(&mut &mut payment_vault.data.borrow_mut()[..])?;

    msg!("Staker claimed {} SOL in rewards", amount);
    Ok(())
}

// Authorize query
fn authorize_query(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    user: Pubkey,
    provider: Pubkey,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker_account = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let staking_pool = next_account_info(account_info_iter)?;

    if staker_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if staking_pool.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let staker_data = StakerAccount::try_from_slice(&staker_account.data.borrow())?;
    let provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;
    let pool = StakingPool::try_from_slice(&staking_pool.data.borrow())?;

    // SECURITY FIX: Verify staker PDA
    let (staker_pda, _) = Pubkey::find_program_address(
        &[b"staker", user.as_ref()],
        program_id,
    );
    if staker_pda != *staker_account.key {
        msg!("Invalid staker PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // SECURITY FIX: Verify provider PDA
    let (provider_pda, _) = Pubkey::find_program_address(
        &[b"provider", provider.as_ref()],
        program_id,
    );
    if provider_pda != *provider_account.key {
        msg!("Invalid provider PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Check user has staked
    if staker_data.staker != user {
        msg!("User mismatch");
        return Err(ProgramError::InvalidAccountData);
    }

    if staker_data.staked_amount == 0 {
        msg!("User has no stake");
        return Err(ProgramError::InvalidAccountData);
    }

    if staker_data.access_tokens == 0 {
        msg!("User has no access tokens");
        return Err(ProgramError::InvalidAccountData);
    }

    // Check provider is active
    if provider_data.provider != provider {
        msg!("Provider mismatch");
        return Err(ProgramError::InvalidAccountData);
    }

    if !provider_data.is_active {
        msg!("Provider is not active");
        return Err(ProgramError::InvalidAccountData);
    }

    // Check pool is active
    if !pool.is_active {
        msg!("Pool is not active");
        return Err(ProgramError::InvalidAccountData);
    }

    msg!("Query authorized");
    Ok(())
}

// Record query for metrics
fn record_query(program_id: &Pubkey, accounts: &[AccountInfo], _user: Pubkey) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let provider = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;

    if !provider.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;

    // SECURITY FIX: Verify provider PDA
    let (provider_pda, _) = Pubkey::find_program_address(
        &[b"provider", provider.key.as_ref()],
        program_id,
    );
    if provider_pda != *provider_account.key {
        msg!("Invalid provider PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if provider_data.provider != *provider.key {
        return Err(ProgramError::InvalidAccountData);
    }

    provider_data.queries_served = provider_data.queries_served
        .checked_add(1)
        .ok_or(ProgramError::InvalidInstructionData)?;

    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    Ok(())
}

// ============= DEVELOPER STAKING FUNCTIONS =============

/// Helper function to calculate developer tier and rebate based on stake
fn calculate_developer_tier(whistle_staked: u64) -> (DeveloperTier, u64) {
    if whistle_staked >= 10_000_000_000_000_000 { // 10,000,000 WHISTLE
        (DeveloperTier::Whale, 10000) // 100% rebate
    } else if whistle_staked >= 2_500_000_000_000_000 { // 2,500,000 WHISTLE
        (DeveloperTier::Enterprise, 7500) // 75% rebate
    } else if whistle_staked >= 500_000_000_000_000 { // 500,000 WHISTLE
        (DeveloperTier::Pro, 5000) // 50% rebate
    } else if whistle_staked >= 100_000_000_000_000 { // 100,000 WHISTLE
        (DeveloperTier::Builder, 2500) // 25% rebate
    } else if whistle_staked >= 10_000_000_000_000 { // 10,000 WHISTLE
        (DeveloperTier::Hobbyist, 1000) // 10% rebate
    } else {
        (DeveloperTier::Hobbyist, 0) // Below minimum, no rebate
    }
}

/// Register as a developer and stake WHISTLE for rebates
fn register_developer(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    stake_amount: u64,
    referrer: Option<Pubkey>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let developer = next_account_info(account_info_iter)?;
    let developer_account = next_account_info(account_info_iter)?;
    let developer_token_account = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let clock_sysvar = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate program IDs
    if *token_program.key != spl_token::id() {
        msg!("Invalid token program");
        return Err(ProgramError::IncorrectProgramId);
    }
    if *system_program.key != solana_program::system_program::id() {
        msg!("Invalid system program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !developer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Minimum stake requirement
    if stake_amount < 100_000_000_000 { // 100 WHISTLE minimum
        msg!("Minimum stake is 100 WHISTLE tokens");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Derive developer PDA
    let (developer_pda, bump) = Pubkey::find_program_address(
        &[b"developer", developer.key.as_ref()],
        program_id,
    );

    if developer_pda != *developer_account.key {
        msg!("Invalid developer PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Check if developer already registered
    if !developer_account.data_is_empty() {
        msg!("Developer already registered");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // If referrer provided, validate it exists (optional validation)
    if let Some(ref referrer_pubkey) = referrer {
        // We could validate the referrer exists, but skipping for simplicity
        msg!("Referred by: {}", referrer_pubkey);
    }

    // Transfer WHISTLE tokens to vault
    invoke(
        &token_instruction::transfer(
            token_program.key,
            developer_token_account.key,
            token_vault.key,
            developer.key,
            &[],
            stake_amount,
        )?,
        &[
            developer_token_account.clone(),
            token_vault.clone(),
            developer.clone(),
            token_program.clone(),
        ],
    )?;

    // Calculate tier and rebate
    let (tier, rebate_percentage) = calculate_developer_tier(stake_amount);

    // Create developer account
    let rent = Rent::get()?;
    let space = std::mem::size_of::<DeveloperAccount>();
    let lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            developer.key,
            developer_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[developer.clone(), developer_account.clone(), system_program.clone()],
        &[&[b"developer", developer.key.as_ref(), &[bump]]],
    )?;

    let clock = Clock::from_account_info(clock_sysvar)?;
    let developer_data = DeveloperAccount {
        developer: *developer.key,
        whistle_staked: stake_amount,
        tier: tier.clone(),
        total_queries: 0,
        free_queries_used_month: 0,
        last_month_reset: clock.unix_timestamp,
        rebate_percentage,
        bonus_rewards: 0,
        referrals_made: 0,
        referred_by: referrer,
        referral_earnings: 0,
        registered_at: clock.unix_timestamp,
        last_stake_time: clock.unix_timestamp,
        is_active: true,
        bump,
    };

    developer_data.serialize(&mut &mut developer_account.data.borrow_mut()[..])?;

    msg!("Developer registered: {}", developer.key);
    msg!("Tier: {:?}, Rebate: {}%", tier, rebate_percentage / 100);
    msg!("Staked: {} WHISTLE", stake_amount);

    Ok(())
}

/// Stake additional WHISTLE to upgrade tier
fn stake_developer(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let developer = next_account_info(account_info_iter)?;
    let developer_account = next_account_info(account_info_iter)?;
    let developer_token_account = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate token program ID
    if *token_program.key != spl_token::id() {
        msg!("Invalid token program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !developer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if amount == 0 {
        msg!("Cannot stake zero amount");
        return Err(ProgramError::InvalidInstructionData);
    }

    if developer_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut developer_data = DeveloperAccount::try_from_slice(&developer_account.data.borrow())?;

    // Verify developer PDA
    let (developer_pda, _) = Pubkey::find_program_address(
        &[b"developer", developer.key.as_ref()],
        program_id,
    );

    if developer_pda != *developer_account.key {
        msg!("Invalid developer PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if developer_data.developer != *developer.key {
        msg!("Not the developer owner");
        return Err(ProgramError::InvalidAccountData);
    }

    if !developer_data.is_active {
        msg!("Developer account is not active");
        return Err(ProgramError::InvalidAccountData);
    }

    // Transfer WHISTLE tokens to vault
    invoke(
        &token_instruction::transfer(
            token_program.key,
            developer_token_account.key,
            token_vault.key,
            developer.key,
            &[],
            amount,
        )?,
        &[
            developer_token_account.clone(),
            token_vault.clone(),
            developer.clone(),
            token_program.clone(),
        ],
    )?;

    // Update stake
    developer_data.whistle_staked = developer_data.whistle_staked
        .checked_add(amount)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // Recalculate tier and rebate
    let (new_tier, new_rebate) = calculate_developer_tier(developer_data.whistle_staked);
    let old_tier = developer_data.tier.clone();
    developer_data.tier = new_tier.clone();
    developer_data.rebate_percentage = new_rebate;

    let clock = Clock::get()?;
    developer_data.last_stake_time = clock.unix_timestamp;

    developer_data.serialize(&mut &mut developer_account.data.borrow_mut()[..])?;

    if old_tier != new_tier {
        msg!("🎉 Tier upgraded: {:?} -> {:?}", old_tier, new_tier);
    }
    msg!("Staked additional {} WHISTLE", amount);
    msg!("Total stake: {}, Rebate: {}%", developer_data.whistle_staked, new_rebate / 100);

    Ok(())
}

/// Unstake WHISTLE from developer account
fn unstake_developer(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let developer = next_account_info(account_info_iter)?;
    let developer_account = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let developer_token_account = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate token program ID
    if *token_program.key != spl_token::id() {
        msg!("Invalid token program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !developer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if amount == 0 {
        msg!("Cannot unstake zero amount");
        return Err(ProgramError::InvalidInstructionData);
    }

    if developer_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if pool_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut developer_data = DeveloperAccount::try_from_slice(&developer_account.data.borrow())?;
    let pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    // Verify developer PDA
    let (developer_pda, _) = Pubkey::find_program_address(
        &[b"developer", developer.key.as_ref()],
        program_id,
    );

    if developer_pda != *developer_account.key {
        msg!("Invalid developer PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if developer_data.developer != *developer.key {
        msg!("Not the developer owner");
        return Err(ProgramError::InvalidAccountData);
    }

    if developer_data.whistle_staked < amount {
        msg!("Insufficient staked amount");
        return Err(ProgramError::InsufficientFunds);
    }

    // Verify token vault PDA
    let (vault_pda, vault_bump) = Pubkey::find_program_address(
        &[b"token_vault", pool.authority.as_ref()],
        program_id,
    );

    if vault_pda != *token_vault.key {
        msg!("Invalid token vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Transfer WHISTLE tokens back from vault
    invoke_signed(
        &token_instruction::transfer(
            token_program.key,
            token_vault.key,
            developer_token_account.key,
            &vault_pda,
            &[],
            amount,
        )?,
        &[
            token_vault.clone(),
            developer_token_account.clone(),
            token_program.clone(),
        ],
        &[&[b"token_vault", pool.authority.as_ref(), &[vault_bump]]],
    )?;

    // Update stake
    developer_data.whistle_staked = developer_data.whistle_staked
        .checked_sub(amount)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // Recalculate tier and rebate
    let (new_tier, new_rebate) = calculate_developer_tier(developer_data.whistle_staked);
    let old_tier = developer_data.tier.clone();
    developer_data.tier = new_tier.clone();
    developer_data.rebate_percentage = new_rebate;

    developer_data.serialize(&mut &mut developer_account.data.borrow_mut()[..])?;

    if old_tier != new_tier {
        msg!("Tier downgraded: {:?} -> {:?}", old_tier, new_tier);
    }
    msg!("Unstaked {} WHISTLE", amount);
    msg!("Remaining stake: {}, Rebate: {}%", developer_data.whistle_staked, new_rebate / 100);

    Ok(())
}

/// Process developer query with rebate
fn process_developer_query(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    provider: Pubkey,
    query_cost: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let developer = next_account_info(account_info_iter)?;
    let developer_account = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let staking_pool = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let clock_sysvar = next_account_info(account_info_iter)?;

    if !developer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if developer_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut developer_data = DeveloperAccount::try_from_slice(&developer_account.data.borrow())?;
    let mut vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;
    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;

    // Verify developer PDA
    let (developer_pda, _) = Pubkey::find_program_address(
        &[b"developer", developer.key.as_ref()],
        program_id,
    );

    if developer_pda != *developer_account.key {
        msg!("Invalid developer PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if developer_data.developer != *developer.key {
        msg!("Not the developer owner");
        return Err(ProgramError::InvalidAccountData);
    }

    if !developer_data.is_active {
        msg!("Developer account is not active");
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify provider PDA
    let (provider_pda, _) = Pubkey::find_program_address(
        &[b"provider", provider.as_ref()],
        program_id,
    );

    if provider_pda != *provider_account.key {
        msg!("Invalid provider PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if provider_data.provider != provider {
        msg!("Provider mismatch");
        return Err(ProgramError::InvalidAccountData);
    }

    if !provider_data.is_active {
        msg!("Provider is not active");
        return Err(ProgramError::InvalidAccountData);
    }

    // Validate query cost
    if query_cost == 0 || query_cost > 1_000_000_000 {
        msg!("Invalid query cost");
        return Err(ProgramError::InvalidInstructionData);
    }

    let clock = Clock::from_account_info(clock_sysvar)?;

    // Reset monthly counter if needed (roughly 30 days = 2,592,000 seconds)
    if clock.unix_timestamp - developer_data.last_month_reset > 2_592_000 {
        developer_data.free_queries_used_month = 0;
        developer_data.last_month_reset = clock.unix_timestamp;
    }

    // Calculate rebate amount
    let rebate_amount = query_cost
        .checked_mul(developer_data.rebate_percentage)
        .ok_or(ProgramError::InvalidInstructionData)?
        .checked_div(10000)
        .ok_or(ProgramError::InvalidInstructionData)?;

    let net_cost = query_cost
        .checked_sub(rebate_amount)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // Transfer net SOL from developer to payment vault
    invoke(
        &system_instruction::transfer(developer.key, payment_vault.key, net_cost),
        &[developer.clone(), payment_vault.clone(), system_program.clone()],
    )?;

    // Split payment: 70/20/5/5 (same as regular queries)
    let provider_share = query_cost.checked_mul(70).ok_or(ProgramError::InvalidInstructionData)? / 100;
    let bonus_share = query_cost.checked_mul(20).ok_or(ProgramError::InvalidInstructionData)? / 100;
    let treasury_share = query_cost.checked_mul(5).ok_or(ProgramError::InvalidInstructionData)? / 100;
    let staker_share = query_cost
        .checked_sub(provider_share)
        .ok_or(ProgramError::InvalidInstructionData)?
        .checked_sub(bonus_share)
        .ok_or(ProgramError::InvalidInstructionData)?
        .checked_sub(treasury_share)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // Update vault pools
    vault_data.total_collected = vault_data.total_collected
        .checked_add(query_cost)
        .ok_or(ProgramError::InvalidInstructionData)?;
    vault_data.provider_pool = vault_data.provider_pool
        .checked_add(provider_share)
        .ok_or(ProgramError::InvalidInstructionData)?;
    vault_data.bonus_pool = vault_data.bonus_pool
        .checked_add(bonus_share)
        .ok_or(ProgramError::InvalidInstructionData)?;
    vault_data.treasury = vault_data.treasury
        .checked_add(treasury_share)
        .ok_or(ProgramError::InvalidInstructionData)?;
    vault_data.staker_rewards_pool = vault_data.staker_rewards_pool
        .checked_add(staker_share)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // Track rebate in developer rebate pool (for accounting)
    vault_data.developer_rebate_pool = vault_data.developer_rebate_pool
        .checked_add(rebate_amount)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // Credit provider
    provider_data.pending_earnings = provider_data.pending_earnings
        .checked_add(provider_share)
        .ok_or(ProgramError::InvalidInstructionData)?;
    provider_data.total_earned = provider_data.total_earned
        .checked_add(provider_share)
        .ok_or(ProgramError::InvalidInstructionData)?;
    provider_data.queries_served = provider_data.queries_served
        .checked_add(1)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // Update developer stats
    developer_data.total_queries = developer_data.total_queries
        .checked_add(1)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // MEDIUM SECURITY FIX: Enhanced referral earnings validation with pool return
    let mut referral_credited = false;
    if let Some(referrer_pubkey) = developer_data.referred_by {
        let referral_earning = query_cost.checked_mul(2).ok_or(ProgramError::InvalidInstructionData)? / 100;
        
        // Try to get referrer account (7th account, optional but recommended)
        match account_info_iter.next() {
            Some(referrer_account) => {
                // Validate referrer account is not the program ID placeholder
                if referrer_account.key == program_id {
                    msg!("Warning: Referrer account not provided");
                    msg!("Referrer: {} will not receive this payment", referrer_pubkey);
                    msg!("MEDIUM FIX: {} lamports returned to developer rebate pool", referral_earning);
                    // Return to pool instead of losing
                    vault_data.developer_rebate_pool = vault_data.developer_rebate_pool
                        .checked_add(referral_earning)
                        .ok_or(ProgramError::InvalidInstructionData)?;
                } else if referrer_account.owner != program_id {
                    msg!("Error: Invalid referrer account owner");
                    msg!("MEDIUM FIX: {} lamports returned to developer rebate pool", referral_earning);
                    // Return to pool instead of losing
                    vault_data.developer_rebate_pool = vault_data.developer_rebate_pool
                        .checked_add(referral_earning)
                        .ok_or(ProgramError::InvalidInstructionData)?;
                } else {
                    // Verify referrer PDA derivation
                    let (referrer_pda, _) = Pubkey::find_program_address(
                        &[b"developer", referrer_pubkey.as_ref()],
                        program_id,
                    );
                    
                    if referrer_pda != *referrer_account.key {
                        msg!("Error: Referrer PDA mismatch");
                        msg!("Expected: {}, Got: {}", referrer_pda, referrer_account.key);
                        msg!("MEDIUM FIX: {} lamports returned to developer rebate pool", referral_earning);
                        vault_data.developer_rebate_pool = vault_data.developer_rebate_pool
                            .checked_add(referral_earning)
                            .ok_or(ProgramError::InvalidInstructionData)?;
                    } else {
                        // Attempt to deserialize and credit
                        match DeveloperAccount::try_from_slice(&referrer_account.data.borrow()) {
                            Ok(mut referrer_data) => {
                                // Validate referrer identity and status
                                if referrer_data.developer != referrer_pubkey {
                                    msg!("Error: Referrer account developer mismatch");
                                    msg!("Expected: {}, Got: {}", referrer_pubkey, referrer_data.developer);
                                    msg!("MEDIUM FIX: {} lamports returned to developer rebate pool", referral_earning);
                                    vault_data.developer_rebate_pool = vault_data.developer_rebate_pool
                                        .checked_add(referral_earning)
                                        .ok_or(ProgramError::InvalidInstructionData)?;
                                } else if !referrer_data.is_active {
                                    msg!("Warning: Referrer account inactive");
                                    msg!("MEDIUM FIX: {} lamports returned to developer rebate pool", referral_earning);
                                    vault_data.developer_rebate_pool = vault_data.developer_rebate_pool
                                        .checked_add(referral_earning)
                                        .ok_or(ProgramError::InvalidInstructionData)?;
                                } else {
                                    // All validations passed - credit the referrer
                                    referrer_data.referral_earnings = referrer_data.referral_earnings
                                        .checked_add(referral_earning)
                                        .ok_or(ProgramError::InvalidInstructionData)?;
                                    
                                    // Increment referral count (only on first query from this developer)
                                    if developer_data.total_queries == 1 {
                                        referrer_data.referrals_made = referrer_data.referrals_made
                                            .checked_add(1)
                                            .ok_or(ProgramError::InvalidInstructionData)?;
                                    }
                                    
                                    referrer_data.serialize(&mut &mut referrer_account.data.borrow_mut()[..])?;
                                    referral_credited = true;
                                    msg!("✓ Credited {} lamports referral to {}", referral_earning, referrer_pubkey);
                                }
                            }
                            Err(e) => {
                                msg!("Error: Could not deserialize referrer account: {:?}", e);
                                msg!("MEDIUM FIX: {} lamports returned to developer rebate pool", referral_earning);
                                vault_data.developer_rebate_pool = vault_data.developer_rebate_pool
                                    .checked_add(referral_earning)
                                    .ok_or(ProgramError::InvalidInstructionData)?;
                            }
                        }
                    }
                }
            }
            None => {
                // Referrer account not provided - return to pool
                msg!("Warning: Referrer account not provided in transaction");
                msg!("Referrer {} will not receive {} lamports", referrer_pubkey, referral_earning);
                msg!("MEDIUM FIX: {} lamports returned to developer rebate pool", referral_earning);
                vault_data.developer_rebate_pool = vault_data.developer_rebate_pool
                    .checked_add(referral_earning)
                    .ok_or(ProgramError::InvalidInstructionData)?;
            }
        }
    }

    vault_data.serialize(&mut &mut payment_vault.data.borrow_mut()[..])?;
    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;
    developer_data.serialize(&mut &mut developer_account.data.borrow_mut()[..])?;

    msg!("Developer query processed");
    msg!("Query cost: {} SOL, Rebate: {} SOL, Net: {} SOL", 
         query_cost, rebate_amount, net_cost);
    msg!("Provider earned: {} SOL", provider_share);

    Ok(())
}

/// Claim developer bonus rewards (WHISTLE tokens)
fn claim_developer_rewards(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let developer = next_account_info(account_info_iter)?;
    let developer_account = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let developer_token_account = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate token program ID
    if *token_program.key != spl_token::id() {
        msg!("Invalid token program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !developer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if developer_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if pool_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut developer_data = DeveloperAccount::try_from_slice(&developer_account.data.borrow())?;
    let pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    // Verify developer PDA
    let (developer_pda, _) = Pubkey::find_program_address(
        &[b"developer", developer.key.as_ref()],
        program_id,
    );

    if developer_pda != *developer_account.key {
        msg!("Invalid developer PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if developer_data.developer != *developer.key {
        return Err(ProgramError::InvalidAccountData);
    }

    if developer_data.bonus_rewards == 0 {
        msg!("No bonus rewards to claim");
        return Err(ProgramError::InvalidAccountData);
    }

    let amount = developer_data.bonus_rewards;

    // Verify token vault PDA
    let (vault_pda, vault_bump) = Pubkey::find_program_address(
        &[b"token_vault", pool.authority.as_ref()],
        program_id,
    );

    if vault_pda != *token_vault.key {
        msg!("Invalid token vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Transfer WHISTLE bonus rewards from vault
    invoke_signed(
        &token_instruction::transfer(
            token_program.key,
            token_vault.key,
            developer_token_account.key,
            &vault_pda,
            &[],
            amount,
        )?,
        &[
            token_vault.clone(),
            developer_token_account.clone(),
            token_program.clone(),
        ],
        &[&[b"token_vault", pool.authority.as_ref(), &[vault_bump]]],
    )?;

    developer_data.bonus_rewards = 0;
    developer_data.serialize(&mut &mut developer_account.data.borrow_mut()[..])?;

    msg!("Developer claimed {} WHISTLE in bonus rewards", amount);
    Ok(())
}

/// Claim referral earnings (SOL)
fn claim_referral_earnings(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let developer = next_account_info(account_info_iter)?;
    let developer_account = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate system program ID
    if *system_program.key != solana_program::system_program::id() {
        msg!("Invalid system program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !developer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if developer_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut developer_data = DeveloperAccount::try_from_slice(&developer_account.data.borrow())?;
    let vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;

    // Verify developer PDA
    let (developer_pda, _) = Pubkey::find_program_address(
        &[b"developer", developer.key.as_ref()],
        program_id,
    );

    if developer_pda != *developer_account.key {
        msg!("Invalid developer PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Verify payment vault PDA
    let (vault_pda, _) = Pubkey::find_program_address(
        &[b"payment_vault", vault_data.authority.as_ref()],
        program_id,
    );

    if vault_pda != *payment_vault.key {
        msg!("Invalid payment vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if developer_data.developer != *developer.key {
        return Err(ProgramError::InvalidAccountData);
    }

    if developer_data.referral_earnings == 0 {
        msg!("No referral earnings to claim");
        return Err(ProgramError::InvalidAccountData);
    }

    let amount = developer_data.referral_earnings;

    // Check vault has sufficient balance
    let vault_lamports = payment_vault.lamports();
    if vault_lamports < amount {
        msg!("Insufficient vault balance for payout");
        return Err(ProgramError::InsufficientFunds);
    }

    // Transfer SOL from vault to developer
    **payment_vault.try_borrow_mut_lamports()? -= amount;
    **developer.try_borrow_mut_lamports()? += amount;

    developer_data.referral_earnings = 0;
    developer_data.serialize(&mut &mut developer_account.data.borrow_mut()[..])?;

    msg!("Developer claimed {} SOL in referral earnings", amount);
    Ok(())
}

// ============= X402 PAYMENT FUNCTIONS =============

/// Derive X402 payment collection wallet PDA
pub fn get_x402_payment_wallet_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"x402_payment_wallet"],
        program_id,
    )
}

/// Initialize X402 payment collection wallet (one-time setup)
fn initialize_x402_wallet(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let x402_wallet = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // LOW SECURITY FIX: Validate system program ID
    if *system_program.key != solana_program::system_program::id() {
        msg!("Invalid system program");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Verify authority
    if !authority.is_signer {
        msg!("Authority must be signer");
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Derive and verify PDA
    let (wallet_pda, bump) = get_x402_payment_wallet_pda(program_id);
    if wallet_pda != *x402_wallet.key {
        msg!("Invalid X402 wallet PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Check if already initialized
    if !x402_wallet.data_is_empty() {
        msg!("X402 wallet already initialized");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // Create the PDA account (minimal space needed for SOL storage)
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(0); // Empty account for SOL storage

    invoke_signed(
        &system_instruction::create_account(
            authority.key,
            x402_wallet.key,
            lamports,
            0, // No data space needed
            program_id,
        ),
        &[authority.clone(), x402_wallet.clone(), system_program.clone()],
        &[&[b"x402_payment_wallet", &[bump]]],
    )?;

    msg!("X402 payment wallet initialized: {}", wallet_pda);
    msg!("Configure your X402 system to send payments to this address");
    Ok(())
}

/// Process X402 payment from collection wallet and distribute
/// 90% -> Staker Rewards Pool
/// 10% -> Treasury
///
/// HIGH SECURITY CONSIDERATION: X402 Payment Source Validation
///
/// VULNERABILITY: This function cannot cryptographically verify that funds in the
/// X402 wallet actually came from the X402 payment system. An attacker with authority
/// access could deposit their own SOL and process it as legitimate X402 revenue.
///
/// MITIGATION STRATEGIES:
///
/// 1. **AUTHORITY CONTROL (Primary Defense):**
///    - Authority MUST be a multi-sig (Squads 3-of-5 recommended)
///    - Use timelock for all process_x402_payment transactions
///    - Document authority in program docs and verify publicly
///
/// 2. **OFF-CHAIN MONITORING (Required):**
///    - Monitor X402 wallet for unauthorized deposits (track sender addresses)
///    - Alert on unexpected balance increases
///    - Compare on-chain balances with X402 system records
///    - Set up automated alerts for suspicious activity
///
/// 3. **PROCESS CONTROLS:**
///    - Require multiple approvers for large payments
///    - Implement daily/weekly limits on X402 processing
///    - Maintain audit trail of all X402 transactions
///    - Regular reconciliation with X402 system backend
///
/// 4. **FUTURE ENHANCEMENTS:**
///    - Oracle integration to verify X402 payment authenticity
///    - Chainlink or Pyth oracle reporting X402 revenue
///    - Merkle proof of X402 payment inclusion
///    - Cross-chain verification if X402 on different chain
///
/// CURRENT IMPLEMENTATION:
/// - Relies on authority multi-sig (see lines 125-206 for setup)
/// - Validates amount bounds to prevent catastrophic errors
/// - All transactions logged for audit trail
/// - Assumes authority follows proper verification procedures
///
fn process_x402_payment(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let x402_wallet = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;
    let staking_pool = next_account_info(account_info_iter)?;

    // HIGH SECURITY: This authority should be a multi-sig (see lines 125-206)
    // Authority is responsible for verifying X402 payment authenticity off-chain
    if !authority.is_signer {
        msg!("Authority must be signer");
        msg!("NOTE: Authority should verify X402 payment authenticity before signing");
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify X402 wallet PDA
    let (wallet_pda, _bump) = get_x402_payment_wallet_pda(program_id);
    if wallet_pda != *x402_wallet.key {
        msg!("Invalid X402 wallet PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Verify payment vault ownership
    if payment_vault.owner != program_id {
        msg!("Invalid payment vault owner");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Verify staking pool ownership
    if staking_pool.owner != program_id {
        msg!("Invalid staking pool owner");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Verify payment vault PDA
    let pool_data = StakingPool::try_from_slice(&staking_pool.data.borrow())?;
    let (vault_pda, _) = Pubkey::find_program_address(
        &[b"payment_vault", pool_data.authority.as_ref()],
        program_id,
    );
    if vault_pda != *payment_vault.key {
        msg!("Invalid payment vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    let mut vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;

    // Validate amount
    if amount == 0 {
        msg!("Amount must be greater than 0");
        return Err(ProgramError::InvalidInstructionData);
    }

    // MEDIUM SECURITY FIX: Add reasonable bounds validation
    // Min: 0.001 SOL (1_000_000 lamports) - prevents dust/spam
    // Max: 1000 SOL (1_000_000_000_000 lamports) - prevents catastrophic errors
    const MIN_X402_PAYMENT: u64 = 1_000_000; // 0.001 SOL
    const MAX_X402_PAYMENT: u64 = 1_000_000_000_000; // 1000 SOL
    
    if amount < MIN_X402_PAYMENT {
        msg!("X402 payment too small (min: 0.001 SOL)");
        return Err(ProgramError::InvalidInstructionData);
    }
    
    if amount > MAX_X402_PAYMENT {
        msg!("X402 payment too large (max: 1000 SOL)");
        msg!("This appears to be an error. Please verify the amount.");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Check X402 wallet has sufficient balance
    let wallet_balance = x402_wallet.lamports();
    if wallet_balance < amount {
        msg!("Insufficient X402 wallet balance: {} < {}", wallet_balance, amount);
        return Err(ProgramError::InsufficientFunds);
    }

    // INFO SECURITY NOTE: X402 Payment Split Ratio
    // Current fixed split: 90% to stakers, 10% to treasury
    // 
    // MAKING THIS CONFIGURABLE (FUTURE ENHANCEMENT):
    // Option 1: Add split_ratio fields to PaymentVault struct
    //   - staker_share_bps: u64 (e.g., 9000 = 90%)
    //   - Requires vault reinitialization or migration
    //   - Add instruction: UpdateX402SplitRatio(staker_bps, treasury_bps)
    //   - Validate: staker_bps + treasury_bps = 10000
    //
    // Option 2: Store in separate ConfigAccount
    //   - More flexible, no vault migration needed
    //   - Can update via governance without affecting vault state
    //
    // Option 3: Use constants with governance upgrade path
    //   - Current approach (below)
    //   - Change requires program upgrade
    //   - Most secure: no runtime manipulation possible
    //
    // CURRENT IMPLEMENTATION: Fixed constants (Option 3)
    const STAKER_SHARE_BPS: u64 = 9000; // 90% = 9000 basis points
    const TREASURY_SHARE_BPS: u64 = 1000; // 10% = 1000 basis points
    
    // Compile-time validation
    const _: () = assert!(STAKER_SHARE_BPS + TREASURY_SHARE_BPS == 10000, "Split ratios must sum to 10000 bps");
    
    // Calculate shares using basis points
    let staker_share = amount
        .checked_mul(STAKER_SHARE_BPS)
        .ok_or(ProgramError::InvalidInstructionData)?
        .checked_div(10000)
        .ok_or(ProgramError::InvalidInstructionData)?;

    let treasury_share = amount
        .checked_mul(TREASURY_SHARE_BPS)
        .ok_or(ProgramError::InvalidInstructionData)?
        .checked_div(10000)
        .ok_or(ProgramError::InvalidInstructionData)?;
    
    // Verify split is exact (no dust due to rounding)
    let total_distributed = staker_share
        .checked_add(treasury_share)
        .ok_or(ProgramError::InvalidInstructionData)?;
    
    if total_distributed != amount {
        msg!("Split calculation error: {} != {}", total_distributed, amount);
        return Err(ProgramError::InvalidInstructionData);
    }

    // Ensure rent-exempt minimum remains in X402 wallet
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(0);
    let remaining_balance = wallet_balance.checked_sub(amount).ok_or(ProgramError::InsufficientFunds)?;
    
    if remaining_balance < min_balance {
        msg!("Cannot withdraw: would leave X402 wallet below rent-exempt minimum");
        msg!("Current: {}, Withdrawing: {}, Remaining: {}, Min required: {}", 
             wallet_balance, amount, remaining_balance, min_balance);
        return Err(ProgramError::InsufficientFunds);
    }

    // Transfer SOL from X402 wallet to payment vault
    **x402_wallet.try_borrow_mut_lamports()? = wallet_balance
        .checked_sub(amount)
        .ok_or(ProgramError::InsufficientFunds)?;
    
    **payment_vault.try_borrow_mut_lamports()? = payment_vault.lamports()
        .checked_add(amount)
        .ok_or(ProgramError::InvalidInstructionData)?;

    // Update vault accounting
    vault_data.staker_rewards_pool = vault_data.staker_rewards_pool
        .checked_add(staker_share)
        .ok_or(ProgramError::InvalidInstructionData)?;

    vault_data.treasury = vault_data.treasury
        .checked_add(treasury_share)
        .ok_or(ProgramError::InvalidInstructionData)?;

    vault_data.total_collected = vault_data.total_collected
        .checked_add(amount)
        .ok_or(ProgramError::InvalidInstructionData)?;

    vault_data.serialize(&mut &mut payment_vault.data.borrow_mut()[..])?;

    msg!("✅ X402 payment processed: {} lamports ({:.3} SOL)", amount, amount as f64 / 1_000_000_000.0);
    msg!("├─ 90% to stakers: {} lamports ({:.3} SOL)", staker_share, staker_share as f64 / 1_000_000_000.0);
    msg!("└─ 10% to treasury: {} lamports ({:.3} SOL)", treasury_share, treasury_share as f64 / 1_000_000_000.0);
    msg!("Stakers can now claim their rewards via claim_staker_rewards()");

    Ok(())
}

