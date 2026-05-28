/**
 * Compare CLI-generated XDR with SDK-generated XDR for create_policy
 */
import {
  TransactionBuilder,
  Contract,
  nativeToScVal,
  xdr,
  Account,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { execSync } from "child_process";

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const CONTRACT_ID = "CCPLG6YUD4COQT655PZ2C5RS7BTS6VT6DRP2Q2DVR3IS4H7PSCOQQ3FF";
const EMPLOYER = "GDTJ5ITQCKMEI7QZSBCYQA5FMNCKCAFTXTMN44CLJ5BITU5R4T53XQQX";

function symbol(val: string) { return nativeToScVal(val, { type: "symbol" }); }
function i128(val: number | bigint) { return nativeToScVal(BigInt(val), { type: "i128" }); }
function u64(val: number) { return nativeToScVal(BigInt(val), { type: "u64" }); }
function u32(val: number) { return nativeToScVal(val, { type: "u32" }); }
function addr(val: string) { return nativeToScVal(val, { type: "address" }); }
function vecAddress(addrs: string[]) {
  return xdr.ScVal.scvVec(addrs.map((a) => nativeToScVal(a, { type: "address" })));
}
function mapToScVal(fields: Record<string, xdr.ScVal>): xdr.ScVal {
  const sorted = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b));
  const entries = sorted.map(
    ([key, val]) => new xdr.ScMapEntry({ key: nativeToScVal(key, { type: "symbol" }), val }),
  );
  return xdr.ScVal.scvMap(entries);
}

// Build the same tx as the CLI
const contract = new Contract(CONTRACT_ID);
const source = new Account(EMPLOYER, "0");

const policyConfig = mapToScVal({
  name: symbol("test_policy"),
  policy_type: symbol("SpendingLimit"),
  max_amount: i128(5000),
  period_limit: i128(50000),
  period_seconds: u64(86400),
  allowed_tokens: vecAddress([]),
  required_signers: u32(0),
  authorized_signers: vecAddress([]),
});

const tx = new TransactionBuilder(source, {
  fee: BASE_FEE,
  networkPassphrase: NETWORK_PASSPHRASE,
})
  .addOperation(
    contract.call("create_policy", addr(EMPLOYER), policyConfig),
  )
  .setTimeout(30)
  .build();

// Decode and inspect
const envelope = tx.toEnvelope();
const ops = envelope.value().tx().operations();
const invokeOp = ops[0].body().invokeHostFunctionOp();
const hostFn = invokeOp.hostFunction();
const contractFn = hostFn.invokeContract();
const args = contractFn.args();

console.log("Args count:", args.length);

// Check arg 1 (the struct) structure
const structArg = args[1];
console.log("Arg 1 type:", structArg.switch().name);
console.log("Arg 1 arm:", structArg.arm());

if (structArg.switch().name === "scvMap") {
  const entries = structArg.map();
  console.log("Map entries:", entries.length);
  
  // Check each entry's key and value type
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const key = entry.key();
    const val = entry.val();
    
    let keyStr = "?";
    try { keyStr = key.sym().toString(); } catch (e) { keyStr = "err: " + e.message; }
    
    const valType = val.switch().name;
    console.log(`  [${i}] "${keyStr}" => ${valType}`);
  }
}

// Compare with the CLI's XDR
console.log("\n--- Fetching CLI XDR ---");
try {
  const cliXdr = execSync(
    `stellar contract invoke --id ${CONTRACT_ID} --source local-deployer --network testnet --build-only -- create_policy --employer "${EMPLOYER}" --config '{ "name": "test_policy", "policy_type": "SpendingLimit", "max_amount": "5000", "period_limit": "50000", "period_seconds": 86400, "allowed_tokens": [], "required_signers": 0, "authorized_signers": [] }' 2>/dev/null`,
    { encoding: "utf8" },
  ).trim();

  console.log("CLI XDR (first 80):", cliXdr.substring(0, 80));
  
  // Decode CLI XDR
  const cliEnvelope = xdr.TransactionEnvelope.fromXDR(cliXdr, "base64");
  const cliOps = cliEnvelope.value().tx().operations();
  const cliInvokeOp = cliOps[0].body().invokeHostFunctionOp();
  const cliHostFn = cliInvokeOp.hostFunction();
  const cliContractFn = cliHostFn.invokeContract();
  const cliArgs = cliContractFn.args();
  
  console.log("CLI args count:", cliArgs.length);
  
  const cliStruct = cliArgs[1];
  console.log("CLI struct type:", cliStruct.switch().name);
  console.log("CLI struct arm:", cliStruct.arm());
  
  if (cliStruct.switch().name === "scvMap") {
    const cliEntries = cliStruct.map();
    console.log("CLI map entries:", cliEntries.length);
    
    for (let i = 0; i < cliEntries.length; i++) {
      const entry = cliEntries[i];
      const key = entry.key();
      const val = entry.val();
      
      let keyStr = "?";
      try { keyStr = key.sym().toString(); } catch (e) { keyStr = "err: " + e.message; }
      
      const valType = val.switch().name;
      console.log(`  [${i}] "${keyStr}" => ${valType}`);
    }
  }
  
  // Compare the host function args XDR directly
  const ourArgsXdr = xdr.ScVal.scvVec(Array.from(args)).toXDR("base64");
  const cliArgsXdr = xdr.ScVal.scvVec(Array.from(cliArgs)).toXDR("base64");
  
  console.log("\nOur args XDR:", ourArgsXdr.substring(0, 80));
  console.log("CLI args XDR:", cliArgsXdr.substring(0, 80));
  
  if (ourArgsXdr === cliArgsXdr) {
    console.log("\n✅ ARGS MATCH!");
  } else {
    console.log("\n❌ ARGS DIFFER!");
    console.log("Our len:", ourArgsXdr.length, "CLI len:", cliArgsXdr.length);
  }
} catch (e: any) {
  console.error("Error:", e.message);
}
