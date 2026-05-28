# Breadcrumbs — Obsidian plugin

## Project overview

Breadcrumbs adds typed, directed graph edges between Obsidian notes, exposing structured hierarchies via sidebar views, page views, codeblocks, and commands.

- Plugin ID: `breadcrumbs`
- Entry point: `src/main.ts` → `main.js` (repo root)
- Release artifacts: `main.js`, `manifest.json`, `styles.css`
- Desktop + mobile (`isDesktopOnly: false`)

## Environment & tooling

- **Package manager: bun** — always `bun install`, never `npm install`
- **Node: ≥24**
- **TypeScript 6 + Svelte 5** (runes syntax)
- **Rust/WASM** (`wasm/`) for the graph engine — compiled with `wasm-pack`
- **Tailwind CSS v4** for styles
- **esbuild** bundles everything into `main.js`
- **Vitest** for unit tests (TypeScript); `wasm-pack test` for Rust

### Commands

```bash
bun run dev          # watch TypeScript + CSS in parallel
bun run build        # type-check, svelte-check, bundle (production)
bun run test         # vitest
bun run lint         # ESLint (src/) + cargo clippy
bun run fmt          # prettier (src/) + cargo fmt
bun run tsc -noEmit -skipLibCheck   # type-check only

# WASM — run after any Rust change
bun run wasm:build   # release build
bun run wasm:dev     # debug build (faster, larger)
bun run wasm:test    # Rust unit tests
```

`main.js`, `styles.css`, `*.map`, `node_modules/`, `coverage/`, `wasm/pkg/` are git-ignored. Never read or reference them — use source files under `src/` and `wasm/src/`.

## Architecture

### Stack

- **TypeScript + Svelte 5** — use runes (`$state`, `$derived`, `$effect`). Never use Svelte 4 patterns (`$:`, `onMount` for reactivity, `writable` stores for component state).
- **Rust/WASM** (`wasm/src/`) — graph engine. TypeScript calls it via `wasm/pkg/breadcrumbs_graph_wasm.d.ts`. Do not edit `wasm/pkg/` — it is generated.
- **Tailwind CSS v4** — utility classes in `.svelte` files. Source: `src/styles.css`.

### Source layout

```
src/
  main.ts               # Plugin lifecycle — onload, onunload, graph singleton
  interfaces/settings.ts # BreadcrumbsSettings shape
  const/settings.ts      # DEFAULT_SETTINGS
  settings/migration.ts  # Runs on every load; handles v2/v3 shapes
  settings/             # Per-section settings UI (one file per section)
  graph/
    builders/index.ts   # rebuild_graph() coordinator
    builders/explicit/  # One builder per edge source
  codeblocks/           # ```breadcrumbs``` block parsing and rendering
  views/                # Side views (TreeView, Matrix) and page views
  commands/             # addCommand implementations
  components/           # Svelte components
  modals/               # Modal classes
  stores/               # Svelte stores (active file, etc.)
  utils/                # Pure helpers
```

### Graph engine (WASM boundary)

The graph lives in Rust. TypeScript creates and queries it via:
- `NoteGraph` — holds nodes and edges; singleton at `plugin.graph`
- `rebuild_graph()` — rebuilds from scratch on settings change or vault reload
- `BatchGraphUpdate` — incremental update for file create/rename/delete
- `TraversalOptions` + `rec_traverse_and_process()` — powers all tree/trail views
- `GCNodeData` / `GCEdgeData` — DTOs for graph construction

### Edge builders

`rebuild_graph()` runs 9 explicit edge builders in parallel: `typed_link`, `tag_note`, `list_note`, `dendron_note`, `johnny_decimal_note`, `dataview_note`, `date_note`, `folder_note`, `regex_note`. Each is in `src/graph/builders/explicit/`. After explicit edges, `TransitiveGraphRule`s generate implied edges inside WASM.

### Settings

- Shape: `src/interfaces/settings.ts` (`BreadcrumbsSettings`)
- Defaults: `src/const/settings.ts` (`DEFAULT_SETTINGS`)
- Migration: `src/settings/migration.ts` — runs on every load
- **When adding a new settings field**: add to the interface, add a default, and add it to every hardcoded `tree:` / `matrix:` object in `tests/settings/migration.test.ts` — the test will fail otherwise.

### Commands

Command IDs must not include the plugin ID (`breadcrumbs`). Obsidian auto-namespaces them. Correct: `id: "rebuild-graph"`. Wrong: `id: "breadcrumbs:rebuild-graph"`.

## Linting

```bash
bun run lint
```

ESLint config: `eslint.config.mjs`. Uses `eslint-plugin-obsidianmd` (Obsidian plugin guidelines), `typescript-eslint`, `eslint-plugin-svelte`, `eslint-plugin-import-x`. Max warnings: 0.

## Testing

```bash
bun run test                            # all vitest tests
bun run test tests/path/to/file.test.ts # single file
bun run wasm:test                       # Rust tests
```

Tests live in `tests/`. No test framework for Svelte components — TypeScript logic only.

## Versioning & releases

- Use `bun run version:prod` or `bun run version:beta` to bump versions.
- Beta releases use `manifest-beta.json`.
- Release tags must match `manifest.json` version exactly (no leading `v`).
- Attach `main.js`, `manifest.json`, `styles.css` to the GitHub release.

## Agent do / don't

**Do**
- Use Svelte 5 runes — `$state`, `$derived`, `$effect`. Not Svelte 4 patterns.
- Run `bun run lint` before finishing any change.
- Update `tests/settings/migration.test.ts` when adding settings fields.
- Run `bun run wasm:build` after any Rust change in `wasm/src/`.
- Use `plugin.graph` as the graph singleton — never instantiate `NoteGraph` directly in TypeScript.
- Use sentence case for all UI strings (settings names, command names, notice text, button labels).
- Prefix `eslint-disable` comments with a reason when suppressing `obsidianmd/*` rules.

**Don't**
- Edit `wasm/pkg/` — it is generated by `wasm-pack`.
- Read or reference `main.js`, `styles.css` (build output — not in git).
- Add `breadcrumbs:` prefix to command IDs — Obsidian adds the plugin ID automatically.
- Change existing command IDs after release — breaks user keybindings.
- Use `console.log` directly outside `src/logger/` — use `log.debug()` / `log.info()` etc.
- Use `confirm()`, `alert()`, or `prompt()` — use Obsidian's Modal API instead.
- Rename or restructure `BreadcrumbsSettings` interface fields without a migration step.

## References

- Docs site: https://breadcrumbs-docs.michaelpporter.com
- Obsidian API docs: https://docs.obsidian.md
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- `eslint-plugin-obsidianmd`: https://www.npmjs.com/package/eslint-plugin-obsidianmd
- GitHub: https://github.com/michaelpporter/breadcrumbs
