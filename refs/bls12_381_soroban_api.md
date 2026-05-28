# BLS12-381 Host Function API in Soroban

> **Status**: Comprehensive reference
> **Protocol**: 22 (initial) + 26 (additional curve checks)
> **SDK**: soroban-sdk v25+ / v26+
> **Last updated**: 2026-05-28

---

## 1. Access Pattern

All BLS12-381 functions are accessed via `env.crypto().bls12_381()` which returns a `Bls12_381` struct.

```rust
use soroban_sdk::{Env, crypto::bls12_381::Bls12_381};

let bls = env.crypto().bls12_381();
```

**No separate trait required** — `Bls12_381` is a concrete struct in `soroban_sdk::crypto::bls12_381`.

---

## 2. Complete Function Signatures (Rust SDK, Protocol 22+)

### 2.1 G1 Operations

| Function | Args | Returns | Protocol |
|---|---|---|---|
| `g1_add(p0: &G1Affine, p1: &G1Affine) -> G1Affine` | Two G1 points | Sum point | 22 |
| `g1_checked_add(p0: &G1Affine, p1: &G1Affine) -> Option<G1Affine>` | Two G1 points | Sum (with subgroup check) | 22 |
| `g1_mul(p0: &G1Affine, scalar: &Fr) -> G1Affine` | Point + scalar | Product | 22 |
| `g1_msm(vp: Vec<G1Affine>, vs: Vec<Fr>) -> G1Affine` | Point vec + scalar vec | MSM result | 22 |
| `g1_is_in_subgroup(p: &G1Affine) -> bool` | Point | subgroup check | 22 |
| `map_fp_to_g1(fp: &Fp) -> G1Affine` | Field element | Mapped point | 22 |
| `hash_to_g1(msg: &Bytes, dst: &Bytes) -> G1Affine` | Message + DST | Hashed point | 22 |
| `g1_is_on_curve(point: &G1Affine) -> bool` (Protocol 26) | Point | curve check (not subgroup) | 26 |

### 2.2 G2 Operations

| Function | Args | Returns | Protocol |
|---|---|---|---|
| `g2_add(p0: &G2Affine, p1: &G2Affine) -> G2Affine` | Two G2 points | Sum | 22 |
| `g2_checked_add(p0: &G2Affine, p1: &G2Affine) -> Option<G2Affine>` | Two G2 points | Sum (with subgroup check) | 22 |
| `g2_mul(p0: &G2Affine, scalar: &Fr) -> G2Affine` | Point + scalar | Product | 22 |
| `g2_msm(vp: Vec<G2Affine>, vs: Vec<Fr>) -> G2Affine` | Point vec + scalar vec | MSM result | 22 |
| `g2_is_in_subgroup(p: &G2Affine) -> bool` | Point | subgroup check | 22 |
| `map_fp2_to_g2(fp2: &Fp2) -> G2Affine` | Fp2 element | Mapped point | 22 |
| `hash_to_g2(msg: &Bytes, dst: &Bytes) -> G2Affine` | Message + DST | Hashed point | 22 |
| `g2_is_on_curve(point: &G2Affine) -> bool` (Protocol 26) | Point | curve check (not subgroup) | 26 |

### 2.3 Pairing

| Function | Args | Returns | Protocol |
|---|---|---|---|
| `pairing_check(vp1: Vec<G1Affine>, vp2: Vec<G2Affine>) -> bool` | G1 vec + G2 vec | true/false | 22 |

- Panics if `vp1.len() != vp2.len()` or either is empty.
- Returns `true` if `e(P1,Q1) * e(P2,Q2) * ... == 1` in GT.
- No plain "pairing" function exists (only multi-pairing check).

### 2.4 Scalar Field (Fr) Operations

| Function | Args | Returns | Protocol |
|---|---|---|---|
| `fr_add(lhs: &Fr, rhs: &Fr) -> Fr` | Two scalars | (a+b) mod r | 22 |
| `fr_sub(lhs: &Fr, rhs: &Fr) -> Fr` | Two scalars | (a-b) mod r | 22 |
| `fr_mul(lhs: &Fr, rhs: &Fr) -> Fr` | Two scalars | (a*b) mod r | 22 |
| `fr_pow(lhs: &Fr, rhs: u64) -> Fr` | Scalar + u64 | a^exp mod r | 22 |
| `fr_inv(lhs: &Fr) -> Fr` | Scalar | a^{-1} mod r | 22 |

### 2.5 Point Negation (SDK-level, not host)

