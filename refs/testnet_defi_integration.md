# Testnet DeFi Integration: Blend + Soroswap

> **Status**: Research complete
> **Network**: Stellar Testnet ("Test SDF Network ; September 2015")
> **Last updated**: 2026-05-28

---

## 1. Blend Protocol (v2) — Testnet

### 1.1 Contract Addresses

Source: `blend-capital/blend-utils` — `testnet.contracts.json`

| Contract | Address (C-form) | Notes |
|---|---|---|
| **Pool Factory v2** | `CDV6RX4CGPCOKGTBFS52V3LMWQGZN3LCQTXF5RVPOOCG4XVMHXQ4NTF6` | Deploy new pools |
| **Backstop v2** | `CBDVWXT433PRVTUNM56C3JREF3HIZHRBA64NB2C3B2UNCKIS65ZYCLZA` | Backstop/liquidation |
| **Emitter** | `CC3WJVJINN4E3LPMNTWKK7LQZLYDQMZHZA7EZGXATPHHBPKNZRIO3KZ6` | BLND rewards emissions |
| **Lending Pool (TestnetV2)** | `CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF` | USDC/XLM/wETH/wBTC pool |
| **Comet** | `CA5UTUUPHYL5K22UBRUVC37EARZUGYOSGK3IKIXG2JLCC5ZZLI4BDWDM` | BLND:USDC liquidity pool |
| **Comet Factory** | `CDX2TKELFKHP2MWISDCXWWZ73CL7F57GHYRJAWJWNOTLNJNNM7XLT4JY` | Comet pair factory |
| **Oracle Mock** | `CAZOKR2Y5E2OSWSIBRVZMJ47RUTQPIGVWSAQ2UISGAVC46XKPGDG5PKI` | Test oracle |

### 1.2 Token Addresses (Testnet)

| Token | Issuer (G...) | Contract Address (C...) |
|---|---|---|
| **XLM** | — | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| **USDC** | `GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56` | `CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU` |
| **BLND** | `GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56` | `CB22KRA3YZVCNCQI64JQ5WE7UY2VAV7WFLK6A2JN3HEX56T2EDAFO7QF` |
| **wETH** | — | `CAZAQB3D7KSLSNOSQKYD2V4JP5V2Y3B4RDJZRLBFCCIXDCTE3WHSY3UE` |
| **wBTC** | — | `CAP5AMC2OHNVREO66DFIN6DHJMPOBAJ2KCDDIMFBR7WWJH5RZBFM3UEI` |

### 1.3 Pool Function Signatures

The Blend Pool v2 uses a **unified `submit` entry point** with a `Request` type for all operations (supply, withdraw, borrow, repay).

#### Core Entry Point

```rust
fn submit(
    e: Env,
    from: Address,       // user whose positions change
    spender: Address,    // sends tokens to pool (approval source if use_allowance)
    to: Address,         // receives tokens from pool
    requests: Vec<Request>,
) -> Positions;
```

#### Request Type

```rust
pub struct Request {
    pub request_type: u32,   // enum discriminant
    pub address: Address,    // reserve asset address
    pub amount: i128,        // amount (in smallest unit, e.g. stroops for USDC)
}

// RequestType enum (u32):
//   0 = SupplyCollateral   — deposit asset as collateral
//   1 = WithdrawCollateral — withdraw collateral
//   2 = Borrow             — borrow asset
//   3 = Repay              — repay borrowed asset
//   4 = RepayWithCollateral— repay using collateral
//   5 = SupplyBase         — deposit without using as collateral
```

#### Positions Return Type

```rust
pub struct Positions {
    pub collateral: Vec<i128>,   // bToken balances per reserve index
    pub liabilities: Vec<i128>,  // dToken balances per reserve index
}
```

### 1.4 Deposit Flow (Supply USDC)

```rust
// 1. Approve the pool contract to spend USDC (one-time per pool)
//    This is done via the token's `approve` function
usdc_token.approve(&env, &pool_address, &amount, &expiration_ledger);

// 2. Submit supply request to pool
let result = pool_client.submit(
    &user,        // from
    &user,        // spender
    &user,        // to
    &vec![&env,
        Request {
            request_type: 0,  // SupplyCollateral
            address: usdc_address,
            amount: deposit_amount,
        },
    ],
);

// result.collateral[reserve_index] contains bUSDC tokens minted
```

**Approval**: Blend uses the standard Stellar token `approve` (allowance) mechanism. The pool contract calls `transfer_from` on the spender. If `use_allowance` is true (second `submit` variant with `transfer_from`), the spender must have pre-approved the pool contract.

