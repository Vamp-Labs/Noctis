import { STELLAR_NETWORK } from "@/types";

const GRAPHQL_URL =
  process.env.MERCURY_GRAPHQL_ENDPOINT ??
  "https://api.mercurydata.app/graphql";

const API_KEY = process.env.MERCURY_API_KEY ?? "";

export interface GraphQLResponse<T = unknown> {
  data: T | null;
  errors?: Array<{ message: string; locations?: unknown[]; path?: string[] }>;
}

export interface SalaryHistoryEntry {
  txHash: string;
  amount: string;
  token: string;
  timestamp: number;
  employer: string;
  streamId: number;
}

export interface EventSubscription {
  contractId: string;
  eventType: string;
  callback: (event: unknown) => void;
  unsubscribe: () => void;
}

export class MercuryClient {
  private graphqlUrl: string;
  private apiKey: string;
  private subscriptions: Map<string, EventSubscription> = new Map();

  constructor(graphqlUrl?: string, apiKey?: string) {
    this.graphqlUrl = graphqlUrl ?? GRAPHQL_URL;
    this.apiKey = apiKey ?? API_KEY;
  }

  async query<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<GraphQLResponse<T>> {
    const res = await fetch(this.graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      return this.fallbackQuery<T>(query, variables);
    }

    return res.json();
  }

  subscribeToEvents(
    contractId: string,
    callback: (event: unknown) => void,
  ): EventSubscription {
    const id = `${contractId}:${Date.now()}`;

    const sub: EventSubscription = {
      contractId,
      eventType: "soroban_event",
      callback,
      unsubscribe: () => {
        this.subscriptions.delete(id);
      },
    };

    this.subscriptions.set(id, sub);

    return sub;
  }

  async getEmployeeHistory(
    employeeAddress: string,
  ): Promise<SalaryHistoryEntry[]> {
    const query = `
      query EmployeeHistory($address: String!) {
        paymentsByPublicKey(publicKeyText: $address) {
          nodes {
            amount
            assetByAsset { code issuer }
            txInfoByTx {
              txHash
              ledgerByLedger { sequence closeTime }
            }
          }
        }
      }
    `;

    const result = await this.query<{
      paymentsByPublicKey: { nodes: any[] };
    }>(query, { address: employeeAddress });

    if (result.errors || !result.data) {
      return this.fallbackGetEmployeeHistory(employeeAddress);
    }

    return result.data.paymentsByPublicKey.nodes.map((n: any) => ({
      txHash: n.txInfoByTx?.txHash ?? "",
      amount: n.amount ?? "0",
      token: n.assetByAsset?.code ?? "XLM",
      timestamp: n.txInfoByTx?.ledgerByLedger?.closeTime ?? 0,
      employer: "",
      streamId: 0,
    }));
  }

  private async fallbackQuery<T>(
    _query: string,
    _variables?: Record<string, unknown>,
  ): Promise<GraphQLResponse<T>> {
    return { data: null };
  }

  private async fallbackGetEmployeeHistory(
    _address: string,
  ): Promise<SalaryHistoryEntry[]> {
    return [];
  }
}
