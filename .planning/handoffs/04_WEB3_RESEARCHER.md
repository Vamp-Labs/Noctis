# WEB3 RESEARCHER — Remaining Work Handoff

**5 Tasks | Est. 2-3 weeks | Priority: P0–P2**

---

## TASK 1: 🟡 Research BLS12-381 Host Function API in Soroban
**Priority:** 🔴 P0 | **Effort:** 2-3 days | **Status:** ❌ MISSING

### Context
The Smart Contract Engineer needs to implement real Groth16 verification (CRITICAL-001) using Stellar's BLS12-381 host functions. The exact API signatures, argument formats, and encoding requirements need to be documented.

### Research Questions
1. **What are the exact host function signatures?**
   - `bls12_381_g1_add`, `bls12_381_g1_mul`, `bls12_381_g1_validate`, `bls12_381_g2_add`, `bls12_381_g2_mul`, `bls12_381_g2_validate`, `bls12_381_fr_mul`, `bls12_381_fr_add`, `bls12_381_pairing` (are these correct?)
   - What are the exact argument types and return types?
   - Are they available in `Env` directly or via a separate trait?

2. **Proof serialization format**
   - 192-byte Soroban format: 48(π_A G1) + 96(π_B G2) + 48(π_C G1)
   - What is the exact encoding? Uncompressed? Compressed? Affine? 
   - Does Soroban require subgroup checks before pairing?

3. **Host function availability**
   - Are ALL BLS12-381 functions available on Protocol 26 testnet?
   - Any known bugs or limitations?
   - Gas costs for pairing operations?

### Deliverable
A reference doc (`refs/bls12_381_soroban_api.md`) with:
- Complete function signatures (Rust `Env` method names, param types, return types)
- Code examples for Groth16 verification flow
- Serialization format specification (192-byte proof → host function inputs)
- Testnet verification test (can we call these functions from a simple contract?)
- Gas estimates for a single pairing check

### Reference Sources
- Stellar Protocol 25/26 release notes
- `stellar-contract-env` crate source (`crates/contract-env/`)
- Stellar Dev Discord #soroban channel
- Stellar developer documentation

---

## TASK 2: 🟡 Research Blend + Soroswap Testnet Contract Addresses & Interfaces
**Priority:** 🟡 P1 | **Effort:** 2-3 days | **Status:** ❌ MISSING

### Context
The Smart Contract Engineer needs to integrate yield routing with real testnet DeFi protocols (T5). The availability of these protocols on Stellar testnet and their exact function signatures must be confirmed.

### Research Questions
1. **Blend Protocol testnet**
   - Is Blend deployed on testnet? What pool addresses?
   - What are the exact function names for deposit/withdraw?
   - What is the ERC-4626-like interface or Soroban-specific interface?
   - How to get pool APY?
   - What is the asset approval flow?

2. **Soroswap testnet**
   - Is Soroswap deployed on testnet? What router/pool addresses?
   - What is the swap function signature?
   - Is there an aggregator/router contract?
   - What pairs are available? Can we swap NOCTIS→USDC?

3. **Yield protocol comparison**
   - Which protocol has higher liquidity on testnet?
   - Which is easier to integrate (clearer interface, better docs)?
   - Are there any testnet faucets for non-NOCTIS assets?

### Deliverable
A reference doc (`refs/testnet_defi_integration.md`) with:
- Contract addresses for all available Blend and Soroswap contracts on testnet
- Full function signatures (name, params, return types)
- Code examples for deposit, withdraw, get_apy flows
- Approval flow documentation (ERC-4626 approval or custom)

### Reference Sources
- Blend Protocol documentation
- Soroswap documentation
- Stellar Expert / StellarChain for testnet contract searches
- Soroswap testnet explorer
- Blend testnet deployment addresses

---

## TASK 3: 🟢 Research x402 + MPP Testnet Setup
**Priority:** 🟢 P2 | **Effort:** 1 week | **Status:** ❌ MISSING

### Context
x402 micropayments and MPP (Meridian Payment Protocol) are planned for Phase 2 but should be researched now so the Backend Engineer has a clear path forward.

### Research Questions
1. **x402 specification**
   - Is there a formal Stellar x402 spec?
   - What are the exact HTTP headers (`Stellar-Payment`, `Stellar-Signature`)?
   - What is the challenge transaction format?
   - How does payment verification work?

