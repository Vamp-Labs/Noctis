import { Keypair, rpc } from "@stellar/stellar-sdk";
import { STELLAR_NETWORK } from "@/types";

export interface ChannelParams {
  employee: string;
  token: string;
  ratePerSecond: string;
  validUntil: number;
}

export interface ChannelState {
  id: string;
  employer: string;
  employee: string;
  token: string;
  totalFunded: string;
  totalReleased: string;
  cumulativePaid: string;
  settled: boolean;
  createdAt: number;
}

export interface Commitment {
  channelId: string;
  payee: string;
  cumulativeAmount: string;
  timestamp: number;
  signature: string;
}

const store = new Map<string, ChannelState>();
const commitments = new Map<string, Commitment[]>();

export class MPPChannelClient {
  private keypair: Keypair;

  constructor(privateKey?: string) {
    this.keypair = privateKey
      ? Keypair.fromSecret(privateKey)
      : Keypair.random();
  }

  async openChannel(employer: string, params: ChannelParams): Promise<ChannelState> {
    const channelId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    const state: ChannelState = {
      id: channelId,
      employer,
      employee: params.employee,
      token: params.token,
      totalFunded: "0",
      totalReleased: "0",
      cumulativePaid: "0",
      settled: false,
      createdAt: Math.floor(Date.now() / 1000),
    };

    store.set(channelId, state);
    commitments.set(channelId, []);

    return state;
  }

  async fundChannel(channelId: string, amount: string): Promise<ChannelState> {
    const state = store.get(channelId);
    if (!state) throw new Error(`Channel ${channelId} not found`);
    if (state.settled) throw new Error("Channel already settled");

    const current = BigInt(state.totalFunded);
    state.totalFunded = (current + BigInt(amount)).toString();

    return state;
  }

  async releasePayment(
    channelId: string,
    payee: string,
    amount: string,
  ): Promise<Commitment> {
    const state = store.get(channelId);
    if (!state) throw new Error(`Channel ${channelId} not found`);
    if (state.settled) throw new Error("Channel already settled");

    const cumulative = (BigInt(state.cumulativePaid) + BigInt(amount)).toString();
    const ts = Math.floor(Date.now() / 1000);
    const msg = `${channelId}:${payee}:${cumulative}:${ts}`;
    const sig = this.keypair.sign(Buffer.from(msg)).toString("base64");

    const commitment: Commitment = {
      channelId,
      payee,
      cumulativeAmount: cumulative,
      timestamp: ts,
      signature: sig,
    };

    state.totalReleased = (BigInt(state.totalReleased) + BigInt(amount)).toString();
    state.cumulativePaid = cumulative;
    commitments.get(channelId)!.push(commitment);

    return commitment;
  }

  async settleChannel(channelId: string): Promise<{ txHash: string }> {
    const state = store.get(channelId);
    if (!state) throw new Error(`Channel ${channelId} not found`);
    if (state.settled) throw new Error("Channel already settled");

    const channelCommitments = commitments.get(channelId) ?? [];
    if (channelCommitments.length === 0) {
      throw new Error("No payments to settle");
    }

    const hash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0")).join("");

    state.settled = true;
    store.set(channelId, state);

    return { txHash: hash };
  }

  getChannel(channelId: string): ChannelState | undefined {
    return store.get(channelId);
  }

  getCommitments(channelId: string): Commitment[] {
    return commitments.get(channelId) ?? [];
  }
}