```rust
let neg_a = -proof.a;  // Uses std::ops::Neg on G1Affine/G2Affine
```

Available via `soroban-sdk` — implemented in PR #1456 (not a host function, SDK convenience).

---

## 3. Low-Level Host Function Signatures (CAP-0059 / env.json)

These are the actual XDR-level exports. The Rust SDK types map to these.

| Export | Name | Args | Return | Proto |
|---|---|---|---|---|
| `4` | `bls12_381_g1_add` | `(BytesObject, BytesObject)` | `BytesObject` | 22 |
| `5` | `bls12_381_g1_mul` | `(BytesObject, U256Val)` | `BytesObject` | 22 |
| `6` | `bls12_381_g1_msm` | `(VecObject, VecObject)` | `BytesObject` | 22 |
| `7` | `bls12_381_map_fp_to_g1` | `(BytesObject)` | `BytesObject` | 22 |
| `8` | `bls12_381_hash_to_g1` | `(BytesObject, BytesObject)` | `BytesObject` | 22 |
| `9` | `bls12_381_g2_add` | `(BytesObject, BytesObject)` | `BytesObject` | 22 |
| `a` | `bls12_381_g2_mul` | `(BytesObject, U256Val)` | `BytesObject` | 22 |
| `b` | `bls12_381_g2_msm` | `(VecObject, VecObject)` | `BytesObject` | 22 |
| `c` | `bls12_381_map_fp2_to_g2` | `(BytesObject)` | `BytesObject` | 22 |
| `d` | `bls12_381_hash_to_g2` | `(BytesObject, BytesObject)` | `BytesObject` | 22 |
| `e` | `bls12_381_multi_pairing_check` | `(VecObject, VecObject)` | `Bool` | 22 |
| `f` | `bls12_381_fr_add` | `(U256Val, U256Val)` | `U256Val` | 22 |
| `g` | `bls12_381_fr_sub` | `(U256Val, U256Val)` | `U256Val` | 22 |
| `h` | `bls12_381_fr_mul` | `(U256Val, U256Val)` | `U256Val` | 22 |
| `i` | `bls12_381_fr_pow` | `(U256Val, U64Val)` | `U256Val` | 22 |
| `j` | `bls12_381_fr_inv` | `(U256Val)` | `U256Val` | 22 |

**Protocol 26 additions** (CAP-0080):

| Export | Name | Args | Return | Proto |
|---|---|---|---|---|
| `x` | `bls12_381_g1_is_on_curve` | `(BytesObject)` | `Bool` | 26 |
| `y` | `bls12_381_g2_is_on_curve` | `(BytesObject)` | `Bool` | 26 |

---

## 4. Serialization Format

### CRITICAL: Points are UNCOMPRESSED