2. **MPP (Meridian Payment Protocol)**
   - What is MPP? How does it differ from x402?
   - Are there any existing reference implementations?
   - Is MPP Stellar-specific or a general protocol?
   - What testnet infrastructure exists for MPP?

3. **Testnet setup**
   - Are there x402 testnet endpoints available?
   - Do we need to run our own x402 server?
   - What SDK or libraries exist for x402/MPP?

### Deliverable
A research brief (`refs/x402_mpp_research.md`) with:
- x402 spec summary (headers, flow, verification)
- MPP overview and how it relates to x402
- Recommended architecture diagram
- Testnet configuration (endpoints, accounts needed)
- Sample curl requests for x402 flow

### Reference Sources
- Stellar x402 blog posts / RFCs
- Meridian Payment Protocol docs
- Stellar Developer Discord #x402 channel
- Reference implementations (if any)

---

## TASK 4: 🟢 Launchtube & Mercury Testnet Configuration
**Priority:** 🟢 P2 | **Effort:** 2 days | **Status:** ❌ MISSING

### Context
Backend Engineer tasks T2 (Launchtube relay) and T3 (Mercury indexer) depend on testnet endpoint availability.

### Research Questions
1. **Launchtube testnet**
   - Is there a testnet Launchtube endpoint?
   - What is the API base URL and authentication method?
   - What are the fee rates on testnet?
   - Is there a rate limit?

2. **Mercury testnet**
   - Is Mercury available on testnet?
   - What is the GraphQL endpoint URL?
   - Do we need an API key? How to get one?
   - Does Mercury index Soroban contract events or only Stellar Classic?
   - What is Galexie and how does it differ from Mercury?

3. **Alternative indexers**
   - Stellar Expert API
   - Horizon (deprecated but still running for testnet?)
   - Stellar Chain API

### Deliverable
A configuration document (`refs/testnet_services_config.md`) with:
- Launchtube testnet endpoint, auth method, fee rates
- Mercury testnet endpoint, API key process, GraphQL schema highlights
- Galexie testnet availability and access method
- Alternative indexer options with pros/cons
- Sample queries for each service

---

## TASK 5: 🟢 SEP Compliance Finalization
**Priority:** 🟢 P2 | **Effort:** 3-5 days | **Status:** ⚠️ PARTIAL

### Context
The PRD requires SEP compliance (Stellar Ecosystem Proposals) for various aspects of the protocol. GAP analysis shows partial compliance.

### Requirements
Review and document compliance status for SEPs relevant to Noctis:

| SEP | Relevance | Status |
|-----|-----------|--------|
| SEP-1 | Stellar account format | ✅ Stellar SDK compliant |
| SEP-7 | URI Scheme for signing | ❌ Not implemented |
| SEP-10 | Stellar Web Auth | ⚠️ Partial (passkey-based) |
| SEP-12 | KYC/AML API | ❌ Not implemented |
| SEP-24 | Anchor/Asset issuance | ⚠️ Partial (SAC based) |
| SEP-38 | Anchor RFQ | ❌ Phase 2 |
| SEP-41 | Stellar Asset Standard | ✅ SAC compliant |

### Deliverable
A compliance matrix report (`refs/sep_compliance.md`) with:
- SEP-7 implementation guide (URI scheme for payment requests)
- SEP-10 passkey-based auth compliance recommendations
- SEP-12 integration path for payroll recipients
- SEP-24 anchor compliance for stablecoin on/off ramp
- Priority ranking for SEP implementation

---

## Priority & Sequence

```
WEEK 1                    WEEK 2                      WEEK 3
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ T1: BLS12-381    │   │ T2: Blend/Swap   │   │ T4: Launchtube   │
│ (blocks SC T1)   │   │ (blocks SC T5)   │   │     + Mercury    │
│                  │   │                  │   │ (blocks BE T2/3) │
│ T5: SEP (async)  │   │ T3: x402/MPP     │   └──────────────────┘
└──────────────────┘   │ (blocks BE T1)   │
                       └──────────────────┘
```

## Files You'll Create

| File | Description |
|------|-------------|
| `refs/bls12_381_soroban_api.md` | BLS12-381 host function API reference |
| `refs/testnet_defi_integration.md` | Blend/Soroswap testnet contract addresses & interfaces |
| `refs/x402_mpp_research.md` | x402 + MPP spec and testnet setup |
| `refs/testnet_services_config.md` | Launchtube/Mercury/Galexie testnet config |
| `refs/sep_compliance.md` | SEP compliance matrix |
