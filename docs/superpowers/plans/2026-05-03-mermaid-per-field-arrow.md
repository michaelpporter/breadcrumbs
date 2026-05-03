# Per-field Mermaid Arrow Style — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users assign a Mermaid arrow shape to each Breadcrumbs edge field, so siblings/relations of distinct fields render with visually distinct arrows.

**Architecture:** Optional `mermaid_arrow` on each `EdgeField` in TS settings. The map (label → arrow string) is forwarded into the WASM Mermaid renderer via two parallel `Vec<String>` parameters on `MermaidGraphOptions`. In Rust, edges whose field has a custom arrow are never accumulated/collapsed — each becomes its own forward-only entry and is emitted with the chosen arrow string. Edges without overrides keep current behavior.

**Tech Stack:** TypeScript + Svelte 5 (runes), Rust/WebAssembly via `wasm-pack` + `wasm-bindgen`, `bun` package manager, Vitest (TS), `wasm-pack test --node` (Rust).

**Workspace:** `/Users/amikita/my/obsidian-fix/breadcrumbs` on branch `feature/per-field-mermaid-arrow`.

**Reference spec:** `docs/superpowers/specs/2026-05-03-mermaid-per-field-arrow-design.md`

---

## File Map

- Modify `wasm/src/mermaid.rs` — add `field_arrows: HashMap<String,String>` to `MermaidGraphOptions`; new ctor params; change `int_accumulate_edges` and `generate_mermaid_edge` to honor custom arrows.
- Modify `wasm/tests/mermaid.rs` — add tests for custom arrows and non-collapse rule.
- Modify `src/interfaces/settings.ts` — add `MERMAID_ARROW_TYPES`, `MermaidArrowType`, `mermaid_arrow?` on `EdgeField`.
- Modify `src/utils/mermaid.ts` — pass empty `field_arrows` placeholders in `from_transitive_rule` (preserves existing behavior).
- Modify `src/components/codeblocks/CodeblockMermaid.svelte` — derive `field_arrow_keys`/`field_arrow_values` from `plugin.settings.edge_fields` and pass into `MermaidGraphOptions`.
- Modify `src/components/settings/EdgeFieldSettings.svelte` — add a per-field `<select>` to set the arrow.
- (No migration changes; field is optional, default = absent.)

---

## Build & test commands (reference)

- Rust unit tests: `bun run wasm:test`
- Rebuild WASM (debug, faster): `bun run wasm:dev`
- Rebuild WASM (release): `bun run wasm:build`
- TS tests: `bun run test`
- Type-check + svelte-check + bundle: `bun run build`

After Rust changes you MUST run `bun run wasm:dev` (or `wasm:build`) before the TS will compile against the new bindings.

---

## Task 1: Add Rust struct field & ctor parameter

**Files:**
- Modify: `wasm/src/mermaid.rs`

- [ ] **Step 1: Add `HashMap` import and `field_arrows` field**

At the top of `wasm/src/mermaid.rs`, ensure `std::collections::HashMap` is imported. Add it near the other imports:

```rust
use std::collections::HashMap;
```

In `pub struct MermaidGraphOptions` (around line 33), add after `pub show_arrow_points: bool,`:

```rust
    #[wasm_bindgen(skip)]
    pub field_arrows: HashMap<String, String>,
```

- [ ] **Step 2: Extend the `#[wasm_bindgen(constructor)]` signature**

In `impl MermaidGraphOptions` (around line 57), change `pub fn new(...)` to accept two new parameters at the end:

