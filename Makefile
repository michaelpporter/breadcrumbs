.PHONY: dev test build version version_beta version_prod

dev:
		bun install -g wasm-pack
		cd wasm
		rustup override set stable
		rustup component add rust-src --toolchain stable-x86_64-unknown-linux-gnu
		cd ..
		bun install
		bun run wasm:build || exit 1
		bun run build || exit 1
		bun run dev

gh-actions:
		bun install
		bun run wasm:test || exit 1
		bun run test || exit 1
		bun run build || exit 1

test:
		bun install -g wasm-pack
		cd wasm
		rustup override set stable
		rustup component add rust-src --toolchain stable-x86_64-unknown-linux-gnu
		cd ..
		bun install
		bun run wasm:build || exit 1
		bun run build || exit 1
		bun run test || exit 1
		bun run dev

build:
		bun install -g wasm-pack
		cd wasm
		rustup override set stable
		rustup component add rust-src --toolchain stable-x86_64-unknown-linux-gnu
		cd ..
		bun install
		bun run wasm:build || exit 1
		bun run build || exit 1

version: version_beta version_prod

version_beta:
		bun run version-bump-beta.mjs
		git add manifest-beta.json versions.json package.json

version_prod:
		bun run version-bump.mjs
		git add manifest.json versions.json package.json
