# SEP Compliance Matrix — Noctis

**Author:** Web3 Researcher  
**Date:** 2026-05-28  
**Status:** Final  
**Priority:** P2 (Phase 2 readiness)

---

## Overview

This document evaluates Noctis compliance against Stellar Ecosystem Proposals (SEPs) relevant to its payroll platform. Each SEP is researched, assessed for compliance, and given implementation guidance.

| SEP | Title | Status | Noctis Compliance |
|-----|-------|--------|-------------------|
| SEP-7 | URI Scheme | Active | ❌ Not implemented |
| SEP-10 | Stellar Web Auth | Active | ⚠️ Partial (passkey-based) |
| SEP-12 | KYC/AML API | Active | ❌ Not implemented |
| SEP-24 | Hosted Deposit/Withdrawal | Active | ⚠️ Partial (SAC based) |
| SEP-38 | Anchor RFQ | Draft | ❌ Phase 2 |
| SEP-41 | Token Interface | Active | ✅ SAC compliant |

---

## SEP-7: URI Scheme

**Spec:** https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md  
**Version:** 2.1.0  
**Status:** Active

### Requirements

Defines the `web+stellar:` URI scheme for requesting transaction signing and payments. Two operations:

- **`tx`**: Encodes a base64-encoded TransactionEnvelope XDR. Recipient wallet decodes, displays, and signs.
- **`pay`**: Encodes destination, asset, amount, memo. Wallet constructs and submits the payment.

Key parameters: `xdr`, `callback` (URL for POST of signed XDR), `replace` (field substitution via SEP-11 Txrep), `signature` (domain-verified signing key).

### Noctis Compliance: ❌ Not implemented

Noctis does not currently generate or consume SEP-7 URIs.

### Relevance to Noctis

- **Payment requests**: Employer could generate a `web+stellar:pay` URI for an employee, which the employee's wallet opens to claim payment.
- **Batch approval**: Employer dashboard could generate a `web+stellar:tx` URI for the batch payment transaction, delegated to a signing service (Launchtube).
- **x402 integration**: SEP-7 URIs could encode x402 payment-challenge transactions for link-based micropayments.

### Implementation Guidance

```
// Generating a payment URI (TypeScript)
const tx = new StellarSdk.TransactionBuilder(account, opts)
  .addOperation(StellarSdk.Operation.payment({ destination, asset, amount }))
  .build();

const xdr = encodeURIComponent(tx.toEnvelope().toXDR().toString("base64"));
const uri = `web+stellar:tx?xdr=${xdr}&callback=${encodeURIComponent(callbackUrl)}`;
```

1. Add `@stellar/stellar-sdk` URI helpers (`Sep7Tx`, `Sep7Pay` classes available in SDK v14+).
2. Implement QR code generation on employer dashboard for payment requests.
3. Implement URI parsing in the employee claim flow (if using in-app wallet).
4. Add `origin_domain` and `signature` parameters for verifiable payment requests (requires stellar.toml signing key).

### Effort: ~1 week

| Task | Days |
|------|------|
| URI generation in employer dashboard | 2 |
| QR code + deep link integration | 1 |
| URI parsing in claim flow | 2 |
| Signature verification setup | 1 |
| Testing | 1 |

### Priority: 🟢 Low (Phase 2 UX enhancement)

Not blocking for MVP. Useful for employer → employee payment requests and mobile deep linking.

---

## SEP-10: Stellar Web Auth

**Spec:** https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md  
**Version:** 2.2.0  
**Status:** Active

### Requirements

Challenge/response protocol for authenticating Stellar accounts (`G...`):

1. **Client** sends `GET /auth?account=<G...>` to anchor server.
2. **Server** returns a Stellar transaction (signed by server, sequence number = 0) — the "challenge."
3. **Client** signs the challenge with the account's secret key and returns it via `POST /auth`.
4. **Server** verifies the signature, returns a JWT.
5. JWT is used for authenticated requests to SEP-12, SEP-24, SEP-38 endpoints.

Parameters: `client_domain` (optional, for wallet attribution), multiple signature support, JWT expiration (default 24h).

### Noctis Compliance: ⚠️ Partial

Noctis uses **passkey-based smart wallets** (contract accounts, `C...` addresses), not classic `G...` accounts. SEP-10 only supports `G...` and `M...` accounts. **SEP-45** is the contract account equivalent.

### Key Gap: SEP-10 vs SEP-45

| Feature | SEP-10 | SEP-45 |
|---------|--------|--------|
| Account type | `G...` (classic) | `C...` (contract) |
| Auth method | Ed25519 signing | `__check_auth` contract call |
| Challenge format | Stellar transaction | Stellar transaction with auth entries |
| JWT output | Yes | Yes |
| Anchor Platform support | Native | Native (separate config) |