```rust
    #[wasm_bindgen(constructor)]
    pub fn new(
        active_node: Option<String>,
        init_line: String,
        chart_type: String,
        direction: String,
        collapse_opposing_edges: bool,
        edge_label_attributes: Vec<String>,
        edge_sorter: Option<EdgeSorter>,
        node_label_fn: Option<js_sys::Function>,
        link_nodes: bool,
        show_arrow_points: bool,
        field_arrow_keys: Vec<String>,
        field_arrow_values: Vec<String>,
    ) -> MermaidGraphOptions {
        let field_arrows = field_arrow_keys
            .into_iter()
            .zip(field_arrow_values.into_iter())
            .collect::<HashMap<String, String>>();

        MermaidGraphOptions {
            active_node,
            init_line,
            chart_type,
            direction,
            collapse_opposing_edges,
            edge_label_attributes,
            edge_sorter,
            node_label_fn,
            link_nodes,
            show_arrow_points,
            field_arrows,
        }
    }
```

- [ ] **Step 3: Update the `Default` impl**

Add `field_arrows: HashMap::new(),` to the struct literal in `impl Default for MermaidGraphOptions` (around line 91):

```rust
impl Default for MermaidGraphOptions {
    fn default() -> Self {
        MermaidGraphOptions {
            active_node: None,
            init_line: "%%{ init: { \"flowchart\": {} } }%%".to_string(),
            chart_type: "graph".to_string(),
            direction: "LR".to_string(),
            collapse_opposing_edges: true,
            edge_label_attributes: vec!["field".to_string()],
            edge_sorter: Some(EdgeSorter::default()),
            node_label_fn: None,
            link_nodes: false,
            show_arrow_points: false,
            field_arrows: HashMap::new(),
        }
    }
}
```

- [ ] **Step 4: Verify Rust still compiles**

Run: `bun run wasm:dev`
Expected: build succeeds. (TS compile will break later — handled in Task 5.)

- [ ] **Step 5: Commit**

```bash
git add wasm/src/mermaid.rs
git commit -m "wasm: add field_arrows to MermaidGraphOptions"
```

---

## Task 2: Custom-arrow accumulation — failing test

**Files:**
- Modify: `wasm/tests/mermaid.rs`

- [ ] **Step 1: Write the failing test for custom arrow + non-collapse**

Append to `wasm/tests/mermaid.rs`:

