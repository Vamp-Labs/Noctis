// @stellar/freighter-api v2 ships without bundled .d.ts files,
// so we declare the minimal types we need here.
interface FreighterNetworkDetails {
  network: string
  networkPassphrase: string
}

interface FreighterWindow {
  freighter?: {
    isConnected: () => Promise<{ isConnected: boolean }>
    getPublicKey: () => Promise<string>
    getNetworkDetails: () => Promise<FreighterNetworkDetails>
    signTransaction: (
      xdr: string,
      opts?: { networkPassphrase?: string }
    ) => Promise<{ signedTxXdr: string }>
    signAuthEntry: (
      entryXdr: string,
      opts?: { networkPassphrase?: string }
    ) => Promise<{ signedAuthEntry: string }>
  }
}

declare const window: Window & FreighterWindow

export const TESTNET_RPC = 'https://soroban-testnet.stellar.org'
export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015'

export interface WalletState {
  connected: boolean
  publicKey: string | null
  network: string | null
}

async function freighterAvailable(): Promise<boolean> {
  return typeof window.freighter !== 'undefined'
}

export async function isConnected(): Promise<boolean> {
  if (!(await freighterAvailable())) return false
  try {
    const resp = await window.freighter!.isConnected()
    return resp.isConnected
  } catch {
    return false
  }
}

export async function getPublicKey(): Promise<string> {
  return window.freighter!.getPublicKey()
}

export async function getNetwork(): Promise<FreighterNetworkDetails> {
  return window.freighter!.getNetworkDetails()
}

export async function signTransaction(
  xdr: string,
  opts?: { networkPassphrase?: string }
): Promise<{ signedTxXdr: string }> {
  return window.freighter!.signTransaction(xdr, opts)
}

export async function signAuthEntry(
  entryXdr: string,
  opts?: { networkPassphrase?: string }
): Promise<{ signedAuthEntry: string }> {
  return window.freighter!.signAuthEntry(entryXdr, opts)
}

export async function connectWallet(): Promise<WalletState> {
  const connected = await isConnected()
  if (!connected) {
    return { connected: false, publicKey: null, network: null }
  }

  const publicKey = await getPublicKey()
  const networkDetails = await getNetwork()

  return {
    connected: true,
    publicKey,
    network: networkDetails.network,
  }
}

export async function ensureTestnet(): Promise<boolean> {
  const { network } = await getNetwork()
  return network === 'TESTNET'
}
