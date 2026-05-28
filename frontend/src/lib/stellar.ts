import {
  rpc,
  Contract,
  Keypair,
  nativeToScVal,
  scValToNative,
  xdr,
  Networks,
  Account,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { STELLAR_NETWORK, CONTRACT_ADDRESSES } from "@/types";

// ─── RPC Client ──────────────────────────────────────────────────
export const server = new rpc.Server(STELLAR_NETWORK.rpcUrl, {
  allowHttp: false,
});

// ─── Sequence Number Cache ───────────────────────────────────────
// Avoid fetching the same account multiple times in a single operation
const accountCache = new Map<string, Account>();

async function getCachedAccount(address: string): Promise<Account> {
  const cached = accountCache.get(address);
  if (cached) return cached;
  const account = await server.getAccount(address);
  accountCache.set(address, account);
  return account;
}

export function clearAccountCache() {
  accountCache.clear();
}

// ─── Contract Helper ─────────────────────────────────────────────
export class ContractClient {
  private contract: Contract;
  private networkPassphrase: string;

  constructor(contractId: string) {
    if (!contractId) {
      console.warn("ContractClient: empty contract ID — calls will fail until deployed");
    }
    this.contract = new Contract(contractId || "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
    this.networkPassphrase = STELLAR_NETWORK.passphrase;
  }

  setContractId(contractId: string) {
    this.contract = new Contract(contractId);
  }

  /** Build a Soroban transaction for simulation (read-only) */
  private async buildSimulationTx(method: string, ...args: xdr.ScVal[]) {
    // Use a test source account for read-only simulations
    const sourceKeypair = Keypair.random();
    const source = new Account(sourceKeypair.publicKey(), "0");
    return new TransactionBuilder(source, {
      fee: "10000",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();
  }

  /** Build a Soroban transaction for signing (write operations) */
  private buildInvocationTx(
    source: Account,
    method: string,
    ...args: xdr.ScVal[]
  ) {
    return new TransactionBuilder(source, {
      fee: "10000",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();
  }

  /** Simulate a read-only contract call */
  async simulate<T>(method: string, ...args: xdr.ScVal[]): Promise<T> {
    const tx = await this.buildSimulationTx(method, ...args);
    const result = await server.simulateTransaction(tx);

    // In v14 SDK, the response is a discriminated union
    const simResult = result as any;
    if (simResult.error) {
      throw new Error(`Simulate error (${method}): ${simResult.error}`);
    }

    if (!simResult.result) {
      // If the transaction has auth entries but no result,
      // it might require authentication — return null
      return null as T;
    }

    const returnValue = simResult.result?.retval;
    if (!returnValue) return null as T;

    return scValToNative(returnValue) as T;
  }

  /** Prepare a transaction for user signing (write operation) */
  async prepareInvocation(
    sourceAddress: string,
    method: string,
    ...args: xdr.ScVal[]
  ): Promise<{
    tx: any;
    simulationResult: any;
  }> {
    const account = await getCachedAccount(sourceAddress);
    const tx = this.buildInvocationTx(account, method, ...args);
    const simResult: any = await server.simulateTransaction(tx);

    if (simResult.error) {
      throw new Error(`Simulate error (${method}): ${simResult.error}`);
    }

    return { tx, simulationResult: simResult };
  }

  /** Send a pre-signed transaction */
  async sendTransaction(signedTx: string): Promise<rpc.Api.SendTransactionResponse> {
    const tx = TransactionBuilder.fromXDR(signedTx, this.networkPassphrase);
    const sendResult = await server.sendTransaction(tx);

    if (sendResult.status === "ERROR") {
      throw new Error(`Transaction failed: ${sendResult.errorResult?.result().toString()}`);
    }

    return sendResult;
  }

  /**
   * Full write flow: prepare → sign with Freighter → poll for completion
   * Returns the transaction hash and the result value (if available)
   */
  async writeWithFreighter(
    sourceAddress: string,
    method: string,
    ...args: xdr.ScVal[]
  ): Promise<{ hash: string; success: boolean }> {
    // 1. Prepare the transaction
    const account = await getCachedAccount(sourceAddress);
    const tx = this.buildInvocationTx(account, method, ...args);
    const simResult: any = await server.simulateTransaction(tx);

    if (simResult.error) {
      throw new Error(`Simulate error (${method}): ${simResult.error}`);
    }

    // 2. Assemble the transaction with auth/soroban data
    const assembledTx = await server.prepareTransaction(tx);

    // 3. Sign with Freighter
    if (typeof window === "undefined" || !(window as any).stellar) {
      throw new Error("Freighter wallet not detected");
    }
    const signedXdr = await (window as any).stellar.signTransaction(
      assembledTx.toXDR(),
      { networkPassphrase: this.networkPassphrase }
    );

    // 4. Send
    const signedTx = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
    const sendResult = await server.sendTransaction(signedTx);

    if (sendResult.status === "ERROR") {
      throw new Error(`Transaction failed: ${sendResult.errorResult?.result().toString()}`);
    }

    // 5. Poll for completion
    const hash = sendResult.hash;
    let status: string = sendResult.status;
    let attempts = 0;

    while (status === "PENDING") {
      await new Promise((r) => setTimeout(r, 2000));
      const txResult = await server.getTransaction(hash);
      status = txResult.status;
      attempts++;
      if (attempts > 30) throw new Error(`${method} timed out after 60s`);
    }

    if (status === "FAILED") {
      throw new Error(`${method} FAILED: transaction reverted`);
    }

    clearAccountCache();
    return { hash, success: true };
  }
}

// ─── ScMap Builder ───────────────────────────────────────────────
// Builds a Soroban ScMap from a record of field name → ScVal pairs.
// Keys are sorted alphabetically as required by Soroban host.
export function buildScMap(fields: Record<string, xdr.ScVal>): xdr.ScVal {
  const sorted = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b));
  const entries = sorted.map(
    ([key, val]) => new xdr.ScMapEntry({ key: symbolToScVal(key), val })
  );
  return xdr.ScVal.scvMap(entries);
}

// ─── ScVal Helpers ───────────────────────────────────────────────
export function addressToScVal(address: string): xdr.ScVal {
  return nativeToScVal(address, { type: "address" });
}

export function i128ToScVal(value: string | bigint | number): xdr.ScVal {
  return nativeToScVal(BigInt(value), { type: "i128" });
}

export function u32ToScVal(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function u64ToScVal(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

export function boolToScVal(value: boolean): xdr.ScVal {
  return nativeToScVal(value, { type: "bool" });
}

export function bytesToScVal(value: string | number[] | Uint8Array): xdr.ScVal {
  return nativeToScVal(value, { type: "bytes" });
}

export function symbolToScVal(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "symbol" });
}

/** Convert an array of ScVals to a Vec ScVal */
export function vecToScVal(items: xdr.ScVal[]): xdr.ScVal {
  return xdr.ScVal.scvVec(items);
}

/** Convert an optional value to ScVal (Soroban v26: None=void, Some=value directly) */
export function optionToScVal(value: xdr.ScVal | null): xdr.ScVal {
  if (value === null) {
    return xdr.ScVal.scvVoid();
  }
  // In Soroban v26, Option<T> is void for None, or the inner T ScVal directly for Some
  return value;
}

// ─── Testnet Faucet ──────────────────────────────────────────────
export async function fundTestnetAccount(publicKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${STELLAR_NETWORK.friendbot}?addr=${publicKey}`
    );
    const json = await response.json();
    return json.checksum !== undefined;
  } catch {
    return false;
  }
}
