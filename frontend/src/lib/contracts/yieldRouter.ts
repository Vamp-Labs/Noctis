import { ContractClient, addressToScVal, i128ToScVal, symbolToScVal, u32ToScVal } from "@/lib/stellar";
import { CONTRACT_ADDRESSES } from "@/types";
import type { YieldSplit, EmployerAllocation } from "@/types";

export class YieldRouterClient extends ContractClient {
  constructor() {
    super(CONTRACT_ADDRESSES.yield_router);
  }

  /** Get registered yield sources */
  async getSources(): Promise<string[]> {
    try {
      const result = await this.simulate<any>("get_sources");
      if (!result) return [];
      // Symbol[] returns as string array
      return result as string[];
    } catch {
      return [];
    }
  }

  /** Get yield rate for a source */
  async getYieldRate(sourceName: string): Promise<number> {
    try {
      const result = await this.simulate<number>(
        "get_yield_rate",
        symbolToScVal(sourceName)
      );
      return result || 0;
    } catch {
      return 0;
    }
  }

  /** Get yield split configuration */
  async getYieldSplit(): Promise<YieldSplit | null> {
    try {
      const result = await this.simulate<any>("get_yield_split");
      if (!result) return null;
      return {
        employer_share: Number(result.employer_share),
        employee_pool: Number(result.employee_pool),
        protocol_fee: Number(result.protocol_fee),
      };
    } catch {
      return null;
    }
  }

  /** Get employer's allocation data */
  async getEmployerAllocation(employerAddress: string): Promise<EmployerAllocation | null> {
    try {
      const result = await this.simulate<any>(
        "get_employer_allocation",
        addressToScVal(employerAddress)
      );
      if (!result) return null;
      return {
        total_principal: result.total_principal?.toString() || "0",
        accumulated_yield: result.accumulated_yield?.toString() || "0",
        claimed_yield: result.claimed_yield?.toString() || "0",
      };
    } catch {
      return null;
    }
  }

  /** Get total deposited across all employers */
  async getTotalDeposited(): Promise<string> {
    try {
      const result = await this.simulate<string>("get_total_deposited");
      return result || "0";
    } catch {
      return "0";
    }
  }
}
