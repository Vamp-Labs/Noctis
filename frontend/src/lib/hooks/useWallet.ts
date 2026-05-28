"use client";

import { useState, useCallback, useEffect } from "react";
import type { WalletState, UserRole, UserProfile } from "@/types";
import { STELLAR_NETWORK } from "@/types";
import { WalletFactoryClient } from "@/lib/contracts/walletFactory";

// ─── Session Constants ────────────────────────────────────────────
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

const STORAGE_KEYS = {
  address: "noctis_wallet_address",
  role: "noctis_role",
  isPasskey: "noctis_is_passkey",
  walletId: "noctis_wallet_id",
  networkPassphrase: "noctis_network",
  expiresAt: "noctis_session_expires",
} as const;

// ─── Validation ───────────────────────────────────────────────────
function isValidStellarAddress(addr: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(addr);
}

function isSessionValid(): boolean {
  if (typeof window === "undefined") return false;

  const address = sessionStorage.getItem(STORAGE_KEYS.address);
  if (!address) return false;

  // Validate address format
  if (!isValidStellarAddress(address)) {
    return false;
  }

  // Check expiry
  const expiresAt = sessionStorage.getItem(STORAGE_KEYS.expiresAt);
  if (expiresAt && Date.now() > parseInt(expiresAt, 10)) {
    return false;
  }

  // Check network mismatch
  const storedNetwork = sessionStorage.getItem(STORAGE_KEYS.networkPassphrase);
  if (storedNetwork && storedNetwork !== STELLAR_NETWORK.passphrase) {
    return false;
  }

  return true;
}

function clearSession() {
  Object.values(STORAGE_KEYS).forEach((key) => sessionStorage.removeItem(key));
}

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
  const [state, setState] = useState<WalletState>(() => {
    if (typeof window === "undefined") {
      return {
        address: null,
        isConnected: false,
        isConnecting: false,
        isPasskey: false,
        walletId: null,
        error: null,
      };
    }

    const valid = isSessionValid();
    const address = valid ? sessionStorage.getItem(STORAGE_KEYS.address) : null;
    const walletIdStr = valid ? sessionStorage.getItem(STORAGE_KEYS.walletId) : null;

    if (!valid) {
      clearSession();
    }

    return {
      address,
      isConnected: valid && !!address,
      isConnecting: false,
      isPasskey: valid && sessionStorage.getItem(STORAGE_KEYS.isPasskey) === "true",
      walletId: walletIdStr ? parseInt(walletIdStr, 10) : null,
      error: null,
    };
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    if (!isSessionValid()) return null;
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
    (address: string, isPasskey: boolean, role?: UserRole, walletId?: number | null) => {
      sessionStorage.setItem(STORAGE_KEYS.address, address);
      sessionStorage.setItem(STORAGE_KEYS.isPasskey, String(isPasskey));
      sessionStorage.setItem(STORAGE_KEYS.networkPassphrase, STELLAR_NETWORK.passphrase);
      sessionStorage.setItem(STORAGE_KEYS.expiresAt, String(Date.now() + SESSION_DURATION_MS));
      if (walletId != null) {
        sessionStorage.setItem(STORAGE_KEYS.walletId, String(walletId));
      }
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
        walletId: null,
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

  /** Register a new passkey and deploy wallet on-chain */
  const registerPasskey = useCallback(async () => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      let passkeyKit: PasskeyKitInterface;

      try {
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

      const result = await passkeyKit.register({
        username: "noctis-user",
        displayName: "Noctis User",
      });

      let walletId: number | null = null;

      if (result.pubkey !== "simulated_pubkey_for_dev_1234567890") {
        // Create wallet on-chain via WalletFactory
        const walletFactory = new WalletFactoryClient();
        const passkeyPubkeyBytes = new TextEncoder().encode(result.pubkey);
        const ownerAddr = result.pubkey;
        await walletFactory.createWallet(ownerAddr, ownerAddr, passkeyPubkeyBytes);
        walletId = await walletFactory.getWalletId(ownerAddr);
      }

      persistState(result.pubkey, true, undefined, walletId);

      setState({
        address: result.pubkey,
        isConnected: true,
        isConnecting: false,
        isPasskey: true,
        walletId,
        error: null,
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: err.message || "Failed to register passkey",
      }));
    }
  }, [persistState]);

  /** Connect via Passkey Kit (WebAuthn) — authenticate existing passkey */
  const connectPasskey = useCallback(async () => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      let passkeyKit: PasskeyKitInterface;

      try {
        const mod: any = await import("passkey-kit");
        const PasskeyKitCtor = mod.PasskeyKit || mod.default;
        passkeyKit = new PasskeyKitCtor() as PasskeyKitInterface;
      } catch {
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

      // Look up existing wallet ID
      let walletId: number | null = null;
      if (walletAddress !== "simulated_pubkey_for_dev_1234567890") {
        try {
          const walletFactory = new WalletFactoryClient();
          walletId = await walletFactory.getWalletId(walletAddress);
        } catch {
          // Wallet may not exist yet
        }
      }

      persistState(walletAddress, true, undefined, walletId);

      setState({
        address: walletAddress,
        isConnected: true,
        isConnecting: false,
        isPasskey: true,
        walletId,
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
    clearSession();
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      isPasskey: false,
      walletId: null,
      error: null,
    });
    setProfile(null);
  }, []);

  return {
    ...state,
    profile,
    connectFreighter,
    connectPasskey,
    registerPasskey,
    setUserRole,
    disconnect,
  };
}
