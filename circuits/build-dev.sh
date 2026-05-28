#!/usr/bin/env bash
# ─── Noctis Payroll ZK Circuit Dev Build ──────────────────────────
# Uses a 2-recipient circuit for fast development iteration.
# For production, use build.sh with the full 100-recipient circuit.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"

echo "🔧 Noctis Circuit Dev Build (2 recipients)"
echo "════════════════════════════════════════════"

rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

echo ""
echo "📐 Step 1/5: Compiling circom circuit..."
circom "${SCRIPT_DIR}/payroll_circuit_dev.circom" \
    --r1cs --wasm --sym \
    --output "${BUILD_DIR}" \
    -l "${SCRIPT_DIR}/node_modules"
echo "  ✅ R1CS, WASM, SYM generated"

echo ""
echo "📊 Step 2/5: Circuit statistics..."
export NODE_OPTIONS="--max-old-space-size=8192"
snarkjs r1cs info "${BUILD_DIR}/payroll_circuit_dev.r1cs"

echo ""
echo "🔑 Step 3/5: Powers of Tau ceremony (2^20)..."
snarkjs powersoftau new bn128 15 "${BUILD_DIR}/ptau_15_0000.ptau" -v 2>&1
snarkjs powersoftau contribute "${BUILD_DIR}/ptau_15_0000.ptau" \
                              "${BUILD_DIR}/ptau_15_0001.ptau" \
                              --name="Noctis Dev" -v \
                              -e="noctis-dev-build-2026"
snarkjs powersoftau verify "${BUILD_DIR}/ptau_15_0001.ptau" 2>&1
snarkjs powersoftau beacon "${BUILD_DIR}/ptau_15_0001.ptau" \
                           "${BUILD_DIR}/ptau_15_beacon.ptau" \
                           0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f \
                           10 -v 2>&1
echo "  ✅ Powers of Tau complete"

echo ""
echo "🔐 Step 4/6: Preparing phase 2..."
snarkjs powersoftau prepare phase2 "${BUILD_DIR}/ptau_15_beacon.ptau" \
                                  "${BUILD_DIR}/ptau_15_phase2.ptau" -v 2>&1
echo "  ✅ Phase 2 prepared"

echo ""
echo "🔐 Step 5/6: Generating proving key..."
snarkjs groth16 setup "${BUILD_DIR}/payroll_circuit_dev.r1cs" \
                      "${BUILD_DIR}/ptau_15_phase2.ptau" \
                      "${BUILD_DIR}/payroll_circuit_dev.zkey"
echo "  ✅ Proving key generated"

echo ""
echo "📝 Step 6/6: Exporting verification key..."
snarkjs zkey export verificationkey "${BUILD_DIR}/payroll_circuit_dev.zkey" \
                                    "${BUILD_DIR}/payroll_circuit_dev.vkey.json"
echo "  ✅ Verification key exported"

echo ""
echo "════════════════════════════════════════════"
echo "✅ Dev Build Complete!"
echo ""
echo "Output files:"
du -sh "${BUILD_DIR}"/*.ptau "${BUILD_DIR}"/*.zkey "${BUILD_DIR}"/*.r1cs \
       "${BUILD_DIR}"/*.wasm "${BUILD_DIR}"/*.sym "${BUILD_DIR}"/*.json 2>/dev/null || true
echo "════════════════════════════════════════════"
