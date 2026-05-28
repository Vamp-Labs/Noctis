import { NextRequest, NextResponse } from "next/server";
import { X402Server } from "@/lib/x402/server";
import { CONTRACT_ADDRESSES } from "@/types";

const x402 = new X402Server(process.env.X402_SERVER_SECRET);

export async function POST(req: NextRequest) {
  const paymentSignature = req.headers.get("PAYMENT-SIGNATURE");

  if (!paymentSignature) {
    const challenge = x402.createPaymentChallenge({
      amount: "1000000",
      token: CONTRACT_ADDRESSES.streaming_vault,
      receiver: CONTRACT_ADDRESSES.payroll_dispatcher,
      description: "Salary streaming session funding",
    });

    return NextResponse.json(challenge.body, {
      status: 402,
      headers: challenge.headers,
    });
  }

  const verification = x402.verifyPaymentSignature(
    paymentSignature,
    CONTRACT_ADDRESSES.payroll_dispatcher,
    "1000000",
  );

  if (!verification.valid) {
    return NextResponse.json(
      { error: verification.error },
      { status: 403 },
    );
  }

  return NextResponse.json({
    status: "accepted",
    from: verification.from,
    message: "Salary streaming session funded",
  });
}

export const runtime = "nodejs";
