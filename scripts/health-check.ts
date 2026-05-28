#!/usr/bin/env node
/**
 * Noctis Health Check CLI
 *
 * Checks RPC and contract health from the command line.
 * Exits with code 0 if all healthy, 1 if any failure.
 * Outputs JSON for machine parsing.
 *
 * Usage:
 *   cd scripts && npm install && npx tsx health-check.ts
 *   npx tsx scripts/health-check.ts --rpc https://custom-rpc.example.com
 */

import { rpc } from "@stellar/stellar-sdk";

const RPC_URL = (() => {
  const idx = process.argv.indexOf("--rpc");
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env.RPC_ENDPOINT || "https://soroban-testnet.stellar.org";
})();

const CONTRACT_ADDRESSES: Record<string, string> = {
  payroll_dispatcher:
    process.env.CONTRACT_PAYROLL_DISPATCHER_ADDRESS ||
    "CCCB3EVCABUMZJAIN5556IHRPZN6VNNP6PU3I6HBJ3AVLZBBOLYIQQSV",
  streaming_vault:
    process.env.CONTRACT_STREAMING_VAULT_ADDRESS ||
    "CAIHQBV4766BNMEZZYVF5DLWXOZTVLZKUXABSHFZKYIQZII7NT42JWVC",
  wallet_factory:
    process.env.CONTRACT_WALLET_FACTORY_ADDRESS ||
    "CCRRGXP2RXEURFYMUFUZT7TU26B6BP74WH2LUGAK3EHDP7E3AT6FXXZT",
  yield_router:
    process.env.CONTRACT_YIELD_ROUTER_ADDRESS ||
    "CBURJANYO5HG5S4FQIAOFKFEJ7P5SPOOPZXLJMS5A3ZCLOFPZBMQYUPK",
  policy_signer:
    process.env.CONTRACT_POLICY_SIGNER_ADDRESS ||
    "CA42C7B4XETGCZISH2OF2TFJSVL6JQAKZBAJST5CNU2M5MF6R2U2BTU5",
};

interface CheckResult {
  name: string;
  status: string;
  detail?: string;
}

interface HealthReport {
  status: string;
  timestamp: string;
  rpc_url: string;
  rpc: CheckResult;
  contracts: CheckResult[];
  summary: {
    total: number;
    healthy: number;
    failed: number;
  };
}

async function checkRpc(): Promise<CheckResult> {
  try {
    const server = new rpc.Server(RPC_URL, { allowHttp: false });
    const health = await server.getHealth();

    return {
      name: "RPC",
      status: "ok",
      detail: `ledger_db_size: ${(health as any).databaseSize ?? "unknown"}`,
    };
  } catch (err) {
    return {
      name: "RPC",
      status: "error",
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkContractViaRpc(
  name: string,
  address: string,
): Promise<CheckResult> {
  try {
    if (!address || !address.startsWith("C")) {
      return { name, status: "error", detail: "Missing or invalid contract address" };
    }

    const server = new rpc.Server(RPC_URL, { allowHttp: false });

    const { Contract, Keypair, Account, TransactionBuilder, Networks } = await import(
      "@stellar/stellar-sdk"
    );

    const contract = new Contract(address);
    const sourceKeypair = Keypair.random();
    const source = new Account(sourceKeypair.publicKey(), "0");

    const tx = new TransactionBuilder(source, {
      fee: "10000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call("admin"))
      .setTimeout(30)
      .build();

    const result: any = await server.simulateTransaction(tx);

    if (result.error) {
      return { name, status: "error", detail: result.error };
    }

    return { name, status: "ok", detail: "Contract responds to simulation" };
  } catch (err) {
    return {
      name,
      status: "error",
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function main(): Promise<void> {
  const rpcResult = await checkRpc();

  const contractResults = await Promise.all(
    Object.entries(CONTRACT_ADDRESSES).map(([name, addr]) =>
      checkContractViaRpc(name, addr),
    ),
  );

  const allChecks = [rpcResult, ...contractResults];
  const failed = allChecks.filter((c) => c.status !== "ok");

  const report: HealthReport = {
    status: failed.length === 0 ? "ok" : "error",
    timestamp: new Date().toISOString(),
    rpc_url: RPC_URL,
    rpc: rpcResult,
    contracts: contractResults,
    summary: {
      total: allChecks.length,
      healthy: allChecks.length - failed.length,
      failed: failed.length,
    },
  };

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(
    JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) + "\n",
  );
  process.exit(1);
});
