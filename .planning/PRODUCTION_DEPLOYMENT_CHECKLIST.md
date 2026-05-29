# 🚀 SPRINT 3 — PRODUCTION DEPLOYMENT CHECKLIST (DEV-014)
## Mainnet Launch Preparation (Target: Late July 2026)

**Author:** Product Manager  
**Audience:** DevOps, Backend Engineer, Security Engineer  
**Target:** M10 (Production Ready: Jul 9)  
**Status:** ✅ CHECKLIST COMPLETE — READY FOR EXECUTION

---

## TABLE OF CONTENTS

1. [Pre-Launch Governance](#1-pre-launch-governance)
2. [Infrastructure Readiness](#2-infrastructure-readiness)
3. [Smart Contract Deployment](#3-smart-contract-deployment)
4. [API & Backend Deployment](#4-api--backend-deployment)
5. [Frontend Deployment](#5-frontend-deployment)
6. [Launch Sequence](#6-launch-sequence)
7. [Post-Launch Monitoring](#7-post-launch-monitoring)
8. [Emergency Response Plan](#8-emergency-response-plan)
9. [Rollback Plan](#9-rollback-plan)

---

## 1. PRE-LAUNCH GOVERNANCE

### 1.1 Protocol Fee Governance (GOV-001)
- [ ] Governance proposal drafted: enables 0.05% protocol fee on yield routing
- [ ] Posted to governance forum (Jul 7) — 7-day discussion period
- [ ] Snapshot off-chain vote (Jul 14-17) — 3-day voting
- [ ] On-chain execution via multi-sig (Jul 17+)
- [ ] Fee implementation active post-passage

### 1.2 Multi-Sig Configuration
- [ ] Gnosis Safe deployed on Stellar mainnet
- [ ] Signers configured (3/5 or 4/7 threshold)
- [ ] Signer identities verified (team leads, community representatives)
- [ ] Emergency pause signer role configured
- [ ] Timelock configured (minimum 24h delay on admin operations)
- [ ] Test transactions executed on testnet multi-sig first

### 1.3 Legal & Compliance (External Counsel)
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Compliance review passed (SEP-8/SEP-24 regulatory readiness)
- [ ] Risk disclosures documented
- [ ] Mainnet token usage disclaimers acknowledged

---

## 2. INFRASTRUCTURE READINESS

### 2.1 Network Configuration

```
[ ] Mainnet RPC endpoints configured:
    Primary:   https://soroban-rpc.stellar.org
    Secondary: https://rpc.stellar.org (public)
    Backup:    https://mainnet.stellar.validationcloud.io (API key)

[ ] Network passphrase: "Public Global Stellar Network ; September 2015"
[ ] Stellar RPC health endpoint: GET /health → {"status": "ok"}
[ ] Horizon (deprecated — read-only fallback): https://horizon.stellar.org
```

### 2.2 Server Infrastructure

```
[ ] Production server specs:
    CPU: 4+ cores (AMD EPYC / Intel Xeon)
    RAM: 16 GB minimum
    Storage: 100 GB SSD (NVMe preferred)
    Network: 1 Gbps dedicated

[ ] Docker images built and tested:
    [ ] soroban-rpc v26.0.0
    [ ] mercury-indexer
    [ ] nox-backend (API server)
    [ ] nox-frontend (Next.js)

[ ] Kubernetes configuration (if applicable):
    [ ] Pod resource limits configured
    [ ] Horizontal Pod Autoscaler configured
    [ ] Readiness/liveness probes configured
    [ ] Service mesh (Istio/linkerd) for mTLS

[ ] Load balancer:
    [ ] SSL termination (Let's Encrypt / AWS Certificate Manager)
    [ ] Rate limiting: 1000 req/min per IP
    [ ] DDoS protection (Cloudflare / AWS Shield)
```

### 2.3 Monitoring & Alerting

```
[ ] Datadog / Grafana dashboard configured:
    [ ] Contract invocation rate (tx/min)
    [ ] Gas consumption trends
    [ ] Error rate (by error type)
    [ ] RPC latency (p50, p95, p99)
    [ ] TVL (total value locked)
    [ ] Active streams count
    [ ] User registrations (daily)

[ ] PagerDuty / Opsgenie escalation:
    [ ] P0: Contract halted or funds at risk → 15-min response
    [ ] P1: API down or degraded → 30-min response
    [ ] P2: UI errors, latency spikes → 2-hour response
    [ ] P3: Minor bugs, cosmetic issues → next business day

[ ] Slack/Telegram bot alerts:
    [ ] #noctis-alerts channel configured
    [ ] Alert on: error rate > 1%, latency > 5s, downtime
    [ ] Daily digest: TVL, users, volume, fees
```

### 2.4 Database & Indexing

```
[ ] Mercury/Galexie indexer synced from genesis:
    [ ] Indexer catch-up complete (latency < 10s from head)
    [ ] Event schema deployed for all 5 contracts
    [ ] Historical data backfilled

[ ] Subgraph (if using The Graph):
    [ ] Subgraph manifest (schema.graphql) deployed
    [ ] Subgraph synced (current block)
    [ ] Query latency < 500ms for standard queries
```

### 2.5 Secrets Management

```
[ ] HashiCorp Vault / AWS Secrets Manager:
    [ ] Stellar private keys stored (encrypted at rest)
    [ ] RPC API keys stored
    [ ] Database credentials stored
    [ ] Multi-sig signer keys stored (offline preferred)

[ ] Environment variables:
    [ ] STELLAR_NETWORK=MAINNET (hardcoded guard removed for mainnet)
    [ ] STELLAR_RPC_URL configured
    [ ] LAUNCHTUBE_API_KEY configured
    [ ] Passkey Kit config for mainnet
```

---

## 3. SMART CONTRACT DEPLOYMENT

### 3.1 Pre-Deployment Verification

```
[✅] All 5 contracts compiled with --release (wasm32v1-none)
[✅] WASM binary hashes recorded:
    ∑ payroll_dispatcher.wasm:   8dafb18cdccb5130c7278c21cd15dbf93911f06a027e753e7e72540e4b94674d
    ∑ streaming_vault.wasm:      90799aa95374a72d34adefe7f3574f52d41f915a138a61e19f22f527de7e2338
    ∑ wallet_factory.wasm:       2e5f7a56e109197e6121fed246c759064a1ce0d374cae56a101893bac771c6b8
    ∑ yield_router.wasm:         20e644175c9cd64e259ff7c72fc059053b28563f4a63d527e2526f6d0fbaa4d9
    ∑ policy_signer.wasm:        756769cf4fdd6a65c328196ff4f6541555eaada1f38fbc6e5d45e19f66439201

[✅] WASM size checked (target: < 100KB each):
    payroll_dispatcher.wasm:     17 KB
    streaming_vault.wasm:        15 KB
    wallet_factory.wasm:          9 KB
    yield_router.wasm:           17 KB
    policy_signer.wasm:          12 KB

[ ] Deterministic build verified:
    [ ] Same commit = same WASM hash (CI reproducible)
    [ ] Docker build environment identical to CI
```

### 3.2 Deployment Order

```
STEP 1: policy_signer (no dependencies)
  └── soroban contract deploy \
        --wasm target/wasm32-unknown-unknown/release/policy_signer.wasm \
        --source <DEPLOYER_KEY> \
        --network mainnet
  └── Initialize: __constructor(admin=multi-sig_address)

STEP 2: streaming_vault (no dependencies)
  └── soroban contract deploy --wasm streaming_vault.wasm ...
  └── __constructor(admin=multi-sig_address)

STEP 3: wallet_factory (no dependencies)
  └── soroban contract deploy --wasm wallet_factory.wasm ...
  └── __constructor(admin=multi-sig_address)

STEP 4: yield_router (no dependencies)
  └── soroban contract deploy --wasm yield_router.wasm ...
  └── __constructor(admin=multi-sig_address)
  └── register_source("Blend", <Blend_Pool_Address>)
  └── register_source("Soroswap", <Soroswap_Pool_Address>)

STEP 5: payroll_dispatcher (depends on all above)
  └── soroban contract deploy --wasm payroll_dispatcher.wasm ...
  └── __constructor(admin=multi-sig_address)
  └── configure(
        policy_signer=<ADDR>,
        streaming_vault=<ADDR>,
        yield_router=<ADDR>,
        trusted_setup_hash=<ZK_VERIFICATION_KEY_HASH>
      )
```

### 3.3 Post-Deployment Verification

```
[ ] All contracts verified on Stellar Expert / Stellar Chain:
    [ ] policy_signer:   _______________
    [ ] streaming_vault: _______________
    [ ] wallet_factory:  _______________
    [ ] yield_router:    _______________
    [ ] payroll_dispatcher: _______________

[ ] Contract-to-contract calls test:
    [ ] payroll_dispatcher → policy_signer: verify_policy() returns true
    [ ] payroll_dispatcher → streaming_vault: create_stream() succeeds
    [ ] payroll_dispatcher → yield_router: route_yield() succeeds
    [ ] streaming_vault → token: transfer() works

[ ] Admin functions tested:
    [ ] pause/unpause works on each contract
    [ ] configure() can update addresses
    [ ] Multi-sig required for admin operations
```

### 3.4 Network Guard

```
[ ] Testnet guard removed:
    [ ] STELLAR_NETWORK !== "MAINNET" → allow mainnet
    [ ] Remove: if network == "testnet" { reject }
    [ ] Add: if network == "unknown" { reject }

[ ] RPC endpoints updated:
    [ ] Testnet endpoint: soroban-testnet.stellar.org → MAINNET
    [ ] Friendbot (testnet only) disabled
    [ ] Horizon testnet references removed

[ ] Frontend network selector:
    [ ] Only MAINNET option visible (testnet hidden)
    [ ] User warned: "This is mainnet. Real funds at stake."
```

---

## 4. API & BACKEND DEPLOYMENT

### 4.1 API Endpoint Inventory

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/v1/health` | GET | Health check | None |
| `/v1/tvl` | GET | Total value locked | None |
| `/v1/streams/:id` | GET | Stream details | Passkey |
| `/v1/streams/employee/:addr` | GET | Employee streams list | Passkey |
| `/v1/batches/:id` | GET | Batch details | Passkey |
| `/v1/yield/rates` | GET | Current yield rates | None |
| `/v1/policies/employer/:addr` | GET | Employer policies | Passkey |
| `/v1/wallet/:owner` | GET | Wallet lookup | Passkey |

### 4.2 Deployment Steps

```
[ ] API server:
    [ ] Docker image tagged and pushed to registry
    [ ] Kubernetes/ECS deployment configured
    [ ] Environment variables set (secrets manager)
    [ ] Health check passes: GET /v1/health → {"status":"ok"}
    [ ] Rate limiting active

[ ] Database:
    [ ] Migration run (if applicable)
    [ ] Connection pool configured (max 25 connections)
    [ ] Read replicas configured (if needed for scale)
    [ ] Backup configured (daily snapshots)

[ ] Caching:
    [ ] Redis/Memcached configured
    [ ] Cache TTL: 60s for TVL, 30s for rates, 5s for streams
    [ ] Cache invalidation on chain events

[ ] Background jobs:
    [ ] Yield rate aggregator (updates every 60s)
    [ ] TVL calculator (updates every 30s)
    [ ] Stream accrual monitor (real-time)
```

---

## 5. FRONTEND DEPLOYMENT

### 5.1 Build & Deploy

```
[ ] Build:
    [ ] NEXT_PUBLIC_STELLAR_NETWORK=mainnet
    [ ] NEXT_PUBLIC_RPC_URL=https://soroban-rpc.stellar.org
    [ ] NEXT_PUBLIC_CONTRACT_ADDRESSES configured (mainnet)
    [ ] npm run build passes without errors
    [ ] bundle size checked: < 500KB (gzip)

[ ] Deployment:
    [ ] Vercel / Netlify / self-hosted configured
    [ ] Custom domain: app.noctis.finance (or similar)
    [ ] SSL certificate valid
    [ ] CDN configured (Cloudflare / Fastly)
    [ ] Cache headers: HTML=no-cache, assets=1y

[ ] SEO / Meta:
    [ ] Title: "Noctis — Privacy-First Payroll on Stellar"
    [ ] Description: "Private, streaming payroll with ZK privacy"
    [ ] OG image configured
    [ ] robots.txt: allow all
    [ ] sitemap.xml generated
```

### 5.2 Wallet Integration

```
[ ] Passkey Kit configured for mainnet:
    [ ] Launchtube mainnet API key
    [ ] Wallet factory address: mainnet
    [ ] Passkey Kit SDK version: v2.1+

[ ] Freighter wallet:
    [ ] Mainnet network passphrase
    [ ] Standard RPC URL
```

### 5.3 Analytics

```
[ ] Mixpanel / Amplitude:
    [ ] Event: page_view
    [ ] Event: wallet_created
    [ ] Event: batch_submitted
    [ ] Event: stream_claimed
    [ ] Event: yield_withdrawn
    [ ] User properties: wallet_address, employer/employee

[ ] Error tracking:
    [ ] Sentry configured
    [ ] Source maps uploaded
    [ ] Error grouping by type
```

---

## 6. LAUNCH SEQUENCE

### 6.1 T-7 Days to T-0 Countdown

```
T-7 (Jul 14): Governance vote opens (Snapshot)
T-7:        Contract deployment to mainnet (behind multi-sig)
T-5:        API + Subgraph migration to mainnet
T-3:        UI deployment + DNS update (staging URL)
T-2:        Internal smoke tests (full E2E on mainnet)
T-1:        Final security review + load test
T-0:        LAUNCH 🚀
```

### 6.2 Launch Day Runbook (T-0)

```
TIME (UTC)    ACTION                            OWNER
─────────────────────────────────────────────────────────────
00:00         Final pre-launch check (all green)  PM
01:00         Multi-sig signers on standby         DevOps
02:00         DNS switch: staging → production     DevOps
02:05         SSL verification                     DevOps
02:10         Frontend health check                Frontend
02:15         API health check                     Backend
02:20         Contract health check                Smart Eng
02:30         Monitoring dashboard live            DevOps
02:45         Twitter announcement drafted         PM
03:00         🚀 LAUNCH ANNOUNCEMENT               PM
03:00-06:00   Launch monitoring                    All
06:00         Post-launch sync                     PM
12:00         First metrics review                 PM
24:00         Day 1 retrospective                  All
```

### 6.3 Launch Communications

```
Twitter/X Thread:
  1/n: "Noctis is live on Stellar Mainnet 🚀"
  2/n: "Privacy-first payroll with zero-knowledge proofs"
  3/n: "Per-second payment streaming"
  4/n: "Auto-yield on idle payroll capital"
  5/n: "Passkey login — no seed phrases needed"
  6/n: "Start at app.noctis.finance"

Discord:
  #announcements: Launch post with key features
  #support: Live support channel opened
  #general: Q&A session (1 hour post-launch)

Governance Forum:
  Post: "Noctis Mainnet Launch — Protocol Update"
  Voting results: Fee switch proposal results

Investor Update:
  Email: Mainnet launch + metrics + next milestones
```

---

## 7. POST-LAUNCH MONITORING

### 7.1 First 24 Hours (Critical Window)

```
Every 30 minutes:
[ ] TVL: $__________ (target: TBD)
[ ] Active streams: _____
[ ] User registrations: _____
[ ] Batch submissions: _____
[ ] Error rate: _____% (target < 1%)
[ ] API latency: _____ ms (target < 500ms p95)
[ ] RPC latency: _____ ms (target < 2s p95)
[ ] Contract gas: avg _____ (target < 200K per tx)

P0 triggers:
[ ] Error rate > 5% → Emergency call
[ ] API down > 2 min → Failover
[ ] Contract paused → Security investigation
[ ] TVL drop > 20% → Community comms
```

### 7.2 First Week

```
Daily:
[ ] Daily active users: _____
[ ] Daily volume: _____ USDC
[ ] Daily fee revenue: _____ USDC
[ ] New streams created: _____
[ ] Support tickets: _____ (categories)
[ ] Community sentiment: positive/neutral/negative

Weekly Metrics Report (Monday):
[ ] Week over week growth
[ ] Top yield sources by TVL
[ ] Top employer wallets by volume
[ ] Bug bounty submissions
[ ] Audit status update
```

### 7.3 Monitoring Dashboard

```
Grafana Dashboard: "Noctis Mainnet — Production"
Panels:
  Row 1: TVL (gauge), Active Streams (stat), Users (stat)
  Row 2: Transaction Volume (area), Fee Revenue (area)
  Row 3: API Latency (heatmap), Error Rate (timeseries)
  Row 4: Contract Gas (bar), RPC Health (status grid)
  Row 5: Yield Rates (table), Source Allocations (pie)
```

---

## 8. EMERGENCY RESPONSE PLAN

### 8.1 Severity Levels

| Level | Definition | Response | Comms |
|-------|------------|----------|-------|
| **P0-Critical** | Funds at risk, contract compromised | <15 min | #noctis-alerts, emergency sync |
| **P1-High** | Service degraded, partial outage | <30 min | Slack huddle |
| **P2-Medium** | Minor feature broken | <2 hours | Slack thread |
| **P3-Low** | Cosmetic, non-urgent | Next day | Linear ticket |

### 8.2 Emergency Contacts

```
PRIMARY:
  Smart Contract Engineer: [Name] — [Phone]
  Backend Engineer:        [Name] — [Phone]
  Security Engineer:       [Name] — [Phone]
  PM (Emergency):          [Name] — [Phone]

BACKUP:
  DevOps:                  [Name] — [Phone]
  Frontend Engineer:       [Name] — [Phone]
  Web3 Researcher:         [Name] — [Phone]

EXTERNAL:
  Immunefi (bounty triage): support@immunefi.com
  Stellar Foundation:       security@stellar.org
```

### 8.3 P0 Runbook: Contract Pause

```
TRIGGER: Suspicious activity detected / vulnerability reported

1. ACKNOWLEDGE (0-5 min)
   [ ] Confirm alert is valid
   [ ] #noctis-alerts: "INCIDENT — Investigating contract activity"
   [ ] Assemble emergency team in Slack huddle

2. PAUSE CONTRACT (5-15 min)
   [ ] Smart Contract Engineer: call pause() on affected contract
   [ ] Verify: contract.state == paused
   [ ] Confirm: all privileged functions reject

3. ASSESS (15-60 min)
   [ ] Determine root cause
   [ ] Quantify impact (funds at risk, affected users)
   [ ] Decide: resume + fix, or migrate to new contract

4. COMMUNICATE (60 min)
   [ ] Status post on governance forum
   [ ] Discord #announcements
   [ ] Twitter/X update
   [ ] Affected users notified directly (if identifiable)

5. RESOLVE (1-48 hours)
   [ ] Deploy fix to testnet
   [ ] Internal audit of fix
   [ ] Multi-sig: approve and deploy fix
   [ ] Unpause contract
   [ ] Post-mortem within 72 hours
```

### 8.4 P0 Runbook: Vulnerability Report (Bug Bounty)

```
TRIGGER: Critical/High severity report via Immunefi

1. TRIAGE (0-4 hours)
   [ ] Security Engineer: validate report
   [ ] Smart Contract Engineer: reproduce
   [ ] Severity classification (confirm or adjust)

2. RESPONSE (4-24 hours)
   [ ] If valid Critical/High → pause affected contracts
   [ ] Develop fix
   [ ] Internal review of fix
   [ ] Deploy fix

3. REMEDIATE (24-72 hours)
   [ ] Payout bounty
   [ ] Public disclosure (after fix deployed)
   [ ] Post-mortem
```

---

## 9. ROLLBACK PLAN

### 9.1 Smart Contract Rollback

Soroban contracts on Stellar are **immutable by default**. No upgrades without proxy pattern.

**Option A: Emergency Pause + Deploy New Contract**
- Best for: critical security vulnerabilities
- Process:
  1. Pause all contracts
  2. Deploy new correct contracts with new addresses
  3. Migrate state data (if possible) via admin migration function
  4. Update frontend/API with new contract addresses
  5. Communicate migration to users
- Cost: Users need to approve new contracts

**Option B: Proxy Upgrade Pattern (Future)**
- For production, consider deploying behind a proxy (e.g., Eternal Storage pattern)
- Not implemented in MVP — planned for Phase 2

### 9.2 Infrastructure Rollback

```
If API/Frontend deployment fails:

Kubernetes:
  kubectl rollout undo deployment/noctis-api
  kubectl rollout undo deployment/noctis-frontend

Docker:
  docker pull noctis/api:previous-tag
  docker compose up -d

DNS:
  Update DNS to point to previous deployment IP
  (TTL should be 60s for rapid rollback)
```

### 9.3 Data Rollback

```
Database:
  Point-in-time recovery from last backup
  ETA: 30 min (RTO), 1 hour max data loss (RPO)

Indexer:
  Re-index from last known good block
  ETA: Depends on blocks behind (estimate: 10 min per 1000 blocks)
```

---

## APPENDIX A: ENVIRONMENT COMPARISON

| Item | Testnet (Current) | Mainnet (Target) |
|------|------------------|-------------------|
| Network Passphrase | "Test SDF Network ; September 2015" | "Public Global Stellar Network ; September 2015" |
| RPC Endpoint | soroban-testnet.stellar.org | soroban-rpc.stellar.org |
| Horizon | horizon-testnet.stellar.org | horizon.stellar.org |
| Friendbot | friendbot.stellar.org | N/A (real XLM only) |
| Faucet | Free testnet XLM | Purchase XLM on exchange |
| USDC | Circle testnet | Circle real |
| Contract Deploy | Free (testnet) | ~1 XLM per deploy |
| Passkey Kit | Launchtube testnet | Launchtube mainnet |
| Multi-sig | Testnet Safe | Mainnet Safe |
| Monitoring | Datadog test env | Datadog production |

## APPENDIX B: CONTRACT ADDRESSES

| Contract | Testnet Address | Mainnet Address |
|----------|----------------|-----------------|
| `policy_signer` | `CCQTEQOHLRV4IR5HZ6WXRFSPC2KUUWC3YJOFPABUBN5PY5NZ5HEGM5RI` | TBD |
| `streaming_vault` | `CCR6YESUPNGSTDU2JNP5AG5HJ6PZLHC6RUVRHRBK44PDAZO5EUQLE3E3` | TBD |
| `wallet_factory` | `CA5KLXL6T2PLD4OVEVVG3QS5B7NQ3S7BGATNNCKD2R6TK2Y724K434SQ` | TBD |
| `yield_router` | `CBFWLCN5XTFZHCJGWNIBSMMB3M5SMFAYHTCOGHWBY2SSXSK5XEE5Q7KB` | TBD |
| `payroll_dispatcher` | `CDP36DTJD22K3MHBPS7YF724S4H4ZB6OAX3W4UYXFQ35AE62S4EHR4LF` | TBD |

## APPENDIX C: ROLLING CHECKLIST (PHYSICAL COPY)

Print this checklist and put it on the war room wall during launch:

```
┌─────────────────────────────────────────────────────────────┐
│                NOCTIS MAINNET LAUNCH CHECKLIST                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [ ] 1. Multi-sig configured (3/5 signers confirmed)         │
│  [ ] 2. All 5 contracts deployed                            │
│  [ ] 3. Cross-contract calls working (E2E test)             │
│  [ ] 4. API endpoints responding + authenticated             │
│  [ ] 5. Subgraph/Indexer synced                              │
│  [ ] 6. Frontend deployed + DNS propagated                   │
│  [ ] 7. Monitoring dashboard live                            │
│  [ ] 8. Alerts configured (PagerDuty/Slack)                  │
│  [ ] 9. Governance vote passed                               │
│  [ ] 10. Security audit sign-off                             │
│  [ ] 11. Bug bounty program live                             │
│  [ ] 12. Emergency response team on standby                  │
│  [ ] 13. All social channels ready for announcement          │
│  [ ] 14. Investor + community comms prepared                 │
│  [ ] 15. Post-launch monitoring schedule confirmed            │
│                                                             │
│  🚀 LAUNCH SIGN-OFF: _________________ DATE: ______________ │
└─────────────────────────────────────────────────────────────┘
```

---

*End of Production Deployment Checklist*  
*Date: May 29, 2026*  
*Phase: Sprint 3 — Production Readiness*  
*Status: ✅ COMPLETE — Ready for DevOps + Backend Engineer*
