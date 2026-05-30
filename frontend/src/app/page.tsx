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
              Stellar Soroban · Streaming Payroll
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Streaming Payroll
              <br />
              <span className="text-primary">with Zero-Knowledge Privacy</span>
            </h1>

            <p className="text-lg text-text-muted max-w-lg mx-auto">
              Process confidential batch payroll on Stellar Soroban.
              Funds stream per-second to employees — they claim anytime.
              One transaction replaces an entire pay cycle.
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24 max-w-5xl w-full"
          >
            <div className="p-6 rounded-xl bg-surface-light border border-surface-lighter">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-4 text-lg">
                🔒
              </div>
              <h3 className="font-semibold mb-2">ZK Batch Privacy</h3>
              <p className="text-sm text-text-muted">
                Each payroll batch submits a zero-knowledge proof on-chain.
                Employee identities and amounts stay confidential — only
                a Merkle commitment is published.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-surface-light border border-surface-lighter">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center mb-4 text-lg">
                ⚡
              </div>
              <h3 className="font-semibold mb-2">Per-Second Streaming</h3>
              <p className="text-sm text-text-muted">
                Funds stream from employer to employees every second, not
                monthly or bi-weekly. Claim your accrued balance at any
                time with a single transaction.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-surface-light border border-surface-lighter">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center mb-4 text-lg">
                📦
              </div>
              <h3 className="font-semibold mb-2">One-Tx Batch Payroll</h3>
              <p className="text-sm text-text-muted">
                Upload a CSV, review on-screen, and submit one transaction.
                The smart contract creates individual streams for every
                employee in the batch automatically.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-surface-light border border-surface-lighter">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center mb-4 text-lg">
                🪙
              </div>
              <h3 className="font-semibold mb-2">NOCTIS Token</h3>
              <p className="text-sm text-text-muted">
                Salary streams use the NOCTIS token on Stellar Testnet.
                Claim tokens to your wallet, create a trustline once,
                and receive payments instantly.
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
        Noctis · Stellar Soroban Protocol 26 · Hackathon MVP
      </footer>
    </div>
  );
}
