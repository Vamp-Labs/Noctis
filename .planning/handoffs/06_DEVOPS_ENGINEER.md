# DEVOPS ENGINEER — Remaining Work Handoff

**3 Tasks | Est. 1-2 weeks | Priority: P1–P2**

---

## TASK 1: 🟡 CI/CD Pipeline for Contract Deployment
**Priority:** 🟡 P1 | **Effort:** 2-3 days | **Status:** ❌ NOT STARTED

### Current State
All contract deployments are manual via the `stellar contract deploy` CLI. No CI/CD pipeline exists. The `.env.testnet` is updated manually after each deployment.

### Requirements
Build a GitHub Actions CI/CD pipeline that:

1. **On push to `main`** — Run all tests:
   ```yaml
   - name: Run contract unit tests
     run: cargo test --workspace --release
   
   - name: Run E2E tests (testnet)
     run: npx tsx tests/e2e-testnet.ts
   ```

2. **On tag push (e.g., `deploy-v1.0.0`)** — Deploy to testnet:
   ```yaml
   - name: Build WASM
     run: stellar contract build
   
   - name: Deploy contracts
     run: |
       for contract in payroll_dispatcher streaming_vault wallet_factory yield_router policy_signer; do
         stellar contract deploy --wasm target/wasm32v1-none/release/${contract}.wasm \
           --source-account passkeygate-deployer --network testnet \
           -- --admin $(cat .admin_address)
       done
   
   - name: Configure contracts
     run: npx tsx scripts/deploy-and-configure.ts
   ```

3. **Secret management**:
   - `PASSKEYGATE_DEPLOYER_SECRET` — deployer secret key (stored as GitHub secret)
   - `LOCAL_DEPLOYER_SECRET` — SAC admin key (stored as GitHub secret)
   - `TESTNET_RPC_URL` — RPC endpoint
   - `FRIENDBOT_URL` — Friendbot URL

4. **Post-deployment**:
   - Save new contract addresses as artifact
   - Commit updated `.env.testnet` back to repo
   - Send Slack/Discord notification

### Files to Create
- `.github/workflows/ci.yml` — CI pipeline (test on push)
- `.github/workflows/deploy.yml` — Deploy pipeline (on tag)
- `scripts/deploy-and-configure.ts` — Deployment automation script

### Acceptance Criteria
- [ ] CI pipeline runs on every push to `main` (unit tests + E2E)
- [ ] Deploy pipeline triggers on tag push
- [ ] Contracts deploy and configure automatically
- [ ] `.env.testnet` updated automatically
- [ ] Test failures send notification
- [ ] All secrets stored securely in GitHub

---

## TASK 2: 🟡 Circuit Build Automation
**Priority:** 🟡 P1 | **Effort:** 2 days | **Status:** ❌ NOT STARTED

### Current State
`circuits/build.sh` is a shell script that has never been run. No CI step builds circuit artifacts. No `.wasm` or `.zkey` files exist in `frontend/public/circuits/`.

### Requirements
1. **CI job for circuit builds** — Add to GitHub Actions:
   ```yaml
   circuits-build:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - name: Install circom
         run: |
           wget https://github.com/iden3/circom/releases/download/v2.1.8/circom-linux-amd64.tar.gz
           tar -xzf circom-linux-amd64.tar.gz
           sudo mv circom /usr/local/bin/
       - name: Install snarkjs
         run: npm install -g snarkjs
       - name: Build circuits
         run: cd circuits && bash build.sh
       - name: Copy artifacts to frontend
         run: cp circuits/out/*.wasm frontend/public/circuits/ && cp circuits/out/*.zkey frontend/public/circuits/
       - name: Upload artifacts
         uses: actions/upload-artifact@v4
         with:
           name: circuit-artifacts
           path: frontend/public/circuits/
   ```

2. **Docker build option** (for reproducibility):
   ```dockerfile
   FROM node:20 AS circom-builder
   RUN wget -q https://github.com/iden3/circom/releases/download/v2.1.8/circom-linux-amd64.tar.gz && \
       tar -xzf circom-linux-amd64.tar.gz && mv circom /usr/local/bin/
   WORKDIR /circuits
   COPY circuits/ .
   RUN bash build.sh
   ```

3. **Artifact caching** — Cache the `.ptau` file (~2GB) to avoid re-downloading on every build:
   ```
   powers_of_tau.cache:
     path: circuits/powers_of_tau.ptau
     key: ptau-${{ hashFiles('circuits/build.sh') }}
   ```

### Files to Create/Modify
- `.github/workflows/ci.yml` (add circuits-build job)
- `Dockerfile.circuits` (optional)
- `docker-compose.circuits.yml` (optional)

### Acceptance Criteria
- [ ] CI builds circuit WASM + ZKEY automatically
- [ ] Artifacts available for frontend consumption
- [ ] Build time < 30 minutes on GitHub Actions runner
- [ ] `.ptau` file cached across builds
- [ ] Artifact version matched with contract version

---

## TASK 3: 🟢 Testnet Monitoring & Alerting
**Priority:** 🟢 P2 | **Effort:** 3 days | **Status:** ❌ NOT STARTED

### Current State
No monitoring exists. If testnet RPC goes down or a contract panics, no one gets alerted.

### Requirements
1. **Health check endpoint** — Deploy a simple health check service:
   - `/health` — Returns 200 if contract RPC responds
   - `/health/contracts` — Checks all 5 contracts are deployed and respond
   - `/health/e2e` — Runs a lightweight E2E check (non-destructive)

2. **Uptime monitoring** — Configure:
   - UptimeRobot / Better Uptime / Grafana Cloud check on health endpoint
   - Ping every 5 minutes
   - Alert via Discord webhook + email

3. **Contract event monitoring** — Watch for:
   - Failed transactions (from Stellar RPC)
   - Outstanding streams expiring
   - Low yield rates
   - Balance below threshold (for employer accounts)

4. **Dashboard** — Basic Grafana dashboard (or CloudWatch if using AWS):
   - TVL by employer
   - Active streams count
   - Claim volume (24h/7d)
   - Yield accrued
   - Error rate

### Files to Create
- `app/api/health/route.ts` — Health check endpoint
- `app/api/health/contracts/route.ts` — Contract health endpoint
- `scripts/health-check.ts` — CLI health check tool
- `docker-compose.monitoring.yml` — Grafana + Prometheus config (optional)

### Acceptance Criteria
- [ ] Health check endpoint live and returning contract status
- [ ] Uptime monitoring pinging every 5 minutes
- [ ] Discord alert on health check failure
- [ ] Basic dashboard showing key metrics
- [ ] Alert fatigue minimized (no false positives)

---

## Priority & Sequence

```
WEEK 1                      WEEK 2
┌──────────────────────┐   ┌──────────────────────┐
│ T1: CI/CD pipeline   │   │ T2: Circuit build    │
│     (contract dep)   │   │     automation        │
│                      │   │ T3: Monitoring        │
│                      │   │     (health checks)   │
└──────────────────────┘   └──────────────────────┘
```

## Files You'll Create/Modify

| File | Tasks |
|------|-------|
| `.github/workflows/ci.yml` | T1, T2 |
| `.github/workflows/deploy.yml` | T1 |
| `scripts/deploy-and-configure.ts` | T1 |
| `Dockerfile.circuits` | T2 (optional) |
| `app/api/health/*` | T3 |
| `scripts/health-check.ts` | T3 |
| `docker-compose.monitoring.yml` | T3 (optional) |
