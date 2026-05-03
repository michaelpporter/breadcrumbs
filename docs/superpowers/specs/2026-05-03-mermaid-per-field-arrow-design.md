# Per-field Mermaid Arrow Style for Breadcrumbs

Status: design approved
Date: 2026-05-03
Scope: Breadcrumbs Obsidian plugin (fork at `/Users/amikita/my/obsidian-fix/breadcrumbs`)

## Problem

Breadcrumbs renders typed-link graphs as Mermaid flowcharts. Today every edge uses the same arrow shape regardless of its `field`/`direction` (`up`/`down`/`same`/`next`/`prev`). Only the optional label (via `show-attributes: [field]`) distinguishes them. Users want sibling links (`same` field) to be visually distinct from hierarchy links (`down`/`up`) — different arrow style, not just label.

The arrow shape is currently selected only by `(backward.is_empty, all_implied, show_arrow_points)` in `wasm/src/mermaid.rs`. The edge's field is not consulted.

## Goal

Allow the user to assign a Mermaid arrow shape to each Breadcrumbs edge field. Edges of that field render with the chosen shape. Edges with no override keep current behavior.

## Non-goals

- Per-field colors, stroke widths, or labels styling beyond Mermaid arrow tokens.
- Custom/free-form arrow strings (fixed dropdown only).
- Changing the trail / list / tree views (Mermaid view only).

## Design

### 1. Settings model

In `src/interfaces/settings.ts`:

```ts
export const MERMAID_ARROW_TYPES = [
  "-->",   // solid arrow (default)
  "-.->",  // dotted arrow
  "==>",   // thick arrow
  "--o",   // circle end
  "--x",   // cross end
  "---",   // solid no-arrow
  "-.-",   // dotted no-arrow
] as const;
export type MermaidArrowType = (typeof MERMAID_ARROW_TYPES)[number];

export interface EdgeField {
  label: string;
  mermaid_arrow?: MermaidArrowType;
}
```

`undefined` means "use existing default logic". No migration needed; existing settings load with the field absent and behavior is unchanged.

### 2. Settings UI

In `src/components/settings/EdgeFieldSettings.svelte`, next to each field's label input, add an Obsidian-styled `<select>` with options:

- `Default` (value: empty / undefined)
- `--> solid`
- `-.-> dotted`
- `==> thick`
- `--o circle`
- `--x cross`
- `--- solid no-arrow`
- `-.- dotted no-arrow`

Persist on change via the existing settings save flow.

### 3. WASM API change

In `wasm/src/mermaid.rs`, extend `MermaidGraphOptions`:

```rust
pub field_arrows: HashMap<String, String>,  // field label → arrow string
```

Add a new last argument to `MermaidGraphOptions::new()` (`field_arrows: JsValue` deserialized to `HashMap<String,String>`). Keep current arg order so existing callers continue compiling once they're updated; add the param explicitly at all call sites.

JS binding consumer (`src/utils/mermaid.ts`, `src/components/codeblocks/CodeblockMermaid.svelte`): build the map from `plugin.settings.edge_fields` (only entries where `mermaid_arrow` is set), pass to constructor.

### 4. Edge emission logic

In `wasm/src/mermaid.rs`:

**Custom-arrow detection helper:**

```rust
fn custom_arrow<'a>(edges: &[&EdgeData], field_arrows: &'a HashMap<String, String>) -> Option<&'a String> {
    edges.iter().find_map(|e| field_arrows.get(&e.edge_type))
}
```

(If multiple edges in `forward` have different custom arrows, take the first; document it.)

**Accumulation (`int_accumulate_edges`):** add `field_arrows: &HashMap<String, String>` parameter. Rule: an edge whose field has a custom arrow is **never accumulated** — neither merged with same-direction peers nor collapsed with an opposing edge. Such an edge always becomes its own forward-only entry. Edges without custom arrows keep current accumulation behavior.

This means the accumulator's keys for custom edges must be unique per edge (not per node pair). Implementation: when the new edge has a custom arrow, insert it under a synthetic key that includes the edge's identity (e.g. `(source, target, edge_attribute_id)`) so it never collides with another entry.

**Emission (`generate_mermaid_edge`):** compute `forward_arrow = custom_arrow(forward, field_arrows)`.

- If `forward_arrow` is `None` and `backward` is empty or also `None` → existing `match` for `arrow_type` runs unchanged.
- If `forward_arrow` is `Some(s)` → emit `source s|"label"| target` (or no-label form) using `s` as the arrow. `backward` is guaranteed empty by the accumulator rule.

This guarantees: edges with custom arrows always render as one-way lines with the chosen shape; edges without custom arrows behave exactly as today.

### 5. Tests

Rust unit tests in `wasm/tests/mermaid.rs`:

1. Two edges, one with `mermaid_arrow = "-.->"` (sibling-style), one without → output contains the `-.->` for the first edge and an unchanged arrow for the second.
2. Bidirectional pair (`down` + `up` between same nodes) where `down` has a custom arrow and `up` does not → output contains two distinct edge lines, not one collapsed line.
3. No `field_arrows` map at all (empty) → output byte-identical to current behavior on a fixture graph (regression guard).

Manual test in Obsidian: load real vault, set `same` field to `-.->`, verify rendered diagram on the `!!Tree` page matches expectation.

### 6. Build & install

Workspace: `/Users/amikita/my/obsidian-fix/breadcrumbs` (full clone).

Toolchain prerequisites (verify, install if missing):
- `rustup` + stable toolchain
- `wasm-pack`
- Node + `bun` (repo uses `bun.lock`)

Build steps:
1. `bun install`
2. `npm run build:wasm` (regenerates `wasm/pkg/`)
3. `npm run build` (produces `main.js`)

Install into Obsidian vault:
- User to provide the vault path (or path to existing `<vault>/.obsidian/plugins/breadcrumbs/`).
- Copy `main.js`, `manifest.json`, `styles.css` from the fork to that plugin folder.
- Reload Obsidian (Ctrl/Cmd+R) or disable/enable the plugin.

### 7. Risks / open considerations

- WASM API change is breaking for any external consumer of `MermaidGraphOptions::new()`. Inside this repo only one site (`src/utils/mermaid.ts` + `CodeblockMermaid.svelte`) calls it; both updated together.
- "Custom disables collapse" can produce visually busier graphs when many fields have overrides. Acceptable per user choice (variant B in brainstorm).
- Upstreaming: fork lives locally; PR to `SkepticMystic/breadcrumbs` is optional, not part of this scope.
