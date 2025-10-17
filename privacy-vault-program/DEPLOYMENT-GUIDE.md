# Privacy Vault Deployment Guide

## ⚠️ CRITICAL: READ BEFORE DEPLOYING TO MAINNET

### Prerequisites
1. **Solana CLI Tools installed**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"
   ```

2. **Rust & Cargo installed**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

3. **Solana BPF toolchain**
   ```bash
   solana-install init 1.18.0
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   ```

4. **Wallet with SOL**
   - Devnet: Free (use airdrop)
   - Mainnet: Need ~10-15 SOL for deployment

---

## 🧪 STEP 1: Test on Devnet (REQUIRED)

### 1.1 Setup Devnet
```bash
cd privacy-vault-program
solana config set --url devnet
solana-keygen new  # Create new wallet if needed
solana airdrop 5   # Get test SOL
```

### 1.2 Install Dependencies
```bash
npm install
```

### 1.3 Build Program
```bash
cargo build-bpf
# Output: target/deploy/privacy_vault.so
```

### 1.4 Deploy to Devnet
```bash
npm run deploy:devnet
# This will:
# - Deploy the program
# - Save program ID to program-id.json
```

### 1.5 Initialize Vault
```bash
npm run init
# This creates the vault state and token accounts
# Saves info to vault-info.json
```

### 1.6 Test Thoroughly
Test for at least **1 week** on devnet:
- [ ] Deposit works
- [ ] Withdraw works
- [ ] Performance updates work
- [ ] Multiple users can deposit
- [ ] Math is correct
- [ ] No exploits found
- [ ] Edge cases handled

---

## 🚀 STEP 2: Deploy to Mainnet (After Testing!)

### 2.1 Preflight Checklist

**MUST COMPLETE BEFORE MAINNET:**
- [ ] **Code audited** by professional security firm (budget $5k-15k)
- [ ] Tested on devnet for minimum 2 weeks
- [ ] Multiple users tested successfully
- [ ] All edge cases covered
- [ ] Emergency pause mechanism tested
- [ ] Insurance fund ready (optional but recommended)
- [ ] Legal review completed
- [ ] Terms of service published
- [ ] Risk disclosures clear

### 2.2 Mainnet Deployment

```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Check balance (need 10-15 SOL)
solana balance

# Deploy
npm run deploy:mainnet