**Alternatively**, the pool can be deployed with a direct transfer flow where the spender calls `submit` and the pool transfers tokens directly from the spender (no pre-approval needed for same-user operations).

### 1.5 Withdraw Flow

```rust
// Submit withdrawal request
let result = pool_client.submit(
    &user,        // from
    &user,        // spender
    &user,        // to (receives the withdrawn assets)
    &vec![&env,
        Request {
            request_type: 1,  // WithdrawCollateral
            address: usdc_address,
            amount: withdraw_amount,  // or u128::MAX for full withdrawal
        },
    ],
);
```

### 1.6 Reading Pool State

```rust
// Get pool configuration
fn get_config(e: Env) -> PoolConfig;

// Get reserve list (ordered — index defines reserve position)
fn get_reserve_list(e: Env) -> Vec<Address>;

// Get specific reserve data (includes interest rates)
fn get_reserve(e: Env, asset: Address) -> Reserve;

// Get user positions
fn get_positions(e: Env, address: Address) -> Positions;
```

The `Reserve` struct contains: `b_rate` (supply APY basis), `d_rate` (borrow APY basis), total supply/borrow, utilization, and configuration.

### 1.7 Backstop Deposit

```rust
// Backstop deposit (provides BLND as backstop to a pool)
fn deposit(
    e: Env,
    from: Address,
    pool_address: Address,
    amount: i128,
) -> i128;  // returns shares minted
```

### 1.8 Blend SDK (JavaScript)

For off-chain integration, Blend provides JS SDK (`@blend-capital/blend-sdk`):

```typescript
import { PoolV2, PoolMetadata } from '@blend-capital/blend-sdk';

const network = {
  passphrase: "Test SDF Network ; September 2015",
  rpc: "https://soroban-testnet.stellar.org",
};

// Load pool data
const pool = await PoolV2.load(network, poolId);
const reserve = pool.reserves.get(usdcAssetId);
console.log(reserve.b_rate, reserve.d_rate);  // supply/borrow rates

// Construct submit operation
const supplyOp = pool_contract.submit({
  from: userAddress,
  spender: userAddress,
  to: userAddress,
  requests: [{
    request_type: RequestType.SupplyCollateral,
    address: USDC_CONTRACT,
    amount: amountStroops,
  }],
});
```

---

## 2. Soroswap — Testnet

### 2.1 Contract Addresses

Source: `soroswap/core` — `public/testnet.contracts.json`

| Contract | Address (C-form) | Notes |
|---|---|---|
| **Factory** | `CDP3HMUH6SMS3S7NPGNDJLULCOXXEPSHY4JKUKMBNQMATHDHWXRRJTBY` | Creates pairs |
| **Router** | `CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD` | Swap entry point + liquidity mgmt |

The Soroswap API can also provide addresses dynamically:
```bash
curl -XGET 'https://api.soroswap.finance/api/testnet/router'
```

### 2.2 Router Function Signatures

#### Swap — Exact Input for Output

```rust
fn swap_exact_tokens_for_tokens(
    e: Env,
    amount_in: i128,
    amount_out_min: i128,
    path: Vec<Address>,
    to: Address,
    deadline: u64,
) -> Result<Vec<i128>, CombinedRouterError>;
```

`path` is `[input_token_address, ..., output_token_address]` — intermediate tokens for multi-hop swaps.

#### Swap — Input for Exact Output

```rust
fn swap_tokens_for_exact_tokens(
    e: Env,
    amount_out: i128,
    amount_in_max: i128,
    path: Vec<Address>,
    to: Address,
    deadline: u64,
) -> Result<Vec<i128>, CombinedRouterError>;
```

#### Add Liquidity

```rust
fn add_liquidity(
    e: Env,
    token_a: Address,
    token_b: Address,
    amount_a_desired: i128,
    amount_b_desired: i128,
    amount_a_min: i128,
    amount_b_min: i128,
    to: Address,
    deadline: u64,
) -> Result<(i128, i128), CombinedRouterError>;
```

#### Remove Liquidity

```rust
fn remove_liquidity(
    e: Env,
    token_a: Address,
    token_b: Address,
    liquidity: i128,
    amount_a_min: i128,
    amount_b_min: i128,
    to: Address,
    deadline: u64,
) -> Result<(i128, i128), CombinedRouterError>;
```

### 2.3 Library Helper

```rust
// soroswap-library crate for off-chain calculations
fn get_amounts_out(e: Env, factory: Address, amount_in: i128, path: Vec<Address>) -> Vec<i128>;
fn get_amounts_in(e: Env, factory: Address, amount_out: i128, path: Vec<Address>) -> Vec<i128>;
```

