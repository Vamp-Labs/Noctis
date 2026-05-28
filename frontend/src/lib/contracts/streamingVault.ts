import { ContractClient, addressToScVal, i128ToScVal, u32ToScVal, u64ToScVal, vecToScVal, symbolToScVal } from "@/lib/stellar";
import { CONTRACT_ADDRESSES } from "@/types";
import type { StreamData } from "@/types";

export class StreamingVaultClient extends ContractClient {
  constructor() {
    super(CONTRACT_ADDRESSES.streaming_vault);
  }

  /** Get stream data by ID */
  async getStream(streamId: number): Promise<StreamData | null> {
    try {
      const result = await this.simulate<any>("get_stream", u32ToScVal(streamId));
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
        paused: result.paused,
        paused_at: Number(result.paused_at),
        total_paused_duration: Number(result.total_paused_duration),
        total_claimed: result.total_claimed?.toString() || "0",
        refunded: result.refunded,
      };
    } catch {
      return null;
    }
  }

  /** Get accrued amount for a stream */
  async getAccruedAmount(streamId: number): Promise<string | null> {
    try {
      const result = await this.simulate<string>(
        "get_accrued_amount",
        u32ToScVal(streamId)
      );
      return result ? result.toString() : null;
    } catch {
      return null;
    }
  }

  /** Get all stream IDs for an employee */
  async getEmployeeStreams(employeeAddress: string): Promise<number[]> {
    try {
      const result = await this.simulate<number[]>(
        "get_employee_streams",
        addressToScVal(employeeAddress)
      );
      if (!result) return [];
      return Array.isArray(result) ? result : [];
    } catch {
      return [];
    }
  }

  /** Get employer's total deposited balance */
  async getEmployerBalance(employerAddress: string): Promise<string> {
    try {
      const result = await this.simulate<string>(
        "get_employer_balance",
        addressToScVal(employerAddress)
      );
      return result?.toString() || "0";
    } catch {
      return "0";
    }
  }

  /** Get total stream count */
  async getStreamCount(): Promise<number> {
    try {
      return await this.simulate<number>("get_stream_count");
    } catch {
      return 0;
    }
  }

  // ─── Write Operations ───────────────────────────────────────────

  /** Claim a stream (employee) */
  async claimStream(sourceAddress: string, streamId: number): Promise<void> {
    await this.writeWithFreighter(sourceAddress, "claim_stream", u32ToScVal(streamId));
  }

  /** Pause a stream (employer) */
  async pauseStream(sourceAddress: string, streamId: number): Promise<void> {
    await this.writeWithFreighter(sourceAddress, "pause_stream", u32ToScVal(streamId));
  }

  /** Resume a paused stream (employer) */
  async resumeStream(sourceAddress: string, streamId: number): Promise<void> {
    await this.writeWithFreighter(sourceAddress, "resume_stream", u32ToScVal(streamId));
  }

  /** Cancel a stream (employer) — employee gets accrued, employer gets refund */
  async cancelStream(sourceAddress: string, streamId: number): Promise<void> {
    await this.writeWithFreighter(sourceAddress, "cancel_stream", u32ToScVal(streamId));
  }

  /** Create a new stream (employer deposits + configures) */
  async createStream(
    sourceAddress: string,
    employer: string,
    employee: string,
    token: string,
    totalAmount: string,
    amountPerSecond: string,
    duration: number,
  ): Promise<void> {
    await this.writeWithFreighter(
      sourceAddress,
      "create_stream",
      addressToScVal(employer),
      addressToScVal(employee),
      addressToScVal(token),
      i128ToScVal(totalAmount),
      i128ToScVal(amountPerSecond),
      u64ToScVal(duration),
    );
  }
}