# Initialize vault
SOLANA_NETWORK=mainnet-beta npm run init
```

### 2.3 Post-Deployment

1. **Update index.html** with new program ID:
   ```javascript
   const PRIVACY_VAULT_CONFIG = {
     PROGRAM_ID: 'YourMainnetProgramID',
     VAULT_STATE: 'YourVaultState',
     // ... from vault-info.json
   };
   ```

2. **Test with small amounts first** ($10-100)
3. **Monitor for 24 hours** before announcing
4. **Start with deposit cap** (max 10k WHISTLE per user initially)
5. **Gradually increase limits** as confidence grows

---

## 💰 COSTS

### Devnet (FREE)
- Program deployment: 0 SOL (testnet)
- Testing: 0 SOL (airdrops available)

### Mainnet (REAL MONEY)
- Program deployment: ~5-10 SOL ($500-1,000)
- Vault initialization: ~0.01 SOL
- User account creation: ~0.01 SOL per user (one-time)
- Transactions: ~0.000005 SOL each

**Total initial cost: ~$500-1,000 + audit costs**

---

## 🛡️ SECURITY CONSIDERATIONS

### What Makes This Trustless

1. **No Admin Withdrawal**
   - Admin CANNOT withdraw user funds
   - Only users can withdraw their positions
   - PDA signing prevents unauthorized transfers

2. **Capped Losses**
   - Maximum loss hardcoded: 25%
   - Smart contract enforces this limit
   - Even malicious admin can't exceed cap

3. **Transparent Performance**
   - All performance updates on-chain
   - Anyone can verify calculations
   - Historical data immutable

4. **Emergency Features**
   - Users can withdraw anytime
   - No lock-up periods (by design)
   - No admin pause (users always have access)

### Known Risks

⚠️ **Performance Oracle Risk**
- Admin updates performance weekly
- If admin dishonest: Could report fake losses
- Mitigation: Performance verifiable off-chain
- Future: Decentralized oracle (Pyth, Switchboard)

⚠️ **Smart Contract Bugs**
- Code could have undiscovered bugs
- Mitigation: Professional audit required
- Mitigation: Start with deposit caps

⚠️ **Market Risk**
- Real strategies could genuinely lose money
- Not all weeks will be profitable
- Users must understand this risk

---

## 📊 RECOMMENDED LAUNCH STRATEGY

### Phase 1: Soft Launch (Week 1)
- Deploy to mainnet
- Deposit cap: 1,000 WHISTLE per user
- Total cap: 50,000 WHISTLE
- Only announce to existing 690 holders
- Monitor closely

### Phase 2: Controlled Growth (Week 2-4)
- If no issues: Increase to 5,000 per user
- Total cap: 200,000 WHISTLE
- Start marketing
- Weekly performance reports

### Phase 3: Full Launch (Month 2+)
- Remove caps (or set very high)
- Full marketing campaign
- Influencer partnerships
- Volume should be high by now

---

## 🔍 MONITORING & MAINTENANCE

### Daily Checks
- [ ] Vault balance matches total deposited
- [ ] No unauthorized withdrawals
- [ ] Performance updates on schedule
- [ ] User complaints/issues?

### Weekly Tasks
- [ ] Update performance based on real strategy results
- [ ] Publish transparency report
- [ ] Check for new vulnerabilities
- [ ] Community updates

### Monthly Tasks
- [ ] Full audit review
- [ ] Strategy optimization
- [ ] Fee adjustment if needed
- [ ] Upgrade planning

---

## 🆘 EMERGENCY PROCEDURES

### If Exploit Discovered
1. **DO NOT PANIC** - Stay calm
2. Contact users immediately
3. Document everything
4. Work with security team
5. Plan reimbursement if funds lost
6. Learn and improve

### If Performance is Very Bad
1. Be transparent - publish real results
2. Explain what happened
3. Adjust strategies
4. Consider insurance fund
5. Maintain trust through honesty

---

## 📝 LEGAL DISCLAIMERS (REQUIRED)

Add to your UI:

```
PRIVACY VAULT TERMS OF SERVICE

1. HIGH RISK: You can lose up to 25% of your deposit
2. NOT GUARANTEED: Past performance ≠ future results  
3. NOT FINANCIAL ADVICE: DYOR before depositing
4. EXPERIMENTAL: Smart contract is new technology
5. YOUR RISK: Only deposit what you can afford to lose
6. NO REFUNDS: Losses from market performance are final
7. BETA SOFTWARE: May have bugs, use at own risk

By depositing, you accept all risks.
```

---

## ✅ FINAL CHECKLIST BEFORE MAINNET

- [ ] Code audited by professional firm
- [ ] Tested on devnet for 2+ weeks
- [ ] 10+ test users completed full cycles
- [ ] Legal review completed
- [ ] Terms of service written
- [ ] Risk disclosures prominently displayed
- [ ] Insurance fund allocated (optional)
- [ ] Emergency procedures documented
- [ ] Team ready to monitor 24/7 for first week
- [ ] Community informed of risks

**DO NOT DEPLOY TO MAINNET UNTIL ALL BOXES CHECKED**

---

## 🎯 REALISTIC TIMELINE

- Week 1-2: Build & test on devnet
- Week 3: Professional audit
- Week 4: Fix audit findings
- Week 5: Final testing
- Week 6: Soft launch on mainnet
- Week 7+: Scale gradually

**Minimum 6 weeks from start to full launch**
**Budget: $5k-15k (audit) + $1k (deployment) = $6k-16k total**

---

## Questions?

This is real money and real risk. Take your time, do it right.
Better to launch slowly and safely than quickly and lose user funds.

The 690 holders trust you - don't rush this.

