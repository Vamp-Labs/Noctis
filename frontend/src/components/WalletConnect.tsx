"use client";

import { useWallet } from "@/lib/hooks/useWallet";

interface WalletConnectProps {
  onRoleSelected: (role: "employer" | "employee") => void;
}

export default function WalletConnect({ onRoleSelected }: WalletConnectProps) {
  const wallet = useWallet();

  if (wallet.isConnecting) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-text-muted">Connecting wallet...</p>
        </div>
      </div>
    );
  }

  if (wallet.isConnected && wallet.address) {
    return (
      <div className="space-y-6">
        <div className="bg-surface-light rounded-xl p-4 border border-surface-lighter">
          <p className="text-sm text-text-muted mb-1">Connected Wallet</p>
          <p className="font-mono text-sm break-all">
            {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
          </p>
          {wallet.isPasskey && (
            <span className="inline-block mt-2 text-xs bg-secondary/20 text-secondary px-2 py-1 rounded-full">
              Passkey
            </span>
          )}
        </div>

        <div>
          <p className="text-sm text-text-muted mb-3">Select your role:</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onRoleSelected("employer")}
              className="p-4 rounded-xl bg-surface-light border border-surface-lighter hover:border-primary transition-colors text-left"
            >
              <div className="text-lg mb-1">🏢</div>
              <div className="font-semibold">Employer</div>
              <div className="text-xs text-text-muted mt-1">
                Run payroll, manage streams
              </div>
            </button>
            <button
              onClick={() => onRoleSelected("employee")}
              className="p-4 rounded-xl bg-surface-light border border-surface-lighter hover:border-secondary transition-colors text-left"
            >
              <div className="text-lg mb-1">👤</div>
              <div className="font-semibold">Employee</div>
              <div className="text-xs text-text-muted mt-1">
                View and claim salary
              </div>
            </button>
          </div>
        </div>

        <button
          onClick={wallet.disconnect}
          className="w-full py-2 text-sm text-text-muted hover:text-error transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={wallet.connectFreighter}
        className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark transition-colors font-semibold"
      >
        Connect Freighter
      </button>
      <button
        onClick={wallet.connectPasskey}
        className="w-full py-3 px-4 rounded-xl border border-surface-lighter hover:border-secondary transition-colors font-semibold"
      >
        Connect with Passkey
      </button>
      {wallet.error && (
        <p className="text-sm text-error text-center">{wallet.error}</p>
      )}
    </div>
  );
}
