#!/usr/bin/env bash
# ─── Noctis Payroll ZK Circuit Build Script ──────────────────────
# Compiles the circom circuit, runs Powers of Tau ceremony, and
# generates proving/verification keys for Groth16.
#
# Prerequisites:
#   npm install -g circom snarkjs
#   npm install circomlib
#
# Output in build/:
#   payroll_circuit.r1cs          - R1CS constraint system
#   payroll_circuit.wasm          - Witness generation WASM
#   payroll_circuit.sym           - Symbol file for debugging
#   payroll_pTau_20_beacon.ptau   - Powers of Tau (2^20)
#   payroll_circuit.zkey          - Proving key
#   payroll_circuit.vkey.json     - Verification key (safe to public)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"

echo "🔧 Noctis Circuit Build"
echo "═══════════════════════"

# Clean and create build directory
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# ─── Step 1: Compile Circom Circuit ──────────────────────────────
echo ""
echo "📐 Step 1/5: Compiling circom circuit..."
circom "${SCRIPT_DIR}/payroll_circuit.circom" \
    --r1cs --wasm --sym \
    --output "${BUILD_DIR}" \
    -l "${SCRIPT_DIR}/node_modules"
echo "  ✅ R1CS, WASM, SYM generated in ${BUILD_DIR}"

# ─── Step 2: Display circuit stats ───────────────────────────────
echo ""
echo "📊 Step 2/5: Circuit statistics..."
export NODE_OPTIONS="--max-old-space-size=8192"
snarkjs r1cs info "${BUILD_DIR}/payroll_circuit.r1cs"
echo "  (Skipping r1cs print — too large for available memory)"

# ─── Step 3: Powers of Tau Ceremony (2^20) ───────────────────────
echo ""
echo "🔑 Step 3/5: Powers of Tau ceremony (2^20 = ~1M constraints)..."
snarkjs powersoftau new bn128 20 "${BUILD_DIR}/payroll_pTau_20_0000.ptau" -v
snarkjs powersoftau contribute "${BUILD_DIR}/payroll_pTau_20_0000.ptau" \
                              "${BUILD_DIR}/payroll_pTau_20_0001.ptau" \
                              --name="Noctis Hackathon" -v \
                              -e="noctis-payroll-zk-hackathon-2026"
snarkjs powersoftau verify "${BUILD_DIR}/payroll_pTau_20_0001.ptau"
snarkjs powersoftau beacon "${BUILD_DIR}/payroll_pTau_20_0001.ptau" \
                          "${BUILD_DIR}/payroll_pTau_20_beacon.ptau" \
                          0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f \
                          10 -v
echo "  ✅ Powers of Tau complete: ${BUILD_DIR}/payroll_pTau_20_beacon.ptau"

# ─── Step 4: Prepare Phase 2 ────────────────────────────────────
echo ""
echo "🔐 Step 4/6: Preparing phase 2..."
snarkjs powersoftau prepare phase2 "${BUILD_DIR}/payroll_pTau_20_beacon.ptau" \
                                  "${BUILD_DIR}/payroll_pTau_20_phase2.ptau" -v

# ─── Step 5: Generate Proving Key ────────────────────────────────
echo ""
echo "🔐 Step 5/6: Generating proving key (this takes a while)..."
snarkjs groth16 setup "${BUILD_DIR}/payroll_circuit.r1cs" \
                      "${BUILD_DIR}/payroll_pTau_20_phase2.ptau" \
                      "${BUILD_DIR}/payroll_circuit.zkey"
echo "  ✅ Proving key: ${BUILD_DIR}/payroll_circuit.zkey"

# ─── Step 6: Export Verification Key ─────────────────────────────
echo ""
echo "📝 Step 6/6: Exporting verification key..."
snarkjs zkey export verificationkey "${BUILD_DIR}/payroll_circuit.zkey" \
                                   "${BUILD_DIR}/payroll_circuit.vkey.json"
echo "  ✅ Verification key: ${BUILD_DIR}/payroll_circuit.vkey.json"

# ─── Summary ──────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Build Complete!"
echo ""
echo "Output files:"
du -sh "${BUILD_DIR}"/*.ptau "${BUILD_DIR}"/*.zkey "${BUILD_DIR}"/*.r1cs \
       "${BUILD_DIR}"/*.wasm "${BUILD_DIR}"/*.sym "${BUILD_DIR}"/*.json 2>/dev/null || true
echo ""
echo "To generate a test proof:"
echo "  snarkjs wtns create build/payroll_circuit.wasm input.json build/witness.wtns"
echo "  snarkjs groth16 prove build/payroll_circuit.zkey build/witness.wtns build/proof.json build/public.json"
echo "  snarkjs groth16 verify build/payroll_circuit.vkey.json build/public.json build/proof.json"
echo "═══════════════════════════════════════════════════════════════"
