import { ContractClient, addressToScVal, i128ToScVal, u32ToScVal, u64ToScVal, symbolToScVal, vecToScVal, buildScMap } from "@/lib/stellar";
import { CONTRACT_ADDRESSES } from "@/types";
import type { PolicyConfig } from "@/types";

export interface PolicyData {
  id: number;
  employer: string;
  name: string;
  policy_type: "SpendingLimit" | "Allowlist" | "MultiSig" | "Timelock";
  max_amount: string;
  period_limit: string;
  period_seconds: number;
  spent_this_period: string;
  period_start: number;
  allowed_tokens: string[];
  required_signers: number;
  authorized_signers: string[];
  active: boolean;
  created_at: number;
}

export class PolicySignerClient extends ContractClient {
  constructor() {
    super(CONTRACT_ADDRESSES.policy_signer);
  }

  /** Get a policy by ID */
  async getPolicy(policyId: number): Promise<PolicyData | null> {
    try {
      const result = await this.simulate<any>("get_policy", u32ToScVal(policyId));
      if (!result) return null;
      return {
        id: result.id,
        employer: result.employer,
        name: result.name,
        policy_type: result.policy_type,
        max_amount: result.max_amount?.toString() || "0",
        period_limit: result.period_limit?.toString() || "0",
        period_seconds: Number(result.period_seconds),
        spent_this_period: result.spent_this_period?.toString() || "0",
        period_start: Number(result.period_start),
        allowed_tokens: result.allowed_tokens || [],
        required_signers: Number(result.required_signers),
        authorized_signers: result.authorized_signers || [],
        active: result.active,
        created_at: Number(result.created_at),
      };
    } catch {
      return null;
    }
  }

  /** Get all policies for an employer */
  async getEmployerPolicies(employerAddress: string): Promise<PolicyData[]> {
    try {
      const results = await this.simulate<any[]>(
        "get_employer_policies",
        addressToScVal(employerAddress)
      );
      if (!results || !Array.isArray(results)) return [];
      return results.map((r: any) => ({
        id: r.id,
        employer: r.employer,
        name: r.name,
        policy_type: r.policy_type,
        max_amount: r.max_amount?.toString() || "0",
        period_limit: r.period_limit?.toString() || "0",
        period_seconds: Number(r.period_seconds),
        spent_this_period: r.spent_this_period?.toString() || "0",
        period_start: Number(r.period_start),
        allowed_tokens: r.allowed_tokens || [],
        required_signers: Number(r.required_signers),
        authorized_signers: r.authorized_signers || [],
        active: r.active,
        created_at: Number(r.created_at),
      }));
    } catch {
      return [];
    }
  }

  /** Check if a policy is active */
  async isPolicyActive(policyId: number): Promise<boolean> {
    try {
      return await this.simulate<boolean>("is_policy_active", u32ToScVal(policyId));
    } catch {
      return false;
    }
  }

  /** Get total policy count */
  async getPolicyCount(): Promise<number> {
    try {
      return await this.simulate<number>("get_policy_count");
    } catch {
      return 0;
    }
  }

  // ─── Write Operations ───────────────────────────────────────────

  /** Create a new spending policy */
  async createPolicy(
    sourceAddress: string,
    employer: string,
    config: {
      name: string;
      policyType: "SpendingLimit" | "Allowlist" | "MultiSig" | "Timelock";
      maxAmount: string;
      periodLimit: string;
      periodSeconds: number;
      allowedTokens: string[];
      requiredSigners: number;
      authorizedSigners: string[];
    },
  ): Promise<void> {
    // Build PolicyConfig ScMap (keys sorted alphabetically)
    const configMap: Record<string, any> = {
      allowed_tokens: vecToScVal(config.allowedTokens.map(t => addressToScVal(t))),
      authorized_signers: vecToScVal(config.authorizedSigners.map(s => addressToScVal(s))),
      max_amount: i128ToScVal(config.maxAmount),
      name: symbolToScVal(config.name),
      period_limit: i128ToScVal(config.periodLimit),
      period_seconds: u64ToScVal(config.periodSeconds),
      // PolicyType enum: vec([symbol(variant_name)])
      policy_type: vecToScVal([symbolToScVal(config.policyType)]),
      required_signers: u32ToScVal(config.requiredSigners),
    };

    const policyConfig = buildScMap(configMap);

    await this.writeWithFreighter(sourceAddress, "create_policy",
      addressToScVal(employer),
      policyConfig,
    );
  }

  /** Revoke a policy (employer only) */
  async revokePolicy(sourceAddress: string, employer: string, policyId: number): Promise<void> {
    await this.writeWithFreighter(sourceAddress, "revoke_policy",
      addressToScVal(employer),
      u32ToScVal(policyId),
    );
  }
}
