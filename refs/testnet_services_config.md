# Testnet Services Configuration — Noctis

**Date:** 2026-05-28  
**Author:** Web3 Researcher  
**Context:** Backend Engineer tasks T2 (Launchtube relay) and T3 (Mercury indexer)

---

## 1. Launchtube

### 1.1 What Is Launchtube?

Launchtube is a **fee-bumping relay service** created by Tyler van der Hoeven (kalepail). It accepts Soroban operations, handles simulation, sequence numbers, fee management, and transaction submission. Users do NOT need XLM or G-addresses — Launchtube wraps transactions in fee-bump transactions with its own accounts.

**Status:** ⚠️ **Being deprecated** by Stellar Development Foundation in favor of the [OpenZeppelin Relayer](https://developers.stellar.org/docs/tools/openzeppelin-relayer) (Stellar Channels Service). Launchtube is functional for testing but has no SLA, no auditing, and is not recommended for production.

### 1.2 Endpoints

| Network | URL |
|---------|-----|
| Testnet | `https://testnet.launchtube.xyz` |
| Mainnet | `https://launchtube.xyz` |

### 1.3 Authentication

Launchtube uses **JWT bearer tokens** for authentication. Credits are denominated in stroops (1 XLM = 10,000,000 stroops).

| Action | URL | Method |
|--------|-----|--------|
| Generate testnet JWT | `https://testnet.launchtube.xyz/gen` | GET (browser) |
| Generate mainnet JWT | Join `#launchtube` on Stellar Discord | Manual |
| Activate token (claim code) | `POST /activate` | POST |
| Create token from web form | `GET /claim?code=<code>` | GET |
| Check remaining credits | `GET /info` | GET (with `Authorization: Bearer <jwt>`) |

### 1.4 API

**Submit Transaction:**
```bash
curl -X POST https://testnet.launchtube.xyz \
  -H 'Authorization: Bearer <jwt>' \
  -H 'Content-Type: application/json' \
  -d '{
    "network": "testnet",
    "operations": [
      {
        "op": "invoke_host_function",
        "contract_id": "<contract_id>",
        "function": "transfer",
        "args": ["<from>", "<to>", "1000000"]
      }
    ],
    "sim": true,
    "invoker": "<G... invoker address>"
  }'
```

**Parameters:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `network` | string | `testnet` | `testnet` or `mainnet` |
| `operations` | array | required | Soroban operations array |
| `sim` | boolean | `true` | Let Launchtube handle simulation |
| `invoker` | string | — | Borrow invoker auth for auth entries |

**Response Headers:**
- `X-Credits-Remaining`: String — remaining credits in stroops
- `X-Transaction-Id`: String — on-chain tx hash on success

### 1.5 Credit System

| Stage | Cost (stroops) |
|-------|---------------|
| Initial submission | 100,000 |
| Simulation failure | 100,000 (no refund) |
| Simulation success | 100,000 refunded, bid fee charged |
| Submission success | Bid fee refunded, final tx fee charged |

### 1.6 Fee Rates

- Default max fee: 1,000,000 stroops (0.1 XLM) — configurable
- If `sim=false`: timeout must be ≤30s, inclusion fee ≤201 stroops

### 1.7 Integration Pattern

Launchtube wraps submitted operations in a fee-bump transaction using its own funded accounts:
- **Fund relayer**: pays fees
- **Sequence relayer accounts** (≥2): manage sequence numbers for parallel processing

This is configured via OpenZeppelin Relayer's Launchtube plugin (environment-driven in newer versions).

### 1.8 Recommendation for Noctis

**Do not build on Launchtube.** Use OpenZeppelin Relayer (Channels) instead:
- Testnet endpoint: `https://channels.openzeppelin.com/testnet`
- Mainnet endpoint: `https://channels.openzeppelin.com`
- API key: Generate at [channels.openzeppelin.com/gen](https://channels.openzeppelin.com/gen)
- Supports fee bump, sponsored transactions, and has an SLA

---

## 2. Mercury Indexer

### 2.1 What Is Mercury?

Mercury is a **Stellar-native high-performance indexer** by Xycloo Labs. It provides:
- **Mercury Classic**: GraphQL API for Classic Stellar operations (payments, balances, account objects)
- **Retroshades**: Streamlined Soroban event indexing
- **ZephyrVM**: Cloud execution environment for custom indexing logic

### 2.2 Endpoints

| Service | Testnet | Mainnet |
|---------|---------|---------|
| Retroshades / Classic REST | `https://api.mercurydata.app/rest` | `https://mainnet.mercurydata.app/rest` |
| GraphQL API | `https://api.mercurydata.app/graphql` | `https://mainnet.mercurydata.app/graphql` |
| GraphiQL Playground | `https://api.mercurydata.app:2083/graphiql` | — |
| RPC | — | `https://mainnet-rpc.mercurydata.app/` |

Note: The GraphQL endpoint is shared; the network is determined by the projects/tables you query.

### 2.3 Authentication

Mercury uses **JWT bearer tokens** for authentication:

1. Create an account at [mercurydata.app](https://mercurydata.app)
2. Generate an API key from the Mercury dashboard
3. Include in requests: `Authorization: Bearer YOUR_JWT`

#### Mercury SDK

```ts
import { Mercury } from "mercury-sdk";

const mercury = new Mercury({
  backendEndpoint: "https://api.mercurydata.app",
  graphqlEndpoint: "https://api.mercurydata.app",
  apiKey: process.env.MERCURY_API_KEY,
});
```

### 2.4 Indexed Data (Mercury Classic)

| Query | Description |
|-------|-------------|
| `paymentsByPublicKey(pk)` | Payments sent from an account |
| `paymentsToPublicKey(pk)` | Payments received by an account |
| `balanceByPublicKey(pk)` | Account balances (native, assets, LP shares) |
| `accountObjectByPublicKey(pk)` | Account metadata (seq num, sub-entries) |
| `operationsByPublicKey(pk)` | All operations for an account |

### 2.5 Soroban Event Indexing

Mercury indexes **Soroban contract events** via:
1. **Retroshades**: Subscribe to specific contract IDs and event topics
2. **ZephyrVM**: Write custom Rust programs that process ledger metadata
3. **Mercury Classic**: GraphQL queries for contract events (requires subscription setup)

The subscription process:
1. Log into Mercury dashboard
2. Create subscription → insert contract ID + event topic XDR
3. Mercury begins indexing that contract's events
4. Query via GraphQL with auto-generated table names

**Important:** Mercury Classic (non-Retroshades) requires pre-subscription. It does NOT index all Soroban events by default — you must tell it which contracts to watch.

### 2.6 Sample Queries

**Payments by account:**
```graphql
query {
  paymentsByPublicKey(publicKeyText: "GB...") {
    nodes {
      amount
      assetByAsset { code issuer }
      assetNative
      txInfoByTx {
        txHash
        fee
        ledgerByLedger { sequence closeTime }
        opCount
      }
      accountByDestination { publickey }
    }
  }
}
```

**Contract events (Zephyr):**
```graphql
query {
  allZephyr85B036892719B0A99Aa987B1F62E9B10S {
    edges {
      node {
        hello
      }
    }
  }
}
```

### 2.7 Pricing

Mercury pricing is **not publicly documented**. Historical context:
- Testnet access: Free with API key
- Mainnet: "Access is currently given on request to some teams" (per docs)
- ZephyrVM hosting: Custom pricing (contact Xycloo Labs)

### 2.8 Recommendation for Noctis

Mercury is **suitable for Phase 2+** (event indexing, historical queries). For Phase 1:
- Use Horizon or Stellar Expert API for simple balance/transaction lookups
- Mercury requires subscription setup for contract events — plan ahead

---

## 3. Galexie

### 3.1 What Is Galexie?

Galexie is a **self-hosted data extraction tool** from Stellar Development Foundation. It is NOT a hosted service — you run it on your own infrastructure.

**Purpose:** Export raw Stellar ledger metadata (in XDR format) to cloud storage (GCS or S3) for building custom data lakes.

### 3.2 Testnet Availability

Galexie works on **any Stellar network** (testnet, mainnet, futurenet). Configuration:
```toml
[stellar_core_config]
network = "testnet"

[datastore_config]
type = "GCS"
[datastore_config.params]
destination_bucket_path = "stellar-network-data/testnet"

[datastore_config.schema]
ledgers_per_file = 1
files_per_partition = 64000
```

### 3.3 Running Galexie

```bash
# Docker (recommended)
docker pull stellar/stellar-galexie:v26.0.0

# Run in continuous mode
stellar-galexie append --start <ledger> --config-file config.toml

# Fill gaps
stellar-galexie scan-and-fill --start <start> --end <end> --config-file config.toml
```

### 3.4 Galexie vs Mercury

| Dimension | Galexie | Mercury |
|-----------|---------|---------|
| Hosting | Self-hosted | Cloud-hosted (Xycloo) |
| Data format | Raw XDR (ledger metadata) | Processed + GraphQL |
| Storage | GCS/S3 cloud bucket | Mercury's own database |
| Setup effort | High (run infra) | Low (API key only) |
| Soroban events | Yes (raw XDR) | Yes (via Retroshades/Classic) |
| Best for | Custom data pipelines, analytics | Quick queries, app integration |

### 3.5 Recommendation for Noctis

Galexie is **overkill for Phase 1-2**. Use Mercury or Stellar Expert. Galexie becomes relevant in Phase 3 if Noctis needs:
- Custom audit data pipelines
- Full historical ledger replay
- Compliance data lakes

---

## 4. Alternative Indexers

### 4.1 Stellar Expert API

**URL:** `https://api.stellar.expert/explorer/`  
**Docs:** [stellar.expert/openapi.html](https://stellar.expert/openapi.html)  
**Auth:** None (public, free)  
**Rate limit:** Not documented (generous)

**Available endpoints:**
- `GET /explorer/directory` — Account directory lookup, search
- `GET /explorer/directory/{address}` — Single account directory info
- `GET /explorer/asset` — Asset info
- `GET /explorer/{network}/` — Network-specific explorer data

**Networks supported:** Mainnet, Testnet (via `stellar.expert/explorer/testnet`)

**Sample:**
```bash
# Directory lookup
curl "https://api.stellar.expert/explorer/directory?address[]=GA6HCMBLTZS5VYYBCATRBRZ3BZJMAFUDKYYF6AH6MVCMGWMRDNSWJPIH"

# Search
curl "https://api.stellar.expert/explorer/directory?search=kraken"
```

**Pros:** Free, no auth, simple REST API  
**Cons:** Limited query surface (no custom contract events, no Soroban indexing)

### 4.2 Horizon (Deprecating)

**URLs:**
- Testnet: `https://horizon-testnet.stellar.org`
- Mainnet: `https://horizon.stellar.org`

**Status:** Being **phased out** in favor of Soroban RPC + indexers. Still functional on testnet/mainnet but no new features. Not recommended for new integrations.

**Use cases:** Balance queries, transaction history, account details (all Classic operations).

### 4.3 Stellar Chain API (Third-Party)

Various third-party RPC providers offer Stellar access:
- [QuickNode](https://www.quicknode.com/chains/stellar) — Mainnet + Testnet RPC endpoints
- Public Soroban RPC: `https://soroban-testnet.stellar.org` (rate-limited, no auth)

### 4.4 Comparison Matrix

| Service | Type | Soroban Events | Auth | Cost | Best For |
|---------|------|---------------|------|------|----------|
| Mercury | Cloud indexer | ✅ (subscription) | JWT/API key | Unknown (testnet free) | Contract event queries, custom indexes |
| Stellar Expert | Public API | ❌ | None | Free | Account directory, asset lookup |
| Horizon | REST API | ❌ | None | Free | Legacy Classic queries |
| Galexie | Self-hosted | ✅ (raw XDR) | GCP/AWS creds | Infra cost | Data lakes, compliance |
| OpenZeppelin Relayer | Tx submission | N/A | API key | Paid (testnet free) | Fee bump, sponsored tx |
| QuickNode | RPC provider | ✅ | API key | Paid | Dedicated RPC throughput |

---

## 5. Recommended Stack for Noctis

| Task | Service | Priority |
|------|---------|----------|
| Read account balances / history | Mercury or Stellar Expert | P1 |
| Write Soroban transactions | OpenZeppelin Relayer | P1 |
| Index contract events (payroll, transfer) | Mercury (Retroshades) | P2 |
| Historical data lake / compliance | Galexie (self-hosted) | P3 |
| Fee bump / sponsored transactions | OpenZeppelin Relayer | P1 |

### 5.1 Phase 1 Config

```env
# Noctis backend .env
STELLAR_NETWORK=testnet
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
MERURY_API_KEY=<from mercurydata.app>
MERURY_GRAPHQL_ENDPOINT=https://api.mercurydata.app
OPENZEPPELIN_RELAYER_URL=https://channels.openzeppelin.com/testnet
OPENZEPPELIN_API_KEY=<from channels.openzeppelin.com/gen>
```

### 5.2 Phase 2 Additions

```env
# Add for Phase 2
LAUNCHTUBE_URL=https://testnet.launchtube.xyz      # Only if using legacy
LAUNCHTUBE_JWT=<from testnet.launchtube.xyz/gen>    #
GALEXIE_BUCKET=gs://noctis-stellar-data-testnet     # Phase 3 only
```

---

## 6. References

- [Launchtube GitHub](https://github.com/kalepail/launchtube)
- [OpenZeppelin Relayer — Stellar](https://docs.openzeppelin.com/relayer/1.3.x/stellar)
- [OpenZeppelin x402 Facilitator](https://docs.openzeppelin.com/relayer/guides/stellar-x402-facilitator-guide)
- [Mercury Documentation](https://docs.mercurydata.app)
- [Mercury SDK](https://mercury-sdk.paltalabs.io)
- [Galexie Documentation](https://developers.stellar.org/docs/data/indexers/build-your-own/galexie)
- [Stellar Expert API](https://stellar.expert/openapi.html)
- [Stellar Indexers Overview](https://developers.stellar.org/docs/data/indexers)
