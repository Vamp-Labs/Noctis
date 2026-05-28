# Circuit Artifacts

This directory contains compiled ZK circuit artifacts for the Noctis payroll privacy system.

## Current Files

| File | Size | Description |
|------|------|-------------|
| `payroll_circuit.wasm` | 2.2 MB | Witness generation WASM (dev build, 2 recipients) |
| `payroll_circuit.zkey` | 10 MB | Proving key (dev build, BN128, power 15) |
| `payroll_circuit.vkey.json` | 3.6 KB | Verification key |

## Build Scripts

| Script | Circuit | Recipients | Use |
|--------|---------|------------|-----|
| `circuits/build-dev.sh` | `payroll_circuit_dev.circom` | 2 | Fast dev iteration |
| `circuits/build.sh` | `payroll_circuit.circom` | 100 | Production |

## Building from Source

Prerequisites:
- `circom` binary installed (download from https://github.com/iden3/circom/releases)
- `snarkjs` via `npm install -g snarkjs` or local install in `circuits/`
- `circomlib` via `npm install circomlib` in `circuits/`

Dev build (fast, 2 recipients):
```bash
cd circuits
npm install circomlib snarkjs
./build-dev.sh
```

Production build (100 recipients, requires ~16 GB RAM):
```bash
cd circuits
npm install circomlib snarkjs
./build.sh
```

## Expected Outputs (dev build)

After `build-dev.sh` completes:
- `build/payroll_circuit_dev.r1cs` — R1CS constraint system (3.0 MB, 23,393 constraints)
- `build/payroll_circuit_dev_js/payroll_circuit_dev.wasm` — Witness WASM (2.1 MB)
- `build/payroll_circuit_dev.sym` — Symbol file
- `build/ptau_15_phase2.ptau` — Powers of Tau (phase 2 prepared, 37 MB)
- `build/payroll_circuit_dev.zkey` — Proving key (11 MB)
- `build/payroll_circuit_dev.vkey.json` — Verification key

The files are copied to `frontend/public/circuits/` as `payroll_circuit.{wasm,zkey,vkey.json}`.

## Production Build

The production circuit (`payroll_circuit.circom`) supports 100 recipients and has ~1.17M constraints. The build requires:
- Power 20 Powers of Tau (2^20 ≈ 1M entries)
- ~16 GB RAM for `snarkjs powersoftau prepare phase2`
- Significant time (30+ minutes)

## Verification

After building, test with:
```bash
echo '{"batch_commitment": "0x...", ...}' > input.json
snarkjs groth16 fullprove input.json \
  build/payroll_circuit.wasm \
  build/payroll_circuit.zkey \
  proof.json public.json
snarkjs groth16 verify build/payroll_circuit.vkey.json \
  public.json proof.json
```
