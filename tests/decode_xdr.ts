import { xdr, scValToNative } from "@stellar/stellar-sdk";

const xdrB64 = 'AAAAAgAAAADmnqJwEphEfhmQRYgDpWNEoQCzvNjecEtPQonTseT7uwAAAGQAKnapAAAAFAAAAAAAAAAAAAAAAQAAAAAAAAAYAAAAAAAAAAGes3sUHwToT93r86F2MvhnL1Z+HF+oaHWO0S4f75CdCAAAAA1jcmVhdGVfcG9saWN5AAAAAAAAAgAAABIAAAAAAAAAAOaeonASmER+GZBFiAOlY0ShALO82N5wS09CidOx5Pu7AAAAEQAAAAEAAAAIAAAADwAAAA5hbGxvd2VkX3Rva2VucwAAAAAAEAAAAAEAAAAAAAAADwAAABJhdXRob3JpemVkX3NpZ25lcnMAAAAAABAAAAABAAAAAAAAAA8AAAAKbWF4X2Ftb3VudAAAAAAACgAAAAAAAAAAAAAAAAAAE4gAAAAPAAAABG5hbWUAAAAPAAAACENMSV90ZXN0AAAADwAAAAxwZXJpb2RfbGltaXQAAAAKAAAAAAAAAAAAAAAAAADDUAAAAA8AAAAOcGVyaW9kX3NlY29uZHMAAAAAAAUAAAAAAAFRgAAAAA8AAAALcG9saWN5X3R5cGUAAAAAEAAAAAEAAAABAAAADwAAAA1TcGVuZGluZ0xpbWl0AAAAAAAADwAAABByZXF1aXJlZF9zaWduZXJzAAAAAwAAAAAAAAAAAAAAAAAAAAA=';

const envelope = xdr.TransactionEnvelope.fromXDR(xdrB64, 'base64');
const tx = envelope.value().tx();
const ops = tx.operations();

console.log('Number of operations:', ops.length);

const op = ops[0];
const body = op.body();
console.log('Op body type:', body.switch().name);

const invokeOp = body.invokeHostFunctionOp();
const hostFn = invokeOp.function();
console.log('Host function type:', hostFn.switch().name);

const invokeArgs = hostFn.invokeContract();
console.log('Contract ID:', invokeArgs.contractAddress().contractId().toString('hex'));

const funcName = invokeArgs.functionName().toString();
console.log('Function name:', funcName);

const funcArgs = invokeArgs.args();
console.log('Number of args:', funcArgs.length);

for (let i = 0; i < funcArgs.length; i++) {
  const arg = funcArgs[i];
  try {
    const native = scValToNative(arg);
    console.log(`Arg ${i}:`, typeof native === 'object' ? JSON.stringify(native).substring(0, 200) : native);
  } catch (e: any) {
    console.log(`Arg ${i}: (raw)`, arg.switch().name);
  }
  // Print the raw ScVal structure
  console.log(`  Raw: ${arg.switch().name}, value:`, arg.arm() || 'N/A');
}

// For the struct arg (arg 1), print detailed structure
const structArg = funcArgs[1];
console.log('\n--- Detailed struct ScVal ---');
printScVal(structArg, '');

function printScVal(val: any, indent: string) {
  const switchName = val.switch().name;
  const arm = val.arm();
  
  if (switchName === 'scvVec') {
    const vec = val.vec();
    console.log(`${indent}Vec (${vec.length} elements):`);
    for (let i = 0; i < vec.length; i++) {
      printScVal(vec[i], indent + '  [' + i + '] ');
    }
  } else if (switchName === 'scvMap') {
    const map = val.map();
    console.log(`${indent}Map (${map.length} entries):`);
    for (const entry of map) {
      console.log(`${indent}  Key:`);
      printScVal(entry.key, indent + '    ');
      console.log(`${indent}  Value:`);
      printScVal(entry.val, indent + '    ');
    }
  } else if (switchName === 'scvSymbol') {
    console.log(`${indent}Symbol: "${val.sym().toString()}"`);
  } else if (switchName === 'scvBytes') {
    const bytes = val.bytes();
    console.log(`${indent}Bytes: (${bytes.length} bytes) ${bytes.toString('hex').substring(0, 40)}`);
  } else if (switchName === 'scvI128') {
    const parts = val.i128();
    console.log(`${indent}i128: lo=${parts.lo} hi=${parts.hi}`);
  } else if (switchName === 'scvU64') {
    console.log(`${indent}u64: ${val.u64()}`);
  } else if (switchName === 'scvU32') {
    console.log(`${indent}u32: ${val.u32()}`);
  } else if (switchName === 'scvAddress') {
    console.log(`${indent}Address: ${scValToNative(val)}`);
  } else if (switchName === 'scvVoid') {
    console.log(`${indent}Void`);
  } else if (switchName === 'scvBool') {
    console.log(`${indent}Bool: ${val.b()}`);
  } else if (switchName === 'scvString') {
    console.log(`${indent}String: "${val.str().toString()}"`);
  } else {
    console.log(`${indent}${switchName}:`, arm ? arm.toString().substring(0, 40) : 'N/A');
  }
}
