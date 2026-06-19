import { 
  isConnected, 
  getPublicKey, 
  getNetwork, 
  signTransaction,
  signAuthEntry 
} from '@stellar/freighter-api'

export const TESTNET_RPC = 'https://soroban-testnet.stellar.org'
export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015'

export interface WalletState {
  connected: boolean
  publicKey: string | null
  network: string | null
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