### Implementation Guidance

**Path A (Recommended for MVP):** Implement SEP-45 only, since Noctis uses contract accounts natively.

1. Deploy a `web_auth_verify` contract (or verify that Passkey Kit's default contract supports SEP-45's `web_auth_verify` interface).
2. Configure Anchor Platform with `SEP45_ENABLED=true`, `SEP45_HOME_DOMAINS`, `SEP45_WEB_AUTH_CONTRACT_ID`.
3. Client: authenticate via SEP-45 to get JWT, then use JWT for SEP-12/24/38.

**Path B (Full compliance):** Implement both SEP-10 and SEP-45.

1. Maintain a classic `G...` signing key on backend for SEP-10 challenge/response.
2. Also deploy SEP-45 contract for passkey-based auth.
3. Anchor Platform supports both simultaneously — clients choose based on account type.

### Passkey-to-SEP-10 Mapping

Passkey auth (`secp256r1` via `__check_auth`) cannot directly produce SEP-10 compliant signatures because SEP-10 requires Ed25519 signatures on a challenge transaction. However, a **backend orchestration layer** can:

1. Accept a passkey-signed authorization from the smart wallet.
2. Backend verifies `__check_auth` via RPC simulation.
3. Backend signs the SEP-10 challenge with the platform's `G...` key on behalf of the user.
4. Return JWT.

This approach works but introduces a trusted intermediary. **SEP-45 is the correct solution.**

### Effort: ~1 week

| Task | Days |
|------|------|
| SEP-45 contract deployment and `web_auth_verify` interface validation | 2 |
| Anchor Platform SEP-45 configuration | 1 |
| Client-side SEP-45 auth flow (Passkey Kit integration) | 2 |
| Testing + fallback to SEP-10 if needed | 1 |

### Priority: 🟡 Medium (required for SEP-12/24/38 integration)

Without SEP-10 or SEP-45, Noctis cannot authenticate with anchors for KYC, deposits, or withdrawals.

---

## SEP-12: KYC/AML API

**Spec:** https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md  
**Version:** 1.15.0  
**Status:** Active

### Requirements

Standard REST API for collecting and managing customer KYC information:

- **`GET /customer`** — Check customer status and required fields (returns: `ACCEPTED`, `PROCESSING`, `NEEDS_INFO`, `REJECTED`).
- **`PUT /customer`** — Submit or update KYC information (fields per SEP-9: name, DOB, address, ID document, etc.).
- **`PUT /customer/verification`** — Upload verification documents (image files, up to 2MB each).
- **`DELETE /customer/[id]`** — Remove customer data.
- **`GET /customer/[id]`** — Get specific customer details.

Authentication: Requires JWT from SEP-10 or SEP-45.

### Noctis Compliance: ❌ Not implemented

No KYC collection infrastructure exists. Noctis operates on testnet where KYC is not required, but any regulated corridor will need this.

### Relevance to Noctis

- **Employee onboarding**: Before an employee can receive payroll in regulated stablecoins (USDC, EURC), they may need KYC verification.
- **Employer verification**: Corporate KYC for the employing entity.
- **Jurisdiction-specific requirements**: Different corridors (SE Asia, LATAM, Africa, Europe) have different KYC/AML rules.

### Integration Path

```
┌─────────────┐     SEP-10/45 JWT     ┌──────────────┐
│  Noctis     │ ──────────────────→   │  Anchor      │
│  Frontend   │                       │  (KYC Server)│
│             │ ←──────────────────   │              │
│             │   KYC fields/status   │              │
└─────────────┘                       └──────────────┘
```

1. **Embed KYC in onboarding flow**: After passkey registration, check if employee needs KYC (jurisdiction-dependent).
2. **Use hosted Anchor Platform KYC**: Anchors like Circle provide SEP-12 endpoints. Noctis frontend opens the anchor's KYC widget or collects data and submits via SEP-12.
3. **Store KYC status**: Map KYC status to employee records in Noctis backend. Rejected status blocks payroll disbursement.
4. **SEP-9 fields**: Use standard SEP-9 fields for interoperability (first_name, last_name, email_address, country_code, etc.).

### Effort: ~2 weeks

| Task | Days |
|------|------|
| SEP-12 client integration in passkey auth flow | 3 |
| KYC status tracking in backend | 2 |
| UI for KYC collection (or embedded anchor widget) | 3 |
| Document upload flow | 2 |
| Testing with testnet anchor KYC sandbox | 2 |

### Priority: 🟡 Medium (required for regulated corridors)

Not needed for testnet MVP. Required for any fiat on/off ramp or regulated stablecoin corridor in Phase 2.

---

## SEP-24: Hosted Deposit and Withdrawal