### 2.4 JS SDK Integration

```typescript
import { Router, Token, CurrencyAmount, TradeType, Networks } from "soroswap-router-sdk";

const USDC_ADDRESS = "CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU";
const XLM_ADDRESS = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const router = new Router({
  protocols: [Protocols.SOROSWAP],
  network: Networks.TESTNET,
});

const route = await router.route(
  CurrencyAmount.fromRawAmount(USDC_TOKEN, amount),
  XLM_TOKEN,
  TradeType.EXACT_INPUT
);
```

### 2.5 Swapping NOCTIS → USDC

To swap NOCTIS (a custom token) to USDC:
1. Ensure a NOCTIS/USDC liquidity pair exists (created via factory's `create_pair`)
2. If no direct pair, route through XLM: `path = [NOCTIS, XLM, USDC]`
3. Use `swap_exact_tokens_for_tokens` with the path
4. For best rates, use the Soroswap aggregator API which routes across all Stellar DEXes

### 2.6 Soroswap API (REST)

```bash
# Get quote
curl -X GET 'https://api.soroswap.finance/api/testnet/quote' \
  -H 'Content-Type: application/json' \
  -d '{
    "sellToken": "'$NOCTIS_ADDRESS'",
    "buyToken": "'$USDC_ADDRESS'",
    "sellAmount": "'$amount'"
  }'

# Get router address
curl -X GET 'https://api.soroswap.finance/api/testnet/router'

# Get pools
curl -X GET 'https://api.soroswap.finance/api/testnet/pools'
```

---

## 3. Protocol Comparison

| Aspect | Blend | Soroswap |
|---|---|---|
| **Type** | Lending protocol (money market) | DEX / Aggregator |
| **Testnet liquidity** | Good (USDC, XLM, wETH, wBTC pools) | Varies; testnet pools need seeding |
| **Key function** | `submit(Request{SupplyCollateral/WithdrawCollateral})` | `swap_exact_tokens_for_tokens` |
| **Yield** | Supply APY + BLND emissions | LP fees (~0.3% per swap) |
| **Token approval** | Standard Soroban `approve` | Standard Soroban `approve` |
| **Docs quality** | Good (docs.blend.capital + SDK) | Good (docs.soroswap.finance + SDK) |
| **Contract source** | `blend-capital/blend-contracts-v2` | `soroswap/core` |

### Recommendation for Noctis Yield Routing

**Blend** is the preferred yield source because:
1. Passive yield via supplying USDC (no active LP management needed)
2. BLND token emissions provide additional yield
3. Single `submit` interface handles both deposit and withdraw
4. Well-tested on testnet with existing USDC/XLM pools

**Soroswap** is needed for:
1. Swapping yield (BLND rewards → USDC) for compounding
2. Converting NOCTIS tokens to/from USDC for payroll operations
3. General token swaps (NOCTIS ↔ USDC, NOCTIS ↔ XLM)

---

## 4. Testnet Faucets

| Asset | Faucet / Method |
|---|---|
| **XLM (testnet)** | [Stellar Lab Friendbot](https://laboratory.stellar.org/#account-creator?network=test) — send XLM to any new account |
| **USDC (testnet)** | No public faucet. Deploy a mock USDC token contract (standard Soroban token) or use existing testnet USDC |
| **BLND (testnet)** | No faucet. The BLND token exists at the testnet address above but must be obtained from Blend protocol interactions |

For testing, deploy custom test tokens (mintable) using the Stellar Soroban token contract:
```bash
soroban contract deploy --wasm soroban_token_contract.wasm
soroban contract invoke --id <CONTRACT_ID> -- initialize --admin <ADMIN> --decimal 7 --name "Test USDC" --symbol "tUSDC"
```

---

## 5. Resources

- **Blend Docs**: https://docs.blend.capital
- **Blend Contracts**: https://github.com/blend-capital/blend-contracts-v2
- **Blend SDK (JS)**: https://github.com/blend-capital/blend-sdk-js
- **Blend Testnet Config**: https://github.com/blend-capital/blend-utils/blob/main/testnet.contracts.json
- **Soroswap Docs**: https://docs.soroswap.finance
- **Soroswap Contracts**: https://github.com/soroswap/core
- **Soroswap SDK (JS)**: https://github.com/soroswap/sdk
- **Soroswap Router SDK**: https://github.com/soroswap/soroswap-router-sdk
- **Soroswap API**: https://api.soroswap.finance
- **Stellar Testnet RPC**: `https://soroban-testnet.stellar.org`
- **Stellar Testnet Horizon**: `https://horizon-testnet.stellar.org`
