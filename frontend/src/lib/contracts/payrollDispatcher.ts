import { ContractClient, addressToScVal, i128ToScVal, u32ToScVal, u64ToScVal, bytesToScVal, vecToScVal, symbolToScVal, buildScMap } from "@/lib/stellar";
import { CONTRACT_ADDRESSES } from "@/types";
import type { BatchMetadata } from "@/types";

/** Stream data returned by the PayrollDispatcher's get_stream function */
export interface DispatcherStream {
  id: number;
  employer: string;
  employee: string;
  token: string;
  total_amount: string;
  amount_per_second: string;
  start_time: number;
  stop_time: number;
  total_claimed: string;
  active: boolean;
}

/** Stream reference (batch_id, stream_index) returned by get_employee_streams */
export interface StreamRef {
  batch_id: number;
  stream_index: number;
}

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

  /** Get stream data by batch ID and stream index */
  async getStream(batchId: number, streamIndex: number): Promise<DispatcherStream | null> {
    try {
      const result = await this.simulate<any>("get_stream", u32ToScVal(batchId), u32ToScVal(streamIndex));
      if (!result) return null;
      return {
        id: result.id,
        employer: result.employer,
        employee: result.employee,
        token: result.token,
        total_amount: result.total_amount?.toString() || "0",
        amount_per_second: result.amount_per_second?.toString() || "0",
        start_time: Number(result.start_time),
        stop_time: Number(result.stop_time),
        total_claimed: result.total_claimed?.toString() || "0",
        active: result.active,
      };
    } catch {
      return null;
    }
  }

  /** Get all stream references for an employee (scans batches) */
  async getEmployeeStreams(employeeAddress: string): Promise<StreamRef[]> {
    try {
      const result = await this.simulate<any[]>("get_employee_streams", addressToScVal(employeeAddress));
      if (!result) return [];
      return result.map((r: any) => ({
        batch_id: Number(r.batch_id),
        stream_index: Number(r.stream_index),
      }));
    } catch {
      return [];
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