Per CAP-0059 and confirmed by SDK fix (PR #1455): **the compression flag must be UNSET (0)**. All points use uncompressed affine format. The host validates this.

### G1 Point — 96 bytes

```
be_bytes(X) || be_bytes(Y)
  X: 48 bytes (Fp element, big-endian)
  Y: 48 bytes (Fp element, big-endian)
  Most significant 3 bits of X encode flags:
    bit 383 = compression_flag (must be 0)
    bit 382 = infinity_flag
    bit 381 = sort_flag (must be 0)
```

Constants:
- `G1_SERIALIZED_SIZE = 96`
- `FP_SERIALIZED_SIZE = 48`

### G2 Point — 192 bytes

```
be_bytes(X_c1) || be_bytes(X_c0) || be_bytes(Y_c1) || be_bytes(Y_c0)
  Each component: 48 bytes Fp
  Total: 4 * 48 = 192 bytes
  Most significant 3 bits of X_c1 encode flags (same as G1)
```

Constants:
- `G2_SERIALIZED_SIZE = 192`
- `FP2_SERIALIZED_SIZE = 96`

### Fr Scalar — 32 bytes (U256)

Represented as `U256Val` internally (not `BytesObject`). Use `Fr::from_u256(U256)` and `Fr::to_u256()` for conversion.

### Infinity Point Encoding

When the infinity flag is set, all remaining bits must be zero. This is the only allowed flag combination besides the zero point (plain zeros).

---

## 5. Subgroup Checks

**The host automatically performs subgroup validation on *every* input point** for the following functions:
- `g1_add`, `g1_mul`, `g1_msm`
- `g2_add`, `g2_mul`, `g2_msm`
- `pairing_check`

This means:
- Input points that are on the curve but NOT in the correct prime-order subgroup will be **rejected** (host error/panic).
- For `hash_to_g1`/`hash_to_g2`, the hash-to-curve process handles cofactor clearing, so outputs are guaranteed in the correct subgroup.
- For `map_fp_to_g1`/`map_fp2_to_g2`, the output may NOT be in the correct subgroup (cofactor clearing not performed). Use `hash_to_g*` if you need subgroup membership.

**Protocol 26** adds `g1_is_on_curve`/`g2_is_on_curve` which ONLY check curve membership (not subgroup), useful for cheaper pre-validation of user-supplied points.

---

## 6. Host Function Availability

| Protocol | Version | Release Date | BLS12-381 Status |
|---|---|---|---|
| 22 | Initial | Testnet: 2024-11-12, Mainnet: 2024-12-05 | **11 base functions** (CAP-0059) |
| 25 | X-Ray | Testnet: 2026-01-07, Mainnet: 2026-01-22 | Poseidon/Poseidon2 with BLS12-381 Fr |
| 26 | Yardstick | Testnet: 2026-04-16, Mainnet: 2026-05-06 | **+2 curve checks** (CAP-0080) |

**Current status (2026-05-28)**: Protocol 26 is live on mainnet. All BLS12-381 functions are available.

**Known limitations**:
- No individual `pairing` function (only `pairing_check` that returns bool). This is by design — prevents expensive fp12 serialization and encourages the optimized multi-pairing pattern.
- No `G2 -> G1` or cross-group operations.
- No `Fr` from arbitrary bytes — only from `U256` (use `Fr::from_u256`).
- Host panics on malformed input (not recoverable in guest contract).

---

## 7. Gas / Budget Costs

From the Stellar Groth16 verifier test output (single pairing check with 4 pairs):

```
Cpu limit: 100000000; used: 40968821   (~41% of 100M budget)
Mem limit: 41943040; used: 297494      (~0.7% of 40M budget)

Cost Type                     cpu_insns
────────────────────────────────────────
Bls12381Pairing               30,335,852  ← dominant cost (74% of total)
Bls12381G2CheckPointInSubgroup 4,231,288
Bls12381G1CheckPointInSubgroup 3,652,550
Bls12381G1Mul                  2,458,985
```

**Key estimates** (1 Groth16 verify with 4 pairs = 4 G1 + 4 G2 inputs):
- **Pairing**: ~30M CPU instructions (~3/4 of total cost)
- **Subgroup checks**: ~8M combined
- **G1 mul** (per op): ~2.5M CPU
- **Full Groth16 verification**: ~41M CPU instructions (~40% of 100M budget per Soroban tx)
- **Estimated cost**: ~4,100 stroops (roughly $0.0004 at $0.10/stroop)

Note: The pairing cost scales linearly with the number of pairs. A minimal BLS sig verification (2 pairs) would be roughly half.

From `stellar-zk` project: BN254 Groth16 verification costs ~12M CPU instructions (~1,100 stroops). BLS12-381 is more expensive due to larger field sizes.

---

## 8. Groth16 Verification — Complete Example Flow

Source: `stellar/soroban-examples/groth16_verifier` (official Stellar example)

### 8.1 Data Structures

```rust
#[derive(Clone)]
#[contracttype]
pub struct VerificationKey {
    pub alpha: G1Affine,
    pub beta: G2Affine,
    pub gamma: G2Affine,
    pub delta: G2Affine,
    pub ic: Vec<G1Affine>,
}

#[derive(Clone)]
#[contracttype]
pub struct Proof {
    pub a: G1Affine,    // pi_A — G1 point (48+48 = 96 bytes uncompressed)
    pub b: G2Affine,    // pi_B — G2 point (192 bytes uncompressed)
    pub c: G1Affine,    // pi_C — G1 point (96 bytes)
}
```

### 8.2 Verification Equation

```
e(-A, B) * e(alpha, beta) * e(vk_x, gamma) * e(C, delta) == 1
```

Where `vk_x = ic[0] + sum(pub_signals[i] * ic[i+1])`

### 8.3 Contract Implementation

```rust
pub fn verify_proof(
    env: Env,
    vk: VerificationKey,
    proof: Proof,
    pub_signals: Vec<Fr>,
) -> Result<bool, Groth16Error> {
    let bls = env.crypto().bls12_381();

    // Compute linear combination of public inputs with IC
    if pub_signals.len() + 1 != vk.ic.len() {
        return Err(Groth16Error::MalformedVerifyingKey);
    }
    let mut vk_x = vk.ic.get(0).unwrap();
    for (s, v) in pub_signals.iter().zip(vk.ic.iter().skip(1)) {
        let prod = bls.g1_mul(&v, &s);
        vk_x = bls.g1_add(&vk_x, &prod);
    }

    // Pairing check
    let neg_a = -proof.a;                        // Negation (SDK op)
    let vp1 = vec![&env, neg_a, vk.alpha, vk_x, proof.c];
    let vp2 = vec![&env, proof.b, vk.beta, vk.gamma, vk.delta];
    Ok(bls.pairing_check(vp1, vp2))             // Single call, 4 pairs
}
```

### 8.4 Proof → Contract Input Flow

1. **Circuit** (Circom/Noir) generates `proof.json`, `verification_key.json`, `public.json`
2. **Off-chain parsing**: Convert hex string coordinates to `G1Affine`/`G2Affine` via:

```rust
// Using arkworks for off-chain serialization (test code)
use ark_bls12_381::{Fq, Fq2, G1Affine as ArkG1, G2Affine as ArkG2};
use ark_serialize::CanonicalSerialize;

let ark_point = ArkG1::new(Fq::from_str(x).unwrap(), Fq::from_str(y).unwrap());
let mut buf = [0u8; G1_SERIALIZED_SIZE]; // 96 bytes
ark_point.serialize_uncompressed(&mut buf[..]).unwrap();
let g1 = G1Affine::from_array(&env, &buf);
```

3. **Contract invocation**: Pass `VerificationKey`, `Proof`, and `Vec<Fr>` to `verify_proof`.

### 8.5 Serialization Mapping (192-byte proof)

The Soroban Proof struct maps to the standard Groth16 proof format:

| Field | Curve Group | Uncompressed Size | Notes |
|---|---|---|---|
| `proof.a` (pi_A) | G1 | 96 bytes | 48(X) + 48(Y) |
| `proof.b` (pi_B) | G2 | 192 bytes | 48(X_c1) + 48(X_c0) + 48(Y_c1) + 48(Y_c0) |
| `proof.c` (pi_C) | G1 | 96 bytes | 48(X) + 48(Y) |
| **Total** | | **384 bytes** | Serialized as 3 separate `G1Affine`/`G2Affine` values |

The handoff mentions "192-byte proof format: 48(G1) + 96(G2) + 48(G1)". This is the **compressed** format. Soroban uses **uncompressed** format (384 bytes for the proof, or 96+192+96). The contract uses typed structs not raw bytes — serialization is handled by the SDK's XDR encoding of the contract types.

---

## 9. Code Generation Tool

**`soroban-verifier-gen`** (crates.io: `soroban-verifier-gen`) can auto-generate a Groth16 verifier contract from a snarkjs `verification_key.json`:

```bash
cargo install soroban-verifier-gen
soroban-verifier-gen --vk verification_key.json --out verifier
```

Supports both BLS12-381 (default) and BN254 (`--curve bn254`).

---

## 10. Key Differences from Ethereum EIP-2537

| Aspect | Ethereum (EIP-2537) | Soroban |
|---|---|---|
| Point format | Compressed (48 bytes G1) | **Uncompressed** (96 bytes G1) |
| Pairing | `Fp12` result returned | `bool` only (multi-pairing-check) |
| Hash-to-curve | Not in EIP-2537 | Included (`hash_to_g1`, `hash_to_g2`) |
| MSM | `G1MULTIEXP` / `G2MULTIEXP` | `g1_msm` / `g2_msm` |
| Fr arith | Not included | Full set (add, sub, mul, pow, inv) |
| Fr type | Bytes | `U256Val` / `Fr` struct |

---

## 11. Resources

- [CAP-0059 — Host functions for BLS12-381](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0059.md)
- [CAP-0080 — Additional BN254 and BLS12-381 host functions](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0080.md)
- [Official SDK docs: `Bls12_381`](https://docs.rs/soroban-sdk/latest/soroban_sdk/crypto/bls12_381/struct.Bls12_381.html)
- [Groth16 Verifier Example](https://github.com/stellar/soroban-examples/tree/main/groth16_verifier)
- [BLS Signature Example](https://github.com/stellar/soroban-examples/tree/main/bls_signature)
- [soroban-verifier-gen (auto-generator)](https://crates.io/crates/soroban-verifier-gen)
- [Protocol 26 Upgrade Guide](https://stellar.org/blog/foundation-news/stellar-yardstick-protocol-26-upgrade-guide)
- [Software Versions](https://developers.stellar.org/docs/networks/software-versions)
