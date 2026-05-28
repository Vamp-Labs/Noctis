import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { STELLAR_NETWORK } from "@/types";

const RELAYER_URL =
  process.env.OPENZEPPELIN_RELAYER_URL ??
  "https://channels.openzeppelin.com/testnet";

const API_KEY = process.env.OPENZEPPELIN_API_KEY ?? "";

export interface FeeEstimate {
  feeBump: string;
  baseFee: string;
  network: string;
}

export interface RelayResult {
  hash: string;
  status: "submitted" | "confirmed" | "failed";
  ledger?: number;
}

export class RelayerClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = (baseUrl ?? RELAYER_URL).replace(/\/+$/, "");
    this.apiKey = apiKey ?? API_KEY;
  }

  async estimateFee(transaction: string): Promise<FeeEstimate> {
    const res = await fetch(`${this.baseUrl}/fee-estimate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        network: "testnet",
        transaction,
      }),
    });

    if (!res.ok) {
      return this.fallbackFeeEstimate();
    }

    return res.json();
  }

  async relay(transaction: string): Promise<RelayResult> {
    const res = await fetch(`${this.baseUrl}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        network: "testnet",
        transaction,
      }),
    });

    if (!res.ok) {
      return this.fallbackRelay(transaction);
    }

    return res.json();
  }

  async createFeeBump(
    innerTxXdr: string,
    maxFee: string,
  ): Promise<{ feeBumpXdr: string; hash: string }> {
    const innerTx = new Transaction(innerTxXdr, STELLAR_NETWORK.passphrase);

    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      innerTx.source,
      maxFee,
      innerTx,
      STELLAR_NETWORK.passphrase,
    );

    return {
      feeBumpXdr: feeBump.toEnvelope().toXDR("base64"),
      hash: feeBump.hash().toString("hex"),
    };
  }

  private async fallbackFeeEstimate(): Promise<FeeEstimate> {
    return {
      feeBump: "100000",
      baseFee: "100",
      network: "testnet",
    };
  }

  private async fallbackRelay(transaction: string): Promise<RelayResult> {
    const { rpc } = await import("@stellar/stellar-sdk");
    const server = new rpc.Server(STELLAR_NETWORK.rpcUrl);
    const tx = TransactionBuilder.fromXDR(transaction, STELLAR_NETWORK.passphrase);
    const result = await server.sendTransaction(tx);

    return {
      hash: result.hash,
      status: result.status === "ERROR" ? "failed" : "submitted",
    };
  }
}
