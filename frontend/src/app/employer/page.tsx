"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { StreamingVaultClient } from "@/lib/contracts/streamingVault";
import { PayrollDispatcherClient } from "@/lib/contracts/payrollDispatcher";
import { YieldRouterClient } from "@/lib/contracts/yieldRouter";
import { PolicySignerClient } from "@/lib/contracts/policySigner";
import { processPayrollBatch, hexToBytes } from "@/lib/zk";
import type { StreamData, PayrollRecipient, PolicyConfig, YieldSplit, EmployerAllocation } from "@/types";
import Papa from "papaparse";

// ─── Types ───────────────────────────────────────────────────────
interface CsvRow {
  address: string;
  amount: string;
  duration_secs?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────
function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 12) return addr || "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatAmount(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toLocaleString();
}

function formatTime(timestamp: number): string {
  if (!timestamp) return "—";
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Employer Dashboard Page ─────────────────────────────────────
export default function EmployerDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wallet state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Dashboard data
  const [totalDeposited, setTotalDeposited] = useState("0");
  const [batchCount, setBatchCount] = useState(0);
  const [streamCount, setStreamCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // CSV / Payroll state
  const [csvData, setCsvData] = useState<PayrollRecipient[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Streams
  const [employerStreams, setEmployerStreams] = useState<StreamData[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);

  // Batch history
  const [recentBatches, setRecentBatches] = useState<number[]>([]);

  // Yield
  const [yieldSources, setYieldSources] = useState<string[]>([]);
  const [yieldRates, setYieldRates] = useState<Record<string, number>>({});
  const [yieldAllocation, setYieldAllocation] = useState<EmployerAllocation | null>(null);
  const [yieldSplit, setYieldSplit] = useState<YieldSplit | null>(null);
  const [isLoadingYield, setIsLoadingYield] = useState(false);
  const [isWithdrawingYield, setIsWithdrawingYield] = useState(false);

  // Error / success messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Policy creation form state
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [policyName, setPolicyName] = useState("");
  const [policyType, setPolicyType] = useState<"SpendingLimit" | "Allowlist" | "MultiSig" | "Timelock">("SpendingLimit");
  const [policyMaxAmount, setPolicyMaxAmount] = useState("");
  const [policyPeriodLimit, setPolicyPeriodLimit] = useState("");
  const [policyPeriodSeconds, setPolicyPeriodSeconds] = useState("86400");
  const [policyAllowedTokens, setPolicyAllowedTokens] = useState<string[]>([]);
  const [policyNewToken, setPolicyNewToken] = useState("");
  const [policyRequiredSigners, setPolicyRequiredSigners] = useState("1");
  const [policyAuthorizedSigners, setPolicyAuthorizedSigners] = useState<string[]>([]);
  const [policyNewSigner, setPolicyNewSigner] = useState("");
  const [isCreatingPolicy, setIsCreatingPolicy] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"overview" | "payroll" | "streams" | "policies">("overview");

  // ─── Init ─────────────────────────────────────────────────────
  useEffect(() => {
    const address = sessionStorage.getItem("noctis_wallet_address");
    const role = sessionStorage.getItem("noctis_role");
    if (!address || role !== "employer") {
      router.push("/");
      return;
    }
    setWalletAddress(address);
  }, [router]);

  // ─── Load Dashboard Data ──────────────────────────────────────
  useEffect(() => {
    if (!walletAddress) return;
    const address: string = walletAddress;

    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const vaultClient = new StreamingVaultClient();
        const payrollClient = new PayrollDispatcherClient();
        const yieldClient = new YieldRouterClient();

        const [deposited, batches, streams, _totalDeposited] = await Promise.all([
          vaultClient.getEmployerBalance(address),
          payrollClient.getBatchCount(),
          vaultClient.getStreamCount(),
          yieldClient.getTotalDeposited(),
        ]);

        if (!cancelled) {
          setTotalDeposited(deposited);
          setBatchCount(batches);
          setStreamCount(streams);
        }

        // Load yield data
        setIsLoadingYield(true);
        try {
          const yieldClient2 = new YieldRouterClient();
          const [sources, split, allocation] = await Promise.all([
            yieldClient2.getSources(),
            yieldClient2.getYieldSplit(),
            yieldClient2.getEmployerAllocation(address),
          ]);

          if (!cancelled) {
            setYieldSources(sources);
            setYieldSplit(split);
            setYieldAllocation(allocation);

            // Fetch APY for each source
            const rates: Record<string, number> = {};
            for (const src of sources) {
              rates[src] = await yieldClient2.getYieldRate(src);
            }
            setYieldRates(rates);
          }
        } catch {
          // Yield data is non-critical
        } finally {
          if (!cancelled) setIsLoadingYield(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load dashboard data");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  // ─── Load Recent Batches ──────────────────────────────────────
  useEffect(() => {
    if (!walletAddress || batchCount === 0) return;

    let cancelled = false;

    async function loadBatches() {
      const payrollClient = new PayrollDispatcherClient();
      const batchIds: number[] = [];
      // Load last 5 batches
      const start = Math.max(1, batchCount - 4);
      for (let id = start; id <= batchCount; id++) {
        batchIds.push(id);
      }
      if (!cancelled) setRecentBatches(batchIds);
    }

    loadBatches();
    return () => {
      cancelled = true;
    };
  }, [walletAddress, batchCount]);

  // ─── Load Employer Streams ────────────────────────────────────
  const loadEmployerStreams = useCallback(async () => {
    const addr = sessionStorage.getItem("noctis_wallet_address");
    if (!addr) return;

    setIsLoadingStreams(true);
    try {
      const vaultClient = new StreamingVaultClient();
      const count = await vaultClient.getStreamCount();

      // For MVP: iterate through all streams (in production, use an index)
      const streams: StreamData[] = [];
      for (let id = 1; id <= count; id++) {
        const stream = await vaultClient.getStream(id);
        if (stream && stream.employer === addr) {
          streams.push(stream);
        }
      }
      setEmployerStreams(streams);
    } catch (err: any) {
      setError(err.message || "Failed to load streams");
    } finally {
      setIsLoadingStreams(false);
    }
  }, []);

  useEffect(() => {
    if (walletAddress && activeTab === "streams") {
      loadEmployerStreams();
    }
  }, [walletAddress, activeTab, loadEmployerStreams]);

  // ─── CSV Upload ───────────────────────────────────────────────
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setCsvFileName(file.name);
      setError(null);
      setSuccess(null);

      Papa.parse<CsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(
              `CSV parse error: ${results.errors[0].message}`
            );
            return;
          }

          const recipients: PayrollRecipient[] = results.data
            .filter((row) => row.address && row.amount)
            .map((row) => ({
              address: row.address.trim(),
              amount: row.amount.trim(),
              duration_secs: row.duration_secs
                ? parseInt(row.duration_secs, 10)
                : 86400, // Default: 1 day
            }));

          if (recipients.length === 0) {
            setError("No valid records found in CSV. Check headers: address, amount, duration_secs");
            return;
          }

          setCsvData(recipients);

          // Calculate total
          const total = recipients.reduce(
            (sum, r) => sum + BigInt(r.amount),
            BigInt(0)
          );
          setTotalAmount(total.toString());
          setSuccess(
            `Loaded ${recipients.length} recipient(s). Total: ${totalAmount} units`
          );
        },
        error: (err) => {
          setError(`CSV error: ${err.message}`);
        },
      });
    },
    [totalAmount]
  );

  // ─── Stream Actions ────────────────────────────────────────────
  const handlePauseStream = useCallback(async (streamId: number) => {
    try {
      setError(null);
      const address = sessionStorage.getItem("noctis_wallet_address");
      if (!address) throw new Error("Wallet not connected");
      const vaultClient = new StreamingVaultClient();
      await vaultClient.pauseStream(address, streamId);
      setSuccess(`Stream #${streamId} paused`);
    } catch (err: any) {
      setError(err.message || "Failed to pause stream");
    }
  }, []);

  const handleResumeStream = useCallback(async (streamId: number) => {
    try {
      setError(null);
      const address = sessionStorage.getItem("noctis_wallet_address");
      if (!address) throw new Error("Wallet not connected");
      const vaultClient = new StreamingVaultClient();
      await vaultClient.resumeStream(address, streamId);
      setSuccess(`Stream #${streamId} resumed`);
    } catch (err: any) {
      setError(err.message || "Failed to resume stream");
    }
  }, []);

  const handleCancelStream = useCallback(async (streamId: number) => {
    try {
      setError(null);
      const address = sessionStorage.getItem("noctis_wallet_address");
      if (!address) throw new Error("Wallet not connected");
      const vaultClient = new StreamingVaultClient();
      await vaultClient.cancelStream(address, streamId);
      setSuccess(`Stream #${streamId} cancelled — un-accrued refunded`);
    } catch (err: any) {
      setError(err.message || "Failed to cancel stream");
    }
  }, []);

  // ─── Yield Actions ─────────────────────────────────────────────
  const handleWithdrawYield = useCallback(async (token: string) => {
    setIsWithdrawingYield(true);
    setError(null);
    setSuccess(null);
    try {
      const address = sessionStorage.getItem("noctis_wallet_address");
      if (!address) throw new Error("Wallet not connected");
      const yieldClient = new YieldRouterClient();
      await yieldClient.withdrawYield(address, address, token);
      setSuccess("Yield withdrawn successfully!");
      // Reload yield data
      const allocation = await yieldClient.getEmployerAllocation(address);
      setYieldAllocation(allocation);
    } catch (err: any) {
      setError(err.message || "Failed to withdraw yield");
    } finally {
      setIsWithdrawingYield(false);
    }
  }, []);

  // ─── Submit Payroll ───────────────────────────────────────────
  const handleSubmitPayroll = useCallback(async () => {
    if (csvData.length === 0) {
      setError("Upload a CSV first");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const address = sessionStorage.getItem("noctis_wallet_address");
      if (!address) throw new Error("Wallet not connected");

      const recipients = csvData.map(r => ({
        address: r.address,
        amount: r.amount,
        duration_secs: r.duration_secs || 86400,
      }));

      // 1. Compute real Merkle root, ZK proof, and nullifiers
      const result = await processPayrollBatch(
        recipients,
        address,
        totalAmount,
      );

      // 2. Convert hex strings to bytes for Soroban submission
      const commitmentRoot = hexToBytes(result.merkleRoot).slice(-32);
      const nullifiers = result.nullifiers.map(n => hexToBytes(n));

      // 3. Submit via dispatcher
      const dispatcherClient = new PayrollDispatcherClient();
      await dispatcherClient.processBatch(
        address,
        address,
        recipients,
        totalAmount,
        commitmentRoot,
        result.proofBytes,
        nullifiers,
      );

      setSuccess(
        `Payroll batch processed for ${csvData.length} recipient(s)! ` +
        `Total: ${formatAmount(totalAmount)} units`
      );

      setCsvData([]);
      setCsvFileName("");
      setTotalAmount("0");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setError(err.message || "Failed to submit payroll");
    } finally {
      setIsSubmitting(false);
    }
  }, [csvData, totalAmount]);

  // ─── Policy Token / Signer helpers ────────────────────────────
  const handleAddToken = useCallback(() => {
    const t = policyNewToken.trim();
    if (!t) return;
    if (policyAllowedTokens.includes(t)) return;
    setPolicyAllowedTokens(prev => [...prev, t]);
    setPolicyNewToken("");
  }, [policyNewToken, policyAllowedTokens]);

  const handleRemoveToken = useCallback((token: string) => {
    setPolicyAllowedTokens(prev => prev.filter(t => t !== token));
  }, []);

  const handleAddSigner = useCallback(() => {
    const s = policyNewSigner.trim();
    if (!s) return;
    if (policyAuthorizedSigners.includes(s)) return;
    setPolicyAuthorizedSigners(prev => [...prev, s]);
    setPolicyNewSigner("");
  }, [policyNewSigner, policyAuthorizedSigners]);

  const handleRemoveSigner = useCallback((signer: string) => {
    setPolicyAuthorizedSigners(prev => prev.filter(s => s !== signer));
  }, []);

  // ─── Create Policy ───────────────────────────────────────────
  const handleCreatePolicy = useCallback(async () => {
    setError(null);
    setSuccess(null);

    if (!policyName.trim()) { setError("Policy name is required"); return; }
    if (!policyMaxAmount || BigInt(policyMaxAmount) <= 0n) { setError("Max amount must be > 0"); return; }
    if (!policyPeriodSeconds || Number(policyPeriodSeconds) <= 0) { setError("Period seconds must be > 0"); return; }
    if (Number(policyRequiredSigners) < 1) { setError("Required signers must be at least 1"); return; }
    if (policyType === "MultiSig" && policyAuthorizedSigners.length < Number(policyRequiredSigners)) {
      setError("Authorized signers must be >= required signers for MultiSig"); return;
    }

    setIsCreatingPolicy(true);
    try {
      const address = sessionStorage.getItem("noctis_wallet_address");
      if (!address) throw new Error("Wallet not connected");

      const client = new PolicySignerClient();
      await client.createPolicy(address, address, {
        name: policyName.trim(),
        policyType,
        maxAmount: policyMaxAmount,
        periodLimit: policyPeriodLimit || "0",
        periodSeconds: Number(policyPeriodSeconds),
        allowedTokens: policyAllowedTokens,
        requiredSigners: Number(policyRequiredSigners),
        authorizedSigners: policyAuthorizedSigners,
      });

      setSuccess(`Policy "${policyName}" created successfully!`);
      setShowPolicyForm(false);
      setPolicyName("");
      setPolicyType("SpendingLimit");
      setPolicyMaxAmount("");
      setPolicyPeriodLimit("");
      setPolicyPeriodSeconds("86400");
      setPolicyAllowedTokens([]);
      setPolicyRequiredSigners("1");
      setPolicyAuthorizedSigners([]);
    } catch (err: any) {
      setError(err.message || "Failed to create policy");
    } finally {
      setIsCreatingPolicy(false);
    }
  }, [policyName, policyType, policyMaxAmount, policyPeriodLimit, policyPeriodSeconds,
      policyAllowedTokens, policyRequiredSigners, policyAuthorizedSigners]);

  // ─── Navigate Back ────────────────────────────────────────────
  const handleBack = useCallback(() => {
    sessionStorage.removeItem("noctis_role");
    router.push("/");
  }, [router]);

  // ─── Render ───────────────────────────────────────────────────
  if (!walletAddress) return null; // Redirecting

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "payroll" as const, label: "Run Payroll" },
    { id: "streams" as const, label: "Streams" },
    { id: "policies" as const, label: "Policies" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Header ─────────────────────────────────── */}
      <header className="px-6 py-4 border-b border-surface-lighter flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="text-text-muted hover:text-text transition-colors"
          >
            ← Back
          </button>
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-xs font-bold">
            N
          </div>
          <span className="font-bold">Noctis · Employer Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted font-mono">
            {truncateAddress(walletAddress)}
          </span>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            Employer
          </span>
        </div>
      </header>

      {/* ─── Tabs ─────────────────────────────────── */}
      <div className="px-6 border-b border-surface-lighter">
        <nav className="flex gap-6 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── Error / Success ────────────────────────── */}
      <div className="px-6 pt-4">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm whitespace-pre-line">
            {success}
          </div>
        )}
      </div>

      {/* ─── Main Content ──────────────────────────── */}
      <main className="flex-1 px-6 py-6 max-w-5xl mx-auto w-full">
        {/* ═══ OVERVIEW TAB ════ */}
        {activeTab === "overview" && (
          <div>
            <h2 className="text-lg font-bold mb-4">Dashboard Overview</h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <OverviewCard
                    label="Total Deposited"
                    value={formatAmount(totalDeposited)}
                  />
                  <OverviewCard
                    label="Batches Processed"
                    value={batchCount.toString()}
                  />
                  <OverviewCard
                    label="Total Streams"
                    value={streamCount.toString()}
                  />
                  <OverviewCard
                    label="CSV Loaded"
                    value={csvData.length > 0 ? csvData.length.toString() : "0"}
                    accent={csvData.length > 0}
                  />
                </div>

                {/* Quick actions */}
                <div className="p-6 rounded-xl bg-surface-light border border-surface-lighter">
                  <h3 className="font-semibold mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => setActiveTab("payroll")}
                      className="p-3 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors text-sm text-left"
                    >
                      <div className="font-medium text-primary mb-1">Run Payroll</div>
                      <div className="text-xs text-text-muted">
                        Upload CSV, process batch
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab("streams")}
                      className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 hover:bg-secondary/20 transition-colors text-sm text-left"
                    >
                      <div className="font-medium text-secondary mb-1">
                        Manage Streams
                      </div>
                      <div className="text-xs text-text-muted">
                        Pause, resume, or cancel
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab("policies")}
                      className="p-3 rounded-lg bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors text-sm text-left"
                    >
                      <div className="font-medium text-accent mb-1">
                        View Policies
                      </div>
                      <div className="text-xs text-text-muted">
                        Spending limits &amp; rules
                      </div>
                    </button>
                  </div>
                </div>

                {/* Yield */}
                <div className="mt-6 p-6 rounded-xl bg-surface-light border border-surface-lighter">
                  <h3 className="font-semibold mb-4">Yield &amp; Rewards</h3>

                  {isLoadingYield ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Sources + Split */}
                      <div>
                        <p className="text-xs text-text-muted mb-2">Yield Sources</p>
                        {yieldSources.length === 0 ? (
                          <p className="text-sm text-text-muted italic">No yield sources configured</p>
                        ) : (
                          <div className="space-y-2 mb-4">
                            {yieldSources.map((src) => (
                              <div
                                key={src}
                                className="flex items-center justify-between p-2 rounded-lg bg-surface border border-surface-lighter"
                              >
                                <span className="text-sm font-mono">{src}</span>
                                <span className="text-sm font-semibold text-success">
                                  {yieldRates[src]?.toFixed(2) ?? "—"}% APY
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {yieldSplit && (
                          <div>
                            <p className="text-xs text-text-muted mb-2">Yield Split</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-text-muted">Employer</span>
                                <span className="font-semibold">{yieldSplit.employer_share}%</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-text-muted">Employee Pool</span>
                                <span className="font-semibold">{yieldSplit.employee_pool}%</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-text-muted">Protocol Fee</span>
                                <span className="font-semibold">{yieldSplit.protocol_fee}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Allocation + Actions */}
                      <div>
                        {yieldAllocation && (
                          <div className="mb-4">
                            <p className="text-xs text-text-muted mb-2">Your Allocation</p>
                            <div className="space-y-2">
                              <div className="p-3 rounded-lg bg-surface border border-surface-lighter">
                                <p className="text-xs text-text-muted">Total Principal</p>
                                <p className="text-lg font-bold">
                                  {formatAmount(yieldAllocation.total_principal)}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 rounded-lg bg-surface border border-surface-lighter">
                                  <p className="text-xs text-text-muted">Accumulated Yield</p>
                                  <p className="text-base font-semibold text-success">
                                    {formatAmount(yieldAllocation.accumulated_yield)}
                                  </p>
                                </div>
                                <div className="p-3 rounded-lg bg-surface border border-surface-lighter">
                                  <p className="text-xs text-text-muted">Claimed Yield</p>
                                  <p className="text-base font-semibold">
                                    {formatAmount(yieldAllocation.claimed_yield)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => handleWithdrawYield(yieldSources[0] || "")}
                          disabled={isWithdrawingYield || yieldSources.length === 0}
                          className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                            isWithdrawingYield || yieldSources.length === 0
                              ? "bg-surface-lighter text-text-muted cursor-not-allowed"
                              : "bg-primary hover:bg-primary-dark text-white"
                          }`}
                        >
                          {isWithdrawingYield ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                              Withdrawing...
                            </span>
                          ) : (
                            "Withdraw Yield"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent batches */}
                {recentBatches.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3">Recent Batches</h3>
                    <div className="space-y-2">
                      {recentBatches.map((batchId) => (
                        <BatchCard
                          key={batchId}
                          batchId={batchId}
                          walletAddress={walletAddress}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ PAYROLL TAB ════ */}
        {activeTab === "payroll" && (
          <div>
            <h2 className="text-lg font-bold mb-4">Run Payroll</h2>

            {/* CSV Upload */}
            <div className="p-6 rounded-xl bg-surface-light border border-surface-lighter mb-6">
              <h3 className="font-semibold mb-3">1. Upload Employee CSV</h3>
              <p className="text-xs text-text-muted mb-4">
                CSV format: <code className="text-primary">address, amount, duration_secs</code>
                {" "}(duration_secs optional, defaults to 86400 = 1 day)
              </p>

              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-text-muted
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-white
                    hover:file:bg-primary-dark
                    file:cursor-pointer file:transition-colors
                    cursor-pointer"
                />
              </div>

              {csvData.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-text-muted mb-2">
                    {csvData.length} recipient(s) loaded · Total:{" "}
                    <span className="text-success font-semibold">
                      {formatAmount(totalAmount)}
                    </span>{" "}
                    units
                  </p>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-surface-lighter">
                    <table className="w-full text-xs">
                      <thead className="bg-surface-lighter">
                        <tr>
                          <th className="px-3 py-2 text-left text-text-muted">Address</th>
                          <th className="px-3 py-2 text-right text-text-muted">Amount</th>
                          <th className="px-3 py-2 text-right text-text-muted">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.map((r, i) => (
                          <tr key={i} className="border-t border-surface-lighter">
                            <td className="px-3 py-2 font-mono">
                              {truncateAddress(r.address)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {formatAmount(r.amount)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {r.duration_secs}s
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="p-6 rounded-xl bg-surface-light border border-surface-lighter">
              <h3 className="font-semibold mb-3">2. Submit Payroll</h3>
              <p className="text-xs text-text-muted mb-4">
                This will prepare a batch transaction. You&apos;ll need to sign
                it with your wallet to submit to the Stellar testnet.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSubmitPayroll}
                  disabled={csvData.length === 0 || isSubmitting}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    csvData.length > 0 && !isSubmitting
                      ? "bg-primary hover:bg-primary-dark text-white"
                      : "bg-surface-lighter text-text-muted cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Processing...
                    </span>
                  ) : csvData.length === 0 ? (
                    "Upload CSV First"
                  ) : (
                    `Submit Payroll (${csvData.length} employees)`
                  )}
                </button>

                {csvData.length > 0 && (
                  <button
                    onClick={() => {
                      setCsvData([]);
                      setCsvFileName("");
                      setTotalAmount("0");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="px-4 py-2.5 rounded-lg border border-surface-lighter hover:border-error/50 text-sm text-text-muted hover:text-error transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Info box */}
            <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10 text-xs text-text-muted">
              <p className="font-semibold text-primary mb-1">How it works</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Upload a CSV with employee addresses and amounts</li>
                <li>The system computes a Merkle root of the payroll data</li>
                <li>A zero-knowledge proof is generated for privacy</li>
                <li>The batch transaction is sent to the PayrollDispatcher contract</li>
                <li>Each employee gets a per-second streaming payment stream</li>
              </ol>
            </div>
          </div>
        )}

        {/* ═══ STREAMS TAB ════ */}
        {activeTab === "streams" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Manage Streams</h2>
              <button
                onClick={loadEmployerStreams}
                className="px-3 py-1.5 rounded-lg border border-surface-lighter hover:border-text-muted text-xs transition-colors"
              >
                Refresh
              </button>
            </div>

            {isLoadingStreams ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : employerStreams.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="font-semibold mb-2">No Streams Found</h3>
                <p className="text-text-muted text-sm">
                  Streams created from your payroll batches will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {employerStreams.map((stream) => (
                  <div
                    key={stream.id}
                    className="p-4 rounded-xl bg-surface-light border border-surface-lighter"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold">
                            Stream #{stream.id}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              stream.refunded
                                ? "text-error"
                                : stream.paused
                                ? "text-warning"
                                : "text-success"
                            }`}
                          >
                            {stream.refunded
                              ? "Cancelled"
                              : stream.paused
                              ? "Paused"
                              : "Active"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-text-muted">Employee</span>
                            <p className="font-mono mt-0.5">
                              {truncateAddress(stream.employee)}
                            </p>
                          </div>
                          <div>
                            <span className="text-text-muted">Total</span>
                            <p className="font-mono mt-0.5">
                              {formatAmount(stream.total_amount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-text-muted">Claimed</span>
                            <p className="font-mono mt-0.5">
                              {formatAmount(stream.total_claimed)}
                            </p>
                          </div>
                          <div>
                            <span className="text-text-muted">Rate</span>
                            <p className="font-mono mt-0.5">
                              {formatAmount(stream.amount_per_second)}/s
                            </p>
                          </div>
                          <div>
                            <span className="text-text-muted">Start</span>
                            <p>{formatTime(stream.start_time)}</p>
                          </div>
                          <div>
                            <span className="text-text-muted">End</span>
                            <p>{formatTime(stream.stop_time)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        {!stream.refunded && (
                          <>
                            {stream.paused ? (
                              <button
                                onClick={() => handleResumeStream(stream.id)}
                                className="px-3 py-1.5 rounded-lg bg-success/20 text-success hover:bg-success/30 text-xs font-semibold transition-colors"
                              >
                                Resume
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePauseStream(stream.id)}
                                className="px-3 py-1.5 rounded-lg bg-warning/20 text-warning hover:bg-warning/30 text-xs font-semibold transition-colors"
                              >
                                Pause
                              </button>
                            )}
                            <button
                              onClick={() => handleCancelStream(stream.id)}
                              className="px-3 py-1.5 rounded-lg bg-error/20 text-error hover:bg-error/30 text-xs font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ POLICIES TAB ════ */}
        {activeTab === "policies" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Policy Configuration</h2>
              <button
                onClick={() => setShowPolicyForm(prev => !prev)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  showPolicyForm
                    ? "border border-surface-lighter text-text-muted hover:text-text"
                    : "bg-primary hover:bg-primary-dark text-white"
                }`}
              >
                {showPolicyForm ? "Cancel" : "+ Create Policy"}
              </button>
            </div>

            {/* ── Policy Creation Form ── */}
            {showPolicyForm && (
              <div className="p-6 rounded-xl bg-surface-light border border-surface-lighter mb-6">
                <h3 className="font-semibold mb-4">New Policy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-text-muted mb-1">Policy Name</label>
                    <input
                      type="text"
                      value={policyName}
                      onChange={e => setPolicyName(e.target.value)}
                      placeholder="e.g. Monthly Payroll Limit"
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-lighter text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Policy Type */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Policy Type</label>
                    <select
                      value={policyType}
                      onChange={e => setPolicyType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-lighter text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="SpendingLimit">Spending Limit</option>
                      <option value="Allowlist">Allowlist</option>
                      <option value="MultiSig">Multi-Signature</option>
                      <option value="Timelock">Timelock</option>
                    </select>
                  </div>

                  {/* Max Amount */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Max Amount (per tx)</label>
                    <input
                      type="text"
                      value={policyMaxAmount}
                      onChange={e => setPolicyMaxAmount(e.target.value)}
                      placeholder="1000000"
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-lighter text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Period Limit */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Period Limit</label>
                    <input
                      type="text"
                      value={policyPeriodLimit}
                      onChange={e => setPolicyPeriodLimit(e.target.value)}
                      placeholder="5000000"
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-lighter text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Period Seconds */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Period (seconds)</label>
                    <input
                      type="text"
                      value={policyPeriodSeconds}
                      onChange={e => setPolicyPeriodSeconds(e.target.value)}
                      placeholder="86400"
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-lighter text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Required Signers */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Required Signers</label>
                    <input
                      type="number"
                      min="1"
                      value={policyRequiredSigners}
                      onChange={e => setPolicyRequiredSigners(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-lighter text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Allowed Tokens */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-text-muted mb-1">Allowed Tokens</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={policyNewToken}
                        onChange={e => setPolicyNewToken(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddToken(); } }}
                        placeholder="G... contract address"
                        className="flex-1 px-3 py-2 rounded-lg bg-surface border border-surface-lighter text-sm focus:outline-none focus:border-primary"
                      />
                      <button
                        onClick={handleAddToken}
                        className="px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-sm font-semibold transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {policyAllowedTokens.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {policyAllowedTokens.map(t => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface border border-surface-lighter text-xs font-mono"
                          >
                            {truncateAddress(t)}
                            <button
                              onClick={() => handleRemoveToken(t)}
                              className="text-text-muted hover:text-error transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Authorized Signers */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-text-muted mb-1">Authorized Signers</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={policyNewSigner}
                        onChange={e => setPolicyNewSigner(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddSigner(); } }}
                        placeholder="G... address"
                        className="flex-1 px-3 py-2 rounded-lg bg-surface border border-surface-lighter text-sm focus:outline-none focus:border-primary"
                      />
                      <button
                        onClick={handleAddSigner}
                        className="px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-sm font-semibold transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {policyAuthorizedSigners.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {policyAuthorizedSigners.map(s => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface border border-surface-lighter text-xs font-mono"
                          >
                            {truncateAddress(s)}
                            <button
                              onClick={() => handleRemoveSigner(s)}
                              className="text-text-muted hover:text-error transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={handleCreatePolicy}
                    disabled={isCreatingPolicy}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      isCreatingPolicy
                        ? "bg-surface-lighter text-text-muted cursor-not-allowed"
                        : "bg-primary hover:bg-primary-dark text-white"
                    }`}
                  >
                    {isCreatingPolicy ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Creating...
                      </span>
                    ) : (
                      "Create Policy"
                    )}
                  </button>
                  <button
                    onClick={() => setShowPolicyForm(false)}
                    className="px-4 py-2.5 rounded-lg border border-surface-lighter hover:border-text-muted text-sm text-text-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── Active Policies List ── */}
            <div className="p-6 rounded-xl bg-surface-light border border-surface-lighter">
              <h3 className="font-semibold mb-3">Active Policies</h3>
              <p className="text-xs text-text-muted mb-4">
                Policies control spending limits, token allowlists, and
                multi-signature requirements for payroll transactions.
              </p>

              <PolicyList walletAddress={walletAddress} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Overview Card ────────────────────────────────────────────────
function OverviewCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl bg-surface-light border border-surface-lighter">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p
        className={`text-xl font-bold ${
          accent ? "text-success" : "text-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Batch Card ───────────────────────────────────────────────────
function BatchCard({
  batchId,
  walletAddress: _employer,
}: {
  batchId: number;
  walletAddress: string;
}) {
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const client = new PayrollDispatcherClient();

    client.getBatch(batchId).then((data) => {
      if (!cancelled && data) setMetadata(data);
    });

    return () => {
      cancelled = true;
    };
  }, [batchId]);

  if (!metadata) {
    return (
      <div className="p-3 rounded-lg bg-surface-light border border-surface-lighter text-xs text-text-muted animate-pulse">
        Loading batch #{batchId}...
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-surface-light border border-surface-lighter">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold">Batch #{metadata.id}</span>
          <span className="ml-2 text-xs text-text-muted">
            {formatTime(metadata.timestamp)}
          </span>
        </div>
        <span className="text-xs font-medium text-success">
          {metadata.status}
        </span>
      </div>
      <div className="mt-1 text-xs text-text-muted">
        {metadata.recipient_count} recipient(s) ·{" "}
        {formatAmount(metadata.total_amount)} units ·{" "}
        {metadata.stream_count} stream(s)
      </div>
    </div>
  );
}

// ─── Policy List ──────────────────────────────────────────────────
function PolicyList({ walletAddress }: { walletAddress: string }) {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const client = new PolicySignerClient();

    client.getEmployerPolicies(walletAddress).then((data) => {
      if (!cancelled) {
        setPolicies(data || []);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="text-xs text-text-muted animate-pulse">
        Loading policies...
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        <p>No policies configured yet.</p>
        <p className="text-xs mt-1">
          Policies are created via the PolicySigner contract.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {policies.map((policy) => (
        <div
          key={policy.id}
          className="p-3 rounded-lg bg-surface border border-surface-lighter"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{policy.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  policy.active
                    ? "bg-success/20 text-success"
                    : "bg-error/20 text-error"
                }`}
              >
                {policy.active ? "Active" : "Revoked"}
              </span>
            </div>
            <span className="text-xs text-text-muted">
              {policy.policy_type}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-text-muted">Max Amount</span>
              <p className="font-mono">{formatAmount(policy.max_amount)}</p>
            </div>
            <div>
              <span className="text-text-muted">Period Limit</span>
              <p className="font-mono">{formatAmount(policy.period_limit)}</p>
            </div>
            <div>
              <span className="text-text-muted">Signers</span>
              <p className="font-mono">
                {policy.required_signers}/{policy.authorized_signers?.length || 0}
              </p>
            </div>
          </div>

          {policy.allowed_tokens && policy.allowed_tokens.length > 0 && (
            <div className="mt-2 text-xs">
              <span className="text-text-muted">Allowed Tokens: </span>
              {policy.allowed_tokens.map((t: string) => (
                <span
                  key={t}
                  className="inline-block mr-1 px-1.5 py-0.5 rounded bg-surface-lighter font-mono"
                >
                  {truncateAddress(t)}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