**Spec:** https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md  
**Version:** 3.8.0  
**Status:** Active

### Requirements

Standard for anchor-to-wallet interactive deposit/withdrawal:

- **`GET /info`** — Supported currencies, fee structure, methods.
- **`POST /transactions/deposit/interactive`** — Initiate deposit, returns interactive URL.
- **`POST /transactions/withdraw/interactive`** — Initiate withdrawal, returns interactive URL.
- **`GET /transaction`** — Status of a specific transaction.
- **`GET /transactions`** — Transaction history (filtered by asset, status, etc.).

Key requirements:
- Anchor must define `TRANSFER_SERVER_SEP0024` in stellar.toml.
- Must support SEP-10 or SEP-45 authentication for all endpoints except `/info`.
- Interactive flow uses a popup/browser window hosted by the anchor.
- Supports SEP-9 KYC fields passed to pre-fill forms.
- SEP-38 quote integration for firm pricing before deposit/withdrawal.

### Noctis Compliance: ⚠️ Partial

Noctis uses Stellar Asset Contract (SAC) for its tokens, which is the correct foundation. However:

- No SEP-24 integration exists for fiat on/off ramp.
- No anchor relationship established.
- No SEP-10/45 auth flow to support SEP-24.

### What's Needed

1. **Select an anchor partner**: Circle (USDC/EURC on/off ramp) supports SEP-24.
2. **Implement SEP-10 or SEP-45 auth** to obtain JWT for SEP-24 endpoints.
3. **Deposit flow**:
   - Employee clicks "Deposit" in Noctis dashboard.
   - Noctis calls `POST /transactions/deposit/interactive` with JWT.
   - Anchor returns interactive URL; Noctis opens in new tab/popup.
   - Employee completes fiat deposit with anchor.
   - Anchor sends on-chain USDC/EURC to Noctis-managed distribution account.
4. **Withdrawal flow**:
   - Employee clicks "Withdraw" → Noctis sends on-chain tokens to anchor's distribution account.
   - Noctis calls `POST /transactions/withdraw/interactive` with JWT.
   - Anchor shows interactive UI for fiat withdrawal details.
   - Anchor sends fiat to employee's bank account.

### Effort: ~3 weeks

| Task | Days |
|------|------|
| Anchor partner selection and integration agreement | 3 |
| SEP-10/45 auth flow for anchor communication | 3 |
| SEP-24 client in frontend (deposit/withdraw UX) | 5 |
| Backend distribution account management | 3 |
| Interactive popup integration | 2 |
| Testing with testnet anchor sandbox | 3 |

### Priority: 🟡 Medium (Phase 2 — fiat on/off ramp)

Not needed for testnet MVP (testnet USDC is free from Friendbot). Critical for real-world usage.

---

## SEP-38: Anchor RFQ (Request for Quote)

**Spec:** https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md  
**Version:** 2.5.0  
**Status:** Draft

### Requirements

Standardized API for anchors to provide quotes on asset exchanges:

- **`GET /info`** — Supported Stellar and off-chain assets.
- **`GET /prices`** — Available trading pairs with indicative prices.
- **`GET /price`** — Indicative price for a specific pair (provide `sell_amount` or `buy_amount`, not both).
- **`POST /quote`** — Request a firm quote (returns `id`, `price`, `expires_at`).
- **`GET /quote/:id`** — Retrieve a previously requested firm quote.

Asset identification format: `stellar:USDC:GBBD47...` (on-chain) or `iso4217:USD` (fiat).

Authentication: SEP-10/45 JWT required for `POST /quote` and `GET /quote/:id`. Optional for `/info`, `/prices`, `/price`.

### Noctis Compliance: ❌ Not implemented (Phase 2)

No SEP-38 integration exists. No quote requests are made.

### Relevance to Noctis — Global Payroll FX

SEP-38 is the backbone for cross-border payroll with FX conversion:

```
Employer funds in USDC
        │
        ▼
Noctis requests quote (SEP-38)
  sell_asset: "stellar:USDC:..."
  buy_asset: "iso4217:PHP"
  sell_amount: "10000"
        │
        ▼
Anchor returns firm quote (rate, expires_at)
        │
        ▼
Noctis initiates SEP-24 withdrawal or SEP-31 transfer
with quote_id to lock the rate
```

**Phase 2 use cases:**
- Employer deposits USDC → Noctis converts to local fiat (PHP, IDR, NGN) via anchor quote.
- Employee receives local currency via bank transfer or mobile money.
- Multi-currency payroll with guaranteed exchange rates (firm quotes with time-bound expiry).

### Implementation Guidance

