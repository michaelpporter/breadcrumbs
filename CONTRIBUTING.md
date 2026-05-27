# Contributing to Breadcrumbs

Thanks for your interest in contributing! This guide covers setup, development workflow, and how to submit changes.

## Prerequisites

- [Bun](https://bun.sh/) (package manager)
- [Rust + wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) (only if changing graph engine code in `wasm/`)
- Node.js 18+ (built with 24.15)

## Setup

```bash
git clone https://github.com/SkepticMystic/breadcrumbs
cd breadcrumbs
bun install
```

Symlink (or copy) the repo into your Obsidian vault's plugin folder so Obsidian can load it:

```
<vault>/.obsidian/plugins/breadcrumbs/ → repo root
```

## Development

```bash
# Watch mode — rebuilds main.js + styles.css on every change
bun run dev
```

Reload the plugin in Obsidian after each build: **Settings → Community Plugins → Breadcrumbs → reload icon**, or use the **Hot Reload** community plugin.

## Build

```bash
bun run build        # type-check + svelte-check + bundle
bun run tsc -noEmit -skipLibCheck   # type-check only
bun run svelte-check                # Svelte type-check only
```

## Testing

```bash
bun run test                                  # all Vitest tests
bun run test tests/settings/migration.test.ts # single file
bun run wasm:test                             # Rust unit tests (wasm-pack)
```

## Linting & Formatting

```bash
bun run lint   # ESLint + cargo clippy
bun run fmt    # Prettier + cargo fmt
```

## Graph Engine (Rust/WASM)

The core graph lives in `wasm/src/`. Rebuild after any Rust changes:

```bash
bun run wasm:build   # release build
bun run wasm:dev     # debug build (faster, larger output)
```

The generated bindings in `wasm/pkg/` are committed to the repo; `wasm/target/` is gitignored.

## Submitting Changes

1. Fork the repo and create a branch from `master`.
2. Make your changes, add or update tests as appropriate.
3. Run `bun run build` and `bun run test` — both must pass.
4. Open a pull request with a clear description of what and why.

For large changes, open an issue first to discuss the approach.

## Adding a New Settings Field

1. Add it to `src/interfaces/settings.ts` (`BreadcrumbsSettings`).
2. Add a default in `src/const/settings.ts` (`DEFAULT_SETTINGS`).
3. Add it to every hardcoded `tree:` / `matrix:` object in `tests/settings/migration.test.ts`.

## Release Process (maintainers)

See the `release` skill in CLAUDE.md, or run:

```bash
bun run release:beta    # bump + tag + push beta
bun run release         # bump + tag + push stable
```
