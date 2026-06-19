# PRD-to-Agent Responsibility Mapping
## Quick Reference: Who Owns What
### PM: ArbaLabs | June 2026

---

> Each agent should read the full PRD once, but use this mapping to find their specific sections quickly during development.

---

## Smart Contract Engineer

| PRD § | Topic | Key Files | Priority |
|-------|-------|-----------|----------|
| §3.2 | ZK Proving System (Noir + UltraHonk) | `circuits/` | Must-read |
| §3.3 | Cryptographic Primitives | `circuits/`, `contracts/` | Must-read |
| §8.2 | Smart Contract Layer | `contracts/confidential_payroll/` | **Own** |
| §8.2.1 | ConfidentialPayrollContract (full code) | `lib.rs` | **Own** |
| §8.2.2 | UltraHonkVerifierContract deployment | Deploy scripts | **Own** |
| §8.3 | Noir Circuit (full code) | `main.nr` | **Own** |
| §9.1 | On-Chain State Model | Contract storage | Must-read |
| §9.4 | ZK Circuit Witness Schema | Circuit inputs | Must-read |
| §9.5 | Merkle Tree Specification | Circuit, contracts | Must-read |
| §12.1 | Circuit Security | Circuit constraints | Must-read |
| §12.2 | Smart Contract Security | Contract patterns | **Critical** |
| §13.1 | Cryptographic Decisions | Circuit params | Must-read |
| Glossary | Cryptographic Terms | Reference | Reference |

## Backend Engineer

| PRD § | Topic | Key Files | Priority |
|-------|-------|-----------|----------|
| §8.4 | Agent Layer (Tree Builder) | `services/tree-builder/` | **Own** |
| §8.6 | Web2 Layer (Backend API) | `services/api/` | **Own** |
| §8.7 | WebSocket Layer | `services/ws-server/` | **Own** |
| §9.2 | Off-Chain Data Structures | `services/tree-builder/` | **Own** |
| §9.3 | Soroban Events Schema | `services/event-indexer/` | **Own** |
| §9.5 | Merkle Tree Specification | `services/tree-builder/` | Must-read |
| §7.3.2 | CommitmentBuilder (tree integration) | API for frontend | Must-read |
| §8.1 | System Architecture Diagram | Reference | Must-read |
| §FR-03 | Withdrawal Secret Distribution | Payload encoder | Must-read |
| §FR-06 | Audit Tools | Auditor CLI | Must-read |

## Frontend Engineer

| PRD § | Topic | Key Files | Priority |
|-------|-------|-----------|----------|
| §7 | Frontend Specification (FULL) | `frontend/` | **Own — read all** |
| §7.1 | Stack & Setup | Next.js config | Must-read |
| §7.2 | Page & Route Structure | All pages | Must-read |
| §7.3.1 | Landing Page | `page.tsx` | Must-read |
| §7.3.2 | Employer Batch Creation | `/employer/batch/new` | **Own** |
| §7.3.3 | Batch Dashboard | `/employer/batch/[id]` | **Own** |
| §7.3.4 | Employee Withdrawal Portal | `/withdraw/[payload]` | **Own — Critical** |
| §7.3.5 | Auditor Tool | `/auditor` | **Own** |
| §7.4 | Design System | Tailwind config | Must-read |
| §7.5 | Metadata Specification | `layout.tsx` | Must-read |
| §12.3 | Frontend Security | All pages | Must-read |
| §8.6 | API Routes (consumption) | API client code | Must-read |
| §8.7 | WebSocket Events (consumption) | WS client code | Must-read |

## Everyone

| PRD § | Topic | Why Everyone |
|-------|-------|-------------|
| §1 | Executive Summary | Understanding the what and why |
| §2 | Problem Statement | Shared context for decision-making |
| §5 | User Stories | All stories affect all agents |
| §10 | Roadmap & Milestones | Timeline awareness |
| §11 | Success Metrics & KPIs | What we're optimizing for |
| §13 | Open Questions | Active decisions, weigh in |

---

## Quick File Map

```
PRD.md                                          — The master specification (read this first)
planning/
├── ROADMAP.md                                  — Strategic 3-month plan
├── BACKLOG.md                                  — Full prioritized backlog
├── GOVERNANCE.md                               — Decisions, risks, milestones
├── LAUNCH_CHECKLIST.md                         — Pre-submission go/no-go
├── sprints/
│   ├── Sprint-1.md                             — Week 1 sprint: contracts + services
│   └── Sprint-2.md                             — Week 2 sprint: frontend + E2E
├── handoffs/
│   ├── SMARTCONTRACT_ENGINEER.md                — Your detailed hand-off
│   ├── BACKEND_ENGINEER.md                      — Your detailed hand-off
│   └── FRONTEND_ENGINEER.md                     — Your detailed hand-off
└── specs/
    ├── testnet_addresses.md                     — Populate as you deploy
    └── PRD_MAPPING.md                           — This file
```
