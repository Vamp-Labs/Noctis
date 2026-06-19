# Kickstart — First Steps for Each Agent
## ZK-SDP — Confidential Payroll on Stellar

---

> **Read this first, then open your role-specific Day 1 guide.**

| Role | File | First Action |
|------|------|-------------|
| 🛡️ **Smart Contract Engineer** | [`SMARTCONTRACT_DAY1.md`](./SMARTCONTRACT_DAY1.md) | Write & compile `payroll_withdrawal.nr` circuit |
| ⚙️ **Backend Engineer** | [`BACKEND_DAY1.md`](./BACKEND_DAY1.md) | Create Supabase project + run DB migration |
| 🎨 **Frontend Engineer** | [`FRONTEND_DAY1.md`](./FRONTEND_DAY1.md) | Scaffold Next.js + build landing page |

### Quick Start (All Agents)

```bash
# Clone the monorepo
git clone [repo-url] && cd zk-sdp

# Each agent works in their directory:
# Smart Contract:  circuits/ + contracts/
# Backend:         supabase/ + packages/shared/
# Frontend:        frontend/

# PM coordinates:  planning/ (all docs here)
```

### Hand-off Schedule

| Day | From | To | Artifact |
|-----|------|----|---------|
| 3 | Smart Contract | Backend + Frontend | Contract addresses + circuit JSON |
| 6 | Backend | Frontend | Supabase URL + anon key |

### Need Help?

1. Read your hand-off doc in `planning/handoffs/`
2. Read your Day 1 kickstart here
3. Check the development flow: `planning/DEVELOPMENT_FLOW.md`
4. Tag @pm in Telegram
