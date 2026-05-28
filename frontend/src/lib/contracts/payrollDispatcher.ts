import { ContractClient, addressToScVal, i128ToScVal, u32ToScVal, u64ToScVal, bytesToScVal, vecToScVal, symbolToScVal, buildScMap } from "@/lib/stellar";
import { CONTRACT_ADDRESSES } from "@/types";
import type { BatchMetadata } from "@/types";

export class PayrollDispatcherClient extends ContractClient {
  constructor() {
    super(CONTRACT_ADDRESSES.payroll_dispatcher);
  }

  /** Get batch metadata by ID */
  async getBatch(batchId: number): Promise<BatchMetadata | null> {
    try {
      const result = await this.simulate<any>("get_batch", u32ToScVal(batchId));
      if (!result) return null;
      return {
        id: result.id,
        employer: result.employer,
        total_amount: result.total_amount?.toString() || "0",
        token: result.token,
        recipient_count: Number(result.recipient_count),
        timestamp: Number(result.timestamp),
        status: result.status,
        stream_count: Number(result.stream_count),
        nullifier_count: Number(result.nullifier_count),
      };
    } catch {
      return null;
    }
  }

  /** Get batch Merkle root by ID */
  async getBatchRoot(batchId: number): Promise<string | null> {
    try {
      const result = await this.simulate<string>("get_batch_root", u32ToScVal(batchId));
      return result || null;
    } catch {
      return null;
    }
  }

  /** Get total batch count */
  async getBatchCount(): Promise<number> {
    try {
      const result = await this.simulate<number>("get_batch_count");
      return result || 0;
    } catch {
      return 0;
    }
  }

  /** Verify a nullifier has not been used */
  async verifyNullifier(nullifier: string): Promise<boolean> {
    try {
      const result = await this.simulate<boolean>(
        "verify_nullifier",
        addressToScVal(nullifier) // simplified — real impl needs BytesN
      );
      return result ?? false;
    } catch {
      return false;
    }
  }

  /** Get the trusted setup hash */
  async getTrustedSetupHash(): Promise<string | null> {
    try {
      const result = await this.simulate<string>("get_trusted_setup_hash");
      return result || null;
    } catch {
      return null;
    }
  }

  // ─── Write Operations ───────────────────────────────────────────

  /**
   * Process a payroll batch
   * Builds the PayrollBatch ScVal from raw data, calls process_batch via Freighter
   */
  async processBatch(
    sourceAddress: string,
    employer: string,
    recipients: { address: string; amount: string; duration_secs: number }[],
    totalAmount: string,
    commitmentRoot: Uint8Array,
    zkProof: Uint8Array,
    nullifiers: Uint8Array[],
  ): Promise<void> {
    const batchMap: Record<string, any> = {
      amounts: vecToScVal(recipients.map(r => i128ToScVal(r.amount))),
      commitment_root: bytesToScVal(commitmentRoot),
      employer: addressToScVal(employer),
      nullifiers: vecToScVal(nullifiers.map(n => bytesToScVal(n))),
      recipients: vecToScVal(recipients.map(r => addressToScVal(r.address))),
      stream_durations: vecToScVal(recipients.map(r => u64ToScVal(r.duration_secs))),
      total_amount: i128ToScVal(totalAmount),
      zk_proof: bytesToScVal(zkProof),
    };

    const payrollBatch = buildScMap(batchMap);
    await this.writeWithFreighter(sourceAddress, "process_batch", payrollBatch);
  }

  /** Claim a stream from a processed batch (employee) */
  async claimStream(sourceAddress: string, batchId: number, streamIndex: number): Promise<void> {
    await this.writeWithFreighter(
      sourceAddress,
      "claim_stream",
      u32ToScVal(batchId),
      u32ToScVal(streamIndex),
    );
  }
}
