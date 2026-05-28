"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import WalletConnect from "@/components/WalletConnect";
import type { UserRole } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [showWallet, setShowWallet] = useState(false);

  const handleRoleSelected = useCallback(
    (role: UserRole) => {
      // Store role in session storage for the dashboard pages
      sessionStorage.setItem("noctis_role", role);
      router.push(`/${role}`);
    },
    [router]
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Navigation ─────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-lighter">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-sm font-bold">
            N
          </div>
          <span className="font-bold text-lg">Noctis</span>
        </div>
        <button
          onClick={() => setShowWallet(!showWallet)}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark transition-colors text-sm font-semibold"
        >
          {showWallet ? "Close" : "Connect Wallet"}
        </button>
      </nav>

      {/* ─── Hero Section ───────────────────────────── */}
      {!showWallet ? (
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="max-w-2xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
              Stellar Testnet · Hackathon MVP
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Privacy-First Payroll
              <br />
              <span className="text-primary">on Stellar</span>
            </h1>

            <p className="text-lg text-text-muted max-w-lg mx-auto">
              Run confidential batch payroll with zero-knowledge proofs.
              Employees get per-second streaming payments they can claim anytime.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowWallet(true)}
                className="px-8 py-3 rounded-xl bg-primary hover:bg-primary-dark transition-colors font-semibold text-base"
              >
                Get Started
              </button>
              <a
                href="#how-it-works"
                className="px-8 py-3 rounded-xl border border-surface-lighter hover:border-text-muted transition-colors font-semibold text-base"
              >
                How It Works
              </a>
            </div>
          </div>

          {/* ─── Feature Cards ─────────────────────────── */}
          <div
            id="how-it-works"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-4xl w-full"
          >
            <div className="p-6 rounded-xl bg-surface-light border border-surface-lighter">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-4 text-lg">
                🔒
              </div>
              <h3 className="font-semibold mb-2">Zero-Knowledge Privacy</h3>
              <p className="text-sm text-text-muted">
                Payroll batches are verified with ZK proofs. Employee amounts
                remain confidential on-chain.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-surface-light border border-surface-lighter">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center mb-4 text-lg">
                ⚡
              </div>
              <h3 className="font-semibold mb-2">Real-Time Streaming</h3>
              <p className="text-sm text-text-muted">
                Payments stream per-second. Employees claim accrued salary at
                any time — no pay cycles.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-surface-light border border-surface-lighter">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center mb-4 text-lg">
                🏦
              </div>
              <h3 className="font-semibold mb-2">Yield-Bearing Capital</h3>
              <p className="text-sm text-text-muted">
                Idle payroll funds are routed to DeFi yield sources. Earnings
                are split between employer, employees, and protocol.
              </p>
            </div>
          </div>
        </main>
      ) : (
        /* ─── Wallet Connect Panel ────────────────── */
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <div className="bg-surface-light rounded-2xl p-8 border border-surface-lighter">
              <h2 className="text-xl font-bold mb-6 text-center">
                Connect Your Wallet
              </h2>
              <WalletConnect onRoleSelected={handleRoleSelected} />
            </div>
          </div>
        </main>
      )}

      {/* ─── Footer ─────────────────────────────────── */}
      <footer className="px-6 py-4 border-t border-surface-lighter text-center text-xs text-text-muted">
        Noctis · Built on Stellar Testnet · Hackathon MVP
      </footer>
    </div>
  );
}
