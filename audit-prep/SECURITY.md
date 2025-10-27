# Security Considerations - Ghost Whistle Staking Contract

## 🔐 Overview

This document outlines security considerations, threat models, and mitigation strategies for the Ghost Whistle staking contract.

---

## 🎯 Assets at Risk

### **User Funds:**
- Staked $WHISTLE tokens (currently ~XXX tokens)
- Accumulated rewards in pool vault
- Protocol fee pool (~130k $WHISTLE)

### **User Data:**
- Node reputation scores
- Relay history and statistics
- Earnings records

### **Protocol Integrity:**
- Fair reward distribution
- Accurate reputation tracking
- Relay network availability

---

## 🚨 Threat Model

### **Threat Actor: Malicious Staker**

**Attack Vectors:**
1. **Drain Staking Pool** → Exploit unstake logic to withdraw more than staked
2. **Steal Other Users' Rewards** → Claim rewards belonging to other nodes
3. **Manipulate Reputation** → Game the system to earn higher rewards
4. **DoS Attack** → Spam relay requests to drain fee pool
5. **Front-Running** → MEV attacks on high-value claims

**Mitigations:**
- ✅ PDA-based account isolation
- ✅ Signer validation on all withdrawals
- ✅ Reputation slashing for failed relays
- ✅ Minimum stake requirements
- ⚠️ No rate limiting on relay creation (potential DoS)

---

### **Threat Actor: Malicious Node Operator**

**Attack Vectors:**
1. **Fail Relays Intentionally** → Steal user fees without completing work
2. **Collude with Other Nodes** → Manipulate reputation rankings
3. **Sybil Attack** → Create many small nodes to dominate fee pool

**Mitigations:**
- ✅ Reputation slashing for failures
- ✅ Fee withholding until relay completion
- ✅ Minimum stake requirement (reduces Sybil profitability)
- ⚠️ No maximum nodes per wallet (Sybil still possible)

---

### **Threat Actor: Smart Contract Exploit**

**Attack Vectors:**
1. **Integer Overflow** → Overflow `total_earned` or `fee_pool`
2. **Reentrancy** → Re-enter claim function before state update
3. **PDA Collision** → Create conflicting PDAs to access others' accounts
4. **Rounding Errors** → Drain small amounts via precision loss

**Mitigations:**
- ✅ Anchor's built-in overflow checks
- ✅ State updates before external calls (reentrancy protection)
- ✅ Unique PDA seeds (`["node", user_pubkey]`)
- ⚠️ No explicit rounding error handling

---

### **Threat Actor: Admin/Authority**

**Attack Vectors:**
1. **Rug Pull** → Set reward params to 0, drain fee pool
2. **Arbitrary Reward Changes** → Favor specific nodes
3. **Unfair Parameter Updates** → Change rules mid-game

**Mitigations:**
- ⚠️ No upgrade authority (contract is immutable)
- ⚠️ Authority can update reward params (trusted role)
- ⚠️ No timelock on parameter changes
- ⚠️ No multi-sig requirement for authority

**Recommendation:** Revoke authority or implement multi-sig after stabilization.

---

## 🔍 Vulnerability Analysis

### **Critical Severity**

#### **1. Fee Pool Drainage**
**Risk:** Can an attacker claim more fees than they're entitled to?

**Code Location:** `claim_rewards()` (lines 251-282)

**Concern:**
```rust
node.pending_rewards = node.pending_rewards
    .checked_add(amount)
    .ok_or(ErrorCode::ArithmeticOverflow)?;
```
- Is `pending_rewards` validated against `fee_pool`?
- Can multiple claims drain the pool?

**Test:** Concurrent claims from multiple users when `fee_pool < sum(pending_rewards)`

---

#### **2. Unstake Underflow**
**Risk:** Can a user unstake more than they staked?

**Code Location:** `unstake()` (lines 98-143)

**Protection:**
```rust
node.staked_amount = node.staked_amount
    .checked_sub(amount)
    .ok_or(ErrorCode::InsufficientStake)?;
```
✅ **Safe** - `checked_sub` prevents underflow

---

#### **3. PDA Seed Uniqueness**
**Risk:** Can two users have the same PDA?

**Seeds Used:**
- Pool: `["pool"]` → ✅ Unique (only one pool)
- Node: `["node", user.key()]` → ✅ Unique per user
- Vault: `["vault"]` → ✅ Unique (only one vault)
- Relay: `["relay", relay_id.to_le_bytes()]` → ✅ Unique per ID

**Verdict:** ✅ **No collisions possible**

---

### **High Severity**

#### **4. Reputation Manipulation**
**Risk:** Can users artificially inflate reputation?

**Code Location:** `fulfill_relay()` (lines 188-234)

**Current Logic:**
- Successful relay: +100 reputation
- Failed relay: -50 reputation

**Exploits:**
- Create relay to self, fulfill immediately (free +100)
- Collude with friend, fulfill each other's relays

**Mitigation:** ⚠️ None currently

**Recommendation:**
- Verify relay requester ≠ fulfiller
- Add minimum time before fulfillment
- Require external verification

---

#### **5. Relay Fee Bypass**
**Risk:** Can nodes earn rewards without actually performing work?

**Code Location:** `fulfill_relay()` (lines 188-234)

