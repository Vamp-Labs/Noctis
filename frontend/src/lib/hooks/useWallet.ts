"use client";

import { useState, useCallback, useEffect } from "react";
import type { WalletState, UserRole, UserProfile } from "@/types";

// ─── Session Storage Keys ────────────────────────────────────────
const STORAGE_KEYS = {
  address: "noctis_wallet_address",
  role: "noctis_role",
  isPasskey: "noctis_is_passkey",
} as const;

// ─── Freighter Wallet Detection ──────────────────────────────────
declare global {
  interface Window {
    stellar?: {
      isConnected: () => Promise<{ isConnected: boolean }>;
      getPublicKey: () => Promise<string>;
      signTransaction: (tx: string, opts?: any) => Promise<string>;
    };
  }
}

// ─── Passkey Kit Interface ───────────────────────────────────────
interface PasskeyKitInterface {
  register: (opts: { username: string; displayName: string }) => Promise<{
    pubkey: string;
    credentialId: string;
  }>;
  authenticate: () => Promise<{
    pubkey: string;
    signature: string;
  }>;
}

// ─── Wallet Hook ─────────────────────────────────────────────────
export function useWallet() {
  const [state, setState] = useState<WalletState>(() => ({
    address: typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEYS.address) : null,
    isConnected:
      typeof window !== "undefined" && !!sessionStorage.getItem(STORAGE_KEYS.address),
    isConnecting: false,
    isPasskey:
      typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEYS.isPasskey) === "true",
    error: null,
  }));
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    const address = sessionStorage.getItem(STORAGE_KEYS.address);
    const role = sessionStorage.getItem(STORAGE_KEYS.role) as UserRole | null;
    if (address && role) {
      return { address, role };
    }
    return null;
  });

  // Auto-connect Freighter on mount if address is stored
  useEffect(() => {
    if (state.address && !state.isPasskey) {
      checkFreighterConnection();
    }
  }, []);

  const checkFreighterConnection = async () => {
    if (typeof window === "undefined") return;
    try {
      if (window.stellar) {
        const { isConnected } = await window.stellar.isConnected();
        if (isConnected) {
          const pubkey = await window.stellar.getPublicKey();
          setState((s) => ({
            ...s,
            address: pubkey,
            isConnected: true,
            isConnecting: false,
          }));
        }
      }
    } catch {
      // Freighter not installed
    }
  };

  /** Persist state to sessionStorage */
  const persistState = useCallback(
    (address: string, isPasskey: boolean, role?: UserRole) => {
      sessionStorage.setItem(STORAGE_KEYS.address, address);
      sessionStorage.setItem(STORAGE_KEYS.isPasskey, String(isPasskey));
      if (role) {
        sessionStorage.setItem(STORAGE_KEYS.role, role);
      }
    },
    []
  );

  /** Connect via Freighter browser extension */
  const connectFreighter = useCallback(async () => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      if (!window.stellar) {
        throw new Error(
          "Freighter wallet not detected. Install from freighter.app"
        );
      }
      const { isConnected } = await window.stellar.isConnected();
      if (!isConnected) {
        await window.stellar.getPublicKey(); // triggers connection prompt
      }
      const pubkey = await window.stellar.getPublicKey();
      persistState(pubkey, false);
      setState({
        address: pubkey,
        isConnected: true,
        isConnecting: false,
        isPasskey: false,
        error: null,
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: err.message || "Failed to connect Freighter",
      }));
    }
  }, [persistState]);

  /** Connect via Passkey Kit (WebAuthn) */
  const connectPasskey = useCallback(async () => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      let passkeyKit: PasskeyKitInterface;

      try {
        // Dynamic import — will work once passkey-kit is installed
        const mod: any = await import("passkey-kit");
        const PasskeyKitCtor = mod.PasskeyKit || mod.default;
        passkeyKit = new PasskeyKitCtor() as PasskeyKitInterface;
      } catch {
        // Fallback simulation for development
        passkeyKit = {
          register: async () => ({
            pubkey: "simulated_pubkey_for_dev_1234567890",
            credentialId: "simulated_credential_id",
          }),
          authenticate: async () => ({
            pubkey: "simulated_pubkey_for_dev_1234567890",
            signature: "simulated_signature",
          }),
        };
      }

      const passkey = await passkeyKit.authenticate();
      const walletAddress = passkey.pubkey;
      persistState(walletAddress, true);

      setState({
        address: walletAddress,
        isConnected: true,
        isConnecting: false,
        isPasskey: true,
        error: null,
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: err.message || "Failed to connect with passkey",
      }));
    }
  }, [persistState]);

  /** Set user role after connection */
  const setUserRole = useCallback(
    (role: UserRole) => {
      if (state.address) {
        sessionStorage.setItem(STORAGE_KEYS.role, role);
        setProfile({ address: state.address, role });
      }
    },
    [state.address]
  );

  /** Disconnect wallet */
  const disconnect = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEYS.address);
    sessionStorage.removeItem(STORAGE_KEYS.role);
    sessionStorage.removeItem(STORAGE_KEYS.isPasskey);
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      isPasskey: false,
      error: null,
    });
    setProfile(null);
  }, []);

  return {
    ...state,
    profile,
    connectFreighter,
    connectPasskey,
    setUserRole,
    disconnect,
  };
}
