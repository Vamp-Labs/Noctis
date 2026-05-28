# x402 + MPP Research — Noctis Agentic Payments

**Date:** 2026-05-28  
**Author:** Web3 Researcher  
**Context:** Phase 2 micropayment infrastructure for Noctis employer payroll streaming

---

## 1. x402 Protocol on Stellar

### 1.1 Overview

x402 is an open protocol from the **Coinbase Developer Platform** that activates the dormant HTTP `402 Payment Required` status code. On Stellar, it uses Soroban authorization (auth entry signing) for per-request payments — ideal for AI agents and API monetization.

**Key facts:**
- x402 v2 is the current version on Stellar
- Uses **Exact** payment scheme (one request, one payment)
- Facilitator-based: server does not touch blockchain directly
- Any SEP-41 token supported (default: USDC)
- Mainstream Stellar wallets support auth-entry signing (needed for clients)

### 1.2 HTTP Headers (V2)

| Header | Direction | Content |
|--------|-----------|---------|
| `PAYMENT-REQUIRED` | Server → Client | Base64-encoded `PaymentRequired` JSON |
| `PAYMENT-SIGNATURE` | Client → Server | Base64-encoded `PaymentPayload` JSON |
| `PAYMENT-RESPONSE` | Server → Client | Base64-encoded `SettlementResponse` JSON |

### 1.3 Payment Flow

```
Client                    Server                 Facilitator
  |                         |                         |
  |--- GET /resource ------->|                         |
  |                         |                         |
  |<--- 402 + PAYMENT-REQUIRED --|                     |
  |     (price, network,      |                         |
  |      payTo, scheme)      |                         |
  |                         |                         |
  |--- Signs auth entry -----|                         |
  |     (Soroban authorize)  |                         |
  |                         |                         |
  |--- retry with ---------->|                         |
  |    PAYMENT-SIGNATURE     |                         |
  |                         |--- /verify ------------->|
  |                         |<-- verified -------------|
  |                         |                         |
  |                         |--- /settle ------------->|
  |                         |     (submits tx)         |
  |                         |<-- settled --------------|
  |                         |                         |
  |<--- 200 + PAYMENT-RESPONSE --|                     |
  |     + resource data      |                         |
```

### 1.4 PaymentRequired Schema (Decoded from Base64)

```json
{
  "x402Version": 2,
  "error": "PAYMENT-SIGNATURE header is required",
  "resource": {
    "url": "https://api.noctis.dev/payroll/stream",
    "description": "Access to payroll streaming endpoint",
    "mimeType": "application/json"
  },
  "accepts": [
    {
      "scheme": "exact",
      "network": "stellar:testnet",
      "amount": "1000000",
      "asset": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2Q2A2VP6Q6YB7U7TB",  // USDC testnet SAC
      "payTo": "GB...NOCTIS_EMPLOYER_ADDRESS",
      "maxTimeoutSeconds": 60,
      "extra": {
        "name": "USDC",
        "version": "2"
      }
    }
  ],
  "extensions": {}
}
```

### 1.5 PaymentPayload Schema (Client Response)

```json
{
  "x402Version": 2,
  "resource": { "url": "...", "description": "...", "mimeType": "application/json" },
  "accepted": {
    "scheme": "exact",
    "network": "stellar:testnet",
    "amount": "1000000",
    "asset": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2Q2A2VP6Q6YB7U7TB",
    "payTo": "GB...",
    "maxTimeoutSeconds": 60,
    "extra": {}
  },
  "payload": {
    "signature": "<signed auth entry>",
    "authorization": {
      "from": "GC...CLIENT",
      "to": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2Q2A2VP6Q6YB7U7TB",  // USDC contract
      "value": "1000000",
      "validAfter": 1717000000,
      "validBefore": 1717000060,
      "nonce": "0x..."
    }
  }
}
```

### 1.6 Stellar-Specific Details

- **Auth entry signing**: Client signs a Soroban authorization entry (not the full tx). The facilitator rebuilds the full transaction and submits it.
- **Ledger-based expiration**: Default ~12 ledgers (~60s testnet)
- **Network identifiers**: `stellar:testnet`, `stellar:pubnet`, `stellar:*` (CAIP-28)
- **Default RPC**: `https://soroban-testnet.stellar.org` (testnet)
- **Facilitator**: OpenZeppelin x402 facilitator plugin — endpoints `/verify`, `/settle`, `/supported`

### 1.7 x402 Facilitator (OpenZeppelin)

