import { Keypair } from "@stellar/stellar-sdk";

export interface PaymentChallengeParams {
  amount: string;
  token: string;
  receiver: string;
  description?: string;
  maxTimeoutSeconds?: number;
}

export interface PaymentRequiredPayload {
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

export class X402Server {
  private secretKey: Keypair;

  constructor(secretKey?: string) {
    this.secretKey = secretKey
      ? Keypair.fromSecret(secretKey)
      : Keypair.random();
  }

  createPaymentChallenge(params: PaymentChallengeParams): {
    status: 402;
    headers: Record<string, string>;
    body: PaymentRequiredPayload;
  } {
    const body: PaymentRequiredPayload = {
      x402Version: 2,
      error: "PAYMENT-SIGNATURE header is required",
      resource: {
        url: "/api/x402/salary",
        description: params.description ?? "Salary streaming access",
        mimeType: "application/json",
      },
      accepts: [
        {
          scheme: "exact",
          network: "stellar:testnet",
          amount: params.amount,
          asset: params.token,
          payTo: params.receiver,
          maxTimeoutSeconds: params.maxTimeoutSeconds ?? 60,
          extra: { name: "NOCTIS", version: "2" },
        },
      ],
      extensions: {},
    };

    return {
      status: 402,
      headers: {
        "PAYMENT-REQUIRED": btoa(JSON.stringify(body)),
        "Content-Type": "application/json",
      },
      body,
    };
  }

  verifyPaymentSignature(
    paymentSignatureHeader: string,
    expectedReceiver: string,
    expectedAmount: string,
  ): { valid: boolean; from?: string; error?: string } {
    try {
      const parsed = JSON.parse(atob(paymentSignatureHeader));
      const { accepted, payload } = parsed;

      if (accepted.payTo !== expectedReceiver) {
        return { valid: false, error: "payTo mismatch" };
      }
      if (accepted.amount !== expectedAmount) {
        return { valid: false, error: "amount mismatch" };
      }
      if (accepted.network !== "stellar:testnet") {
        return { valid: false, error: "wrong network" };
      }

      const msg = `${accepted.amount}:${accepted.asset}:${accepted.payTo}:${payload.authorization.validAfter}:${payload.authorization.nonce}`;
      const sigBuffer = Buffer.from(atob(payload.signature), "binary");
      const fromPubKey = Keypair.fromPublicKey(payload.authorization.from);
      const isValid = fromPubKey.verify(Buffer.from(msg), sigBuffer);

      if (!isValid) {
        return { valid: false, error: "invalid signature" };
      }

      return { valid: true, from: payload.authorization.from };
    } catch (e) {
      return { valid: false, error: `parse error: ${e}` };
    }
  }
}
