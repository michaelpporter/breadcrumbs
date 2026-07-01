# CONTEXT — domain & architecture glossary

Shared vocabulary for Breadcrumbs. Names good seams so architecture reviews
and future work talk about the same things. Architecture terms (module,
interface, depth, seam, locality, leverage) follow the `codebase-design`
vocabulary.

---

## View settings sync

**The seam:** `useViewSettings` (`src/stores/use_view_settings.svelte.ts`).

A Breadcrumbs view (`TreeView`, `Matrix`, `TrailView`) renders editable
controls bound to *its slice* of `plugin.settings`. It cannot `bind:value`
directly to the global settings, so each view keeps a **local `$state`
mirror** of its slice and two effects keep the mirror and the global store
in sync:

- **writeback** — user edits the mirror → push to `plugin.settings` → debounced save
- **resync** — the global slice changes → pull back into the mirror

The naïve wiring is an **infinite loop** (`effect_update_depth_exceeded`,
the crash PR #685 fixed): writeback depends on the mirror *and* writes the
global store, which can schedule effects that write the mirror again.
`untrack()` cuts the cycle — the writeback may *depend on* the mirror (read,
tracked) but its writes to `plugin.settings` are wrapped in `untrack` so they
create no new reactive dependency.

**The invariant** (load-bearing — do not split or weaken):
1. the global write happens inside `untrack`, so the write phase is
   reactivity-inert;
2. the mirror is seeded once and resynced **in place** (`Object.assign`), never
   reassigned — a returned proxy must stay the same object reference;
3. the debounced save is **skipped on first run** (mount is not a user edit).

`useViewSettings` is the **deep module** that owns this whole invariant behind
a tiny interface: callers supply only *where the slice lives* (`read`/`write`
accessors); the helper owns all the *when/how* (the `untrack` boundaries, the
resync, the save policy). Before it existed, this invariant was hand-copied
across three views and had drifted (dead first-mount flags, save inside vs.
outside `untrack`) — the friction that motivated the seam.

> Not to be confused with **settings panels** (`src/settings/`), which bind
> *directly* to `plugin.settings` and call `refreshViews()`. Panels and views
> have different write cadences; only views need the mirror.

---

## Settings commit policy

`BreadcrumbsPlugin.commitSettings(policy)` (pure core `commit_setting` in
`src/settings/commit.ts`) is the single follow-up a settings-panel callback runs
after writing a field. The policy names *what the setting affects*:
`"graph"` (rebuild + save), `"views"` (refresh + save), `"none"` (save only).
Centralised so the ~140 callbacks can't drift on which effect to pair with save.

---

## Graph traversal facade

`src/graph/traversal.ts` — the TS seam over the WASM traversal lifecycle, so
call sites stop hand-assembling the positional `TraversalOptions` (magic
`max_traversal_count`, the `separate_edges` flag) + sorter:

- `build_traversal_options(opts)` — named form of the positional constructor.
- `traverse(graph, opts)` — `build` + postprocess + `rec_traverse_and_process`,
  returns the **live** `FlatTraversalResult` (caller owns `.free()`).
- `with_traversal(graph, opts, fn)` — scoped variant that frees after `fn`, for
  one-shot consumers (commands).
- `sort_traversal(graph, result, sort)` — re-sort helper; fully hides
  `create_edge_sorter`.

The view-side `.free()` lifecycle is owned by **`useOwned`** (see below), so
consumers no longer hand-write the free `$effect`.

**Bug the facade surfaced and fixed:** TreeView fed `separateEdges:
settings.merge_fields` while everyone else fed `!merge_fields`. Per the engine
(`separate_edges = true` ⇒ branches kept to one edge type ⇒ fields *separated*),
the correct mapping is `!merge_fields`, so TreeView's merge-fields toggle had
been inverted. The named option made the inversion obvious at the call site;
now `!settings.merge_fields` everywhere.

---

## Tree entry-path resolution

`resolve_tree_entry_paths` (`src/graph/resolve_tree_entry_paths.ts`) — a pure
function, sibling to `walk_to_roots`, that decides which node(s) `TreeView`
renders from: **locked path → find-root walk → active file**, in that
precedence, falling through when a preferred option isn't available (e.g. a
locked path no longer in the graph, or `find_root` with no field labels
configured).

Before this seam, the precedence tree lived inline in TreeView's
`entry_paths` `$derived.by`, fused with Svelte's reactive tracking — the
policy (which branch wins, and the fallthrough behavior) had no test surface
of its own; verifying it meant mounting the component. The component's
`entry_paths` is now a one-line call; the branch logic is unit-tested
directly (9 cases: guards, each branch, precedence, fallthroughs).

---

## Codeblock source resolution

`resolve_codeblock_source` + `validate_codeblock_entry`
(`src/codeblocks/resolve_codeblock_source.ts`) — the `source_path`/`max_depth`
arithmetic and `has_node` validation shared by all three codeblock types
(Tree, Mermaid, Markmap): `start-note` override → the codeblock's containing
file → the active file; `depth[1] === Infinity` falls back to the caller's
own default (each type has a different one).