1. **Requires SEP-10/45 auth** as prerequisite.
2. **Integrate with anchor's SEP-38 endpoint** (or Anchor Platform's built-in SEP-38).
3. **Frontend**: Quote display before payroll batch execution (show employer the exchange rate).
4. **Backend**: Fetch indicative prices for dashboard, request firm quotes before settlement.
5. **Integration with SEP-24**: Pass `quote_id` to deposit/withdrawal requests to lock rates.
6. **Integration with SEP-31**: Cross-border payment corridors use SEP-38 quotes for FX.

### Effort: ~2 weeks

| Task | Days |
|------|------|
| SEP-38 client integration (info, prices, price) | 3 |
| Firm quote request/management in backend | 2 |
| UI for quote display and approval | 2 |
| Quote-to-settlement pipeline (SEP-24/31) | 3 |
| Testing with anchor sandbox + edge cases | 2 |

### Priority: 🟢 Low (Phase 2 — FX for global payroll)

Not needed for testnet MVP. Essential for multi-currency payroll in Phase 2.

---

## SEP-41: Stellar Asset Standard (Token Interface)

**Spec:** https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md  
**Version:** 1.0.0  
**Status:** Active

### Requirements

Standard Soroban token interface (ERC-20-like) for contract-based assets:

| Function | Signature | Description |
|----------|-----------|-------------|
| `name` | `() -> String` | Token name |
| `symbol` | `() -> String` | Token symbol |
| `decimals` | `() -> u32` | Decimal places |
| `balance` | `(id: Address) -> i128` | Query balance |
| `transfer` | `(from, to, amount) -> ()` | Transfer tokens |
| `transfer_from` | `(spender, from, to, amount) -> ()` | Transfer on behalf |
| `approve` | `(from, spender, amount, expiration_ledger) -> ()` | Set allowance |
| `allowance` | `(from, spender) -> (i128, u32)` | Query allowance |
| `total_supply` | `() -> i128` | Total supply |
| `is_contract` | `(id: Address) -> bool` | Contract check |

Events: `transfer` (`[from, to]`, amount), `approval` (`[from, spender]`, amount, expiration_ledger).

### Noctis Compliance: ✅ Compliant (via SAC)

The Stellar Asset Contract (SAC) implements SEP-41 natively. All SAC-wrapped tokens (USDC, EURC, XLM, PYUSD, Ondo USDY, Spiko USTBL) are automatically SEP-41 compliant.

Noctis uses `token::TokenClient` for all token interactions, which connects to SAC-wrapped assets. The PRD lists SEP-41 as required and it is fully implemented.

### Nitpicks

1. **Custom token**: If Noctis introduces a native NOCTIS token (not SAC-wrapped), it must implement SEP-41 manually. The SAC wrapper should be preferred.
2. **Metadata extension**: SEP-41 does not require `info_server` (SEP-27) or dynamic metadata (SEP-14), but these may be needed for token discovery.

### What to Verify

- [ ] All token interactions use `token::TokenClient` (SEP-41 compliant).
- [ ] Any custom contract tokens implement the full SEP-41 interface (not just a subset).
- [ ] Event emissions follow SEP-41 `transfer` and `approval` topic format (important for Mercury indexing).

### Effort: ✅ Already compliant

No implementation work needed for SAC tokens. If adding custom token: ~3 days.

### Priority: 🔴 Required (already met for MVP)

---

## Summary: Implementation Roadmap

| SEP | Phase | Effort | Depends On | Blocking |
|-----|-------|--------|------------|----------|
| SEP-41 | Current | ✅ Done | — | — |
| SEP-10/45 | Current (MVP) | 1 week | Passkey Kit | SEP-12, SEP-24, SEP-38 |
| SEP-12 | Phase 2 | 2 weeks | SEP-10/45 | Regulated corridors |
| SEP-24 | Phase 2 | 3 weeks | SEP-10/45, SEP-12 | Fiat on/off ramp |
| SEP-7 | Phase 2 | 1 week | — | UX/deep links |
| SEP-38 | Phase 2 | 2 weeks | SEP-10/45 | Cross-border FX |

### Critical Path

```
SEP-10/45 ─→ SEP-12 ─→ SEP-24
                 │
                 └──→ SEP-38 ─→ SEP-31 (future)
```

**SEP-10/45 is the foundational dependency** — every other SEP integration requires authentication. Implement SEP-45 first.

### Recommended Order of Implementation

1. **SEP-45** (contract auth for Passkey Kit smart wallets) — prerequisite for all anchor interactions.
2. **SEP-24** (deposit/withdrawal with interactive flow) — highest user-facing value.
3. **SEP-12** (KYC collection) — needed before regulated deposits/withdrawals can proceed.
4. **SEP-38** (RFQ for FX quotes) — enables multi-currency payroll with locked rates.
5. **SEP-7** (URI scheme) — nice-to-have UX improvement for payment requests and deep links.