| Network | URL | API Key |
|---------|-----|---------|
| Testnet | `https://channels.openzeppelin.com/x402/testnet` | Generate at [channels.openzeppelin.com](https://channels.openzeppelin.com/gen) |
| Mainnet | `https://channels.openzeppelin.com/x402` | Generate at [channels.openzeppelin.com](https://channels.openzeppelin.com/gen) |

### 1.8 Reference Implementations

- **SDK**: `@x402/stellar` (npm) — client, server, facilitator packages
- **GitHub**: [stellar/x402-stellar](https://github.com/stellar/x402-stellar) — examples, demo apps
- **Middleware**: `@x402/express` — Express.js payment middleware
- **Starter Template**: [1-shot Stellar x402 app](https://github.com/stellar/x402-stellar/tree/main/examples/simple-paywall)
- **Spec**: [coinbase/x402](https://github.com/coinbase/x402) — formal spec v2

---

## 2. MPP — Machine Payments Protocol (Meridian)

### 2.1 Overview

MPP is co-authored by **Tempo Labs** and **Stripe** (launched March 2026). Where x402 is Coinbase's stablecoin-focused protocol, MPP is payment-method agnostic and supports stablecoins, cards, Lightning, and session-based billing.

**Key facts:**
- Defined in an [IETF Internet-Draft](https://mpp.dev)
- Uses standard `WWW-Authenticate: Payment` / `Authorization: Payment` headers (RFC 9110)
- Stellar SDK: `@stellar/mpp` (npm) — maintained by Stellar Development Foundation
- Core framework: `mppx` (npm)

### 2.2 Payment Intents

| Intent | Description | Use Case |
|--------|-------------|----------|
| **Charge** | One-time on-chain SAC `transfer` per request | Simple pay-per-call APIs |
| **Channel** | Off-chain signed commitments, batch-settled | High-frequency streaming, micropayments |

### 2.3 x402 vs MPP Comparison

| Dimension | x402 | MPP |
|-----------|------|-----|
| Origin | Coinbase Developer Platform | Tempo Labs + Stripe |
| Payment methods | Stablecoins only (USDC) | Stablecoins, cards, Lightning, custom |
| Headers | Custom: `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE` | Standard: `WWW-Authenticate`, `Authorization` |
| Session/channel support | No (one-off only) | Yes — `channel` intent for streaming |
| Facilitator | Required (OpenZeppelin or Coinbase) | No facilitator needed for charge (P2P) |
| Fee sponsorship | Via facilitator | Server can pay fees (pull mode) |
| Stellar SDK | `@x402/stellar` | `@stellar/mpp` |
| Stellar support | Auth entry signing via facilitator | Direct SAC transfers, no intermediary |

### 2.4 MPP Architecture (Charge Intent)

```
Client                          Server
  |                               |
  |--- GET /resource ------------->|
  |                               |
  |<--- 402 + WWW-Authenticate: Payment --|
  |     (scheme, network, amount)  |
  |                               |
  |--- Builds & signs SAC transfer |
  |     (auth entry only, or full) |
  |                               |
  |--- retry with Authorization: Payment ->|
  |     (signed payload)           |
  |                               |
  |--- Server validates via ------>| simulation
  |     simulation                |
  |                               |
  |--- Server broadcasts tx ------>| Stellar Network
  |                               |
  |<--- 200 + resource ------------|
```

### 2.5 MPP Architecture (Channel/Session Intent)

```
Client                              Server
  |                                   |
  |--- Deploy one-way-channel ------->| (on-chain)
  |     contract + deposit USDC       |
  |                                   |
  |--- Request w/ signed commitment ->| (off-chain)
  |     (cumulative amount, sig)      |
  |                                   |
  |--- Server simulates --------------| prepare_commitment
  |     to verify                    |
  |                                   |
  |<--- Response + resource ----------|
  |                                   |
  |--- (repeat N times) ------------->|
  |                                   |
  |--- Server calls close() --------->| (on-chain, final settlement)
  |     with highest commitment       |
```

### 2.6 MPP Stellar SDK Quickstart

**Server (charge intent):**
```ts
import { Mppx } from "mppx/server";
import { stellar } from "@stellar/mpp/charge/server";
import { USDC_SAC_TESTNET } from "@stellar/mpp";

const mppx = Mppx.create({
  secretKey: process.env.MPP_SECRET_KEY,
  methods: [
    stellar.charge({
      recipient: "GB...NOCTIS_ADDRESS",
      currency: USDC_SAC_TESTNET,
      network: "stellar:testnet",
    }),
  ],
});

// Use with Express, etc.
```

**Server (channel intent):**
```ts
import { Mppx, stellar, Store } from "@stellar/mpp/channel/server";

const mppx = Mppx.create({
  secretKey: process.env.MPP_SECRET_KEY,
  methods: [
    stellar.channel({
      channel: "C...CHANNEL_CONTRACT",  // deployed one-way-channel
      commitmentKey: "G...FUNDER_PUBKEY",
      store: Store.memory(),            // tracks cumulative amounts
      network: "stellar:testnet",
    }),
  ],
});
```

### 2.7 Key Constants

```ts
import {
  USDC_SAC_MAINNET,
  USDC_SAC_TESTNET,
  XLM_SAC_MAINNET,
  XLM_SAC_TESTNET,
} from "@stellar/mpp";
```

---

## 3. Recommended Architecture for Noctis

### 3.1 Use Case: Employer Payroll Streaming

Noctis needs a recurring micropayment flow where employers fund streaming payroll sessions. The **MPP channel intent** is the recommended approach:

```
Employer                     Noctis Backend                 Stellar Network
   |                             |                              |
   |--- Fund session ------------->|                             |
   |     (USDC deposit to         |-- deploy/use --------------->|
   |      channel contract)       |    one-way-channel           |
   |                             |    contract                   |
   |                             |                              |
   |--- Submit payroll weeks ---->|                             |
   |     (off-chain commitment    |-- verify via simulation ---->|
   |      with cumulative amount) |    (no on-chain tx)         |
   |                             |                              |
   |<--- Stream confirmed --------|                             |
   |                             |                              |
   |--- (repeat each pay -------->|                             |
   |     period)                  |                              |
   |                             |                              |
   |--- Close period -------------|                             |
   |                             |-- close() ------------------>|
   |                             |    (single on-chain tx)      |
   |                             |    settles net amount        |
   |                             |    to employee contract      |
```

### 3.2 Why MPP Channel > x402 for Noctis

| Requirement | x402 | MPP Channel |
|-------------|------|-------------|
| Pay per employee per period | N on-chain tx | 2 on-chain tx (open + close) |
| Micropayments | 1 tx per $0.01 | 0 tx per commitment |
| Facilitator dependency | Required | Not required (P2P) |
| Fee sponsorship | Via facilitator | Native (server pays) |

### 3.3 When to Use x402

x402 is useful for Noctis for **one-off API monetization** — e.g., employer pays $0.01 to access a premium audit report. For recurring streaming payroll, always use MPP channel.

### 3.4 Fallback: MPP Charge

If channel contract deployment is too complex for Phase 2, start with MPP charge (one tx per payout) and migrate to channel later. MPP charge is a one-line change.

---

## 4. Testnet Configuration

| Parameter | Value |
|-----------|-------|
| Network passphrase | `Test SDF Network ; September 2015` |
| RPC URL | `https://soroban-testnet.stellar.org` |
| USDC SAC (testnet) | Use `USDC_SAC_TESTNET` from `@stellar/mpp` (resolved automatically by SDK) |
| Channel contract | Deploy via `stellar contract deploy` or use pre-deployed testnet address |
| MPP secret key | Any random string for local credential verification |
| x402 facilitator (testnet) | `https://channels.openzeppelin.com/x402/testnet` |

### 4.1 Sample cURL: x402 Flow

```bash
# Step 1: Request resource
curl -v https://api.noctis.dev/payroll/stream

# Server responds 402 with PAYMENT-REQUIRED header
# Decode the base64 header to get payment requirements

# Step 2: Client signs auth entry, retries with PAYMENT-SIGNATURE
curl -X GET https://api.noctis.dev/payroll/stream \
  -H 'PAYMENT-SIGNATURE: <base64-encoded PaymentPayload>' \

# Step 3: Server returns 200 + PAYMENT-RESPONSE header on success
```

### 4.2 Sample cURL: Mercury GraphQL Query

```bash
curl 'https://api.mercurydata.app/graphql' \
  -H 'authorization: Bearer YOUR_JWT' \
  -H 'content-type: application/json' \
  --data-raw '{
    "query": "query { allZephyr85B036892719B0A99Aa987B1F62E9B10S { edges { node { hello } } } }"
  }'
```

---

## 5. Known Gaps & Speculative Items

| Item | Status |
|------|--------|
| x402 Stellar-specific RFC | Not found — only Coinbase generic spec + Stellar docs |
| MPP one-way-channel contract testnet address | Self-deploy required (no pre-deployed address found) |
| MPP mainnet readiness | Live on mainnet (March 2026) but channel contract is new |
| OpenZeppelin x402 facilitator SLA | No published SLA — treat as best-effort |
| @stellar/mpp SDK maturity | Active development by Stellar Foundation, well-documented |

---

## 6. Recommendations

1. **Default to MPP channel** for employer payroll streaming — 2 on-chain tx per funding cycle, unlimited off-chain commitments
2. **Build MPP charge as fallback** — simpler implementation, can ship earlier
3. **Use x402 only** for optional premium API endpoints (e.g., audit report access)
4. **Self-deploy the one-way-channel contract** — no pre-deployed testnet address found; deployment is straightforward
5. **Do NOT depend on x402 facilitator for core payroll** — it adds third-party dependency; MPP is P2P and trust-minimized
6. **Monitor `@stellar/mpp` releases** — SDK is evolving rapidly

---

## 7. References

- [Stellar x402 Docs](https://developers.stellar.org/docs/build/agentic-payments/x402)
- [Stellar MPP Docs](https://developers.stellar.org/docs/build/agentic-payments/mpp)
- [x402 Spec v2](https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md)
- [MPP vs x402](https://mpp.dev/mpp-vs-x402)
- [@stellar/mpp on npm](https://www.npmjs.com/package/@stellar/mpp)
- [@x402/stellar on npm](https://www.npmjs.com/package/@x402/stellar)
- [OpenZeppelin x402 Facilitator](https://docs.openzeppelin.com/relayer/guides/stellar-x402-facilitator-guide)
- [MPP Specification](https://mpp.dev)
