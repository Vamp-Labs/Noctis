.PHONY: all build test clippy clean

all: build test clippy

build:
	cargo build --target wasm32v1-none --release

test:
	cargo test

clippy:
	cargo clippy --all-targets

clean:
	cargo clean

# Deploy to testnet (requires soroban-cli)
deploy-testnet:
	@echo "=== Deploying policy_signer ==="
	soroban contract deploy \
		--wasm ../../target/wasm32v1-none/release/policy_signer.wasm \
		--source $$DEPLOYER_KEY \
		--network testnet
	@echo "=== Deploying streaming_vault ==="
	soroban contract deploy \
		--wasm ../../target/wasm32v1-none/release/streaming_vault.wasm \
		--source $$DEPLOYER_KEY \
		--network testnet
	@echo "=== Deploying wallet_factory ==="
	soroban contract deploy \
		--wasm ../../target/wasm32v1-none/release/wallet_factory.wasm \
		--source $$DEPLOYER_KEY \
		--network testnet
	@echo "=== Deploying yield_router ==="
	soroban contract deploy \
		--wasm ../../target/wasm32v1-none/release/yield_router.wasm \
		--source $$DEPLOYER_KEY \
		--network testnet
	@echo "=== Deploying payroll_dispatcher ==="
	soroban contract deploy \
		--wasm ../../target/wasm32v1-none/release/payroll_dispatcher.wasm \
		--source $$DEPLOYER_KEY \
		--network testnet
	@echo "=== All contracts deployed ==="

# Print WASM hashes
hashes:
	@for f in ../../target/wasm32v1-none/release/*.wasm; do \
		echo "$$(sha256sum $$f | cut -d' ' -f1)  $$(basename $$f)"; \
	done