**Concern:**
- No proof-of-work verification
- No external oracle validation
- Trust-based completion

**Mitigation:** ⚠️ Assumes honest nodes

**Recommendation:** Add cryptographic proof or external verification

---

### **Medium Severity**

#### **6. Fee Pool Unbounded Growth**
**Risk:** If claims < deposits, fee pool grows forever

**Concern:**
- No maximum cap on `pool.fee_pool`
- Large pool = high value target
- No emergency withdrawal mechanism

**Mitigation:** ⚠️ None currently

**Recommendation:**
- Add maximum fee pool cap
- Implement overflow to treasury
- Add emergency pause function

---

#### **7. Rounding Errors in Rewards**
**Risk:** Small stakes lose precision in fee distribution

**Example:**
```
User A stakes: 100 WHISTLE
User B stakes: 1,000,000 WHISTLE
Fee pool: 1,000 WHISTLE

User A share: (100 / 1,000,100) * 1000 = 0.0999 ≈ 0
User B share: (1,000,000 / 1,000,100) * 1000 = 999.9 ≈ 999
Lost: 1 WHISTLE (rounds down)
```

**Mitigation:** ⚠️ None currently

**Recommendation:**
- Accumulate rounding errors in "dust" account
- Distribute dust periodically
- Or set minimum claim threshold

---

### **Low Severity**

#### **8. No Emergency Pause**
**Risk:** Cannot stop contract in case of exploit

**Mitigation:** Contract is immutable (cannot upgrade)

**Trade-off:** Security vs. flexibility

**Recommendation:** Consider time-locked pause mechanism for v2

---

#### **9. No Rate Limiting**
**Risk:** Spam relay requests to DoS network

**Mitigation:** Economic cost (10% fee per relay)

**Concern:** If token price drops, spam becomes cheap

**Recommendation:** Add configurable rate limit per user

---

## 🛡️ Security Best Practices

### **Currently Implemented:**
✅ PDA-based account isolation  
✅ Signer validation on all actions  
✅ Safe arithmetic (checked_add/sub)  
✅ Token transfers via SPL Token CPI  
✅ Anchor security features (account validation)  
✅ Minimum stake requirement (anti-spam)  

### **Missing:**
❌ Emergency pause mechanism  
❌ Timelock on parameter changes  
❌ Multi-sig authority  
❌ Rate limiting  
❌ Maximum fee pool cap  
❌ Rounding error handling  
❌ Proof-of-work for relays  
❌ Oracle integration for verification  

---

## 🔬 Recommended Tests

### **Unit Tests:**
1. ✅ Test all arithmetic edge cases (max u64, min u64)
2. ✅ Test all error paths
3. ✅ Test PDA derivation uniqueness
4. ❌ Test concurrent claims
5. ❌ Test reputation manipulation attempts
6. ❌ Test fee pool drainage scenarios

### **Integration Tests:**
1. ❌ Test full user journey (stake → relay → claim)
2. ❌ Test multi-user interactions
3. ❌ Test MEV attack scenarios
4. ❌ Test fee pool distribution accuracy

### **Fuzz Tests:**
1. ❌ Fuzz all numeric inputs
2. ❌ Fuzz all account combinations
3. ❌ Fuzz timing/ordering of instructions

---

## 📊 Risk Assessment

| Vulnerability | Severity | Likelihood | Impact | Status |
|--------------|----------|------------|--------|--------|
| Fee Pool Drainage | 🔴 Critical | Low | High | ⚠️ Review |
| Unstake Underflow | 🔴 Critical | Very Low | High | ✅ Protected |
| PDA Collision | 🔴 Critical | Very Low | High | ✅ Protected |
| Reputation Gaming | 🟡 High | Medium | Medium | ⚠️ Unprotected |
| Relay Fee Bypass | 🟡 High | Medium | Medium | ⚠️ Trust-based |
| Unbounded Growth | 🟠 Medium | High | Low | ⚠️ Monitor |
| Rounding Errors | 🟠 Medium | High | Low | ⚠️ Accept |
| No Emergency Pause | 🟢 Low | Very Low | High | ⚠️ Trade-off |
| Spam Relays | 🟢 Low | Medium | Low | ✅ Economic |

---

## 🚀 Security Roadmap

### **Pre-Audit (Week 1):**
- [ ] Expand test coverage to 90%+
- [ ] Add concurrent claim tests
- [ ] Document all assumptions
- [ ] Fix Clippy warnings

### **Post-Audit (Week 2-3):**
- [ ] Fix all Critical/High findings
- [ ] Re-test after fixes
- [ ] Get final audit report

### **Future Improvements (v2):**
- [ ] Add emergency pause
- [ ] Implement multi-sig authority
- [ ] Add proof-of-work for relays
- [ ] Oracle integration
- [ ] Timelock for parameter changes

---

## 📞 Responsible Disclosure

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. **DO NOT** exploit the vulnerability
3. **DO** email: security@whistle.ninja
4. **DO** provide: steps to reproduce, impact assessment, suggested fix
5. **Reward:** Up to $10,000 for critical findings (bug bounty)

**Response Time:** Within 24 hours  
**Fix Time:** Critical issues patched within 48 hours

---

**Last Updated:** October 27, 2025  
**Next Review:** Before mainnet audit

