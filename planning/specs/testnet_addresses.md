# Testnet Addresses — ZK-SDP
## Stellar Testnet (Protocol 26 — Yardstick)
### Updated: June 19, 2026

---

> **Populate these addresses as contracts are deployed during Sprint 1.**

---

## Deployed Contracts

| Contract | Address | Deployed By | Date | Tx Hash (Deploy) | Status |
|----------|---------|-------------|------|-------------------|--------|
| UltraHonkVerifierContract | `_TBD_` | Smart Contract Engineer | — | — | 🔲 |
| ConfidentialPayrollContract | `_TBD_` | Smart Contract Engineer | — | — | 🔲 |
| USDC SAC (testnet) | `CBIELTK6YBZJU5UP2WWQEQ4YkSB1C3ED7JOMDLIN7YNKPOTFPJVULQH` | Stellar Foundation | — | — | ✅ Known |

---

## Verification Key

| Parameter | Value |
|-----------|-------|
| Circuit | `payroll_withdrawal.nr` |
| VK Hash | `_TBD_` |
| VK Bytes File | `circuits/payroll_withdrawal/target/vk` |

---

## Test Accounts

| Role | Public Key | Secret Key (⚠️ Testnet Only) | Funded? | Notes |
|------|-----------|------------------------------|---------|-------|
| Employer | `_TBD_` | `_TBD_` | 🔲 | Needs testnet USDC + XLM |
| Employee 1 | `_TBD_` | `_TBD_` | 🔲 | Only needs XLM for fees |
| Employee 2 | `_TBD_` | `_TBD_` | 🔲 | Only needs XLM for fees |
| Employee 3 | `_TBD_` | `_TBD_` | 🔲 | Only needs XLM for fees |

---

## Network Configuration

```json
{
  "network": "TESTNET",
  "networkPassphrase": "Test SDF Network ; September 2015",
  "rpcUrl": "https://soroban-testnet.stellar.org",
  "friendbotUrl": "https://friendbot.stellar.org",
  "horizonUrl": "https://horizon-testnet.stellar.org",
  "protocolVersion": 26
}
```

---

## Infrastructure (Free Tier)

| Service | URL | Credentials | Limits |
|---------|-----|-------------|--------|
| Cloudflare Pages | `https://zksdp.pages.dev` | Connected via GitHub | Free: unlimited bandwidth, 500 builds/mo |
| Supabase Project | `https://[project].supabase.co` | Anon key (public) + Service role (private) | Free: 500MB DB, 500k Edge Function invocations/mo, 200 Realtime connections |
| Supabase Edge Functions | `https://[project].supabase.co/functions/v1/` | Anon key in `Authorization` header | Free tier |

### Supabase Environment Variables

| Variable | Value | Where Used |
|----------|-------|------------|
| `SUPABASE_URL` | `https://[project].supabase.co` | All Edge Functions |
| `SUPABASE_ANON_KEY` | `_TBD_` | Frontend (Realtime client) + batch-status function |
| `SUPABASE_SERVICE_ROLE_KEY` | `_TBD_` | event-indexer function (for DB writes) |
| `PAYROLL_CONTRACT_ID` | `_TBD_` | event-indexer function |
| `STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org` | event-indexer function |

---

## Circuit Artifact Serving

| Artifact | URL | Size |
|----------|-----|------|
| Circuit JSON | `https://zksdp.pages.dev/circuits/payroll_withdrawal.json` | _TBD_ |
| WASM (Barretenberg) | CDN (loaded by `@noir-lang/backend_barretenberg`) | ~20-40 MB |

---

## Deployment History

| Date | Action | By | Notes |
|------|--------|----|-------|
| — | — | — | — |

---

*Update this document as deployments happen. PM tracks this.*