`try_dataview_from_query` (`src/codeblocks/dataview_from.ts`) — a safe
wrapper around `dataview_from_query` that swallows parse errors and always
re-queries live. Markmap always did this (it depended on the external
Dataview plugin's async-ready index before it had its own `dataview_from.ts`,
so live-querying was never optional); Tree and Mermaid used to read a `from`
match precomputed once at `CodeblockMDRC.onload()` time and never refreshed
it — so a `GRAPH_UPDATE`-triggered `update()` could act on a stale match.
Both now call `try_dataview_from_query` on every update.

**`from`'s two semantics stay separate, deliberately:** Tree/Mermaid treat a
`from` match as a *restrict-filter* — they always enter the traversal from
`source_path`, and only use the match to bound which nodes may appear
(`dataviewFrom`). Markmap treats a match as *replacing the entry point* — it
walks from every matched path instead of the active file, for a
map-of-everything-matching-this-query view. This is not drift from one
design: Markmap's shape predates Tree/Mermaid's `from` support and has a
different origin (the external-Dataview-plugin era). Don't unify them without
a deliberate decision — that's a behavior change to `from`, not a refactor.

**Bug the extraction surfaced and fixed:** Mermaid resolved `source_path`
honoring `start-note`, but its traversal entry was hardcoded to
`[file_path]` — so `start-note` never actually moved a mermaid codeblock's
entry point. It now enters from the resolved `source_path`, like Tree and
Markmap always have.

---

## Edge-field resolution: read_edge_field vs. validate_optional_edge_field

`read_edge_field` (`src/graph/builders/explicit/read_edge_field.ts`) is the
seam for a builder's *primary* field: per-note `BC-<source>-field` override,
falling back to a settings default when the source has one
(`EDGE_FIELD_SLOTS[source].primary`), invalid → bail the note out entirely.
`FieldSource` now includes `traverse_note` (folded in — it had re-implemented
the exact same shape via a direct `validate_edge_field` call).

`validate_optional_edge_field` (`src/graph/builders/explicit/validate_field.ts`)
is the seam for a builder's *secondary*, optional field (a sibling/neighbour
field): same override-then-default merge, but unset stays unset
(`succ(undefined)`) rather than bailing the note out — only a
present-but-invalid value is an error. Used by `tag_note`'s `sibling_field`
and `list_note`'s `neighbour_field`.

**Not part of either seam, checked and ruled out during the 2026-07-01
review:**
- `date_note` — no per-note override at all; its fields (`default_field`,
  `next_field`, `up_field`) are pure settings validation. A different
  mechanism, not a `read_edge_field` bypass.
- `typed_link` — scans *every* frontmatter/inline-field key against the full
  set of registered field labels (Set membership), not a single
  override-with-fallback. Also a different mechanism.
- `dendron_note`/`johnny_decimal_note`'s `sibling_field` — settings-only, no
  per-note override, no validation call. A third, simpler shape; don't route
  it through `validate_optional_edge_field` without adding the missing
  validation as a deliberate decision, not an incidental side effect of a
  refactor.

---

## `dataview_from_query` — parser/evaluator fusion, deliberately not split

`src/codeblocks/dataview_from.ts` parses a Dataview-style `from` query
(`#tag`, `"folder"`, `[[link]]`, `AND`/`OR`/`NOT`) straight into `FilePredicate`
closures rather than an intermediate AST — parsing and evaluation are one
step. Flagged in the 2026-06-24 review as a shallow-abstraction candidate;
checked during the 2026-07-01 follow-up and **not split**: it has exactly one
real consumer (the codeblock `from` field, called identically from
`index.ts` and all three codeblock components for the same feature) — no
second adapter to justify the seam. Don't re-propose the AST split unless a
genuinely distinct second consumer shows up.

Also traced: no branch in `parse_atom`/`parse_and`/`parse_or`/`consume_keyword`
can throw — an unrecognised atom returns a false-matching predicate, not an
exception. The `try`/`catch` in `try_dataview_from_query` and the parse-time
validation in `codeblocks/index.ts` guard against an exception this grammar
structurally can't produce today. Harmless as-is; know this before "fixing"
error handling here.

Test coverage added instead (`tests/codeblocks/dataview_from.test.ts`) — the
file had none before.

---

## Owned WASM lifecycle (`useOwned`)

`src/stores/use_owned.svelte.ts` — a rune helper that owns a derived WASM
object's `.free()`: re-creates it when its reactive inputs change, frees the
superseded handle, and frees the last on unmount. Read the value via `.current`.

```ts
const owned = useOwned(() => to_node_stringify_options(plugin.settings, opts));
let node_stringify_options = $derived(owned.current);
```

Replaces the `$effect(() => { const o = x; return () => o.free(); })` block that
was copy-pasted across 8 components (for `node_stringify_options` and TreeView's
traversal result). The `$derived(owned.current)` alias keeps the existing value
name so templates/props are untouched. The **imperative** consumers that drive
their own WASM lifecycle outside reactivity (CodeblockTree's `data` via
`update()`/`onDestroy`) keep hand-managing it — `useOwned` is for the reactive
derive sites.