```rust
#[wasm_bindgen_test]
fn test_field_arrows_disable_collapse() {
    // a --up--> b, and the transitive rule generates a --same--> b in reverse.
    // With field_arrows mapping "same" -> "==>", the same edge must NOT be
    // collapsed into the up edge and must use the custom arrow.

    let graph = get_test_graph();

    let mut options = MermaidGraphOptions::default();
    options.field_arrows = std::collections::HashMap::from([
        ("same".to_string(), "==>".to_string()),
    ]);

    let mermaid = graph
        .generate_mermaid_graph(get_traversal_options(), options)
        .unwrap();

    // We assert per-line containment instead of full equality because node
    // ordering elsewhere is unaffected by this change.
    let body = mermaid.mermaid.trim();
    assert!(
        body.contains(r#"2 ==>|"same"| 0"#),
        "expected custom thick arrow for 'same' edge, got:\n{body}"
    );
    assert!(
        body.contains(r#"0 ==>|"same"| 2"#),
        "expected custom thick arrow for the reverse 'same' edge, got:\n{body}"
    );
    assert!(
        body.contains(r#"0 -->|"up"| 1"#),
        "expected unchanged 'up' edge, got:\n{body}"
    );
    assert!(
        body.contains(r#"1 -->|"down"| 2"#),
        "expected unchanged 'down' edge, got:\n{body}"
    );
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run wasm:test -- --test-arg=test_field_arrows_disable_collapse`
(If the test runner doesn't take `--test-arg`, just run `bun run wasm:test` and confirm only the new test fails.)
Expected: FAIL — the `same` edge is currently rendered as `-.-` (implied collapsed bidirectional) without any `==>` token.

- [ ] **Step 3: Commit the failing test**

```bash
git add wasm/tests/mermaid.rs
git commit -m "test: failing test for per-field mermaid arrows"
```

---

## Task 3: Implement non-collapse for custom-arrow edges

**Files:**
- Modify: `wasm/src/mermaid.rs`

- [ ] **Step 1: Change `int_accumulate_edges` signature**

Find the `pub fn int_accumulate_edges` definition (around line 327). Change it so it receives the options (or specifically the field_arrows map). Replace the existing function header and body:

```rust
    pub fn int_accumulate_edges<'a>(
        graph: &'a NoteGraph,
        edges: Vec<EdgeStruct>,
        collapse_opposing_edges: bool,
        field_arrows: &HashMap<String, String>,
    ) -> Result<AccumulatedEdgeHashMap<'a>> {
        let mut accumulated_edges = AccumulatedEdgeHashMap::default();

        for edge_struct in edges {
            edge_struct.check_revision(graph)?;

            let edge_data = edge_struct.edge_data_ref(graph).unwrap();
            let has_custom_arrow = field_arrows.contains_key(&edge_data.edge_type);

            // Edges with custom arrows must never merge into another entry.
            // Insert them under a key that includes the edge's address so it
            // is unique even if multiple custom edges share the same node pair.
            if has_custom_arrow {
                let unique_key_target = NodeIndex::new(usize::MAX - accumulated_edges.map.len());
                accumulated_edges.map.insert(
                    (edge_struct.source_index, unique_key_target),
                    (
                        edge_struct.source_index,
                        edge_struct.target_index,
                        vec![edge_data],
                        Vec::new(),
                    ),
                );
                continue;
            }

            let forward_dir = (edge_struct.source_index, edge_struct.target_index);

            let entry1 = accumulated_edges.map.get_mut(&forward_dir);
            if let Some((_, _, forward, _)) = entry1 {
                forward.push(edge_data);
                continue;
            }

            if collapse_opposing_edges {
                let backward_dir = (edge_struct.target_index, edge_struct.source_index);

                if let Some((_, _, _, backward)) = accumulated_edges.map.get_mut(&backward_dir) {
                    backward.push(edge_data);
                    continue;
                }
            }

            accumulated_edges.map.insert(
                forward_dir,
                (
                    edge_struct.source_index,
                    edge_struct.target_index,
                    vec![edge_data],
                    Vec::new(),
                ),
            );
        }

        Ok(accumulated_edges)
    }
```

(The synthetic key uses `usize::MAX - len` as the second `NodeIndex` to guarantee no collision with any real node index in the graph or with another custom entry.)

- [ ] **Step 2: Update the caller in `generate_mermaid_graph`**

Find the call to `NoteGraph::int_accumulate_edges` (around line 169) and add the new argument:

```rust
        let accumulated_edges = NoteGraph::int_accumulate_edges(
            self,
            edge_structs,
            diagram_options.collapse_opposing_edges,
            &diagram_options.field_arrows,
        )?;
```

- [ ] **Step 3: Build and confirm only the new test still fails**

Run: `bun run wasm:test`
Expected: existing tests still pass; `test_field_arrows_disable_collapse` still FAILS — accumulation now keeps them separate, but emission still uses the default `-->` instead of `==>`.

- [ ] **Step 4: Commit**

```bash
git add wasm/src/mermaid.rs
git commit -m "wasm: skip collapsing for edges with custom arrows"
```

---

## Task 4: Implement custom-arrow emission

**Files:**
- Modify: `wasm/src/mermaid.rs`

- [ ] **Step 1: Modify `generate_mermaid_edge` to honor `field_arrows`**

Find `fn generate_mermaid_edge` (around line 261). Replace the body:

```rust
    fn generate_mermaid_edge(
        &self,
        source: &NodeIndex<u32>,
        target: &NodeIndex<u32>,
        forward: &[&EdgeData],
        backward: &[&EdgeData],
        diagram_options: &MermaidGraphOptions,
    ) -> String {
        let mut label = String::new();

        let custom_arrow = forward
            .iter()
            .find_map(|e| diagram_options.field_arrows.get(&e.edge_type))
            .cloned();

        let arrow_type: String = if let Some(s) = custom_arrow {
            s
        } else {
            let all_implied = !forward
                .iter()
                .zip_longest(backward.iter())
                .any(|pair| match pair {
                    EitherOrBoth::Both(a, b) => a.explicit || b.explicit,
                    EitherOrBoth::Left(a) => a.explicit,
                    EitherOrBoth::Right(b) => b.explicit,
                });

            match (
                backward.is_empty(),
                all_implied,
                diagram_options.show_arrow_points,
            ) {
                (true, true, _) => "-.->",
                (true, false, _) => "-->",
                (false, true, true) => "<-.->",
                (false, false, true) => "<--->",
                (false, true, false) => "-.-",
                (false, false, false) => "---",
            }
            .to_string()
        };

        label.push_str(
            forward
                .iter()
                .map(|edge| edge.attribute_label(&diagram_options.edge_label_attributes))
                .collect::<Vec<String>>()
                .join(", ")
                .as_str(),
        );

        // The previous behavior also concatenated backward labels when the
        // edge_types differ. We preserve that for non-custom edges only.
        if custom_arrow_was_none(&diagram_options.field_arrows, forward) && !backward.is_empty() {
            let same_elements = forward
                .iter()
                .zip(backward.iter())
                .all(|(a, b)| a.edge_type == b.edge_type);
            if !same_elements {
                label.push_str(" | ");
                label.push_str(
                    backward
                        .iter()
                        .map(|edge| edge.attribute_label(&diagram_options.edge_label_attributes))
                        .collect::<Vec<String>>()
                        .join(", ")
                        .as_str(),
                );
            }
        }

        if label.is_empty() {
            format!("    {} {} {}\n", source.index(), arrow_type, target.index())
        } else {
            format!(
                "    {} {}|\"{}\"| {}\n",
                source.index(),
                arrow_type,
                label,
                target.index()
            )
        }
    }
```

- [ ] **Step 2: Add the small helper used above**

Just above `impl NoteGraph {` (around line 260), add:

```rust
fn custom_arrow_was_none(
    field_arrows: &HashMap<String, String>,
    forward: &[&EdgeData],
) -> bool {
    !forward
        .iter()
        .any(|e| field_arrows.contains_key(&e.edge_type))
}
```

- [ ] **Step 3: Build and run tests**

Run: `bun run wasm:test`
Expected: ALL tests pass, including `test_field_arrows_disable_collapse`.

- [ ] **Step 4: Commit**

```bash
git add wasm/src/mermaid.rs
git commit -m "wasm: emit custom mermaid arrow per edge field"
```

---

## Task 5: Add a no-regression test for empty `field_arrows`

**Files:**
- Modify: `wasm/tests/mermaid.rs`

- [ ] **Step 1: Sanity-test that empty map = byte-identical to current default**

Append to `wasm/tests/mermaid.rs`:

```rust
#[wasm_bindgen_test]
fn test_field_arrows_empty_is_default() {
    let graph = get_test_graph();

    let mut options = MermaidGraphOptions::default();
    options.field_arrows = std::collections::HashMap::new(); // explicit, but already the default

    let mermaid = graph
        .generate_mermaid_graph(get_traversal_options(), options)
        .unwrap();

    assert_eq!(
        mermaid.mermaid.trim(),
        indoc! {
            r#"
            %%{ init: { "flowchart": {} } }%%
            graph LR
                0("a.md")
                2("c.md")
                1("b.md")
                2 -.-|"same"| 0
                0 -->|"up"| 1
                1 -->|"down"| 2
            "#
        }
        .trim()
    );
}
```

- [ ] **Step 2: Run all WASM tests**

Run: `bun run wasm:test`
Expected: ALL tests pass.

- [ ] **Step 3: Commit**

```bash
git add wasm/tests/mermaid.rs
git commit -m "test: regression — empty field_arrows preserves default output"
```

---

## Task 6: TS settings model

**Files:**
- Modify: `src/interfaces/settings.ts`

- [ ] **Step 1: Add the arrow type union and extend `EdgeField`**

At the very top of `src/interfaces/settings.ts` (after the existing imports, before `EdgeField`), add:

```ts
export const MERMAID_ARROW_TYPES = [
	"-->",
	"-.->",
	"==>",
	"--o",
	"--x",
	"---",
	"-.-",
] as const;

export type MermaidArrowType = (typeof MERMAID_ARROW_TYPES)[number];
```

Replace the existing `EdgeField` interface:

```ts
export interface EdgeField {
	label: string;
	mermaid_arrow?: MermaidArrowType;
}
```

- [ ] **Step 2: Type-check**

Run: `bun run tsc -noEmit -skipLibCheck`
Expected: PASS — the new field is optional, no other call sites need updates.

- [ ] **Step 3: Commit**

```bash
git add src/interfaces/settings.ts
git commit -m "settings: add optional mermaid_arrow on EdgeField"
```

---

## Task 7: Rebuild WASM bindings

**Files:**
- (none — generated artifacts under `wasm/pkg/` are checked in.)

- [ ] **Step 1: Rebuild the bindings**

Run: `bun run wasm:dev`
Expected: success. `wasm/pkg/breadcrumbs_graph_wasm.d.ts` should now show the `MermaidGraphOptions` constructor with two extra `Array<string>` parameters at the end and a new `field_arrows` accessor (skip-typed, but at least no parameters are missing).

- [ ] **Step 2: Verify**

Run: `rg "MermaidGraphOptions" wasm/pkg/breadcrumbs_graph_wasm.d.ts | head`
Expected: the constructor signature includes 12 parameters (was 10).

- [ ] **Step 3: No commit needed**

`wasm/pkg/` is not tracked in this repo (`git ls-files wasm/pkg/` returns empty). The bundled `main.js` carries the WASM bytes after `bun run build`. Skip the commit; nothing to add.

---

## Task 8: Wire `field_arrows` into the codeblock renderer

**Files:**
- Modify: `src/components/codeblocks/CodeblockMermaid.svelte`

- [ ] **Step 1: Build the keys/values arrays from settings**

In `src/components/codeblocks/CodeblockMermaid.svelte`, inside the `update()` function, just **before** `const mermaid_options = new MermaidGraphOptions(` (around line 75), insert:

```ts
		const field_arrow_entries = plugin.settings.edge_fields
			.filter((f) => !!f.mermaid_arrow)
			.map((f) => [f.label, f.mermaid_arrow!] as const);
		const field_arrow_keys = field_arrow_entries.map(([k]) => k);
		const field_arrow_values = field_arrow_entries.map(([, v]) => v);
```

- [ ] **Step 2: Pass them into the constructor**

Change the closing args of `new MermaidGraphOptions(...)` from:

```ts
				true,
				options["mermaid-arrow"] ?? false,
			);
```

to:

```ts
				true,
				options["mermaid-arrow"] ?? false,
				field_arrow_keys,
				field_arrow_values,
			);
```

- [ ] **Step 3: Build the bundle**

Run: `bun run build`
Expected: type-check, svelte-check, and esbuild all succeed.

- [ ] **Step 4: Commit**

```bash
git add src/components/codeblocks/CodeblockMermaid.svelte
git commit -m "codeblock: forward per-field mermaid arrows to wasm"
```

---

## Task 9: Update `from_transitive_rule` callsite

**Files:**
- Modify: `src/utils/mermaid.ts`

- [ ] **Step 1: Pass empty arrays so the existing example renderer still works**

In `src/utils/mermaid.ts`, find the `new MermaidGraphOptions(...)` call inside `from_transitive_rule` (around line 92). Change its closing arguments from:

```ts
			false,
			false,
		),
```

to:

```ts
			false,
			false,
			[],
			[],
		),
```

(Two empty arrays = no field overrides, so transitive-rule preview diagrams keep their current look.)

- [ ] **Step 2: Build**

Run: `bun run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/utils/mermaid.ts
git commit -m "utils: pad MermaidGraphOptions call with empty field_arrows"
```

---

## Task 10: Settings UI — per-field arrow dropdown

**Files:**
- Modify: `src/components/settings/EdgeFieldSettings.svelte`

- [ ] **Step 1: Import the arrow type list**

At the top of `EdgeFieldSettings.svelte` (in the `<script>`), add to the existing settings import:

```ts
	import {
		EdgeField,
		EdgeFieldGroup,
		MERMAID_ARROW_TYPES,
		type MermaidArrowType,
	} from "src/interfaces/settings";
```

(If `EdgeField`/`EdgeFieldGroup` are already imported with a different statement shape, add only the two new symbols.)

- [ ] **Step 2: Add a `set_arrow` action**

In the same `<script>` block, locate the `actions.fields` object (which has `remove`, `rename`, `scroll_to`, etc.). Add a new method:

```ts
			set_arrow: (edge_field: EdgeField, value: string) => {
				const next = settings.edge_fields.map((f) =>
					f.label === edge_field.label
						? {
								...f,
								mermaid_arrow:
									value === ""
										? undefined
										: (value as MermaidArrowType),
							}
						: f,
				);
				settings.edge_fields = next;
				plugin.saveSettings();
				plugin.refreshViews();
			},
```

(Match the surrounding `plugin.saveSettings()` / `plugin.refreshViews()` calls used by `rename`/`remove`. If the local pattern is different, mirror it exactly.)

- [ ] **Step 3: Render the dropdown next to the field label**

Inside the `{#each settings.edge_fields ...}` block, find the row with the label `<input>` and the remove `X` button (around lines 366–382). Right after the remove button's closing `</button>`, insert:

```svelte
						<select
							class="dropdown"
							title="Mermaid arrow shape for this field"
							value={field.mermaid_arrow ?? ""}
							onchange={(e) =>
								actions.fields.set_arrow(
									field,
									e.currentTarget.value,
								)}
						>
							<option value="">Default arrow</option>
							{#each MERMAID_ARROW_TYPES as arrow}
								<option value={arrow}>{arrow}</option>
							{/each}
						</select>
```

- [ ] **Step 4: Build**

Run: `bun run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/EdgeFieldSettings.svelte
git commit -m "settings UI: per-field mermaid arrow dropdown"
```

---

## Task 11: Manual install & smoke test

**Files:** none (host-side only)

- [ ] **Step 1: Locate the user's vault**

Ask the user (or read from `~/Library/Application Support/obsidian/obsidian.json` on macOS) for the vault path that has Breadcrumbs installed. Set:

```bash
VAULT="/path/to/the/vault"
```

- [ ] **Step 2: Copy the build artifacts**

```bash
cp main.js manifest.json styles.css "$VAULT/.obsidian/plugins/breadcrumbs/"
```

Expected: three files copied; no errors.

- [ ] **Step 3: Reload Obsidian**

In Obsidian: Cmd/Ctrl+R, or disable+enable the Breadcrumbs plugin.

- [ ] **Step 4: Manual verification checklist**

- Settings → Breadcrumbs → Edge Fields: each field has a new "Default arrow / `-->` / `-.->` / ..." dropdown.
- Set the `same` field to `==>`. Open the page (`!!Tree`) that renders the Mermaid view.
- The `same` edges render as thick arrows (`==>`).
- The `down` edges still render with the previous default arrow.
- The `same` edges are no longer collapsed with their reverse partner (now two separate edges instead of one bidirectional line).
- Reset the `same` dropdown to `Default arrow`. Behavior reverts to current.

- [ ] **Step 5: Final commit (if anything was tweaked during smoke test)**

```bash
git status
# if clean — nothing to commit
# otherwise:
git add -p
git commit -m "fix: tweaks from manual smoke test"
```

---

## Notes for the executor

- Run `bun run wasm:dev` after **every** change to `wasm/src/*.rs`. The TS layer is bound to the generated `wasm/pkg/` artifacts.
- If `wasm-pack` is missing, install with `cargo install wasm-pack`.
- The plan deliberately keeps the regression test (`test_default_config`) untouched. Any output drift there is a real bug.
- Keep commits small and named per the messages above to make `git log` and any upstream PR diff readable.
