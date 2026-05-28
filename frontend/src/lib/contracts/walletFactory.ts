import { ContractClient, addressToScVal, bytesToScVal, u32ToScVal, boolToScVal } from "@/lib/stellar";
import { CONTRACT_ADDRESSES } from "@/types";

export interface WalletData {
  id: number;
  owner: string;
  passkey_pubkey: string;
  deployed_at: number;
  last_used: number;
  nonce: number;
}

export class WalletFactoryClient extends ContractClient {
  constructor() {
    super(CONTRACT_ADDRESSES.wallet_factory);
  }

  /** Check if an owner has a registered wallet */
  async hasWallet(ownerAddress: string): Promise<boolean> {
    try {
      return await this.simulate<boolean>("has_wallet", addressToScVal(ownerAddress));
    } catch {
      return false;
    }
  }

  /** Get wallet data by owner address */
  async getWallet(ownerAddress: string): Promise<WalletData | null> {
    try {
      const result = await this.simulate<any>("get_wallet", addressToScVal(ownerAddress));
      if (!result) return null;
      return {
        id: result.id,
        owner: result.owner,
        passkey_pubkey: result.passkey_pubkey,
        deployed_at: Number(result.deployed_at),
        last_used: Number(result.last_used),
        nonce: Number(result.nonce),
      };
    } catch {
      return null;
    }
  }

  /** Get wallet ID for an owner */
  async getWalletId(ownerAddress: string): Promise<number | null> {
    try {
      return await this.simulate<number>("get_wallet_id", addressToScVal(ownerAddress));
    } catch {
      return null;
    }
  }

  /** Get wallet data by wallet ID */
  async getWalletById(walletId: number): Promise<WalletData | null> {
    try {
      const result = await this.simulate<any>("get_wallet_by_id", u32ToScVal(walletId));
      if (!result) return null;
      return {
        id: result.id,
        owner: result.owner,
        passkey_pubkey: result.passkey_pubkey,
        deployed_at: Number(result.deployed_at),
        last_used: Number(result.last_used),
        nonce: Number(result.nonce),
      };
    } catch {
      return null;
    }
  }

  /** Get total wallet count */
  async getWalletCount(): Promise<number> {
    try {
      return await this.simulate<number>("get_wallet_count");
    } catch {
      return 0;
    }
  }

  // ─── Write Operations ───────────────────────────────────────────

  /** Create a new wallet registration for a passkey-authenticated user */
  async createWallet(
    sourceAddress: string,
    owner: string,
    passkeyPubkey: Uint8Array,
  ): Promise<void> {
    await this.writeWithFreighter(sourceAddress, "create_wallet",
      addressToScVal(owner),
      bytesToScVal(passkeyPubkey),
    );
  }

  /** Update the passkey public key for an existing wallet */
  async updatePasskey(
    sourceAddress: string,
    owner: string,
    newPubkey: Uint8Array,
  ): Promise<void> {
    await this.writeWithFreighter(sourceAddress, "update_passkey",
      addressToScVal(owner),
      bytesToScVal(newPubkey),
    );
  }
}
