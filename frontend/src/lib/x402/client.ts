import { Keypair } from "@stellar/stellar-sdk";

export interface PaymentRequired {
  x402Version: number;
  error: string;
  resource: { url: string; description: string; mimeType: string };
  accepts: Array<{
    scheme: string;
    network: string;
    amount: string;
    asset: string;
    payTo: string;
    maxTimeoutSeconds: number;
    extra: Record<string, string>;
  }>;
  extensions: Record<string, unknown>;
}

export interface PaymentPayload {
  x402Version: number;
  resource: { url: string; description: string; mimeType: string };
  accepted: {
    scheme: string;
    network: string;
    amount: string;
    asset: string;
    payTo: string;
    maxTimeoutSeconds: number;
    extra: Record<string, string>;
  };
  payload: {
    signature: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: number;
      validBefore: number;
      nonce: string;
    };
  };
}

export class X402Client {
  private keypair: Keypair;

  constructor(privateKey?: string) {
    this.keypair = privateKey
      ? Keypair.fromSecret(privateKey)
      : Keypair.random();
  }

  async requestPayment(url: string, amount: string, token: string): Promise<Response> {
    const initial = await fetch(url);
    if (initial.status !== 402) return initial;

    const b64 = initial.headers.get("PAYMENT-REQUIRED");
    if (!b64) throw new Error("Missing PAYMENT-REQUIRED header");
    const challenge: PaymentRequired = JSON.parse(atob(b64));

    const accepted = challenge.accepts[0];
    if (!accepted) throw new Error("No accepted payment schemes in challenge");

    const validAfter = Math.floor(Date.now() / 1000);
    const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
    const nonceHex = "0x" + Array.from(nonceBytes).map((b) => b.toString(16).padStart(2, "0")).join("");

    const payload: PaymentPayload = {
      x402Version: challenge.x402Version,
      resource: challenge.resource,
      accepted,
      payload: {
        signature: this.signPayload(accepted, validAfter, nonceHex),
        authorization: {
          from: this.keypair.publicKey(),
          to: accepted.asset,
          value: accepted.amount,
          validAfter,
          validBefore: validAfter + accepted.maxTimeoutSeconds,
          nonce: nonceHex,
        },
      },
    };

    return fetch(url, {
      headers: { "PAYMENT-SIGNATURE": btoa(JSON.stringify(payload)) },
    });
  }

  private signPayload(
    accepted: PaymentRequired["accepts"][0],
    validAfter: number,
    nonce: string,
  ): string {
    const msg = `${accepted.amount}:${accepted.asset}:${accepted.payTo}:${validAfter}:${nonce}`;
    return this.keypair.sign(Buffer.from(msg)).toString("base64");
  }
}
