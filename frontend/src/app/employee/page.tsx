"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PayrollDispatcherClient, type DispatcherStream, type StreamRef } from "@/lib/contracts/payrollDispatcher";
import { hasTrustline, createTrustlineViaFreighter, getNoctisBalance } from "@/lib/trustline";
import type { StreamData } from "@/types";
import { useNotifications } from "@/components/NotificationToast";

// ─── Types ───────────────────────────────────────────────────────
interface StreamWithAccrued {
  stream: StreamData;
  batchId: number;
  streamIndex: number;
  accrued: string;
  isLoadingAccrued: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────
function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatAmount(amount: string): string {
  const n = Number(amount);
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

function streamStatusLabel(stream: StreamData): {
  label: string;
  color: string;
} {
  if (stream.refunded) return { label: "Cancelled", color: "text-error" };
  if (stream.paused) return { label: "Paused", color: "text-warning" };
  const now = Math.floor(Date.now() / 1000);
  if (now > stream.stop_time) return { label: "Expired", color: "text-text-muted" };
  return { label: "Active", color: "text-success" };
}

// ─── Employee Portal Page ────────────────────────────────────────
export default function EmployeePortal() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streams, setStreams] = useState<StreamWithAccrued[]>([]);
  const [needsTrustline, setNeedsTrustline] = useState(false);
  const [isCreatingTrustline, setIsCreatingTrustline] = useState(false);
  const { addNotification, NotificationContainer } = useNotifications();
  const prevStreamCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);

  // Read wallet from session storage on mount
  useEffect(() => {
    const address = sessionStorage.getItem("noctis_wallet_address");
    const role = sessionStorage.getItem("noctis_role");
    if (!address) {
      router.push("/");
      return;
    }
    if (role !== "employee") {
      router.push("/");
      return;
    }
    setWalletAddress(address);
  }, [router]);

  // Fetch streams when we have the wallet address
  useEffect(() => {
    if (!walletAddress) return;
    const address: string = walletAddress;

    let cancelled = false;

    async function loadStreams() {
      setIsLoading(true);
      setError(null);

      try {
        // Streams are stored INSIDE the PayrollDispatcher contract via
        // process_batch. Query the dispatcher directly (not StreamingVault).
        const dispatcherClient = new PayrollDispatcherClient();
        const streamRefs = await dispatcherClient.getEmployeeStreams(address);

        if (cancelled) return;

        // Check NOCTIS trustline — needed for receiving tokens
        const hasTrust = await hasTrustline(address);
        if (!cancelled) setNeedsTrustline(!hasTrust);

        if (streamRefs.length === 0) {
          setStreams([]);
          setIsLoading(false);
          return;
        }

        // Load each stream's data and accrued amount from dispatcher
        const streamPromises = streamRefs.map(async (ref) => {
          const stream = await dispatcherClient.getStream(ref.batch_id, ref.stream_index);
          if (!stream) return null;

          let accrued = "0";
          try {
            // Calculate accrued: amount_per_second * elapsed_seconds
            const now = Math.floor(Date.now() / 1000);
            const effectiveEnd = stream.stop_time < now ? stream.stop_time : now;
            const elapsed = Math.max(0, effectiveEnd - stream.start_time);
            accrued = (BigInt(stream.amount_per_second) * BigInt(elapsed)).toString();
          } catch {
            // keep 0
          }

          return {
            stream: {
              id: stream.id,
              employer: stream.employer,
              employee: stream.employee,
              token: stream.token,
              total_amount: stream.total_amount,
              amount_per_second: stream.amount_per_second,
              start_time: stream.start_time,
              stop_time: stream.stop_time,
              paused: false,
              paused_at: 0,
              total_paused_duration: 0,
              total_claimed: stream.total_claimed,
              refunded: !stream.active,
            },
            batchId: ref.batch_id,
            streamIndex: ref.stream_index,
            accrued,
            isLoadingAccrued: false,
          };
        });

        const results = (await Promise.all(streamPromises)).filter(
          (s): s is StreamWithAccrued => s !== null
        );

        if (!cancelled) {
          if (!isFirstLoadRef.current && results.length > prevStreamCountRef.current) {
            addNotification({
              type: "success",
              title: "New Stream Created",
              message: `${results.length - prevStreamCountRef.current} new payment stream(s) detected`,
            });
          }
          isFirstLoadRef.current = false;
          prevStreamCountRef.current = results.length;
          setStreams(results);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load streams");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadStreams();

    // Poll for new streams every 30 seconds
    const pollInterval = setInterval(loadStreams, 30000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [walletAddress]);

  // Claim a single stream
  const handleClaim = useCallback(
    async (batchId: number, streamIndex: number) => {
      try {
        setError(null);
        const address = sessionStorage.getItem("noctis_wallet_address");
        if (!address) throw new Error("Wallet not connected");

        // Ensure NOCTIS trustline exists before claiming
        const hasTrust = await hasTrustline(address);
        if (!hasTrust) {
          setNeedsTrustline(true);
          addNotification({
            type: "warning",
            title: "Trustline Required",
            message: "Please create a NOCTIS trustline first to receive tokens.",
          });
          return;
        }

        const dispatcher = new PayrollDispatcherClient();
        await dispatcher.claimStream(address, batchId, streamIndex);

        addNotification({
          type: "success",
          title: "Stream Claimed",
          message: `Stream claimed successfully`,
        });

        // Refresh streams after claiming — re-fetch from dispatcher
        const refs = await dispatcher.getEmployeeStreams(address);
        const reloaded = await Promise.all(
          refs.map(async (ref: StreamRef) => {
            const st = await dispatcher.getStream(ref.batch_id, ref.stream_index);
            if (!st) return null;
            const now = Math.floor(Date.now() / 1000);
            const effectiveEnd = st.stop_time < now ? st.stop_time : now;
            const elapsed = Math.max(0, effectiveEnd - st.start_time);
            const accrued = (BigInt(st.amount_per_second) * BigInt(elapsed)).toString();
            return {
              stream: {
                id: st.id,
                employer: st.employer,
                employee: st.employee,
                token: st.token,
                total_amount: st.total_amount,
                amount_per_second: st.amount_per_second,
                start_time: st.start_time,
                stop_time: st.stop_time,
                paused: false,
                paused_at: 0,
                total_paused_duration: 0,
                total_claimed: st.total_claimed,
                refunded: !st.active,
              },
              batchId: ref.batch_id,
              streamIndex: ref.stream_index,
              accrued,
              isLoadingAccrued: false,
            } as StreamWithAccrued;
          })
        );
        setStreams(reloaded.filter((s): s is StreamWithAccrued => s !== null));
      } catch (err: any) {
        setError(err.message || "Failed to claim");
        addNotification({
          type: "error",
          title: "Claim Failed",
          message: err.message || "Unable to claim stream",
        });
      }
    },
    [addNotification]
  );

  // Claim all — sum up all accrued amounts
  const handleClaimAll = useCallback(async () => {
    const totalAccrued = streams.reduce(
      (sum, s) => sum + Number(s.accrued),
      0
    );
    if (totalAccrued <= 0) {
      setError("Nothing to claim.");
      return;
    }
    try {
      setError(null);
      const address = sessionStorage.getItem("noctis_wallet_address");
      if (!address) throw new Error("Wallet not connected");

      // Ensure NOCTIS trustline exists before claiming
      const hasTrust = await hasTrustline(address);
      if (!hasTrust) {
        setNeedsTrustline(true);
        addNotification({
          type: "warning",
          title: "Trustline Required",
          message: "Please create a NOCTIS trustline first to receive tokens.",
        });
        return;
      }

      const dispatcher = new PayrollDispatcherClient();
      for (const s of streams) {
        if (Number(s.accrued) > 0) {
          await dispatcher.claimStream(address, s.batchId, s.streamIndex);
        }
      }

      // Refresh all streams
      const refs = await dispatcher.getEmployeeStreams(address);
      const reloaded = await Promise.all(
        refs.map(async (ref: StreamRef) => {
          const st = await dispatcher.getStream(ref.batch_id, ref.stream_index);
          if (!st) return null;
          const now = Math.floor(Date.now() / 1000);
          const effectiveEnd = st.stop_time < now ? st.stop_time : now;
          const elapsed = Math.max(0, effectiveEnd - st.start_time);
          const accrued = (BigInt(st.amount_per_second) * BigInt(elapsed)).toString();
          return {
            stream: {
              id: st.id,
              employer: st.employer,
              employee: st.employee,
              token: st.token,
              total_amount: st.total_amount,
              amount_per_second: st.amount_per_second,
              start_time: st.start_time,
              stop_time: st.stop_time,
              paused: false,
              paused_at: 0,
              total_paused_duration: 0,
              total_claimed: st.total_claimed,
              refunded: !st.active,
            },
            batchId: ref.batch_id,
            streamIndex: ref.stream_index,
            accrued,
            isLoadingAccrued: false,
          } as StreamWithAccrued;
        })
      );
      setStreams(reloaded.filter((s): s is StreamWithAccrued => s !== null));

      addNotification({
        type: "success",
        title: "All Streams Claimed",
        message: `Claimed ${streams.filter(s => Number(s.accrued) > 0).length} stream(s)`,
      });
    } catch (err: any) {
      setError(err.message || "Failed to claim all");
      addNotification({
        type: "error",
        title: "Claim All Failed",
        message: err.message || "Unable to claim streams",
      });
    }
  }, [streams, addNotification]);

  // Total salary accrual rate from active (non-refunded, non-paused) streams
  const totalRatePerSec = streams
    .filter((s) => !s.stream.refunded && !s.stream.paused)
    .reduce((sum, s) => sum + Number(s.stream.amount_per_second), 0);

  // Handle NOCTIS trustline creation
  const handleCreateTrustline = useCallback(async () => {
    try {
      setError(null);
      setIsCreatingTrustline(true);
      const address = sessionStorage.getItem("noctis_wallet_address");
      if (!address) throw new Error("Wallet not connected");

      addNotification({
        type: "info",
        title: "Creating Trustline",
        message: "Freighter will open to sign a trustline transaction...",
      });

      const result = await createTrustlineViaFreighter(address);

      if (result === "already_exists") {
        addNotification({
          type: "success",
          title: "Trustline Exists",
          message: "NOCTIS trustline is already set up.",
        });
      } else {
        addNotification({
          type: "success",
          title: "Trustline Created",
          message: "NOCTIS token trustline activated. You can now receive payments!",
        });
      }

      setNeedsTrustline(false);
    } catch (err: any) {
      setError(err.message || "Failed to create trustline");
      addNotification({
        type: "error",
        title: "Trustline Failed",
        message: err.message || "Unable to create NOCTIS trustline",
      });
    } finally {
      setIsCreatingTrustline(false);
    }
  }, [addNotification]);

  // Navigate back home
  const handleBack = useCallback(() => {
    sessionStorage.removeItem("noctis_role");
    router.push("/");
  }, [router]);

  if (!walletAddress) {
    return null; // Redirecting
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NotificationContainer />
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
          <span className="font-bold">Noctis · Employee Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted font-mono">
            {truncateAddress(walletAddress)}
          </span>
          <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
            Employee
          </span>
        </div>
      </header>

      {/* ─── Main Content ──────────────────────────── */}
      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        {/* ─── Summary ──────────────────────────────── */}
        {!isLoading && streams.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard
              label="Active Streams"
              value={streams.filter((s) => !s.stream.refunded).length.toString()}
            />
            <SummaryCard
              label="Total Accrued"
              value={formatAmount(
                streams
                  .reduce((sum, s) => sum + Number(s.accrued), 0)
                  .toString()
              )}
            />
            <SummaryCard
              label="Total Claimed"
              value={formatAmount(
                streams
                  .reduce(
                    (sum, s) => sum + Number(s.stream.total_claimed),
                    0
                  )
                  .toString()
              )}
            />
            <SummaryCard
              label="Salary Accruing"
              value={totalRatePerSec > 0 ? `${formatAmount(totalRatePerSec.toString())}/s` : "—"}
              accent={totalRatePerSec > 0}
            />
          </div>
        )}

        {/* ─── Error ────────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
            {error}
          </div>
        )}

        {/* ─── Loading ──────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-text-muted text-sm">Loading your streams...</p>
            </div>
          </div>
        )}

        {/* ─── Empty State ──────────────────────────── */}
        {!isLoading && streams.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-sm">
              <div className="text-4xl mb-4">📭</div>
              <h2 className="text-xl font-bold mb-2">No Streams Yet</h2>
              <p className="text-text-muted text-sm mb-6">
                You don&apos;t have any active payment streams. When your
                employer runs payroll, your stream will appear here.
              </p>
              <button
                onClick={handleBack}
                className="px-6 py-2 rounded-lg bg-primary hover:bg-primary-dark transition-colors text-sm font-semibold"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}

        {/* ─── Trustline Warning ──────────────────────── */}
        {needsTrustline && (
          <div className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/30">
            <div className="flex items-start gap-3">
              <div className="text-warning text-lg shrink-0">⚠️</div>
              <div className="flex-1">
                <p className="font-semibold text-warning mb-1">NOCTIS Token Trustline Required</p>
                <p className="text-sm text-text-muted mb-3">
                  You need a trustline for the NOCTIS token to claim your streamed salary.
                  This is a one-time setup.
                </p>
                <button
                  onClick={handleCreateTrustline}
                  disabled={isCreatingTrustline}
                  className="px-4 py-2 rounded-lg bg-warning hover:bg-warning/80 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {isCreatingTrustline ? "Creating Trustline..." : "Create NOCTIS Trustline"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Stream List ─────────────────────────── */}
        {!isLoading && streams.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">My Streams</h2>
              {streams.some(
                (s) => Number(s.accrued) > 0 && !s.stream.paused && !s.stream.refunded
              ) && (
                <button
                  onClick={handleClaimAll}
                  className="px-4 py-2 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors text-sm font-semibold"
                >
                  Claim All
                </button>
              )}
            </div>

            <div className="space-y-3">
              {streams.map((item, index) => {
                const status = streamStatusLabel(item.stream);
                const canClaim =
                  Number(item.accrued) > 0 &&
                  !item.stream.paused &&
                  !item.stream.refunded;

                return (
                  <div
                    key={item.stream.id}
                    className="p-4 rounded-xl bg-surface-light border border-surface-lighter"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header row */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold">
                            Stream #{item.stream.id}
                          </span>
                          <span
                            className={`text-xs font-medium ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-text-muted">Employer</span>
                            <p className="font-mono mt-0.5">
                              {truncateAddress(item.stream.employer)}
                            </p>
                          </div>
                          <div>
                            <span className="text-text-muted">Total</span>
                            <p className="font-mono mt-0.5">
                              {formatAmount(item.stream.total_amount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-text-muted">Rate</span>
                            <p className="font-mono mt-0.5">
                              {formatAmount(item.stream.amount_per_second)}/s
                            </p>
                          </div>
                          <div>
                            <span className="text-text-muted">Claimed</span>
                            <p className="font-mono mt-0.5">
                              {formatAmount(item.stream.total_claimed)}
                            </p>
                          </div>
                          <div>
                            <span className="text-text-muted">Start</span>
                            <p className="mt-0.5">
                              {formatTime(item.stream.start_time)}
                            </p>
                          </div>
                          <div>
                            <span className="text-text-muted">End</span>
                            <p className="mt-0.5">
                              {formatTime(item.stream.stop_time)}
                            </p>
                          </div>
                          <div>
                            <span className="text-text-muted">Accrued</span>
                            <p className="font-mono mt-0.5 text-success font-semibold">
                              {item.isLoadingAccrued
                                ? "..."
                                : formatAmount(item.accrued)}
                            </p>
                          </div>
                          <div>
                            <span className="text-text-muted">Paused</span>
                            <p className="mt-0.5">
                              {item.stream.paused
                                ? `${Math.floor(
                                    (Date.now() / 1000 - item.stream.paused_at) /
                                      60
                                  )}m ago`
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Claim button */}
                      <button
                        onClick={() => handleClaim(item.batchId, item.streamIndex)}
                        disabled={!canClaim}
                        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          canClaim
                            ? "bg-primary hover:bg-primary-dark text-white"
                            : "bg-surface-lighter text-text-muted cursor-not-allowed"
                        }`}
                      >
                        {item.isLoadingAccrued
                          ? "..."
                          : canClaim
                          ? `Claim ${formatAmount(item.accrued)}`
                          : item.stream.refunded
                          ? "Cancelled"
                          : item.stream.paused
                          ? "Paused"
                          : "Claim"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Summary Card Sub-component ───────────────────────────────────
function SummaryCard({
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
          accent ? "text-warning" : "text-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
