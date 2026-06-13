# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Features

* List Notes can be scoped to a single heading with `BC-list-note-section: "<heading>"` in frontmatter. Only list items under that heading become edges; the section runs to the next equal-or-higher-level heading (or end of file), so nested sub-headings stay inside it. Without the field, the whole note is read as before ([#363](https://github.com/michaelpporter/breadcrumbs/discussions/363)).
* New **Excluded folders** setting — notes inside the listed folders are skipped when generating edges (one folder path per line). A note is excluded if its path equals, or is inside, a listed folder ([#358](https://github.com/michaelpporter/breadcrumbs/discussions/358)).
* List Notes can exempt individual links with a `BC-list-note-exclude` frontmatter list of wikilinks. Any listed link stays in the note's list but does not become a child edge — useful for reference/see-also links ([#365](https://github.com/michaelpporter/breadcrumbs/discussions/365)).

## 4.X

### [4.15.2](https://github.com/michaelpporter/breadcrumbs/compare/4.15.1...4.15.2) (2026-06-11)

### Fixed

* Settings sub-pages (Edge fields, Tag notes, and every other section) rendered blank — title only, no controls — on Obsidian 1.13.1. Each sub-page now renders through the documented `SettingPage` page factory instead of the previous workaround ([#713](https://github.com/michaelpporter/breadcrumbs/issues/713)).

### [4.15.1](https://github.com/michaelpporter/breadcrumbs/compare/4.15.0...4.15.1) (2026-06-09)

### Fixed

* Detect Dataview inline fields wrapped in parentheses or brackets — `(down:: [[Note]])` and `[down:: [[Note]]]` now build edges, matching how Dataview itself parses these forms ([#710](https://github.com/michaelpporter/breadcrumbs/issues/710)).

### Build

- Bump JS dev dependencies (svelte-check 4.6, svelte 5.56.3, typescript-eslint 8.60.1, @types/node 25.9.2).
- Add `svelte.config.mjs` so `svelte-check` 4.6 reads the Svelte config directly instead of probing `vite.config.mjs` (which has no `@sveltejs/vite-plugin-svelte`, since this project builds via `esbuild-svelte`).

### [4.15.0](https://github.com/michaelpporter/breadcrumbs/compare/4.14.2...4.15.0) (2026-06-07)

**Breaking:** Breadcrumbs now requires Obsidian 1.13.0 or later. If you're still on Obsidian 1.12, stay on 4.14.2 — the 1.12 line is maintained on the `1.12-compat` branch.

### ⚠ BREAKING CHANGES

* Require Obsidian 1.13.0. The imperative `display()` settings fallback for older app versions has been removed; the settings tab now renders entirely through the declarative `getSettingDefinitions()` API, so every section appears in global settings search and supports page-based navigation.

### Features

* Settings tab now shows a "waypoints" icon next to its name in the settings list and global search.
* Reordered settings sections — Views lead with Page (the in-note views) before the sidebar views; Edge sources are grouped as content-based (tag, list), then filename-derived (dendron, johnny.decimal, date, regex), then query-based (traverse).
* Added a short description under every settings entry so each section's purpose is clear at a glance.

### Documentation

* Expanded the Security & Privacy section: documented the bundled-dependency `fetch()` matches (KaTeX lexer method, markmap's CDN asset loader), the exported WASM linear memory, and the single wasm-bindgen `new Function()` (no `eval`).

### Build

* Stopped attaching `manifest-beta.json` to GitHub releases — Obsidian only downloads `main.js`/`manifest.json`/`styles.css`, and BRAT reads `manifest-beta.json` from the repo root.

### [4.14.2](https://github.com/michaelpporter/breadcrumbs/compare/4.14.1...4.14.2) (2026-06-05)

Internal maintenance release — no user-facing behavior changes.

### Performance

* Debounce side/page view setting writes (Tree View, Matrix, Trail View) so rapid control changes coalesce into a single save instead of hitting disk on every change.
* Index date-note period lookups with a basename map, replacing nested linear scans (O(n·m) → O(n)) during graph rebuilds.
* Debounce the opt-in "rebuild graph on layout change" trigger so it no longer rebuilds on every editor cursor move or scroll.

### Refactors

* Extract a shared `validate_edge_field` helper used across all explicit edge builders.
* Replace untyped `any` casts on Obsidian/Dataview internals with typed shapes.
* Remove dead code, including the unused Dataview file-source path. No effect on the `dataview-from` codeblock feature.

### Tests

* Add unit tests for the date, list, folder, dataview, and traverse note builders.

### Chores

* Address Obsidian community plugin scorecard lint findings, including scoping the lint-suppression header in the generated WASM type declarations.
* Update funding links (GitHub Sponsors, Buy Me a Coffee).

### [4.14.1](https://github.com/michaelpporter/breadcrumbs/compare/4.14.0...4.14.1) (2026-06-03)

### Bug Fixes

* **Tree View multi-parent** — a note with multiple parents now appears under each parent in the Tree View. Previously, a shared `visited` set across all traversal branches caused the node to appear only once (under whichever parent was processed first). Replaced with a per-branch `ancestors` set so cycle detection blocks only literal ancestors on the current path, not siblings or diamond nodes.

### [4.14.0](https://github.com/michaelpporter/breadcrumbs/compare/4.13.11...4.14.0) (2026-06-02)

### Features

* **`self_is_sibling` implied relation** — new setting in Edge Fields → Self group. Fields listed there automatically generate an implied self-loop edge for every note that participates in an edge of that type (either as source or target). Defaults to `["same"]`, restoring the classic Breadcrumbs behaviour where a note appears in its own sibling list. Configurable via the tag-chip selector in the Edge Fields settings page.

### Bug Fixes

* **`folder_note` builder** — `BC-folder-note-field` now creates edges to `.canvas` and `.base` files, not just `.md` files. Extension filter now matches the same set used when collecting vault nodes.
* **`list_note` builder** — no longer requires Dataview. Rebuilt using Obsidian's native `metadataCache.listItems` + `metadataCache.links` + `vault.cachedRead`; field overrides and neighbour-field edges preserved.
* **`typed_link` builder** — added a native second pass for body inline fields (`field:: [[value]]` syntax). Previously required Dataview; now resolved from `cache.links` + line content, covering self-references and inline-only fields.
* **`dataview-from:` codeblock option** — no longer requires Dataview. Replaced with a native FROM-clause parser supporting `#tag`, `"folder"`, `[[link]]`, and `AND`/`OR`/`NOT` combinations (`src/codeblocks/dataview_from.ts`).
* **Markmap codeblock** — live re-query on each update now uses the native FROM parser instead of calling the Dataview API directly; restores markmap rendering when Dataview is not installed.

### Chores

* **Removed `obsidian-dataview` dev dependency** — plugin no longer imports from the `obsidian-dataview` package. Dataview API is accessed at runtime via `app.plugins.plugins["dataview"]?.api` (optional; `dataview_note` builder still uses it when installed). Eliminates all npm audit findings (was 12 vulns via transitive svelte 3.x in `obsidian-calendar-ui`).

### [4.13.11](https://github.com/michaelpporter/breadcrumbs/compare/4.13.10...4.13.11) (2026-06-02)

### Chores

* **Dependency updates** — bumped `@types/obsidian-typings` alias from `obsidian-typings@^3.16.6` to `^6.13.0`, matching the runtime dep. Added `package-lock.json` for npm audit compatibility. Reduced npm audit findings from 12 to 3 (remaining 3 are SSR-only Svelte vulns inside `obsidian-calendar-ui`, unfixable without an upstream `obsidian-dataview` fix).

### [4.13.10](https://github.com/michaelpporter/breadcrumbs/compare/4.13.9...4.13.10) (2026-06-02)

### Bug Fixes

* **`folder_note` builder** — `BC-folder-note-field` now creates edges to `.canvas` and `.base` files inside a folder, not just `.md` files. The extension filter is now driven by the same `NON_MD_EXTENSIONS` set used when collecting vault files for the graph.

### [4.13.9](https://github.com/michaelpporter/breadcrumbs/compare/4.13.8...4.13.9) (2026-06-02)

### Chores

* **Dependency updates** — bumped all outdated dev dependencies: `npm-run-all2` 7 → 9, `prettier-plugin-svelte` 3 → 4, `prettier-plugin-tailwindcss` 0.6 → 0.8, `obsidian-typings` 3 → 6, plus minor/patch bumps for `vitest`, `svelte-check`, and `svelte-preprocess`.

### Tests

* **`typed_link` builder** — added 18 test cases covering the Obsidian `frontmatterLinks` branch (unresolved links, resolved links, list-type keys, multiple edges) and the Dataview branch (Link objects, markdown link strings, invalid values, dedup logic). Extended test helpers with `frontmatterLinks` support in `mock_file` and `resolve_link`/`fileManager` in `make_plugin`.

### [4.13.8](https://github.com/michaelpporter/breadcrumbs/compare/4.13.7...4.13.8) (2026-06-01)

### Features

* **Date Notes quick setup** — a "Set up…" button at the top of the Date Notes settings section opens a modal for one-click hierarchy configuration. Choose which period levels to enable (week / month / quarter / year), opt in to period-specific edge fields (`next_week` / `prev_week`, `next_month` / `prev_month`, etc. — created automatically and added to the `nexts` / `prevs` field groups), and pick the week start day. On confirm, the modal enables the selected periods, bumps the `up` / `down` transitive-rule rounds to 3 for full daily → week → month → quarter → year chaining, and adds `next ↔ prev` reversal rules for each period-specific field. Modal choices are remembered across opens.
* **`week_start` setting** — new "Week starts on" option (Monday / Sunday) in Date Notes settings and in the quick-setup modal. When set to Sunday, daily notes that fall on a Sunday are shifted forward one day before the ISO week lookup, so they map to the _following_ week's note — matching US-style week file numbering. Available in both the quick-setup modal and the main Date Notes settings panel.

### [4.13.7](https://github.com/michaelpporter/breadcrumbs/compare/4.13.6...4.13.7) (2026-05-31)

### Chores

* **ESLint** — integrated `eslint-plugin-obsidianmd` recommended config. Fixed plugin registration conflict (`@typescript-eslint` was being registered twice — once by obsidianmd's config and once by our own); now both `import` and `@typescript-eslint` plugins are stripped from obsidianmd's spread before our own registrations. Resolved all resulting warnings: `Array<T>` → `T[]` in `traverse_note.ts`, removed unused `Result` import in `result.ts`, dropped unnecessary `as any` cast in `SettingsTab`, and suppressed `no-deprecated` on the intentional `this.display()` fallback call that supports Obsidian < 1.13.

### [4.13.6](https://github.com/michaelpporter/breadcrumbs/compare/4.13.5...4.13.6) (2026-05-31)

### Bug Fixes

* **Pretty Properties cover image click conflict** — the `.BC-page-views` container now sets `pointer-events: none` on itself and restores `pointer-events: auto` on its children, so the empty wrapper never intercepts clicks on underlying plugin elements (e.g. the Pretty Properties cover image). When both Trail and Prev/Next views are disabled, the container is no longer inserted into the DOM at all. TrailView also no longer renders a bare `<div>` wrapper when it has no paths to display, eliminating invisible empty nodes that could contribute to the interference (closes [#704](https://github.com/michaelpporter/breadcrumbs/issues/704)).

### [4.13.5](https://github.com/michaelpporter/breadcrumbs/compare/4.13.4...4.13.5) (2026-05-31)

### Bug Fixes

* **`link_kind: "markdown"` path format** — list-index and codeblock outputs now use `app.fileManager.generateMarkdownLink`, so vault link-format settings (shortest path / relative / absolute) are respected. Unresolved ghost-node paths fall back to the previous manual form.
* **`deep_merge_objects` null fields** — settings keys stored as `null` (e.g. from older vault data) now correctly fall back to their defaults instead of being silently retained as `null`, which could previously cause a `TypeError` when the value was expected to be an object.
* **Dataview-inline drop-crumb deduplication** — running "Drop crumbs" more than once no longer appends duplicate `field::` lines. Existing inline fields are found by regex, merged, and deduped in-place; only genuinely new fields are appended.

### Improvements

* **Codeblock empty state** — when a `breadcrumbs` codeblock finds no paths, the empty-state message now names the fields that were searched (e.g. "No paths found for field(s): up, down"), making misconfigured field names easier to spot.
* **"Create list index" command** — the command is now hidden from the command palette when no file is active, instead of opening a modal that immediately closes with a notice.
* **TrailView controls** — removed redundant `onchange` save calls from the format/selection dropdowns; the existing `$effect` writeback already persists every settings change.

### [4.13.4](https://github.com/michaelpporter/breadcrumbs/compare/4.13.3...4.13.4) (2026-05-31)

### Bug Fixes

* **Graph rebuild on note save** — replaced the blanket 10 s debounce with a `_pending_rebuild` flag that fires `rebuildGraph` only after `metadataCache:resolved`, so the graph updates promptly when the cache finishes processing a save rather than waiting an arbitrary delay.

### Build

* **ES2022 targets** — TypeScript `target` and esbuild `target` both updated from ES6/ES2020 to ES2022, matching the minimum Electron version Obsidian ships.
* **tsconfig aligned with Obsidian Svelte docs** — added `verbatimModuleSyntax`, `skipLibCheck`, and `**/*.svelte` to `include`; trimmed redundant `lib` entries (ES5/ES6/ES7) superseded by ES2022; added `--tsconfig` flag to `svelte-check` script.

### [4.13.3](https://github.com/michaelpporter/breadcrumbs/compare/4.13.2...4.13.3) (2026-05-31)

### Bug Fixes

* **`type: markmap` — dark mode text** — markmap node labels now use `var(--text-normal)` so they are readable in both light and dark Obsidian themes.

### [4.13.2](https://github.com/michaelpporter/breadcrumbs/compare/4.13.1...4.13.2) (2026-05-30)

### Features

* **`type: markmap` — native interactive SVG rendering** — markmap graphs are now rendered directly via the bundled `markmap-lib` + `markmap-view` libraries. No external plugin (markmap-obsidian) required. The SVG supports zoom, pan, and node collapse out of the box. Clicking any node text navigates to the corresponding note; Ctrl/Cmd+click opens in a new pane.

### Bug Fixes

* **`type: markmap` — wikilink display** — `[[path|alias]]` wikilinks in node labels are now stripped to clean display names (alias or basename) before rendering.
* **`type: markmap` — WASM revision mismatch** — fixed an illegal `$state` mutation inside `$derived.by()` that caused `"Edge was created in revision N, but current revision is N+1"` errors on graph updates. Now uses a single pure derivation. Old `FlatTraversalResult` is freed after state is updated so reactive reads always see valid WASM memory.

### [4.13.1](https://github.com/michaelpporter/breadcrumbs/compare/4.13.0...4.13.1) (2026-05-30)

### Bug Fixes

* **`type: markmap` with `dataview-from`** — the markmap now uses the Dataview query results as traversal entry nodes instead of the codeblock's own note, and suppresses the spurious `# [[current-note]]` root heading. The Dataview query is re-evaluated on every update so it is never stale from plugin load time. Fixes notes where the codeblock has no direct edges into the queried scope.
* **`type: markmap` render error** — `CodeblockMDRC` (a `MarkdownRenderChild`) is now threaded as the parent component to `MarkdownRenderer.render()`. This gives the markmap-obsidian codeblock processor the MarkdownView context it needs, fixing `"Couldn't find MarkdownView containing code block"` (issue [#703](https://github.com/michaelpporter/breadcrumbs/issues/703)).

### [4.13.0](https://github.com/michaelpporter/breadcrumbs/compare/4.12.3...4.13.0) (2026-05-30)

### Features

* **Obsidian 1.13 declarative settings** — `BreadcrumbsSettingTab` now implements `getSettingDefinitions()`, enabling page-based navigation, global settings search, and proper `hide()` lifecycle. All sections (Edge fields, Implied relations, Edge sources, Views, Commands, Suggestors, Debug) are navigable pages. The existing `display()` is retained as a fallback for Obsidian < 1.13. Settings search navigation uses an `items`-based sentinel row pattern — the `page` factory approach silently skipped `display()` on search navigation in Obsidian 1.13.
* **Traverse note builder** — a new explicit edge source. Annotate any note with `BC-traverse-note-field: <field>` to make it a traversal root. Breadcrumbs performs a DFS walk of the Obsidian vault link graph starting from that note, generating one edge per parent→child hop.
* **Compact edge fields UI** — groups row merged inline with the field row; the "Add to Group" dropdown replaced with a `+` button that opens an Obsidian context menu listing available groups. Spacing tightened to an `<hr>` separator between items. Move-up/move-down arrow buttons added for keyboard-accessible reordering.

### Bug Fixes

* **Settings search navigation** — sub-pages now load correctly when reached via Obsidian 1.13's global settings search.
* **`Plugin.settings` accessor conflict** — Obsidian 1.13.0 introduced `settings?: unknown` on the base `Plugin` class. `BreadcrumbsPlugin` replaced the `get`/`set` accessor with `declare settings: BreadcrumbsSettings`.

### Chores

* **Upgrade obsidian dev dependency to 1.13.0** — picks up `SettingPage`, `SettingDefinitionItem`, and related declarative-settings types.
* **Add `workflow_dispatch` trigger** to release workflow.
* **Correct maintainer takeover date** in README to May 2026.

### [4.13.0-beta.4](https://github.com/michaelpporter/breadcrumbs/compare/4.13.0-beta.3...4.13.0-beta.4) (2026-05-30)

### Bug Fixes

* **Settings search navigation** — sub-pages (Edge fields, Transitive, all edge sources, views, commands, suggestors) now load correctly when reached via Obsidian 1.13's global settings search. Root cause: Obsidian skips `display()` on `SettingPage` subclasses returned from a `page` factory when navigating from search results. All page definitions now use `items` with a sentinel `render` row (matching the pattern used by notebook-navigator) so search navigation and direct navigation both work.

### [4.13.0-beta.3](https://github.com/michaelpporter/breadcrumbs/compare/4.13.0-beta.2...4.13.0-beta.3) (2026-05-29)

### Features

* **Traverse note builder** — a new explicit edge source. Annotate any note with `BC-traverse-note-field: <field>` to make it a traversal root. Breadcrumbs performs a DFS walk of the Obsidian vault link graph (resolved wikilinks) starting from that note, generating one edge per parent→child hop in the traversal tree. No special frontmatter required on linked notes.

### [4.13.0-beta.2](https://github.com/michaelpporter/breadcrumbs/compare/4.13.0-beta.1...4.13.0-beta.2) (2026-05-29)

### Features

* **Compact edge fields UI** — groups row merged inline with the field row; the "Add to Group" dropdown replaced with a `+` button that opens an Obsidian context menu listing available groups. Spacing tightened to an `<hr>` separator between items. Move-up/move-down arrow buttons added for keyboard-accessible reordering (splice-based, correct when the name filter is active).

### [4.13.0-beta.1](https://github.com/michaelpporter/breadcrumbs/compare/4.12.3...4.13.0-beta.1) (2026-05-29)

### Features

* **Obsidian 1.13 declarative settings** — `BreadcrumbsSettingTab` now implements `getSettingDefinitions()`, enabling page-based navigation, global settings search, and proper `hide()` lifecycle on Obsidian 1.12.3+. All sections (Edge fields, Implied relations, Edge sources, Views, Commands, Suggestors, Debug) are surfaced as navigable pages. The existing imperative `display()` is retained as a fallback for Obsidian versions below 1.13.0.

### Chores

* **Upgrade obsidian dev dependency to 1.13.0** — picks up new `SettingPage`, `SettingDefinitionItem`, and related declarative-settings types.
* **Fix `Plugin.settings` accessor conflict** — Obsidian 1.13.0 introduces `settings?: unknown` on the base `Plugin` class. `BreadcrumbsPlugin` replaced the `get`/`set` accessor with `declare settings: BreadcrumbsSettings`; `loadSettings()` now calls `reactive_settings.init()` explicitly to keep the Svelte 5 reactive store in sync.
* **Update author in `package.json`** to `michaelpporter`.

### CI

* **Add `workflow_dispatch` trigger** to release workflow.

### Documentation

* **Correct maintainer takeover date** in README to May 2026.

### [4.12.3](https://github.com/michaelpporter/breadcrumbs/compare/4.12.2...4.12.3) (2026-05-28)

### Chores

* **Update GitHub repository references** — all in-repo links (manifests, CONTRIBUTING, SettingsTab, AGENTS) now point to the new location at `michaelpporter/breadcrumbs` following the project transfer.

### [4.12.2](https://github.com/SkepticMystic/breadcrumbs/compare/4.12.1...4.12.2) (2026-05-27)

### Bug Fixes

* **Johnny.Decimal area→category edges now resolve** — categories like `11 Finance` were not linked to their area `10 Life Admin` because the builder only used delimiter-splitting to find parents. Splitting `"11"` by `"."` yields no parent. Area parents are now derived numerically (`floor(n/10)*10`), so `11 → 10`, `21 → 20`, etc. Area notes (exact multiples of 10) remain top-level with no parent.

### Build

* **Expose `GCEdgeData` field accessors in WASM bindings** — `source`, `target`, `edge_type`, and `edge_source` are now exposed as `#[wasm_bindgen(getter)]` properties, enabling type-safe access in TypeScript tests without casting.
* **Fix TypeScript build errors in test suite** — `succ`/`fail` now return concrete types so `.data`/`.error` are accessible without discriminant narrowing; builder tests updated to `async`/`await` to satisfy the `MaybePromise<EdgeBuilderResults>` return type.

### [4.12.1](https://github.com/SkepticMystic/breadcrumbs/compare/4.12.0...4.12.1) (2026-05-26)

### Bug Fixes

* **Free WASM objects to prevent long-session memory leaks** — all components that create `NodeStringifyOptions`, `FlatTraversalResult`, `TraversalResult`, `PathList`, `Path[]`, and `MermaidGraphData` now explicitly free them via `$effect` cleanup and `onDestroy`. Addresses a reported 16 GB memory growth over long sessions ([#698](https://github.com/SkepticMystic/breadcrumbs/issues/698)).
* **Johnny.Decimal notes no longer link to ghost parent nodes** — the Dendron builder was splitting any dot-containing basename (e.g. `12.01 GP Records`) and creating phantom nodes like `12.md`. Files whose first dot-segment is all digits are now skipped — they belong to the Johnny.Decimal builder.

### CI

* **Remove Rust/WASM toolchain from release workflow** — `wasm/pkg/` is committed to the repo; release builds only need Bun. Drops Rust install, wasm-pack install, `wasm:test`, and `wasm:build` from the release job, significantly reducing release CI time.

### [4.12.0](https://github.com/SkepticMystic/breadcrumbs/compare/4.11.10...4.12.0) (2026-05-26)

### Chores

* **Add `eslint-plugin-obsidianmd`** — integrates Obsidian's official ESLint plugin (v0.3.0) into the lint pipeline. Enforces plugin guidelines on command IDs, settings headings, UI sentence case, vault APIs, and more. ESLint now errors at max 0 warnings.
* **Strip plugin-ID prefix from all command IDs** — command IDs previously included the `breadcrumbs:` prefix (e.g. `breadcrumbs:rebuild-graph`), causing Obsidian to register them as `breadcrumbs:breadcrumbs:rebuild-graph`. All IDs are now unprefixed per Obsidian guidelines. **⚠ Breaking for users with custom keybindings** — re-bind any affected commands after updating.
* **Remove `confirm()` from freeze-to-vault command** — replaced the browser `confirm()` dialog with the existing `GenericModal` prompt (which already requires typing `FREEZE TO VAULT` to confirm). `confirm()` is not permitted in Obsidian plugins.
* **Sentence case audit** — fix casing in several UI strings: `'Show/Copy graph stats'` → `'Show/copy graph stats'`, `'Create List Index'` → `'Create list index'`, `'Build & Copy to Clipboard'` → `'Build & copy to clipboard'`, `'Enable Previous/Next view'` / `'Previous/Next'` → lowercase, `'No active markdown view'` → `'No active Markdown view'`.
* **Zod `.passthrough()` → `.loose()`** — `.passthrough()` is deprecated in Zod v4; updated codeblock schema to use `.loose()`.
* **AGENTS.md** — replace generic sample-plugin template with breadcrumbs-specific guidance covering bun, Svelte 5 runes, WASM boundary, edge builders, settings migration, and agent do/don't rules.

### [4.11.10](https://github.com/SkepticMystic/breadcrumbs/compare/4.11.9...4.11.10) (2026-05-25)

### Bug Fixes

* **Trail view not updating on note switch** — the `layout-change` early-return optimisation (introduced in 4.11.7 for [#698](https://github.com/SkepticMystic/breadcrumbs/issues/698)) skipped remounting when editor mode and sticky setting were unchanged, but did not check which file was open. Switching notes in the same tab left the Trail/Prev-Next page view showing the previous note's breadcrumbs. `file_path` is now included in the skip condition; CM6 cursor/scroll events still short-circuit as before ([#700](https://github.com/SkepticMystic/breadcrumbs/issues/700)).

### Build

* **Commit wasm/pkg artifacts; drop `wasm:build` from CI** — `wasm/pkg` was re-gitignored in 4.11.9-beta.1, breaking the Obsidian community build verifier (clean env, no Rust toolchain). Pre-built WASM binaries are committed again; CI and Makefile no longer run `wasm:build` (`wasm:test` still runs to verify Rust logic). To update the WASM binary: run `bun run wasm:build` locally and commit the result.

### Chores

* **Plugin guideline compliance** — replace `innerHTML` with `createEl()`/`appendText()` in date-note settings descriptions; remove leftover debug `console.log` calls from `FieldFuzzySuggestModal`.
* **CLAUDE.md** — note git-ignored files so Claude Code avoids reading generated artifacts.

### [4.11.9](https://github.com/SkepticMystic/breadcrumbs/compare/4.11.8...4.11.9) (2026-05-24)

### Build

* **Restore wasm:build in CI** — revert the 4.11.8 approach of committing `wasm/pkg` artifacts; build WASM from source in CI again. `wasm/pkg/` is back to gitignored; reproducibility ensured by the pinned `wasm-bindgen-cli 0.2.100`.
* **Remove ELECTRON_SKIP_BINARY_DOWNLOAD** — no longer needed with `--frozen-lockfile`.
* **Fix TS 6 module augmentation** — `obsidian-typings` 3.16 moved its augmentations into `.d.cts` files; TypeScript 6 does not apply module augmentations from `.d.cts` type-reference entries. Added `src/obsidian-unofficial.d.ts` with local `declare module "obsidian"` augmentations for `metadataTypeManager`, `MetadataCache.initialized`, and `MetadataCache.on("initialized")`.
* **Pin svelte-preprocess to 6.0.3** — 6.0.4 introduced a broken ESM import (missing `.js` extension on transformer sub-paths).
* **Add ES2022 to tsconfig lib** — `Array.at()` requires `es2022`; previous lib target caused CI type errors.

### Chores

* **Dependency updates** — `obsidian` → 1.12.3, `obsidian-typings` → 3.16.6, `svelte` → 5.55.9, `tailwindcss`/`@tailwindcss/cli` → 4.3.0, `zod` → 4.4.3, `vitest` → 4.1.7, `eslint` → 10.4.0, plus minor bumps to `luxon`, `lucide-svelte`, `caniuse-lite`, `baseline-browser-mapping`, and several ESLint/Svelte/TypeScript tooling packages.

### [4.11.9-beta.1](https://github.com/SkepticMystic/breadcrumbs/compare/4.11.8...4.11.9-beta.1) (2026-05-24)

### Build

* **Restore wasm:build in CI** — revert the 4.11.8 approach of committing `wasm/pkg` artifacts; build WASM from source in CI again. `wasm/pkg/` is back to gitignored; reproducibility ensured by the pinned `wasm-bindgen-cli 0.2.100`.
* **Remove ELECTRON_SKIP_BINARY_DOWNLOAD** — no longer needed with `--frozen-lockfile`.
* **Fix TS 6 module augmentation** — `obsidian-typings` 3.16 moved its augmentations into `.d.cts` files; TypeScript 6 does not apply module augmentations from `.d.cts` type-reference entries. Added `src/obsidian-unofficial.d.ts` with local `declare module "obsidian"` augmentations for `metadataTypeManager`, `MetadataCache.initialized`, and `MetadataCache.on("initialized")`.
* **Pin svelte-preprocess to 6.0.3** — 6.0.4 introduced a broken ESM import (missing `.js` extension on transformer sub-paths).

### Chores

* **Dependency updates** — `obsidian` → 1.12.3, `obsidian-typings` → 3.16.6, `svelte` → 5.55.9, `tailwindcss`/`@tailwindcss/cli` → 4.3.0, `zod` → 4.4.3, `vitest` → 4.1.7, `eslint` → 10.4.0, plus minor bumps to `luxon`, `lucide-svelte`, `caniuse-lite`, `baseline-browser-mapping`, and several ESLint/Svelte/TypeScript tooling packages.

### [4.11.8](https://github.com/SkepticMystic/breadcrumbs/compare/4.11.7...4.11.8) (2026-05-24)

### Build

* **Reproducible release builds** — restore committed `wasm/pkg` artifacts so CI and Obsidian's build verifier use the same WASM binary; remove `wasm:build` from the release workflow; pin bun to 1.3.14; use `--frozen-lockfile`. Fixes "main.js built from source does not match the release artifact".
* **Skip electron binary download in CI** — set `ELECTRON_SKIP_BINARY_DOWNLOAD=1` to prevent electron's postinstall from fetching binaries (Obsidian provides electron at runtime; we never need it installed).

### [4.11.7](https://github.com/SkepticMystic/breadcrumbs/compare/4.11.6...4.11.7) (2026-05-24)

### Bug Fixes

* **Cursor/scroll lag in source mode** — `layout-change` fires on every CM6 cursor movement and scroll tick, causing a full Svelte unmount+remount of the Trail/Prev-Next page view on each tick even when nothing had changed. The DOM thrash inside `.cm-scroller` made CM6 re-measure and skip cursor positions (visible as paragraph jumps in vim mode). Page views are now only remounted when the editor mode (source vs. preview) or the sticky setting actually changes; repeat `layout-change` firings with an already-correct mount are ignored ([#698](https://github.com/SkepticMystic/breadcrumbs/issues/698)).

### Build

* **Clean step** — `bun run build` now removes stale `main.js` and `styles.css` before rebuilding, preventing Obsidian from loading leftover artifacts.
* **Tailwind CLI resolution** — scripts now use `bunx tailwindcss` so the build works in clean environments where `tailwindcss` is not on `PATH`.

### [4.11.7-beta.1](https://github.com/SkepticMystic/breadcrumbs/compare/4.11.6...4.11.7-beta.1) (2026-05-23)

### Bug Fixes

* **Cursor/scroll lag in source mode** — `layout-change` fires on every CM6 cursor movement and scroll tick, causing a full Svelte unmount+remount of the Trail/Prev-Next page view on each tick even when nothing had changed. The DOM thrash inside `.cm-scroller` made CM6 re-measure and skip cursor positions (visible as paragraph jumps in vim mode). Page views are now only remounted when the editor mode (source vs. preview) or the sticky setting actually changes; repeat `layout-change` firings with an already-correct mount are ignored ([#698](https://github.com/SkepticMystic/breadcrumbs/issues/698)).

### [4.11.6](https://github.com/SkepticMystic/breadcrumbs/compare/4.11.5...4.11.6) (2026-05-22)

### Bug Fixes

* **Community build verification** — commit `wasm/pkg/` (generated WASM bindings) so the Obsidian community plugin build checker can run `bun run build` without a Rust/wasm-pack toolchain. `wasm-pack` auto-generates a `pkg/.gitignore` with `*` that previously excluded the entire directory; that file is now overridden so the JS bindings and type declarations are tracked in git.

### [4.11.5](https://github.com/SkepticMystic/breadcrumbs/compare/4.11.4...4.11.5) (2026-05-22)

### Bug Fixes

* **Scroll performance degradation** — Obsidian's `layout-change` event fires on every scroll tick in newer versions, triggering a full unmount+remount of the page-view (Trail/Prev-Next) Svelte component on each tick. Added a 150 ms leading-edge debounce to the `layout-change` → redraw-page-views path so rapid bursts coalesce into a single redraw. Graph-update-triggered redraws remain immediate ([#698](https://github.com/SkepticMystic/breadcrumbs/issues/698)).

### [4.11.4](https://github.com/SkepticMystic/breadcrumbs/compare/4.11.3...4.11.4) (2026-05-21)

### Bug Fixes

* **Release validation** — remove `breadcrumbs_graph_wasm_bg.wasm` from GitHub release assets. Obsidian's community plugin validator only permits `main.js`, `manifest.json`, and `styles.css`; the extra WASM asset caused build verification to fail.

### [4.11.3](https://github.com/SkepticMystic/breadcrumbs/compare/4.11.2...4.11.3) (2026-05-20)

### Chores

* **CI: add WASM asset and build attestations to releases** — `breadcrumbs_graph_wasm_bg.wasm` is now included as a GitHub release asset (resolves Obsidian scorecard warning "Plugin references 1 unrecognized .wasm file(s)"). Build provenance attestations are generated for `main.js`, `styles.css`, and the WASM file via `actions/attest-build-provenance`. Committed `wasm/Cargo.lock` for reproducible WASM builds.

### [4.11.2](https://github.com/SkepticMystic/breadcrumbs/compare/4.11.1...4.11.2) (2026-05-20)

### Bug Fixes

* **Thread by command crashed without injecting edge** — `vault.create()` fires the `on:create` event synchronously before its promise resolves, so the new note's graph node was already registered by the time the thread command ran its `BatchGraphUpdate`. The duplicate `AddNoteGraphUpdate` threw "There already exists a resolved node with the same name", aborting the batch and preventing the breadcrumb link from being written to the source note's metadata ([#696](https://github.com/SkepticMystic/breadcrumbs/issues/696)).

### [4.11.1](https://github.com/SkepticMystic/breadcrumbs/compare/4.11.0...4.11.1) (2026-05-20)

### Bug Fixes

* **Tree view always showed from root** — the Find Root toggle button (`FindRootButton`) was imported but never rendered in the Tree side-view toolbar, giving users no way to turn off the root-anchored behavior that a prior migration had enabled for everyone. The button is now present in the nav bar. A matching toggle and field-group selector are also exposed in Settings → Tree View so the preference is discoverable and configurable without opening the view ([#695](https://github.com/SkepticMystic/breadcrumbs/issues/695)).

### [4.11.0](https://github.com/SkepticMystic/breadcrumbs/compare/4.10.2...4.11.0) (2026-05-18)

### Features

* **Per-field Mermaid arrow style** — each edge field now has an optional arrow-shape dropdown in Settings → Edge Fields. Choose from `-->`, `---`, `==>`, `===`, `-.->`, `-.-`, `--o`, or `--x`. When set, that field's edges in Mermaid codeblock views render with the chosen arrow instead of the default. Edges with the same custom arrow on both directions collapse into a single bidirectional line (e.g. `==>`→`<==>`). ([#694](https://github.com/SkepticMystic/breadcrumbs/pull/694))

### [4.10.2](https://github.com/SkepticMystic/breadcrumbs/compare/4.10.1...4.10.2) (2026-05-18)

### Bug Fixes

* Fix missing `version` field in `manifest.json`, which caused `"undefined"` to be recorded as the 4.10.1 version key in `versions.json`.

### [4.10.1](https://github.com/SkepticMystic/breadcrumbs/compare/4.10.0...4.10.1) (2026-05-18)

### Chores

* Fix Obsidian community plugin validator warnings: remove `!important` from Banner-compat CSS rules (increase selector specificity with `:root` prefix instead), add trailing punctuation to plugin description, point `authorUrl` to author profile rather than plugin repo, replace deprecated `builtin-modules` package with Node's built-in `module.builtinModules`, and replace `npm-run-all` with the maintained `npm-run-all2` fork.

### [4.10.0](https://github.com/SkepticMystic/breadcrumbs/compare/4.9.7...4.10.0) (2026-05-18)

### Features

* Add a search box to the Tree and Matrix side views, filtering displayed notes by title ([#691](https://github.com/SkepticMystic/breadcrumbs/pull/691)).

### Chores

* Enhance multi-parent display functionality ([#683](https://github.com/SkepticMystic/breadcrumbs/pull/683)).

### [4.9.7](https://github.com/SkepticMystic/breadcrumbs/compare/4.9.6...4.9.7) (2026-05-16)

### Features

* Wire up the **Rebuild Graph → on note save** trigger. The setting had a toggle but no event handler, so enabling it did nothing. A `metadataCache` `changed` listener now rebuilds the graph when the toggle is on, debounced (~1.5s) via the existing `rebuildGraphDebounced` so rapid edits collapse into a single rebuild.

### Code Refactoring

* Differentiate edge-field errors from malformed-value errors. Added an `invalid_edge_field` error code distinct from `invalid_field_value`: the former flags a value naming an unregistered BC edge-field, the latter a malformed metadata value. Applied across the explicit edge builders (`dataview_note`, `dendron_note`, `folder_note`, `johnny_decimal_note`, `list_note`, `regex_note`, `tag_note`).

### Chores

* Remove a stale TODO in the `list_note` builder that was already answered by its own follow-up comment.

### [4.9.6](https://github.com/SkepticMystic/breadcrumbs/compare/4.9.5...4.9.6) (2026-05-16)

### Chores

* Clear all 15 ESLint warnings (0 errors) so `bun run lint` passes under `--max-warnings=0`. Dropped redundant non-null assertions in the sibling-edge builders (`dendron_note`, `johnny_decimal_note`, `tag_note`), fixed import ordering in `main.ts`/`SettingsTab.ts`/`obsidian.ts`, and replaced an `app.plugins` `any` cast with a typed `AppWithPlugins` shim. No runtime behavior change.

### [4.9.5](https://github.com/SkepticMystic/breadcrumbs/compare/4.9.4...4.9.5) (2026-05-13)

### Bug Fixes

* Fix inline `.BC-page-views` rendering as a left column beside `.cm-sizer` (instead of stacking above it) when the Banners Reloaded plugin is **not** active on the current note. 4.9.4 removed `flex-wrap` from `.cm-scroller.BC-cm-scroller-inline-page-views`; default Obsidian uses `flex-direction: row`, so without wrap `.BC-page-views` became a flex sibling of `.cm-sizer`. Two follow-on issues blocked the wrap from taking effect:
  - `.banner-image` is injected as a scroller child by Banners Reloaded even when no banner is set on the note (no `.banner-view-active` class), consuming a flex column. The absolute-position rule on `.banner-image` is now ungated so it is always pulled out of flex flow.
  - The readable-line-width cap of 700px on `> .BC-page-views` applied in default Obsidian too, holding the trail at 700px inside a wide row so `.cm-sizer` still fit beside it. That cap is now scoped to `.banner-view-active` where it was intended.
  - `flex-wrap` is re-enabled on the scroller only when `.banner-view-active` is absent, so Banners Reloaded's column layout remains untouched.

### [4.9.4](https://github.com/SkepticMystic/breadcrumbs/compare/4.9.3...4.9.4) (2026-05-13)

### Bug Fixes

* Fix inline page views (`.BC-page-views`) being pushed off-viewport when the Banners Reloaded plugin is active. Banners Reloaded flips `.cm-scroller` to `flex-direction: column` and applies negative horizontal margins to `.banner-wrapper`, which inflates `scrollWidth` and causes CodeMirror to assign an oversized inline width to `.cm-sizer`. Forced `.BC-page-views` to a full-width row so it stacks above `.cm-sizer` in either flex direction; when `.banner-view-active` is present, hide gutters, neutralize banner-wrapper negative margins, override CM's inline `cm-sizer` width, and absolute-position `.banner-image` so it doesn't push layout. With Obsidian's readable line width enabled, cap `cm-sizer` and unpinned `.BC-page-views` at 700px and center them.

### [4.9.3](https://github.com/SkepticMystic/breadcrumbs/compare/4.9.2...4.9.3) (2026-05-12)

### Bug Fixes

* Fix Settings tab freezing Obsidian on Windows in 4.9.2 — the freeze had two stacked causes. (1) `reactive_settings.current` assigned to its own `$state` variable when read before init, which Svelte 5 detected as a derivation self-mutating its own dependency. (2) Three settings sub-components (`ShowAttributesSettingItem`, `EdgeSortIdSettingItem`, `FieldGroupLabelsSettingItem`) had a `$effect` that watched a `$bindable` prop and called `select_cb(value)` on every read; the callback writes back into `plugin.settings.X`, which re-notifies the same `$bindable` (Svelte 5 deep proxies fire on any property assignment, even with an identical reference), re-runs the effect, and so on until `effect_update_depth_exceeded` triggered after ~38s of awaited `saveData` calls. The store now initialises eagerly with `DEFAULT_SETTINGS` and the three sub-components cache the previously-emitted value to skip self-triggered re-notifications.
* Add gated perf marks (`debug.level` set to `DEBUG`) around `SettingsTab.display`, each section mount, and reactive-loop counters around the suspect `$effect` bodies. Active only at `DEBUG` log level so default users see nothing.

### [4.9.3-beta.6](https://github.com/SkepticMystic/breadcrumbs/compare/4.9.3-beta.5...4.9.3-beta.6) (2026-05-12)

### Bug Fixes

* Fix the Windows Settings-tab freeze (`effect_update_depth_exceeded` + ~38s click hang). Three settings sub-components — `ShowAttributesSettingItem`, `EdgeSortIdSettingItem`, `FieldGroupLabelsSettingItem` — had a `$effect` that watched a `$bindable` prop and invoked `select_cb(value)` on every read. The callback writes back into `plugin.settings.X`, which re-notifies the same `$bindable` prop (Svelte 5 deep proxies fire on any property assignment, even with an identical reference), re-runs the effect, and so on until Svelte's update-depth limit triggers. Each iteration awaits an async `saveData` disk write, which is why the hang stretched to ~38s. Each effect now caches the previously-emitted value and skips the callback when the prop reads back as the same reference, breaking the cycle.

### [4.9.3-beta.5](https://github.com/SkepticMystic/breadcrumbs/compare/4.9.3-beta.4...4.9.3-beta.5) (2026-05-12)

### Diagnostics

* Rework `effect_counter` to track cumulative runs (no 250ms reset window) and log at thresholds 1/10/50/200/1000. Beta.4's window-based counter missed slow loops — the 38-second hang on Windows ran ~2 iterations/second, never hitting 50 in any 250ms window. Also extend coverage to remaining $effects in `TrailView.log`, `TrailView.depth`, `TreeView.depth`, `TreeView.root_open`, `LockViewButton`, `RenderMarkdown`.

### [4.9.3-beta.4](https://github.com/SkepticMystic/breadcrumbs/compare/4.9.3-beta.3...4.9.3-beta.4) (2026-05-12)

### Diagnostics

* Extend reactive-loop counters to the four settings sub-components most likely to fire on tab open (`MatrixFieldOrderSettingItem`, `FieldGroupLabelsSettingItem`, `ShowAttributesSettingItem`, `EdgeSortIdSettingItem`) plus `ShowAttributesSelectorMenu.strip`. Beta.3 timings showed `SettingsTab.display` completed in 27ms but the `effect_update_depth_exceeded` error still fired on the next microtask, so the looping `$effect` lives in a sub-component that beta.3 did not instrument.

### [4.9.3-beta.3](https://github.com/SkepticMystic/breadcrumbs/compare/4.9.3-beta.2...4.9.3-beta.3) (2026-05-12)

### Diagnostics

* Add gated perf marks and reactive-loop counters around the Settings tab (per-section timings, mount durations, `effect-storm` warnings on TrailView/Matrix/TreeView/TransitiveImpliedRelations/NestedEdgeList) to diagnose the remaining few-second Settings-open freeze on Windows. Active only when `debug.level` is set to `DEBUG`; no effect at default log level.

### [4.9.3-beta.2](https://github.com/SkepticMystic/breadcrumbs/compare/4.9.2...4.9.3-beta.2) (2026-05-12)

### Bug Fixes

* Fix settings tab freezing Obsidian on Windows in 4.9.2 — the `reactive_settings.current` getter assigned to its own `$state` variable when read before init, which Svelte 5 detected as a derivation self-mutating its own dependency and looped to `effect_update_depth_exceeded`. The store now initialises `_settings` eagerly with `DEFAULT_SETTINGS` so the getter is a pure read and `init()` simply swaps in the real settings.

### [4.9.2](https://github.com/SkepticMystic/breadcrumbs/compare/4.9.1...4.9.2) (2026-05-12)

### Bug Fixes

* Fix [#686](https://github.com/SkepticMystic/breadcrumbs/issues/686) — opening the Breadcrumbs settings tab on some Android/Windows installs could freeze Obsidian's settings modal. The settings tab now wraps its render in a try/catch, logs the underlying error to the developer console, and shows a recoverable fallback UI with a "Reload settings" button instead of bricking the modal. Also serialised Svelte component teardown so `containerEl.empty()` no longer races pending `unmount()` promises, and `reactive_settings.current` falls back to defaults (with a warning) if read before init.

### [4.9.1](https://github.com/SkepticMystic/breadcrumbs/compare/4.9.0...4.9.1) (2026-05-11)

### Bug Fixes

* Fix view settings (trail enabled, prev/next enabled, matrix collapse) reverting on reload — settings written by TypeScript callbacks were lost because the Svelte 5 reactive proxy did not propagate plain-object mutations back to its internal signal sources. Converted `plugin.settings` to a getter/setter so all writes route through the proxy.
* Fix infinite reactive loop (`effect_update_depth_exceeded`) triggered when toggling trail or side view settings — `$effect` bodies in Matrix, TreeView, and TrailView were writing back to `plugin.settings` without `untrack()`, causing the proxy signal sources to re-trigger the same effects endlessly. Wrapped all proxy writes in `untrack()`.
* Fix `$effect.pre` in Matrix, TreeView, and TrailView re-running on every proxy write — the effects tracked proxy signal sources when reading `plugin.settings.views.*` to initialise local settings state, creating a feedback loop with the write-back `$effect`. Wrapped the snapshot call in `untrack()` so `$effect.pre` only re-runs when the `plugin` prop itself changes.
* Fix `lifecycle_double_unmount` error — concurrent `REDRAW_SIDE_VIEWS` events caused multiple `onOpen()` calls to race; both saw the same live component and both tried to unmount it. Debounced the event-driven `onOpen()` calls (100 ms trailing) so burst events collapse to a single remount.
* Fix Matrix and Tree side views remounting on every graph update or active-leaf change — debounced `REDRAW_SIDE_VIEWS` handler collapses rapid-fire workspace events into one remount per burst.
* Fix codeblock fatal-error log entries showing unexpandable `{…}` objects in the Obsidian developer console — errors are now logged as a formatted plain-text string with one line per error.

### [4.8.2](https://github.com/SkepticMystic/breadcrumbs/compare/4.8.1...4.8.2) (2026-05-03)

### Bug Fixes

* Fix page view alignment when sticky is disabled and readable line length is enabled

### [4.8.1](https://github.com/SkepticMystic/breadcrumbs/compare/4.8.0...4.8.1) (2026-05-02)

### Features

* Add default depth setting to tree view (default: 5) [673](https://github.com/SkepticMystic/breadcrumbs/issues/673)
* support for Notebook Navigator [614](https://github.com/SkepticMystic/breadcrumbs/issues/614)

### [4.8.0](https://github.com/SkepticMystic/breadcrumbs/compare/4.7.2...4.8.0) (2026-05-02)

### [4.7.2](https://github.com/SkepticMystic/breadcrumbs/compare/4.7.1...4.7.2) (2026-04-30)

### [4.7.1](https://github.com/SkepticMystic/breadcrumbs/compare/4.7.0...4.7.1) (2026-04-30)

### [4.7.0](https://github.com/SkepticMystic/breadcrumbs/compare/4.6.3...4.7.0) (2026-04-30)

### [4.6.3](https://github.com/SkepticMystic/breadcrumbs/compare/4.6.2...4.6.3) (2026-04-29)

### [4.6.2](https://github.com/SkepticMystic/breadcrumbs/compare/4.6.2...4.6.2) (2026-04-29)

### [4.6.1](https://github.com/SkepticMystic/breadcrumbs/compare/4.6.0...4.6.1) (2026-04-29)

### [4.6.0](https://github.com/SkepticMystic/breadcrumbs/compare/4.5.0...4.6.0) (2026-04-28)

### [4.5.0](https://github.com/SkepticMystic/breadcrumbs/compare/4.4.4...4.5.0) (2026-04-21)

### [4.4.4](https://github.com/SkepticMystic/breadcrumbs/compare/4.4.3...4.4.4) (2026-03-29)

### [4.4.3](https://github.com/SkepticMystic/breadcrumbs/compare/4.4.1...4.4.3) (2026-03-14)

### [4.4.1](https://github.com/SkepticMystic/breadcrumbs/compare/3.6.11...4.4.1) (2026-03-08)

## 3.X

### [3.6.11](https://github.com/SkepticMystic/breadcrumbs/compare/3.6.10...3.6.11) (2024-01-05)

### [3.6.10](https://github.com/SkepticMystic/breadcrumbs/compare/3.6.9...3.6.10) (2024-01-05)

### [3.6.9](https://github.com/SkepticMystic/breadcrumbs/compare/3.6.8...3.6.9) (2024-01-04)

### [3.6.8](https://github.com/SkepticMystic/breadcrumbs/compare/3.6.7...3.6.8) (2024-01-04)

### [3.6.7](https://github.com/SkepticMystic/breadcrumbs/compare/3.6.6...3.6.7) (2024-01-02)

### [3.6.6](https://github.com/SkepticMystic/breadcrumbs/compare/3.6.4...3.6.6) (2024-01-02)

### [3.6.5](https://github.com/SkepticMystic/breadcrumbs/compare/3.6.4...3.6.5) (2024-01-02)

### [3.6.4](https://github.com/SkepticMystic/breadcrumbs/compare/3.6.3...3.6.4) (2022-10-25)


### Bug Fixes

* Typo in settings ([84a2fa3](https://github.com/SkepticMystic/breadcrumbs/commit/84a2fa37fd89eabf2e55da6e9f6dece9e9e4b61c))

### [3.6.3](https://github.com/SkepticMystic/breadcrumbs/compare/3.6.2...3.6.3) (2022-09-21)


### Bug Fixes

* Bundle Svelte CSS ([7e4ba44](https://github.com/SkepticMystic/breadcrumbs/commit/7e4ba448166ff2942bfcb8eccfbc718f7227f4e9))

### [3.6.2](https://github.com/SkepticMystic/breadcrumbs/compare/3.6.1...3.6.2) (2022-09-14)

### [3.6.1](https://github.com/SkepticMystic/breadcrumbs/compare/3.6.0...3.6.1) (2022-09-08)

## [3.6.0](https://github.com/SkepticMystic/breadcrumbs/compare/3.5.1...3.6.0) (2022-07-25)


### Features

* **Hierarchy Note:** :sparkles: Option to make the hierarchy note the parent of all top-level items in that hierarchy note (fix [#398](https://github.com/SkepticMystic/breadcrumbs/issues/398)) ([a005409](https://github.com/SkepticMystic/breadcrumbs/commit/a005409afe5e5872dfd3b584a3108d79b717da01))

### [3.5.1](https://github.com/SkepticMystic/breadcrumbs/compare/3.5.0...3.5.1) (2022-07-24)


### Bug Fixes

* :bug: Catch errors when removing cycles ([563129c](https://github.com/SkepticMystic/breadcrumbs/commit/563129c89a5ca832b080b99fc2015dcdda769f67))
* No need to use alternative getFile API (fix [#416](https://github.com/SkepticMystic/breadcrumbs/issues/416)) ([e3e4418](https://github.com/SkepticMystic/breadcrumbs/commit/e3e4418bef38a478bda1b12d687bd075a9ff3b8b))

## [3.5.0](https://github.com/SkepticMystic/breadcrumbs/compare/3.4.1...3.5.0) (2022-07-23)


### Features

* **CreateIndex:** :sparkles: Option to change indent character(s) ([#421](https://github.com/SkepticMystic/breadcrumbs/issues/421)) ([1262c17](https://github.com/SkepticMystic/breadcrumbs/commit/1262c179ace6336b1e5d5ac2ddb13386f88d1db1))

### [3.4.1](https://github.com/SkepticMystic/breadcrumbs/compare/3.4.0...3.4.1) (2022-06-25)

## [3.4.0](https://github.com/SkepticMystic/breadcrumbs/compare/3.3.2...3.4.0) (2022-06-25)


### Features

* **Grid View:** :sparkles: Setting to limit initial depth ([1f2f3a0](https://github.com/SkepticMystic/breadcrumbs/commit/1f2f3a0d113b5449fb38d2a20e90748305193ad4))


### Bug Fixes

* Extend limit on gridDepth slider ([3aa4abb](https://github.com/SkepticMystic/breadcrumbs/commit/3aa4abb4a051295db066de7e498f3ae26e74e03c))
* file-open instead of active-leaf-change ([6dd8289](https://github.com/SkepticMystic/breadcrumbs/commit/6dd82897de96c45ea941424782c28f4065a2cefe))
* Obsidian v0.15+ compatibility ([f245a4b](https://github.com/SkepticMystic/breadcrumbs/commit/f245a4ba0f6b94960f0d390f725cd97e903a8d8c))

### [3.3.2](https://github.com/SkepticMystic/breadcrumbs/compare/3.3.1...3.3.2) (2022-06-04)


### Bug Fixes

* No async functions ([273db73](https://github.com/SkepticMystic/breadcrumbs/commit/273db736ecfea8497bd218935283107ae4392541))
* Null check on ff in targetOrder ([59f70ee](https://github.com/SkepticMystic/breadcrumbs/commit/59f70eebdf6db61111d2f33d2e18fd04ebb3eb21))

### [3.3.1](https://github.com/SkepticMystic/breadcrumbs/compare/3.3.0...3.3.1) (2022-04-29)


### Bug Fixes

* **Path View:** :bug: Prevent contextmenu from popping up ([d58fd33](https://github.com/SkepticMystic/breadcrumbs/commit/d58fd33e6c6e0d45d14f0ddb8973c70b264d849e))
* **Path View:** :bug: Trail_Length: Modulo wasn't wrapping ([6d88364](https://github.com/SkepticMystic/breadcrumbs/commit/6d88364b0aa00f9a768d610e836a19a3ae778b74))

## [3.3.0](https://github.com/SkepticMystic/breadcrumbs/compare/3.2.1...3.3.0) (2022-04-29)


### Features

* **Path View:** :sparkles: Right click TrailLength button to go backwards ([9f340f0](https://github.com/SkepticMystic/breadcrumbs/commit/9f340f01c182696e4863f66863474489b77611a5))

### [3.2.1](https://github.com/SkepticMystic/breadcrumbs/compare/3.2.0...3.2.1) (2022-04-29)

## [3.2.0](https://github.com/SkepticMystic/breadcrumbs/compare/3.1.1...3.2.0) (2022-04-25)


### Features

* **Path View:** :sparkles: Option to show Longest path ([4d9e1b5](https://github.com/SkepticMystic/breadcrumbs/commit/4d9e1b5cc58dfb3a43cd0c44ebd132f34b332854))

### [3.1.1](https://github.com/SkepticMystic/breadcrumbs/compare/3.1.0...3.1.1) (2022-04-25)

## [3.1.0](https://github.com/SkepticMystic/breadcrumbs/compare/3.0.0...3.1.0) (2022-04-21)


### Features

* **List/Matrix View:** :sparkles: If alias is showing, add aria-label for original name ([e6e782a](https://github.com/SkepticMystic/breadcrumbs/commit/e6e782ae5ec9e89b42078df6e5609f3a4dd86c6c))

## [3.0.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.58.1...3.0.0) (2022-04-20)


### Features

* **impliedRelations:** :sparkles: Working Mermaid diagrams to visualise the implied relations ([eb3c416](https://github.com/SkepticMystic/breadcrumbs/commit/eb3c416f03312e1c55aa3cb6bdb7392965c21f62))

### [2.58.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.58.0...2.58.1) (2022-04-18)


### Bug Fixes

* **LimitTrailFields:** :bug: Reset limitTrailCheckboxes if it's empty ([208a957](https://github.com/SkepticMystic/breadcrumbs/commit/208a95720f9cc06d47f302233a707863caca3790))

## [2.58.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.57.2...2.58.0) (2022-04-18)


### Features

* **Grid View:** :sparkles: Buttons to change max depth ([51a8a73](https://github.com/SkepticMystic/breadcrumbs/commit/51a8a7310b7011fb42c4e158eb35186772e3f906))

### [2.57.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.57.1...2.57.2) (2022-04-18)


### Bug Fixes

* **DataviewNotes:** :bug: Check for links in query ([51d0b67](https://github.com/SkepticMystic/breadcrumbs/commit/51d0b677acb81e7f7559e20a344d625ad48436af))

### [2.57.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.57.0...2.57.1) (2022-04-18)

## [2.57.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.56.0...2.57.0) (2022-04-18)


### Features

* **Codeblock:** :sparkles: Add `fields` field to limit codeblock tree to only show given fields ([d6fedda](https://github.com/SkepticMystic/breadcrumbs/commit/d6fedda7d740019123265eb9ef340d44877f36e2))


### Bug Fixes

* :bug: Add description for BC-IGNORE field ([a0b749b](https://github.com/SkepticMystic/breadcrumbs/commit/a0b749be1b56e7e360bf0c98162bcf0cdc29fe35))
* :bug: Alternative hierarchy default fields were being overwritten on Settings.onload ([dbb7ad6](https://github.com/SkepticMystic/breadcrumbs/commit/dbb7ad6dde57dec871639d90d0c46d4e994b8e07))
* :truck: Move Juggl setting to better place ([903049f](https://github.com/SkepticMystic/breadcrumbs/commit/903049fe975f530b631b38b77203de92fb5465be))
* **Codeblock:** :bug: hoverPreview on Codeblock Trees ([e26ff93](https://github.com/SkepticMystic/breadcrumbs/commit/e26ff93d257df9e3c14651351709d0e4ac2e268f))
* **Codeblock:** :loud_sound: End log group if `err` is non-empty ([8a83dbf](https://github.com/SkepticMystic/breadcrumbs/commit/8a83dbf782aab5cbea6a0e065e00fd99cb17a70f))

## [2.56.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.55.2...2.56.0) (2022-04-17)


### Features

* :sparkles: `BC-ignore: true` to ignore a note from BC entirely ([9e719a7](https://github.com/SkepticMystic/breadcrumbs/commit/9e719a7b53742a80be3a1adc14889472032d192e))
* **API:** :sparkles: Add refreshIndex method ([#369](https://github.com/SkepticMystic/breadcrumbs/issues/369)) ([f9b97b9](https://github.com/SkepticMystic/breadcrumbs/commit/f9b97b9b6f4942f8e4dcc05ea1c25962f23f5373))
* **Hierarchy Note:** :sparkles: Allow next and prev directions ([#327](https://github.com/SkepticMystic/breadcrumbs/issues/327)) ([657a2d3](https://github.com/SkepticMystic/breadcrumbs/commit/657a2d3ec7d2fbe38814d25ccc91c56c67a9296d))
* **RelationSuggester:** :sparkles: Add wikilink brackets after relation selection ([042dd33](https://github.com/SkepticMystic/breadcrumbs/commit/042dd3307e300c8ed4a0f376713a9dea4feba05d))


### Bug Fixes

* **nextPrev:** :bug: hoverPreview now works on NextPrev View (fix [#356](https://github.com/SkepticMystic/breadcrumbs/issues/356)) ([8191522](https://github.com/SkepticMystic/breadcrumbs/commit/8191522d2315b143a48f24cbd405cd51ee8aa790))
* **Path View:** :bug: Toggle Trail in Live Preview Mode command wasn't using the latest value to toggle the setting ([#364](https://github.com/SkepticMystic/breadcrumbs/issues/364)) ([42b2b67](https://github.com/SkepticMystic/breadcrumbs/commit/42b2b6745b89b40a4f64639db6fffac4bbd0b6f4))

### [2.55.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.55.1...2.55.2) (2022-02-13)

### [2.55.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.55.0...2.55.1) (2022-02-12)

## [2.55.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.54.0...2.55.0) (2022-02-12)


### Features

* **API:** :sparkles: Add various hierarchy utilities ([9b1bb8f](https://github.com/SkepticMystic/breadcrumbs/commit/9b1bb8f1a1dccae01439d33e1743fb4db83faaf6))

## [2.54.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.53.0...2.54.0) (2022-02-12)


### Features

* **API:** :sparkles: Expose more methods on API ([3ab66ea](https://github.com/SkepticMystic/breadcrumbs/commit/3ab66eabc39ed708030889c1284b5aaeace6e162))

## [2.53.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.52.2...2.53.0) (2022-02-12)


### Features

* **API:** :sparkles: Expose more function on API + Add API to global window object ([ad20594](https://github.com/SkepticMystic/breadcrumbs/commit/ad20594a26fb6215c08b6815e519950593c2da1b))

### [2.52.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.52.1...2.52.2) (2022-02-07)

### [2.52.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.52.0...2.52.1) (2022-02-07)


### Bug Fixes

* :bug: Don't add empty BC-note-fields to eligableAlts ([#326](https://github.com/SkepticMystic/breadcrumbs/issues/326)) ([be3a5aa](https://github.com/SkepticMystic/breadcrumbs/commit/be3a5aa3df158f3f847dadbabeed2fe112d12506))

## [2.52.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.51.1...2.52.0) (2022-02-05)


### Features

* **Threading:** :sparkles: Option to threadUnderCursor (Fix [#276](https://github.com/SkepticMystic/breadcrumbs/issues/276)) ([5b0ddde](https://github.com/SkepticMystic/breadcrumbs/commit/5b0dddedc55cd11ba656b4ffab4c48af22761791))

### [2.51.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.51.0...2.51.1) (2022-02-05)

## [2.51.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.50.4...2.51.0) (2022-02-05)


### Features

* **impliedRelations:** :sparkles: New optional impliedRelation: Siblings' parent is your parent ([#301](https://github.com/SkepticMystic/breadcrumbs/issues/301)) ([2a92f6d](https://github.com/SkepticMystic/breadcrumbs/commit/2a92f6da3ee2b51d104aae327396be6ff2511743))

### [2.50.4](https://github.com/SkepticMystic/breadcrumbs/compare/2.50.3...2.50.4) (2022-02-05)

### [2.50.3](https://github.com/SkepticMystic/breadcrumbs/compare/2.50.2...2.50.3) (2022-02-05)


### Bug Fixes

* **DateNotes:** :bug: Only add date notes that match the given dateFormat ([#302](https://github.com/SkepticMystic/breadcrumbs/issues/302)) ([1ea6d2a](https://github.com/SkepticMystic/breadcrumbs/commit/1ea6d2aa725be2800ef4f9ee39fd98927f6b13ea))

### [2.50.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.50.1...2.50.2) (2022-02-03)

### [2.50.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.50.0...2.50.1) (2022-02-03)


### Bug Fixes

* **DataviewNotes:** :bug: Don't run if there aren't any eligable alts ([6a5f2c7](https://github.com/SkepticMystic/breadcrumbs/commit/6a5f2c725767ea0ab42ab126ae737bce94348877))

## [2.50.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.49.0...2.50.0) (2022-01-31)


### Features

* **FolderNote:** :sparkles: BC-folder-note-subfolders links to notes in _subfolders_ of the current note using the given field ([41d6ee5](https://github.com/SkepticMystic/breadcrumbs/commit/41d6ee5ade769be0c78017966c7d92be4f5a6b1d))

## [2.49.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.48.0...2.49.0) (2022-01-29)


### Features

* **DateNotes:** :sparkles: Date notes! Enable the setting for Breadcrumbs to link your daily notes together ([17a02a0](https://github.com/SkepticMystic/breadcrumbs/commit/17a02a0e7b027431b615652a4fdaa8e9b41946ad))

## [2.48.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.47.0...2.48.0) (2022-01-29)


### Features

* Now adds Breadcrumbs edges to Juggl ([c1101d6](https://github.com/SkepticMystic/breadcrumbs/commit/c1101d6015efd9746db9153f12034e817de11aaa))

## [2.47.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.46.0...2.47.0) (2022-01-29)


### Features

* **DataviewNotes:** :sparkles: Dataview Notes! Use `BC-dataview-note: query` to run any valid Dataview from-query and add Breadcrumbs to all matching notes ([bc2681a](https://github.com/SkepticMystic/breadcrumbs/commit/bc2681a139cc476c1974770c6221a215e1ddc467))
* **Hierarchy Note:** :sparkles: Point to a folder full of hierarchy notes by ending the folder name with `/` (fix [#138](https://github.com/SkepticMystic/breadcrumbs/issues/138)) ([49fa7ab](https://github.com/SkepticMystic/breadcrumbs/commit/49fa7ab5e38c98814b5d011a6501f4329059d070))


### Bug Fixes

* :bug: Checks for new note ([63f062e](https://github.com/SkepticMystic/breadcrumbs/commit/63f062e04afa177f246be6e5f2feeaafd2ef06c2))

## [2.46.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.45.1...2.46.0) (2022-01-29)


### Features

* **DendronNote:** :sparkles: Allow stubs ([#297](https://github.com/SkepticMystic/breadcrumbs/issues/297)) ([f976162](https://github.com/SkepticMystic/breadcrumbs/commit/f9761621643fbe6c31c2103cd4df32008822345a))

### [2.45.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.45.0...2.45.1) (2022-01-29)


### Bug Fixes

* **List/Matrix View:** :bug: Sort by lowerCase (fix [#294](https://github.com/SkepticMystic/breadcrumbs/issues/294)) ([728929e](https://github.com/SkepticMystic/breadcrumbs/commit/728929e74170c4e9ac3ed907bd4f5e438023f29a))

## [2.45.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.44.3...2.45.0) (2022-01-29)


### Features

* :sparkles: Field suggestor now inserts different keys depending on if your cursor is in yaml or not (inline dataview) ([957ebe4](https://github.com/SkepticMystic/breadcrumbs/commit/957ebe4f2641e47c26477869ab5b58f6e6df6a79))
* :sparkles: Relation suggestor also detects if your cursor is insideYaml or not ([4d62eef](https://github.com/SkepticMystic/breadcrumbs/commit/4d62eef821e948f451306de06791dc0b64236e7d))


### Bug Fixes

* :bug: So many functions that are meant to be awaited ([fc2e99d](https://github.com/SkepticMystic/breadcrumbs/commit/fc2e99df59592edc903d43f187a3152eb80558bd))
* **LimitTrailFields:** :bug: New fields were being limited by default ([2de4170](https://github.com/SkepticMystic/breadcrumbs/commit/2de41706b559c52260807dcece2b6fa580e6f05f))

### [2.44.3](https://github.com/SkepticMystic/breadcrumbs/compare/2.44.2...2.44.3) (2022-01-28)


### Bug Fixes

* **Threading:** :bug: Disallow illegal filename characters in threadingTemplate (fix [#288](https://github.com/SkepticMystic/breadcrumbs/issues/288)) ([b08073b](https://github.com/SkepticMystic/breadcrumbs/commit/b08073b1e6250790a595d919aec4547428ab8bfc))

### [2.44.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.44.1...2.44.2) (2022-01-27)

### [2.44.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.44.0...2.44.1) (2022-01-26)


### Bug Fixes

* **Codeblock:** :bug: Title field error message triggered in the wrong cases ([6b9dd1c](https://github.com/SkepticMystic/breadcrumbs/commit/6b9dd1cb9433ff45865a7bf3da320806d43b7e83))

## [2.44.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.43.0...2.44.0) (2022-01-23)


### Features

* Juggl view now uses custom hierarchy visualization ([578df1b](https://github.com/SkepticMystic/breadcrumbs/commit/578df1b20be07b229ad070b108a933fa87ef9276))
* Layout type selector for Juggl view ([4f40700](https://github.com/SkepticMystic/breadcrumbs/commit/4f407001e76c0478ecacff2578ce21ce866bb377))


### Bug Fixes

* Juggl doesnt render correctly for notes with - in the name ([2024886](https://github.com/SkepticMystic/breadcrumbs/commit/20248868a7e6b3330999e0f161c9a81674617683))

## [2.43.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.42.1...2.43.0) (2022-01-23)


### Features

* :sparkles: Relation Suggestor with custom trigger ([#286](https://github.com/SkepticMystic/breadcrumbs/issues/286)) ([d7ffaf2](https://github.com/SkepticMystic/breadcrumbs/commit/d7ffaf2be9ad1853563c6a6bd9346b8569b76ffd))

### [2.42.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.42.0...2.42.1) (2022-01-23)

## [2.42.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.41.2...2.42.0) (2022-01-23)


### Features

* Depth configuration in Juggl view ([37ccf4f](https://github.com/SkepticMystic/breadcrumbs/commit/37ccf4f5d816d74367e1736c1df837a9fcc7d29a))
* Expand nodes in the BC Juggl view graph ([d6b4fe3](https://github.com/SkepticMystic/breadcrumbs/commit/d6b4fe3507a2b9936e63cb93b3da2eba893fad3c))

### [2.41.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.41.1...2.41.2) (2022-01-23)


### Bug Fixes

* **WriteBCToFile:** :bug: Use yaml lib ([5371b8d](https://github.com/SkepticMystic/breadcrumbs/commit/5371b8d5c1dbad690f59a651702860466473837d))

### [2.41.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.41.0...2.41.1) (2022-01-21)


### Bug Fixes

* **List/Matrix View:** :bug: Look for aliases in dv fields, too (fix [#256](https://github.com/SkepticMystic/breadcrumbs/issues/256)) ([baf99aa](https://github.com/SkepticMystic/breadcrumbs/commit/baf99aa37d90db368a6977870944b2868ac07f1b))

## [2.41.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.40.4...2.41.0) (2022-01-21)


### Features

* **List/Matrix View:** :sparkles: Hide directions from the matrix view using the `Directions Order` setting ([cede96a](https://github.com/SkepticMystic/breadcrumbs/commit/cede96adeb741dfcfa26fb4787afb27592925ddd))

### [2.40.4](https://github.com/SkepticMystic/breadcrumbs/compare/2.40.3...2.40.4) (2022-01-21)


### Bug Fixes

* **Path View:** :bug: Remember to getOppFallback when limiting trail sub ([5f5e345](https://github.com/SkepticMystic/breadcrumbs/commit/5f5e3451285b835dd8db8c1651959c20a23ca44a))

### [2.40.3](https://github.com/SkepticMystic/breadcrumbs/compare/2.40.2...2.40.3) (2022-01-21)


### Bug Fixes

* :bug: return undefined if a corresponding dir opr hier can't be found for a field ([013e161](https://github.com/SkepticMystic/breadcrumbs/commit/013e16116c4e46927565256a058d302428317ac2))

### [2.40.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.40.1...2.40.2) (2022-01-21)


### Bug Fixes

* **impliedRelations:** :bug: A fallback field already is the opp field ([a584da5](https://github.com/SkepticMystic/breadcrumbs/commit/a584da56c5b7505e8e0c07e2124d6bd585e7619b))
* **impliedRelations:** :bug: GetOppFallback if needed inside reflexiveClosure ([0ee790f](https://github.com/SkepticMystic/breadcrumbs/commit/0ee790f70e234c8ce3dcd6edcdc60ee9f1470c19))

### [2.40.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.40.0...2.40.1) (2022-01-19)


### Bug Fixes

* **impliedRelations:** :bug: Default settings should be the same as current BC behaviour ([6fe275a](https://github.com/SkepticMystic/breadcrumbs/commit/6fe275a1e1212c0461932cb44df449df1e9e2522))

## [2.40.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.39.3...2.40.0) (2022-01-19)


### Features

* **impliedRelations:** :sparkles: Multiple new implied relationship types, each with their own toggle ([43260b3](https://github.com/SkepticMystic/breadcrumbs/commit/43260b3dea594f20aab8a6f4e045de72ad723e80))


### Bug Fixes

* Trail view in lp doesn't scroll with element, simpler solution ([2cb4378](https://github.com/SkepticMystic/breadcrumbs/commit/2cb437864973594e61ee045a0e37652fae0ae088))

### [2.39.3](https://github.com/SkepticMystic/breadcrumbs/compare/2.39.2...2.39.3) (2022-01-16)

### [2.39.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.39.1...2.39.2) (2022-01-16)

### [2.39.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.39.0...2.39.1) (2022-01-16)


### Bug Fixes

* :bug: Incorrect import ([40f1e24](https://github.com/SkepticMystic/breadcrumbs/commit/40f1e24cea66334abf5f7355e03e15b4eec82936))

## [2.39.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.38.1...2.39.0) (2022-01-16)


### Features

* Juggl view into source node after layout is finished ([5059693](https://github.com/SkepticMystic/breadcrumbs/commit/50596939636405ef93a5c6977af9232f8a0daafd))
* Switch between up and down graph in juggl view ([748f433](https://github.com/SkepticMystic/breadcrumbs/commit/748f4336a3cb4d8867d93c7987f6173e6a3cf71f))


### Bug Fixes

* Down viz doesn't work if other trail views are active ([fe9505a](https://github.com/SkepticMystic/breadcrumbs/commit/fe9505ae540256d2728307386e0ec6fabf975248))
* Juggl codeblocks ([9ff3c53](https://github.com/SkepticMystic/breadcrumbs/commit/9ff3c530daa8b711614efdb1bbfaddd7712b0619))
* Switching to preview mode doesn't update trail ([3245a55](https://github.com/SkepticMystic/breadcrumbs/commit/3245a551272fff353de0f64e8583dd29b3dd3bec))
* Syntax error oop ([afb0df6](https://github.com/SkepticMystic/breadcrumbs/commit/afb0df6294188a42a80a8c9d18b8a48c402d21a6))
* Trail view in live preview doesn't scroll with the content ([52d2218](https://github.com/SkepticMystic/breadcrumbs/commit/52d22182abf2204222ee63443a36b25c48df8848))

### [2.38.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.38.0...2.38.1) (2022-01-16)

## [2.38.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.37.0...2.38.0) (2022-01-16)


### Features

* **List/Matrix View:** :sparkles: Hook closedG into m/l view (new relation types!). The new types are added as a class to the `li` ([4572689](https://github.com/SkepticMystic/breadcrumbs/commit/45726897060f93f8b0078af222719a7a50913ac4))

## [2.37.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.36.1...2.37.0) (2022-01-16)


### Features

* **DendronNote:** :sparkles: Add `BC-ignore-dendron: true` to not treat a dendron note as such (Fix [#277](https://github.com/SkepticMystic/breadcrumbs/issues/277)) ([f75653d](https://github.com/SkepticMystic/breadcrumbs/commit/f75653d8f7db264204fb5c96956222ba8acc10b0))


### Bug Fixes

* **FolderNote:** :bug: Point of to parentFolder, not previousFolder ([1b9b522](https://github.com/SkepticMystic/breadcrumbs/commit/1b9b522c26827aeb3ab4f308c8acd9719d790d3c))

### [2.36.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.36.0...2.36.1) (2022-01-15)


### Bug Fixes

* Only adds trails a single time ([4aeb3df](https://github.com/SkepticMystic/breadcrumbs/commit/4aeb3df421daef34cfe67edbf2679814956a214c))

## [2.36.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.35.0...2.36.0) (2022-01-15)


### Features

* **FolderNote:** :sparkles: `BC-folder-note-recursive: true` traverses the folder structure, adding nodes along the way ([d1c3584](https://github.com/SkepticMystic/breadcrumbs/commit/d1c358454286c29af419eac7656cf2b95069361f))

## [2.35.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.33.0...2.35.0) (2022-01-14)


### Features

* Better default values, allow customizing juggl through code block ([5c4b876](https://github.com/SkepticMystic/breadcrumbs/commit/5c4b876b43d4e09df72a11dfb2b5f92f547b55ad))
* Improved some constants, depth 0 for juggl ([90408d0](https://github.com/SkepticMystic/breadcrumbs/commit/90408d087234d0e9a4df9ddaffe4d1e6e98c05e4))
* Initial work on juggl code blocks ([e92021d](https://github.com/SkepticMystic/breadcrumbs/commit/e92021d44476bd76c4329dfdd3e1ae798e0a77cb))
* Juggl view showing hierarchy on top of note ([a5ebd95](https://github.com/SkepticMystic/breadcrumbs/commit/a5ebd95918878588dc941e3179b962f42eec94bf))
* Juggl visualization now supports all BC hierarchy options ([d62b915](https://github.com/SkepticMystic/breadcrumbs/commit/d62b915e0559eee3753dd0295ebb9545129f2c54))

## [2.34.0](https://github.com/HEmile/breadcrumbs/compare/2.33.0...2.34.0) (2022-01-12)


### Features

* Better default values, allow customizing juggl through code block ([5c4b876](https://github.com/HEmile/breadcrumbs/commit/5c4b876b43d4e09df72a11dfb2b5f92f547b55ad))
* Initial work on juggl code blocks ([e92021d](https://github.com/HEmile/breadcrumbs/commit/e92021d44476bd76c4329dfdd3e1ae798e0a77cb))

## [2.33.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.32.1...2.33.0) (2022-01-11)


### Features

* **Codeblock:** :sparkles: `implied: false` to only use real relationships in the specified direction ([a1bee7a](https://github.com/SkepticMystic/breadcrumbs/commit/a1bee7aa0150867fd517f78f65852e6de240a599))

### [2.32.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.32.0...2.32.1) (2022-01-11)


### Bug Fixes

* **Codeblock:** :bug: Copilot isn't always right. Use `indent` to calculate nodeDepth ([8d722ee](https://github.com/SkepticMystic/breadcrumbs/commit/8d722ee85a9df4fa17568cc82319d0dafd91876e))

## [2.32.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.31.4...2.32.0) (2022-01-11)


### Features

* **Codeblock:** :sparkles: `from: "folder" or -#tag` lets you filter the results by folders or tags (Using Dataview api) ([0a70d6c](https://github.com/SkepticMystic/breadcrumbs/commit/0a70d6cf7bb2f56c833dd7e123e69b6a4f494fae))

### [2.31.4](https://github.com/SkepticMystic/breadcrumbs/compare/2.31.3...2.31.4) (2022-01-11)


### Bug Fixes

* **Codeblock:** :bug: Minimum `depth` is 1 (Fix [#267](https://github.com/SkepticMystic/breadcrumbs/issues/267)) ([589d8c5](https://github.com/SkepticMystic/breadcrumbs/commit/589d8c543b99277e22fa9622cae7666d8a1db3a8))

### [2.31.3](https://github.com/SkepticMystic/breadcrumbs/compare/2.31.2...2.31.3) (2022-01-11)


### Bug Fixes

* **Codeblock:** :bug: Check if `f` is undefined first (fix [#265](https://github.com/SkepticMystic/breadcrumbs/issues/265)) ([d530454](https://github.com/SkepticMystic/breadcrumbs/commit/d530454660e411f4b83a7a2fc28b4d5630a70ca1))

### [2.31.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.31.1...2.31.2) (2022-01-11)


### Bug Fixes

* **Codeblock:** :bug: Refresh codeblocks after initialising index ([c150cb9](https://github.com/SkepticMystic/breadcrumbs/commit/c150cb9ddc156ab8895f3bda3b7a2677f78b6456))
* **TreeView:** :bug: Fail silently if mainG is not ready yet ([a2b19a1](https://github.com/SkepticMystic/breadcrumbs/commit/a2b19a1e96bdc3e5a5949998789da91e4c6bcae3))

### [2.31.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.31.0...2.31.1) (2022-01-10)


### Bug Fixes

* **TagNote:** :bug: Null-check on tags coming in ([6da0b7e](https://github.com/SkepticMystic/breadcrumbs/commit/6da0b7e59cf40dd72a14b1c2f4a35244a67b6f09))

## [2.31.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.30.0...2.31.0) (2022-01-10)


### Features

* **List/Matrix View:** :sparkles: Option to sort by note name, but show it's alias. Default is to sort by alias if one is found (fix [#255](https://github.com/SkepticMystic/breadcrumbs/issues/255)) ([bb25b48](https://github.com/SkepticMystic/breadcrumbs/commit/bb25b485488a7449f7505c71d7c1b431855ec82b))


### Bug Fixes

* **Codeblock:** :bug: Safety on `field` in codeblockError ([6a3d42f](https://github.com/SkepticMystic/breadcrumbs/commit/6a3d42f08d978bede3a552823d127f43efa4bb02))

## [2.30.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.28.1...2.30.0) (2022-01-10)


### Features

* **Codeblock:** :sparkles: BREAKING: default `depth` syntax now sets the MIN value. Use `depth: 1-3` to specify a range. ([04d2a10](https://github.com/SkepticMystic/breadcrumbs/commit/04d2a102536594a32653840653feeeee4e856567))

## [2.29.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.28.1...2.29.0) (2022-01-10)


### Features

* **Codeblock:** :sparkles: BREAKING: default `depth` syntax now sets the MAX value. Use `depth: 1-3` to specify a range. ([55f7cb9](https://github.com/SkepticMystic/breadcrumbs/commit/55f7cb995acc3486d5a7d78621f8f33c246054d3))

### [2.28.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.28.0...2.28.1) (2022-01-09)


### Bug Fixes

* **Path View:** :bug: Show aliases in Path/Grid view, too (fix [#212](https://github.com/SkepticMystic/breadcrumbs/issues/212)) ([55a6f60](https://github.com/SkepticMystic/breadcrumbs/commit/55a6f60a8e42f8d73b7f9ee26d49658056c89489))

## [2.28.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.27.2...2.28.0) (2022-01-09)


### Features

* **FolderNote:** :sparkles: `BC-folder-note-subfolders: true` takes notes in subfolders of the folderNote and adds those notes, too ([#218](https://github.com/SkepticMystic/breadcrumbs/issues/218)) ([0d839ac](https://github.com/SkepticMystic/breadcrumbs/commit/0d839ac2b5e37af119b098c1738f44082837817b))

### [2.27.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.27.1...2.27.2) (2022-01-09)

### [2.27.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.27.0...2.27.1) (2022-01-09)

## [2.27.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.26.0...2.27.0) (2022-01-09)


### Features

* **DownView:** :sparkles: Expand Down View to allow any direction ([c48551f](https://github.com/SkepticMystic/breadcrumbs/commit/c48551fb9969bc2ea372e63de90aaea70fc0e0fc))
* **List/Matrix View:** :sparkles: Option to only show the first alias (Fix [#237](https://github.com/SkepticMystic/breadcrumbs/issues/237)) ([aa0be01](https://github.com/SkepticMystic/breadcrumbs/commit/aa0be0119f94c13ebecde6a19ff5662a22762573))

## [2.26.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.25.0...2.26.0) (2022-01-08)


### Features

* **Codeblock:** :sparkles: `content: open` or `content: closed` to show content of each note ([6a350fc](https://github.com/SkepticMystic/breadcrumbs/commit/6a350fce9f6652358d1535a3089a4373d7f2e4a8))

## [2.25.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.24.0...2.25.0) (2022-01-08)


### Features

* **Codeblock:** :sparkles: Use `content: true` to show dropdowns with the note content inside ([95bb202](https://github.com/SkepticMystic/breadcrumbs/commit/95bb202f14e0688f49949b463bca654be087f0b4))

## [2.24.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.23.0...2.24.0) (2022-01-08)


### Features

* **Codeblock:** :sparkles: `flat: true` will flatten the results ([a65d0a2](https://github.com/SkepticMystic/breadcrumbs/commit/a65d0a25118ae4849e50d6f166c4993e60198f92))
* **Codeblock:** :sparkles: Limit depth on type: tree ([144a33c](https://github.com/SkepticMystic/breadcrumbs/commit/144a33c198cf861ea0e14b3e12876d03be2170c8))
* **List/Matrix View:** :lipstick: Add `BC-active-note` class to current note (Fix [#245](https://github.com/SkepticMystic/breadcrumbs/issues/245)) ([83f8b55](https://github.com/SkepticMystic/breadcrumbs/commit/83f8b552ecad1c648929f8a9dc1088d6f96b90d4))

## [2.23.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.22.3...2.23.0) (2022-01-08)


### Features

* **Codeblock:** :sparkles: Breadcrumbs codeblocks!! ([678b9c3](https://github.com/SkepticMystic/breadcrumbs/commit/678b9c3d75a173f02b1dfda027c30e07e3c92435))

### [2.22.3](https://github.com/SkepticMystic/breadcrumbs/compare/2.22.2...2.22.3) (2022-01-08)


### Bug Fixes

* **TagNote:** :bug: Allow non-conventional tag syntax ([075b935](https://github.com/SkepticMystic/breadcrumbs/commit/075b9358f04d67cda74cb2e866f9a3b2f566499f))

### [2.22.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.22.1...2.22.2) (2022-01-08)


### Bug Fixes

* **TagNote:** :bug: Add allTags differently ([38b8569](https://github.com/SkepticMystic/breadcrumbs/commit/38b85697cbf7ce18274083cb7e58ae68aaf1f477))

### [2.22.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.22.0...2.22.1) (2022-01-07)


### Bug Fixes

* **TraverseNote:** :bug: Check if copy.hasEdge(cycle) before trying to dropEdge ([49ca521](https://github.com/SkepticMystic/breadcrumbs/commit/49ca521afb72d084d34b5de4dd52de82c073b79e))

## [2.22.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.21.0...2.22.0) (2022-01-07)


### Features

* **NamingNotes:** :construction: Progress ([342d747](https://github.com/SkepticMystic/breadcrumbs/commit/342d7476e1a706ee4283aa0dd2dc1d57bb5b8035))


### Bug Fixes

* **TagNote:** :bug: Add # in fewer cases ([261f001](https://github.com/SkepticMystic/breadcrumbs/commit/261f001fa3b80c3182ca49a2cfcbaa711f0024dc))
* **TagNote:** :bug: Trim tag in fewer cases ([d20819e](https://github.com/SkepticMystic/breadcrumbs/commit/d20819e59e61ec772245bbb76601092b2798fde2))

## [2.21.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.20.0...2.21.0) (2022-01-06)


### Features

* **RegexNote:** :sparkles: BC-regex-note! All note names that match the regex will be added ([5e3cea2](https://github.com/SkepticMystic/breadcrumbs/commit/5e3cea2f2de16b56ecdea11be6c4bda469205e4b))


### Bug Fixes

* :bug: Load settings much sooner ([d62c0ce](https://github.com/SkepticMystic/breadcrumbs/commit/d62c0ce19d850ada55b118bafcbb84fcc1a9534a))
* **TagNote:** :bug: Allow blank default tagNoteFiled ([9a522a5](https://github.com/SkepticMystic/breadcrumbs/commit/9a522a56c6d060e9d3dcd97663b0f6b8cfe78d50))

## [2.20.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.19.1...2.20.0) (2022-01-03)


### Features

* **List/Matrix View:** :sparkles: Option to hide implied relations (fix [#226](https://github.com/SkepticMystic/breadcrumbs/issues/226)) ([5e1e435](https://github.com/SkepticMystic/breadcrumbs/commit/5e1e435c54b05347759fb3addd48338ca11bbcef))

### [2.19.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.19.0...2.19.1) (2022-01-03)


### Bug Fixes

* **WriteBCToFile:** :bug: Fix write BCs to ALL files command (fix [#217](https://github.com/SkepticMystic/breadcrumbs/issues/217)) ([426a76e](https://github.com/SkepticMystic/breadcrumbs/commit/426a76e206cb9ad6c4d8f92332fb7bfd711d7af7))

## [2.19.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.18.0...2.19.0) (2022-01-03)


### Features

* **TagNote:** :sparkles: BC-tag-note-exact will only include notes with exactly that tag (fix [#236](https://github.com/SkepticMystic/breadcrumbs/issues/236)) ([efd111a](https://github.com/SkepticMystic/breadcrumbs/commit/efd111af3ba1d940f8faa29c3a06a81cb127e071))
* **TagNote:** :sparkles: Choose a default tag-note-field ([b647507](https://github.com/SkepticMystic/breadcrumbs/commit/b6475077e615757016ce8f2b8fe28c80955f6bd8))

## [2.18.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.17.2...2.18.0) (2022-01-03)


### Features

* **Threading:** :sparkles: Choose a template to run for each direction ([f46dba1](https://github.com/SkepticMystic/breadcrumbs/commit/f46dba1f98946c2020ec241ee32327f1e426d0f2))
* **Threading:** :sparkles: Focus note name inputEl if no name template has been chosen ([5a9ed54](https://github.com/SkepticMystic/breadcrumbs/commit/5a9ed549999565351058524e7ab0d89abcbd56b4))


### Bug Fixes

* **Threading:** :bug: Increment duplicate note names was not slicing enough off the name each time ([b0b56da](https://github.com/SkepticMystic/breadcrumbs/commit/b0b56da894ea4d7660d5bc8939c88d4144fa2bb1))

### [2.17.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.17.1...2.17.2) (2022-01-03)

### [2.17.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.17.0...2.17.1) (2022-01-03)

## [2.17.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.16.1...2.17.0) (2022-01-02)


### Features

* **Threading:** :sparkles: Custom date format in threading template ([df0b7eb](https://github.com/SkepticMystic/breadcrumbs/commit/df0b7eb2934a333974b1c68c28ec9e43f7345a1a))
* **Threading:** :sparkles: Move cursor to end of line in new note ([#229](https://github.com/SkepticMystic/breadcrumbs/issues/229)) ([8e38bbf](https://github.com/SkepticMystic/breadcrumbs/commit/8e38bbff773b0da7a1353817a3685df3bcb00ddd))

### [2.16.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.16.0...2.16.1) (2022-01-02)


### Bug Fixes

* **CreateIndex:** :bug: Sinks are nodes with no outgoing **ups** (fix [#231](https://github.com/SkepticMystic/breadcrumbs/issues/231)) ([771a42a](https://github.com/SkepticMystic/breadcrumbs/commit/771a42af3da5a06000d71615a278b1d480cb8f48))

## [2.16.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.15.0...2.16.0) (2022-01-02)


### Features

* **Threading:** :sparkles: Option for customisable template for new note ([c893b81](https://github.com/SkepticMystic/breadcrumbs/commit/c893b812e382b0b761df0040f83b46e49d74c2c4))
* **Threading:** :sparkles: Option to thread into new pane or current pane ([625aa6e](https://github.com/SkepticMystic/breadcrumbs/commit/625aa6e506cb41957391f3940bce5d8565ec66ec))


### Bug Fixes

* **Threading:** :bug: Add incrementing `i` to new notes (fix [#228](https://github.com/SkepticMystic/breadcrumbs/issues/228)) ([4c90c96](https://github.com/SkepticMystic/breadcrumbs/commit/4c90c963732d775a5c5f0a1c36dcfbf7791ec7a6))

## [2.15.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.14.0...2.15.0) (2022-01-01)


### Features

* **List/Matrix View:** :sparkles: Option to change the order of the directions for each hierarchy (fix [#224](https://github.com/SkepticMystic/breadcrumbs/issues/224)) ([ca3c35b](https://github.com/SkepticMystic/breadcrumbs/commit/ca3c35bf236a3099aefaf94b43a0528738fbba1b))

## [2.14.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.13.0...2.14.0) (2021-12-29)


### Features

* **Threading:** :sparkles: Commands to create a new <field> from the current note (fix [#221](https://github.com/SkepticMystic/breadcrumbs/issues/221)) ([ee76b56](https://github.com/SkepticMystic/breadcrumbs/commit/ee76b5691477c52ebb4a7672a6fd3631ce9f97e3))

## [2.13.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.12.1...2.13.0) (2021-12-29)


### Features

* **Path View:** :sparkles: Show "Index Note" instead of noPathFoundMessage when active note is an indexNote (fix [#220](https://github.com/SkepticMystic/breadcrumbs/issues/220)) ([40b2ceb](https://github.com/SkepticMystic/breadcrumbs/commit/40b2cebc99405f74d272381d1d3bce01dee34f30))


### Bug Fixes

* **List/Matrix View:** :bug: Properly unload view when loggling Right/Leaf setting ([05a7325](https://github.com/SkepticMystic/breadcrumbs/commit/05a732597b33e9839f5414a2b045b635f28ccfb1))
* **List/Matrix View:** :bug: Show aria-label on opposite side that leaf is open (fix [#225](https://github.com/SkepticMystic/breadcrumbs/issues/225)) ([76bbda8](https://github.com/SkepticMystic/breadcrumbs/commit/76bbda8b1ab21a1c1a2860c0b563f8f80008b59c))
* **TagNote:** :bug: Tags notes are case insensitive, and work with string[] or string (fix [#219](https://github.com/SkepticMystic/breadcrumbs/issues/219)) ([bb92c08](https://github.com/SkepticMystic/breadcrumbs/commit/bb92c08a6e4553050884872efa8c6c00e55cfeb4))
* **WriteBCToFile:** :bug: Use fallback field if needed ([8a53195](https://github.com/SkepticMystic/breadcrumbs/commit/8a53195016c0210878025751434e83c712dd2ae0))

### [2.12.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.12.0...2.12.1) (2021-12-16)


### Bug Fixes

* :bug: Non-node proxy checking ([d9fc78c](https://github.com/SkepticMystic/breadcrumbs/commit/d9fc78caebb66a3fbcf57de10ca8a998e54f3d99))

## [2.12.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.11.0...2.12.0) (2021-12-16)


### Features

* :sparkles: Button to select All/None for all checkbox settings ([c495bc1](https://github.com/SkepticMystic/breadcrumbs/commit/c495bc1cfff675541ae06469ee1b1545d32c420a))


### Bug Fixes

* :heavy_minus_sign: `fs` is no longer needed ([17218c9](https://github.com/SkepticMystic/breadcrumbs/commit/17218c9babb128bc3c2b3cfbdf1e2b93722902be))

## [2.11.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.10.1...2.11.0) (2021-12-16)


### Features

* :sparkles: Option to limit which fields are used in `Jump to first <direction>` command (fix [#204](https://github.com/SkepticMystic/breadcrumbs/issues/204)) ([eeb470c](https://github.com/SkepticMystic/breadcrumbs/commit/eeb470c13193ee3c73586da5860830b5bc56a090))

### [2.10.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.10.0...2.10.1) (2021-12-16)


### Bug Fixes

* :bug: Safety checks for new notes and no markdownView ([452a54b](https://github.com/SkepticMystic/breadcrumbs/commit/452a54bcbdce20424c1de1f9bf61fb3a99f8cdc1))

## [2.10.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.9.2...2.10.0) (2021-12-16)


### Features

* **DendronNote:** :sparkles: Option to display trimmed dendron note ([16defd6](https://github.com/SkepticMystic/breadcrumbs/commit/16defd6b1e186b34449c9b34fb6487cdc2e1ba27))
* **List/Matrix View:** :sparkles: Button to toggle alphabetical sorting direction (Updates the corresponding setting) (Fix [#208](https://github.com/SkepticMystic/breadcrumbs/issues/208)) ([2d164c1](https://github.com/SkepticMystic/breadcrumbs/commit/2d164c1455185a27f46733df106d259251119eb6))


### Bug Fixes

* **Hierarchy Note:** :bug: Don't merge all HNs, rather do one at a time (Fix [#216](https://github.com/SkepticMystic/breadcrumbs/issues/216)) ([b3bba6d](https://github.com/SkepticMystic/breadcrumbs/commit/b3bba6da52f0620b491b30c1f80bb267354a6878))
* **List/Matrix View:** :bug: Break when an altField is found ([4c45603](https://github.com/SkepticMystic/breadcrumbs/commit/4c456035012a87f95316a54c75fcf9645e91c5f5))
* **List/Matrix View:** :bug: Sort by altField first, then regular note name (Fix [#206](https://github.com/SkepticMystic/breadcrumbs/issues/206)) ([5914cfb](https://github.com/SkepticMystic/breadcrumbs/commit/5914cfb7099e281581db21656f3aa22e9993d710))

### [2.9.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.9.1...2.9.2) (2021-12-14)


### Bug Fixes

* :bug: Don't add Obsidian {{templates}} (fix [#207](https://github.com/SkepticMystic/breadcrumbs/issues/207)) ([4762e13](https://github.com/SkepticMystic/breadcrumbs/commit/4762e1334c43f2ff9ecb41cd5f695f0dadd6294f))

### [2.9.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.9.0...2.9.1) (2021-12-14)


### Bug Fixes

* **DendronNote:** :bug: Don't return if g.hasNode. It may already have it from other means ([f7c4fe4](https://github.com/SkepticMystic/breadcrumbs/commit/f7c4fe4a6d406bf70e2eded74d138ada16247da1))

## [2.9.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.8.0...2.9.0) (2021-12-07)


### Features

* **DendronNote:** :sparkles: New alternative hierarchy, Dendron notes! (Fix [#194](https://github.com/SkepticMystic/breadcrumbs/issues/194)) ([c01663c](https://github.com/SkepticMystic/breadcrumbs/commit/c01663c3e13b6058c30afdb28cdfb0a1db889c1c))


### Bug Fixes

* **List/Matrix View:** :bug: Allow empty reverse fields (Fix [#203](https://github.com/SkepticMystic/breadcrumbs/issues/203)) ([3d0cd5d](https://github.com/SkepticMystic/breadcrumbs/commit/3d0cd5dc11fcd42438d03c1dfb0e4a4b8af070dd))
* **TraverseNote:** :bug: RemoveCycles from obsG ([7068d99](https://github.com/SkepticMystic/breadcrumbs/commit/7068d99e6c26448c1552aaeee4967e452eb63679))

## [2.8.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.7.3...2.8.0) (2021-12-05)


### Features

* :sparkles: Commands to jump to first up/down/next/prev (Fix [#202](https://github.com/SkepticMystic/breadcrumbs/issues/202)) ([a2e21f6](https://github.com/SkepticMystic/breadcrumbs/commit/a2e21f659765b32b6bf52760a8fbb401f88838b5))

### [2.7.3](https://github.com/SkepticMystic/breadcrumbs/compare/2.7.2...2.7.3) (2021-12-05)


### Bug Fixes

* :bug: dfsAllPaths works in more cases ([fd8a9b5](https://github.com/SkepticMystic/breadcrumbs/commit/fd8a9b54d092ea689a5f2863ac7739af662cf828))

### [2.7.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.7.1...2.7.2) (2021-12-05)


### Bug Fixes

* :bug: Filter out Templater templates (Fix [#198](https://github.com/SkepticMystic/breadcrumbs/issues/198)) ([187a270](https://github.com/SkepticMystic/breadcrumbs/commit/187a2708f247e89f159e3276afc1b755a838301a))
* **List/Matrix View:** :bug: Safety check on implied Siblings II ([7ee5046](https://github.com/SkepticMystic/breadcrumbs/commit/7ee5046504261e0fa0d841fb9df48f8f81d08799))

### [2.7.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.7.0...2.7.1) (2021-12-04)


### Bug Fixes

* **List/Matrix View:** :bug: Implied siblings were not making it thru the filter, because nodes don't have a.field ([4297153](https://github.com/SkepticMystic/breadcrumbs/commit/4297153dfe10f9d83c1d122e0b692629176a2ab7))

## [2.7.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.6.1...2.7.0) (2021-12-04)


### Features

* **Hierarchy Note:** :sparkles: Hierarchy Note Adjuster! ([#143](https://github.com/SkepticMystic/breadcrumbs/issues/143)) ([b5afae2](https://github.com/SkepticMystic/breadcrumbs/commit/b5afae26e3503059d95acb7cadfad9b458a6f0ae))


### Bug Fixes

* :bug: Better checks on graphInit ([618251e](https://github.com/SkepticMystic/breadcrumbs/commit/618251e6a9bdab77d8968e330c5c00926da4dfbd))

### [2.6.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.6.0...2.6.1) (2021-12-04)


### Bug Fixes

* **List/Matrix View:** :bug: BC-order was being overwritten ([c673420](https://github.com/SkepticMystic/breadcrumbs/commit/c67342045f95aece1b1e957c26987951941fb109))
* **Path View:** :bug: Truncation (Fix [#166](https://github.com/SkepticMystic/breadcrumbs/issues/166)) ([fb17090](https://github.com/SkepticMystic/breadcrumbs/commit/fb170903b8c09e3771a9166bf7470519affe8916))

## [2.6.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.5.1...2.6.0) (2021-12-04)


### Features

* **List/Matrix View:** :sparkles: Option to enbale/disable alphabetical sorting entirely ([f8bf507](https://github.com/SkepticMystic/breadcrumbs/commit/f8bf507b13ffb1959d56f29aff4a49ba15b93ac6))
* **List/Matrix View:** :sparkles: Option to treat the current note as an implied sibling ([4690e9b](https://github.com/SkepticMystic/breadcrumbs/commit/4690e9bee46b3bb55dbb5e38aba6d8a326c7181b))


### Bug Fixes

* :bug: Better waiting for initialisation ([b4c1ce0](https://github.com/SkepticMystic/breadcrumbs/commit/b4c1ce0c9efbf60c9b4b8e464f0adbf8b7690755))
* **Path View:** :bug: freshIndex should drawTrails if showBCs, not just showTrail ([dbb05dd](https://github.com/SkepticMystic/breadcrumbs/commit/dbb05dd1fe397ea4a33a9ee33bbdb0f45a588234))

### [2.5.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.5.0...2.5.1) (2021-12-03)

## [2.5.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.4.0...2.5.0) (2021-12-03)


### Features

* **DownView:** :sparkles: Option to enable/disable linewrapping (fix [#188](https://github.com/SkepticMystic/breadcrumbs/issues/188)) ([4ea9560](https://github.com/SkepticMystic/breadcrumbs/commit/4ea9560ea2973e0c0e9c218596cd81df055c084b))


### Bug Fixes

* **DownView:** :bug: Don't forget to join('- ') after splitting (fix [#189](https://github.com/SkepticMystic/breadcrumbs/issues/189)) ([60df361](https://github.com/SkepticMystic/breadcrumbs/commit/60df3612f9f484755198a6724f50f4693fe9c3ab))
* **TagNote:** :bug: Check for other formats of tags, too (Fix [#193](https://github.com/SkepticMystic/breadcrumbs/issues/193)) ([929e5c9](https://github.com/SkepticMystic/breadcrumbs/commit/929e5c99a3e895c282bf8fe49e9296e59b04e960))

## [2.4.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.3.0...2.4.0) (2021-11-30)


### Features

* **List/Matrix View:** :sparkles: Add `.BC-empty-view` class on empty views + consistent styling on List view ([06b512a](https://github.com/SkepticMystic/breadcrumbs/commit/06b512a88617f33f14a49271b5103243113ecde0))


### Bug Fixes

* :bug: waitForResolvedLinks if notDV ([4d04242](https://github.com/SkepticMystic/breadcrumbs/commit/4d042421ea0638afe420fc42d419e51f8c242f37))

## [2.3.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.2.0...2.3.0) (2021-11-30)


### Features

* **List/Matrix View:** :sparkles: Add `.BC-empty-view` class on empty views + consistent styling on List view ([1e36a29](https://github.com/SkepticMystic/breadcrumbs/commit/1e36a2977cc396539e8c271e6c3624f9cc103b8c))


### Bug Fixes

* **List/Matrix View:** :lipstick: Header structure was inconsistent ([79ae608](https://github.com/SkepticMystic/breadcrumbs/commit/79ae608f29e519f4826a727a50de80c94ba944a4))

## [2.2.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.1.2...2.2.0) (2021-11-30)


### Features

* :sparkles: Options to choose which views are oppened onload ([c48c571](https://github.com/SkepticMystic/breadcrumbs/commit/c48c571e2c3b276cf0cc67f0839d5e234e6d7b8e))


### Bug Fixes

* :bug: Close views properly onunload ([01f60ff](https://github.com/SkepticMystic/breadcrumbs/commit/01f60ff1dcb941cdf5f114c9118c6d0cead53de1))
* **DownView:** :lipstick: .icon styles were only being added if Graph Analysis is installed ([b17398c](https://github.com/SkepticMystic/breadcrumbs/commit/b17398cc81568ffe9608f129f133f545de4909db))

### [2.1.2](https://github.com/SkepticMystic/breadcrumbs/compare/2.1.1...2.1.2) (2021-11-30)


### Bug Fixes

* **DownView:** :bug: Don't depend on `Create Index > make wikilinks` setting ([61c9770](https://github.com/SkepticMystic/breadcrumbs/commit/61c9770d853d60725dbb8b1f2b84451c98cb07e1))

### [2.1.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.1.0...2.1.1) (2021-11-30)

## [2.1.0](https://github.com/SkepticMystic/breadcrumbs/compare/2.0.1...2.1.0) (2021-11-30)


### Features

* :sparkles: Option to not show Index Refreshed notice (fix [#177](https://github.com/SkepticMystic/breadcrumbs/issues/177)) ([6f1dbf0](https://github.com/SkepticMystic/breadcrumbs/commit/6f1dbf06f91f3e695ddb0ff070c0c74bd2cad52c))
* **DownView:** :sparkles: New view! Show all paths going down the child tree. Update on active-leaf-change, press `freeze` to freeze the current view ([a59c79b](https://github.com/SkepticMystic/breadcrumbs/commit/a59c79b65a8f4742516e2a5b95a158678b286b73))


### Bug Fixes

* :bug: Drop header and alias when initingGraphs ([cb4cc74](https://github.com/SkepticMystic/breadcrumbs/commit/cb4cc74e85b854efc0c32dcb42383349a890991d))
* **DucksView:** :bug: Return correct ViewType ([44026e7](https://github.com/SkepticMystic/breadcrumbs/commit/44026e7ea67bd72ec5ee768e2b249422cf763378))

### [2.0.1](https://github.com/SkepticMystic/breadcrumbs/compare/2.0.0...2.0.1) (2021-11-29)


### Bug Fixes

* **LinkNote:** :bug: Null check on links and embeds ([18975b5](https://github.com/SkepticMystic/breadcrumbs/commit/18975b5d3d339a9aa1901e175f379258415a24a8))

## [2.0.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.17.0...2.0.0) (2021-11-29)


### Bug Fixes

* :bug: Standardise BC_FIELDS and Alt hierarchies behaviour ([c344208](https://github.com/SkepticMystic/breadcrumbs/commit/c344208380e0cff508931e635865352b682db2e1))

## [1.17.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.16.0...1.17.0) (2021-11-29)


### Features

* **List/Matrix View:** :sparkles: Show the common-parent of an implied sibling as an aria-label (on hover) ([#81](https://github.com/SkepticMystic/breadcrumbs/issues/81)) ([7dd0b79](https://github.com/SkepticMystic/breadcrumbs/commit/7dd0b79ad9e7949ce205372a0d0dd145a1689b37))

## [1.16.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.15.1...1.16.0) (2021-11-26)


### Features

* **Path View:** :sparkles: cmd: Toggle Show Trail/Grid in Edit & LP mode (fix [#167](https://github.com/SkepticMystic/breadcrumbs/issues/167)) ([775a4f9](https://github.com/SkepticMystic/breadcrumbs/commit/775a4f90da0879a4288246260cf3f65e259d87f0))


### Bug Fixes

* **TraverseNote:** :bug: For real, don't add non-md notes to ObsG ([7917e05](https://github.com/SkepticMystic/breadcrumbs/commit/7917e05837874e9ceac34aec412eb6f40a9f0874))

### [1.15.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.15.0...1.15.1) (2021-11-25)


### Bug Fixes

* **TraverseNote:** :bug: Don't add MD notes to ObsG ([cc7be40](https://github.com/SkepticMystic/breadcrumbs/commit/cc7be40577fac7d4a99216bd9e916e664af4b179))
* **TraverseNote:** :bug: Use fancier dfs alg instead of graphology ([463fac9](https://github.com/SkepticMystic/breadcrumbs/commit/463fac935b17032c0347f131aa2215eca2b163a7))

## [1.15.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.14.0...1.15.0) (2021-11-25)


### Features

* **TraverseNote:** :sparkles: Working TraverseNotes! Add "BC-traverse-note: fieldName" to a note. Breadcrumbs will DFS the Obsidian graph, adding all edges as `fieldName` types ([e5e365e](https://github.com/SkepticMystic/breadcrumbs/commit/e5e365e6bdc133651294286f39c28317262f6d64))

## [1.14.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.13.0...1.14.0) (2021-11-25)


### Features

* **CSV Crumbs:** :sparkles: Allow CSV items to be wikilinks (The secret is that it doesn't have to be a CSV file! So using wikilinks allows the items to be auto updated) (fix [#169](https://github.com/SkepticMystic/breadcrumbs/issues/169)) ([e1171c5](https://github.com/SkepticMystic/breadcrumbs/commit/e1171c53a50868b4b973750d1cd19ba85f933560))

## [1.13.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.12.2...1.13.0) (2021-11-25)


### Features

* :sparkles: BC-order as Suggestor field. Deprecate custom order field ([a771a4a](https://github.com/SkepticMystic/breadcrumbs/commit/a771a4a531add45784e46ae08becf94431db9a7e))


### Bug Fixes

* :bug: node.dir and node.field is not well-defined ([4e7c0fd](https://github.com/SkepticMystic/breadcrumbs/commit/4e7c0fd01e2bf3aded441fa71dc29563620bb05e))
* **List/Matrix View:** :bug: filterImpliedSiblings wasn't implemented correctly. It has been disabled for now ([ba4ced5](https://github.com/SkepticMystic/breadcrumbs/commit/ba4ced548d78c303de9cd12ad821e493ad8e8fdc))

### [1.12.2](https://github.com/SkepticMystic/breadcrumbs/compare/1.12.1...1.12.2) (2021-11-24)

### [1.12.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.12.0...1.12.1) (2021-11-24)

## [1.12.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.11.1...1.12.0) (2021-11-24)


### Features

* **LinkNote:** :sparkles: Link Notes! Add 'BC-link-note: fieldName' to a note, and all links leaving that note will be added to the graph with that fieldname ([db0114d](https://github.com/SkepticMystic/breadcrumbs/commit/db0114d1264c839bdc14a7342bd9c518efe25eae))

### [1.11.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.11.0...1.11.1) (2021-11-24)

## [1.11.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.10.3...1.11.0) (2021-11-24)


### Features

* :sparkles: Field Suggestor! Type "BC-" at the start of a line to trigger ([652da4f](https://github.com/SkepticMystic/breadcrumbs/commit/652da4ff89050d35bbbd5b6a306a31ef4d3e0a24))

### [1.10.3](https://github.com/SkepticMystic/breadcrumbs/compare/1.10.2...1.10.3) (2021-11-24)


### Bug Fixes

* :bug: More granular graph building + fix order issues ([72b0243](https://github.com/SkepticMystic/breadcrumbs/commit/72b024351fe19d89c4fe85ac2da9793a575353f2))
* **Path View:** :bug: For real, don't try querySelect a non-existent selector ([6853d4c](https://github.com/SkepticMystic/breadcrumbs/commit/6853d4c9e93a1464c84f7aa1dd97de3c5a3b77ac))

### [1.10.2](https://github.com/SkepticMystic/breadcrumbs/compare/1.10.1...1.10.2) (2021-11-24)


### Bug Fixes

* **Path View:** :bug: Can't get max-width in source mode (fix [#163](https://github.com/SkepticMystic/breadcrumbs/issues/163)) ([efa2652](https://github.com/SkepticMystic/breadcrumbs/commit/efa26525f0aff4bb1eb735f5dcd6dc1d07f795b1))

### [1.10.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.10.0...1.10.1) (2021-11-23)

## [1.10.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.9.0...1.10.0) (2021-11-23)


### Features

* **TagNote:** :sparkles: Tag Notes! Similar to Folder Notes, all notes with the tag you specify link to the chosen note ([c630b6f](https://github.com/SkepticMystic/breadcrumbs/commit/c630b6f7c7502a607bb8e07017ceb31f3e2ab752))

## [1.9.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.8.1...1.9.0) (2021-11-23)


### Features

* **FolderNote:** :sparkles: Folder Notes! Make all files in a folder point upwards to a chosen note (fix [#112](https://github.com/SkepticMystic/breadcrumbs/issues/112)) ([0704a6b](https://github.com/SkepticMystic/breadcrumbs/commit/0704a6be27d02722e664aaf03fda923c23ecac8a))
* **Path View:** :sparkles: Option to show all trails if none are found going up to an index note (fix [#69](https://github.com/SkepticMystic/breadcrumbs/issues/69)) ([c97cfd9](https://github.com/SkepticMystic/breadcrumbs/commit/c97cfd97b3028bb2f867b25e8759404dbb2796cd))

### [1.8.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.8.0...1.8.1) (2021-11-23)


### Bug Fixes

* **Path View:** :bug: Work for CM6 ([bc4c2c2](https://github.com/SkepticMystic/breadcrumbs/commit/bc4c2c2a0d6decd6ec035693be807b502e9cc8f7))

## [1.8.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.7.9...1.8.0) (2021-11-23)


### Features

* **Path View:** :sparkles: Option to show Trail View in Edit and Live Preview mode! ([05f8e54](https://github.com/SkepticMystic/breadcrumbs/commit/05f8e549e68d5aa98341c75a3996015a15e82ca9)), closes [#157](https://github.com/SkepticMystic/breadcrumbs/issues/157) [#19](https://github.com/SkepticMystic/breadcrumbs/issues/19)

### [1.7.9](https://github.com/SkepticMystic/breadcrumbs/compare/1.7.8...1.7.9) (2021-11-23)


### Bug Fixes

* :bug: Don't overwrite userHiers everytime ([231a042](https://github.com/SkepticMystic/breadcrumbs/commit/231a042a41e1c12b3275d37e692ca826db2baf48))
* **Path View:** :bug: Traversal was too strict on previously visited nodes ([90000b7](https://github.com/SkepticMystic/breadcrumbs/commit/90000b75f1e63c10b6b69165c48d32259f0c9ff5))

### [1.7.8](https://github.com/SkepticMystic/breadcrumbs/compare/1.7.7...1.7.8) (2021-11-22)


### Bug Fixes

* **Juggl:** :bug: Don't include all links, only those in fields ([015cd2b](https://github.com/SkepticMystic/breadcrumbs/commit/015cd2b4e9a2b7bb7f78eb4519d621de5fd97605))

### [1.7.7](https://github.com/SkepticMystic/breadcrumbs/compare/1.7.6...1.7.7) (2021-11-22)


### Bug Fixes

* :bug: Convert setting name: Safer check + save changes ([7765005](https://github.com/SkepticMystic/breadcrumbs/commit/77650057b865d1859de2d24f8f97ea45a2921a0e))

### [1.7.6](https://github.com/SkepticMystic/breadcrumbs/compare/1.7.5...1.7.6) (2021-11-22)


### Bug Fixes

* :bug: Rename userHierarchies to userHiers ([a0cbebb](https://github.com/SkepticMystic/breadcrumbs/commit/a0cbebbfe6d2d0660c65c238d76f18fa40a3d454))

### [1.7.5](https://github.com/SkepticMystic/breadcrumbs/compare/1.7.4...1.7.5) (2021-11-22)

### [1.7.4](https://github.com/SkepticMystic/breadcrumbs/compare/1.7.3...1.7.4) (2021-11-22)


### Bug Fixes

* :bug: Don't allow blank hierarchy fields ([2a17ef9](https://github.com/SkepticMystic/breadcrumbs/commit/2a17ef9e3141be8971ba5b992f7c2536374b19ac))
* **List/Matrix View:** :bug: Fallback field name ([523585c](https://github.com/SkepticMystic/breadcrumbs/commit/523585c1652ea5a4d744af71d5993232731b42f3))
* **List/Matrix View:** :bug: Implied siblings should be filtered by hierarchy ([5403d87](https://github.com/SkepticMystic/breadcrumbs/commit/5403d87147c86a45df23e374b3b50e4ddf7b5e36))

### [1.7.3](https://github.com/SkepticMystic/breadcrumbs/compare/1.7.2...1.7.3) (2021-11-22)

### [1.7.2](https://github.com/SkepticMystic/breadcrumbs/compare/1.7.1...1.7.2) (2021-11-22)


### Bug Fixes

* **Hierarchy Note:** :bug: Handle top item ([9e738c4](https://github.com/SkepticMystic/breadcrumbs/commit/9e738c43666c90b489f669dca2ca2d834a16f41b))

### [1.7.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.7.0...1.7.1) (2021-11-21)


### Bug Fixes

* **CreateIndex:** :bug: Adjust for mainG ([833c6a1](https://github.com/SkepticMystic/breadcrumbs/commit/833c6a1f2ba5fbfbbdda1ca23df8bf1157352375))

## [1.7.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.6.0...1.7.0) (2021-11-21)


### Features

* **List/Matrix View:** :sparkles: Option to sort items alphabetically asc/desc order ([081bbdf](https://github.com/SkepticMystic/breadcrumbs/commit/081bbdfdc29928644b3c417b8666a3bd19001d70))

## [1.6.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.5.3...1.6.0) (2021-11-20)


### Features

* **DucksView:** :sparkles: Filter nodes with regex ([ec65f68](https://github.com/SkepticMystic/breadcrumbs/commit/ec65f689e46d1ed3305fea5a892236dd9c45fedd))
* **Stats View:** :sparkles: Button to refresh stats view ([5eb8830](https://github.com/SkepticMystic/breadcrumbs/commit/5eb8830ad8f5d007d6d07c1cd15d765d6e4c03b6))


### Bug Fixes

* **Stats View:** :bug: Fix stats view for mainG ([56736d5](https://github.com/SkepticMystic/breadcrumbs/commit/56736d53cc5aa7ee2e2e2268663d138dcc85bdef))

### [1.5.3](https://github.com/SkepticMystic/breadcrumbs/compare/1.5.2...1.5.3) (2021-11-20)

### [1.5.2](https://github.com/SkepticMystic/breadcrumbs/compare/1.5.1...1.5.2) (2021-11-19)


### Bug Fixes

* :bug: Fail safe on adding all nodes to main ([8435b5a](https://github.com/SkepticMystic/breadcrumbs/commit/8435b5ae3dd7d67f9051c5ce07a06a0acb52b0c7))

### [1.5.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.5.0...1.5.1) (2021-11-19)


### Bug Fixes

* **Juggl:** :bug: Fix juggl links. Wasn't adding all files ([3f2b460](https://github.com/SkepticMystic/breadcrumbs/commit/3f2b460c66a54a33d8c976ddbec28f3d8802adbf))

## [1.5.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.4.0...1.5.0) (2021-11-19)


### Features

* **Hierarchy Note:** :sparkles: Much better reliability + indicate field before link (fix [#102](https://github.com/SkepticMystic/breadcrumbs/issues/102)) ([1cedf22](https://github.com/SkepticMystic/breadcrumbs/commit/1cedf226a853a5f039fe5465b867a3e5d2cc4778))
* **Vis View:** :sparkles: Cmd to open (fix [#145](https://github.com/SkepticMystic/breadcrumbs/issues/145)) ([74992ad](https://github.com/SkepticMystic/breadcrumbs/commit/74992adfe692eb396a8841a450825229770199a2))

## [1.4.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.3.1...1.4.0) (2021-11-19)


### Features

* **DucksView:** :sparkles: Add Duck view to show notes which don't have any breadcrumbs ([2d0b2b2](https://github.com/SkepticMystic/breadcrumbs/commit/2d0b2b2dea721f05a537bac4fa512aa35f9caab0))


### Bug Fixes

* :bug: Add all nodes to `main` ([fa24115](https://github.com/SkepticMystic/breadcrumbs/commit/fa241157343a31e9d519cb88877325e8df263beb))

### [1.3.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.3.0...1.3.1) (2021-11-19)


### Bug Fixes

* **CSV Crumbs:** :bug: Fix CSV crumbs ([08a3fab](https://github.com/SkepticMystic/breadcrumbs/commit/08a3fab1813492f61d688299735baa1ff649b90a))

## [1.3.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.2.0...1.3.0) (2021-11-19)


### Features

* **Stats View:** :sparkles: Option to wrap copied cell content in wikiLinks (fix [#101](https://github.com/SkepticMystic/breadcrumbs/issues/101)) ([a6cdeab](https://github.com/SkepticMystic/breadcrumbs/commit/a6cdeabf7e5f3ea6a3ca22ba5f270fd511487306))
* **WriteBCToFile:** :sparkles: Option to write as inline fields (fix [#140](https://github.com/SkepticMystic/breadcrumbs/issues/140)) ([dded0df](https://github.com/SkepticMystic/breadcrumbs/commit/dded0df48db1d86fd31520f48b4e9659cf03cbdf))

## [1.2.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.1.2...1.2.0) (2021-11-19)


### Features

* **List/Matrix View:** :sparkles: Metadata field to sort items in L/M view! ([#92](https://github.com/SkepticMystic/breadcrumbs/issues/92)) ([d6452c3](https://github.com/SkepticMystic/breadcrumbs/commit/d6452c3cdc1f3a0a00bbee06936f8b65cf71006f))
* **Stats View:** :sparkles: Simplifications + add next/prev directions ([1d55d6a](https://github.com/SkepticMystic/breadcrumbs/commit/1d55d6a6e626d93d211ff3892b223dd7ec183678))

### [1.1.2](https://github.com/SkepticMystic/breadcrumbs/compare/1.1.1...1.1.2) (2021-11-19)


### Bug Fixes

* :bug: Check if nodes exist before setting edges ([0111eec](https://github.com/SkepticMystic/breadcrumbs/commit/0111eecd347208cb8e59462757a41a6a619f2f66))
* :bug: Don't index an array using Object.keys :yum: ([79dd8b1](https://github.com/SkepticMystic/breadcrumbs/commit/79dd8b1c6a800051a95692cb17c90ed45bf0160b))
* :bug: I don't think it has to be a breaking change... ([5524c29](https://github.com/SkepticMystic/breadcrumbs/commit/5524c2981ee10d925f7b8f5630aa6e7195b2df2f))

### [1.1.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.1.0...1.1.1) (2021-11-18)


### Bug Fixes

* :bug: More safety checks if no next/prev yet ([918b3e0](https://github.com/SkepticMystic/breadcrumbs/commit/918b3e0bd97cf98899132ac0a1e480063579ff2f))
* **List/Matrix View:** :bug: Unmerge next/prev items ([58691c4](https://github.com/SkepticMystic/breadcrumbs/commit/58691c4241cfccf417c8b34a71fcf63d7a834262))

## [1.1.0](https://github.com/SkepticMystic/breadcrumbs/compare/1.0.5...1.1.0) (2021-11-18)


### Features

* **nextPrev:** :sparkles: Show fieldName ([b2e10d4](https://github.com/SkepticMystic/breadcrumbs/commit/b2e10d4b9886ecf56e73e17eb2cfc963bc352795))


### Bug Fixes

* :bug: Fix "Show Hierarchies" button ([141b4f9](https://github.com/SkepticMystic/breadcrumbs/commit/141b4f90c404b4134fe1b9f21007fcf5581a7b3b))
* **nextPrev:** :bug: Remove duplicate implied ([8fc11e9](https://github.com/SkepticMystic/breadcrumbs/commit/8fc11e9131cad2afb4e2688afabc319493ae252b))

### [1.0.5](https://github.com/SkepticMystic/breadcrumbs/compare/1.0.4...1.0.5) (2021-11-18)

### [1.0.4](https://github.com/SkepticMystic/breadcrumbs/compare/1.0.3...1.0.4) (2021-11-18)


### Bug Fixes

* **nextPrev:** :bug: Fix overflowing next/prev item ([eec41a7](https://github.com/SkepticMystic/breadcrumbs/commit/eec41a745684bd114d409557a850c949fbb58c56))
* **nextPrev:** :bug: Still show nextPrev (if there are any) even in no parents ([b1b4c25](https://github.com/SkepticMystic/breadcrumbs/commit/b1b4c25ff5e119abb7cc7540563f3ddc28aa8933))

### [1.0.3](https://github.com/SkepticMystic/breadcrumbs/compare/1.0.2...1.0.3) (2021-11-18)


### Bug Fixes

* :bug: Properly save hierarchies ([b271fc0](https://github.com/SkepticMystic/breadcrumbs/commit/b271fc06528793941b1f65d93490e8786771c460))

### [1.0.2](https://github.com/SkepticMystic/breadcrumbs/compare/1.0.1...1.0.2) (2021-11-18)


### Bug Fixes

* :bug: More silent fails if no next/prev yet ([489c3c3](https://github.com/SkepticMystic/breadcrumbs/commit/489c3c338819eafd23c97e032fffb055bfd315f7))

### [1.0.1](https://github.com/SkepticMystic/breadcrumbs/compare/1.0.0...1.0.1) (2021-11-18)


### Bug Fixes

* :bug: Fail silently if hier.next/prev is undefined ([d76d5b2](https://github.com/SkepticMystic/breadcrumbs/commit/d76d5b20f3081bbe3e1191fece09f446c1a6800b))

## [1.0.0](https://github.com/SkepticMystic/breadcrumbs/compare/0.12.1...1.0.0) (2021-11-18)


### Features

* New directions! Show the next/previous note ([e3e56d6](https://github.com/SkepticMystic/breadcrumbs/commit/e3e56d6de5ba465d0e96eed10e7920602b5fc905))


### Bug Fixes

* :bug: Prev/Next in MatrixView ([dbec2f5](https://github.com/SkepticMystic/breadcrumbs/commit/dbec2f52edc9f46a135698a509b2cad131507b1c))

### [0.12.1](https://github.com/SkepticMystic/breadcrumbs/compare/0.12.0...0.12.1) (2021-11-17)


### Bug Fixes

* Safety check on in/outNeighbors ([f616a5a](https://github.com/SkepticMystic/breadcrumbs/commit/f616a5aa882640fd723c40153ad08d36b59f7eab))

## [0.12.0](https://github.com/SkepticMystic/breadcrumbs/compare/0.11.9...0.12.0) (2021-11-17)


### Features

* :sparkles: Use Svelte for Hierarchy Note settings ([3c891ea](https://github.com/SkepticMystic/breadcrumbs/commit/3c891ea85375209ccc33913a0be42e4966301921))


### Bug Fixes

* **Grid View:** :bug: Closing gs in wrong direction ([8cfa81e](https://github.com/SkepticMystic/breadcrumbs/commit/8cfa81e2250ae4f1a5652c825a0c344382bb30ce))

### [0.11.9](https://github.com/SkepticMystic/breadcrumbs/compare/0.11.8...0.11.9) (2021-11-17)

### [0.11.8](https://github.com/SkepticMystic/breadcrumbs/compare/0.11.7...0.11.8) (2021-11-10)

### [0.11.7](https://github.com/SkepticMystic/breadcrumbs/compare/0.11.6...0.11.7) (2021-11-10)


### Bug Fixes

* **getFieldValues:** :bug: Handle DataArrays (dv proxies) ([63e57d7](https://github.com/SkepticMystic/breadcrumbs/commit/63e57d785dc28ea846bf22243be759177bf61ff1))

### [0.11.6](https://github.com/SkepticMystic/breadcrumbs/compare/0.11.5...0.11.6) (2021-11-09)


### Bug Fixes

* **getFieldValues:** :bug: Be more explicit with dvLinks ([db9c259](https://github.com/SkepticMystic/breadcrumbs/commit/db9c25956ec848a0d30143a789defc0be2fa5e36))

### [0.11.5](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.76...0.11.5) (2021-11-09)

### [0.10.76](https://github.com/SkepticMystic/breadcrumbs/compare/0.11.4...0.10.76) (2021-11-09)


### Bug Fixes

* :bug: Properly reset back to old version ([cd95a47](https://github.com/SkepticMystic/breadcrumbs/commit/cd95a4795b73ff555f07b245d6c8c21f1079d0c0))

### [0.10.75](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.74...0.10.75) (2021-10-09)


### Bug Fixes

* **CSV Crumbs:** :bug: fixes [#142](https://github.com/SkepticMystic/breadcrumbs/issues/142) CSV File shouldn't be needed to show regular BCs ([df3de06](https://github.com/SkepticMystic/breadcrumbs/commit/df3de06683c03ec8c213931ee8d468d2f2c1cf12))

### [0.10.74](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.73...0.10.74) (2021-10-08)


### Features

* **CSV Crumbs:** :sparkles: Use a CSV file to add Breadcrumbs ([d794db9](https://github.com/SkepticMystic/breadcrumbs/commit/d794db91498acd48acc445f9893614a4228f1187))

### [0.10.73](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.72...0.10.73) (2021-10-04)


### Bug Fixes

* **List/Matrix View:** :bug: Remove duplicate implied siblings ([0d0a187](https://github.com/SkepticMystic/breadcrumbs/commit/0d0a18714473a64a440336b2f67725fafbd5dc74))

### [0.10.72](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.71...0.10.72) (2021-09-29)


### Bug Fixes

* **Grid View:** :bug: .internal-link was a level too high ([e971c8e](https://github.com/SkepticMystic/breadcrumbs/commit/e971c8e80404ba35e46d182fd1cd8e970be6aa90))

### [0.10.71](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.70...0.10.71) (2021-09-10)


### Bug Fixes

* **List/Matrix View:** :bug: Display alt link names for implied siblings, too ([075d8a0](https://github.com/SkepticMystic/breadcrumbs/commit/075d8a05cc19605238d930394474312d7ef768c4))

### [0.10.70](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.69...0.10.70) (2021-09-10)


### Features

* **List/Matrix View:** :sparkles: Setting to list field names to check for alternate link text ([52f0321](https://github.com/SkepticMystic/breadcrumbs/commit/52f0321248f5e72c198ed5bd7e422833ef12ac0e))

### [0.10.69](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.68...0.10.69) (2021-09-10)


### Features

* **WriteBCToFile:** :sparkles: Setting to limit which fields are written to files ([258343f](https://github.com/SkepticMystic/breadcrumbs/commit/258343f4c4a4a6cb5ed710cbdda5b88c6a6a660a))

### [0.10.68](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.67...0.10.68) (2021-09-09)


### Features

* **WriteBCToFile:** :sparkles: Setting to show `Write Breadcrumbs to ALL Files` cmd. Off by default ([7ff2d06](https://github.com/SkepticMystic/breadcrumbs/commit/7ff2d062b31f1dc1ca3872271ba8f04394f27e32))

### [0.10.67](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.66...0.10.67) (2021-09-08)


### Features

* **WriteBCToFile:** :sparkles: Write Breadcrumbs to All files ([289b701](https://github.com/SkepticMystic/breadcrumbs/commit/289b701158a5f8e832d98672be39d8cf8e2ffd9b))

### [0.10.66](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.65...0.10.66) (2021-09-08)


### Features

* **LimitTrailFields:** :sparkles: Ability to limit which fields are shown in the trail/grid view ([ba08396](https://github.com/SkepticMystic/breadcrumbs/commit/ba083960abd68d0555070a50ea4a6bfc70d9d140))

### [0.10.65](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.64...0.10.65) (2021-09-08)

### [0.10.64](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.63...0.10.64) (2021-09-08)


### Bug Fixes

* :bug: Open link in new pane if Mac `cmd` is pressed ([29abbc3](https://github.com/SkepticMystic/breadcrumbs/commit/29abbc3faee80443872fad5bcc58608e3883e330))

### [0.10.63](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.62...0.10.63) (2021-09-07)

### [0.10.62](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.61...0.10.62) (2021-09-07)


### Bug Fixes

* **CreateIndex:** :bug: Check if currFile is null ([c1c8f17](https://github.com/SkepticMystic/breadcrumbs/commit/c1c8f17f8d09b11285e2eaa8265e305df5fee7f1))

### [0.10.61](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.60...0.10.61) (2021-09-06)

### [0.10.60](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.59...0.10.60) (2021-09-06)


### Bug Fixes

* **WriteBCToFile:** :bug: Notice wasn't showing if MetaEdit wasn't enabled ([649c379](https://github.com/SkepticMystic/breadcrumbs/commit/649c3791518f03ad7fcb0f7d36dc170408ea3a51))

### [0.10.59](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.58...0.10.59) (2021-09-05)

### [0.10.58](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.57...0.10.58) (2021-09-05)

### [0.10.57](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.56...0.10.57) (2021-09-05)


### Bug Fixes

* **Vis View:** :bug: Tidy Tree: Importing non-existient function ([628afc4](https://github.com/SkepticMystic/breadcrumbs/commit/628afc4fec9b4b144ccf396c83a944c3987a7b48))

### [0.10.56](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.55...0.10.56) (2021-09-04)

### [0.10.55](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.54...0.10.55) (2021-09-04)

### [0.10.54](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.53...0.10.54) (2021-09-04)

### [0.10.53](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.52...0.10.53) (2021-09-04)

### [0.10.52](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.51...0.10.52) (2021-09-03)


### Features

* **WriteBCToFile:** :sparkles: New Command: Write Breadcrumbs to current file ([c46c95d](https://github.com/SkepticMystic/breadcrumbs/commit/c46c95d08d7bfb46075c5b88ed67552ac58941b6))

### [0.10.51](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.50...0.10.51) (2021-08-29)

### [0.10.50](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.49...0.10.50) (2021-08-29)


### Features

* **Path View:** :sparkles: Option to hide trail in specific notes using custom metadata field ([f5d96bf](https://github.com/SkepticMystic/breadcrumbs/commit/f5d96bfe40d876ea645b47295ccf80c863046447))

### [0.10.49](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.48...0.10.49) (2021-08-28)

### [0.10.48](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.47...0.10.48) (2021-08-28)

### [0.10.47](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.46...0.10.47) (2021-08-28)


### Bug Fixes

* :bug: Check for Apple CMD key in openOrSwitch ([5ea29ac](https://github.com/SkepticMystic/breadcrumbs/commit/5ea29ac95fdef5e1777642364283988328f9ef38))
* **Path View:** :bug: Add trailDiv before markdown-preview-sizer instead of prepending to markdown-preview-view ([bc51e85](https://github.com/SkepticMystic/breadcrumbs/commit/bc51e85f60fe029b74cf65a8cf8440ada4d7c173))

### [0.10.46](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.45...0.10.46) (2021-08-22)


### Features

* :sparkles: Create note if it doesn't exist ([44485db](https://github.com/SkepticMystic/breadcrumbs/commit/44485dbeff1bb17126d9537a9d10c351ba1d6ce2))


### Bug Fixes

* :bug: More intuitive text inputs on hierarchies settings ([14aaebe](https://github.com/SkepticMystic/breadcrumbs/commit/14aaebe991c69519a0328670f4e9bdfbb79b58db))

### [0.10.45](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.44...0.10.45) (2021-08-21)


### Bug Fixes

* **Hierarchy Note:** :bug: Forget to check for different delimiters in depth() ([7d54b88](https://github.com/SkepticMystic/breadcrumbs/commit/7d54b881b067560f5a3098155a9b4ac98f58697e))

### [0.10.44](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.43...0.10.44) (2021-08-21)


### Features

* **Hierarchy Note:** :sparkles: Allow any list delimiter `-`, `*`, `+` ([e307696](https://github.com/SkepticMystic/breadcrumbs/commit/e3076967fde061be5f2f36dbaa007ef208fb1e31))
* **Hierarchy Note:** :sparkles: Allow yaml frontmatter ([88f0499](https://github.com/SkepticMystic/breadcrumbs/commit/88f04997833252bb0498f409a67d57360110cedc))

### [0.10.43](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.42...0.10.43) (2021-08-21)


### Features

* **Hierarchy Note:** :sparkles: Option to have hierarchy note fill in real parents, or real children, or both ([ea31f64](https://github.com/SkepticMystic/breadcrumbs/commit/ea31f643915a89a47492fbe9b8f5658c2f108fc7))

### [0.10.42](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.41...0.10.42) (2021-08-21)

### [0.10.41](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.40...0.10.41) (2021-08-21)

### [0.10.40](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.39...0.10.40) (2021-08-21)


### Features

* :sparkles: Much better debugging. Now grouped by function ([48a2f03](https://github.com/SkepticMystic/breadcrumbs/commit/48a2f03a92ca0bfc6bcf007081b1799f11a8b3ce))

### [0.10.39](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.38...0.10.39) (2021-08-21)


### Bug Fixes

* **Vis View:** :bug: Force Directed Graph: Current note doesn't have to have breadcrumbs for fdg to show ([fc66973](https://github.com/SkepticMystic/breadcrumbs/commit/fc669734727582fc923fa5c92c455fd2869ba8d4)), closes [#93](https://github.com/SkepticMystic/breadcrumbs/issues/93)

### [0.10.38](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.37...0.10.38) (2021-08-21)


### Bug Fixes

* **Hierarchy Note:** :bug: Forgot to initialise hierarchyNotesArr as [] ([ffe6877](https://github.com/SkepticMystic/breadcrumbs/commit/ffe687719eef2fa96c4c4eb9d0b105cf54e4e14f))

### [0.10.37](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.36...0.10.37) (2021-08-21)


### Bug Fixes

* **Hierarchy Note:** :bug: Any indentation allowed. For real this time ([7d5c596](https://github.com/SkepticMystic/breadcrumbs/commit/7d5c5964bdd3ea1937ca8b685d06f6fcc5657428))

### [0.10.36](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.35...0.10.36) (2021-08-21)


### Bug Fixes

* **Hierarchy Note:** :bug: Any consistent depth should be allowed, not just tabs ([a738e39](https://github.com/SkepticMystic/breadcrumbs/commit/a738e39415cf89391509c8bbc2e7953073980082))
* **Hierarchy Note:** :bug: Send Notice if a note in hierarchyNotes has been deleted ([49540e8](https://github.com/SkepticMystic/breadcrumbs/commit/49540e8d99841da10161f9176a5fbaca71079cc4))

### [0.10.35](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.34...0.10.35) (2021-08-20)


### Bug Fixes

* **Hierarchy Note:** :bug: Blanks line allowed ([596bd64](https://github.com/SkepticMystic/breadcrumbs/commit/596bd6445deb21480de7a6347ba203796f00aeb4))

### [0.10.34](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.33...0.10.34) (2021-08-20)


### Bug Fixes

* **Hierarchy Note:** :bug: Don't push children if !noteUp ([841f7bf](https://github.com/SkepticMystic/breadcrumbs/commit/841f7bf9e8950873b39dce43e60e37cb85bfaa0a))

### [0.10.33](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.32...0.10.33) (2021-08-20)


### Features

* **Hierarchy Note:** :sparkles: Adds Hierarchy Notes to Breadcrumbs ([816d847](https://github.com/SkepticMystic/breadcrumbs/commit/816d847e1016a84e0060e805b3900e9948c08a36))

### [0.10.32](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.31...0.10.32) (2021-08-18)


### Features

* **Stats View:** :sparkles: Total row ([628e47a](https://github.com/SkepticMystic/breadcrumbs/commit/628e47ae9bf9f8f1617d40604911a5031985b435))


### Bug Fixes

* :bug: Register active-leaf-change event if it wasn't registered onLoad ([96aa5f4](https://github.com/SkepticMystic/breadcrumbs/commit/96aa5f41924ddd2c344277774f7d892fd52606c7))

### [0.10.31](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.30...0.10.31) (2021-08-15)


### Bug Fixes

* **getFieldValues:** :bug: Some pretty big bugs that I hadn't noticed... I think it works now ([6e98456](https://github.com/SkepticMystic/breadcrumbs/commit/6e98456f4607d7ad40694b2a18ab5ddaf18e50c8))

### [0.10.30](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.29...0.10.30) (2021-08-15)


### Bug Fixes

* **Vis View:** :bug: Force Directed Graph: Colour reset to defaultNodeColour when setting new nodeToGetTo ([dd1d41e](https://github.com/SkepticMystic/breadcrumbs/commit/dd1d41e5909f781b6d1dda0bb501e528a6be9b55))

### [0.10.29](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.28...0.10.29) (2021-08-15)


### Features

* **Vis View:** :sparkles: Force Directed Graph: Right click node to set that as the starting point for path finding ([095fb25](https://github.com/SkepticMystic/breadcrumbs/commit/095fb25e9d2193758eabf67a3a6c7d8442c9c55e))

### [0.10.28](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.27...0.10.28) (2021-08-15)


### Bug Fixes

* **Vis View:** :bug: Force Directed Graph: Path finding wasn't working correctly, oops ([4d6a6f0](https://github.com/SkepticMystic/breadcrumbs/commit/4d6a6f0fd58f25070a7cf819be8cb46d3ee83719))

### [0.10.27](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.26...0.10.27) (2021-08-15)


### Features

* **Vis View:** :sparkles: Force Directed Graph: Customisable node colour ([e83d9ee](https://github.com/SkepticMystic/breadcrumbs/commit/e83d9ee599062a64a918d9fd4b4f7e276e709d50))
* **Vis View:** :sparkles: Force Directed Graph: Highlight current note on graph ([5d437c0](https://github.com/SkepticMystic/breadcrumbs/commit/5d437c088bfa631b563265e8f43e3db8777f8199))
* **Vis View:** :sparkles: Force Directed Graph: Highlight path from current note to hovered node ([0773919](https://github.com/SkepticMystic/breadcrumbs/commit/077391919da06f05cfda722d8612df1bd43f4f3c))
* **Vis View:** :sparkles: Force Directed Graph: Transition to hovering node fade-out ([f4bb083](https://github.com/SkepticMystic/breadcrumbs/commit/f4bb0836296741229b5a29b8715e166624ed32fa))

### [0.10.26](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.25...0.10.26) (2021-08-15)


### Features

* **Vis View:** :sparkles: Customisable colour on Force Directed Graph nodes ([94e2947](https://github.com/SkepticMystic/breadcrumbs/commit/94e294792d3333e75ebb8abb81837b0b5a0278ca))
* **Vis View:** :sparkles: Hovering a node unfocusses any non-connected nodes and edges ([fb6e3a8](https://github.com/SkepticMystic/breadcrumbs/commit/fb6e3a83928b73a3897aba2ce76a6ceb479f4733))

### [0.10.25](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.24...0.10.25) (2021-08-15)


### Features

* **List/Matrix View:** :sparkles: Setting: Filter implied siblings of different types ([5e528b7](https://github.com/SkepticMystic/breadcrumbs/commit/5e528b752b37b890d8c9b2421ef3db6efd3e13bb))


### Bug Fixes

* **getFieldValues:** :bug: If using Obs cache, it sees number-only links as number[][], not string[][] ([3250462](https://github.com/SkepticMystic/breadcrumbs/commit/3250462e726702006f63e36af484c4197cad35fc))

### [0.10.24](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.23...0.10.24) (2021-08-14)


### Bug Fixes

* :bug: Previously checking for plugins.dataview.api, which won't exist if !dataview ([5bc7cc5](https://github.com/SkepticMystic/breadcrumbs/commit/5bc7cc54f7f736d77b49522708815d2175d546fb))

### [0.10.23](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.22...0.10.23) (2021-08-14)


### Features

* **Juggl:** :sparkles: Parse for Juggl links even if Juggl isn't installed ([e1a8f39](https://github.com/SkepticMystic/breadcrumbs/commit/e1a8f395c907587768b801f6290df115e3ea31ea))
* **Juggl:** :sparkles: Use only Juggl links ([09d8d98](https://github.com/SkepticMystic/breadcrumbs/commit/09d8d98f93ee9e36ac1f8a01f3d2126f0cffe80a))


### Bug Fixes

* **Juggl:** :bug: Use typedLinkPrefix from Juggl if installed, fall back on '-' otherwise ([16af4dc](https://github.com/SkepticMystic/breadcrumbs/commit/16af4dc2f64d9ec7c2ab36d0c800ce1657e91be0))

### [0.10.22](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.21...0.10.22) (2021-08-13)


### Bug Fixes

* **CreateIndex:** :bug: I had the graphs being closed the wrong way ([91f742c](https://github.com/SkepticMystic/breadcrumbs/commit/91f742ce03b4df27aa45925550c1c0addf597db4))

### [0.10.21](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.20...0.10.21) (2021-08-13)


### Features

* :sparkles: Setting to change Dataview wait time ([9d7650f](https://github.com/SkepticMystic/breadcrumbs/commit/9d7650fa68a050a4ee65342a575d9d45fbcec9aa))
* **List/Matrix View:** :sparkles: Custom sorting of userHierachies ([1ec10f6](https://github.com/SkepticMystic/breadcrumbs/commit/1ec10f6d987ccbfb03b9eb5401aa96c86c96d5d8))

### [0.10.20](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.19...0.10.20) (2021-08-13)


### Bug Fixes

* **Juggl:** :bug: Fix Juggl links ([23da652](https://github.com/SkepticMystic/breadcrumbs/commit/23da652e0e273b135afc51f96474613db9bf1b08))

### [0.10.19](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.18...0.10.19) (2021-08-13)


### Bug Fixes

* **Juggl:** :bug: Get Juggl syntax working again ([579bd14](https://github.com/SkepticMystic/breadcrumbs/commit/579bd141d9903deba4c5e248d958f4969725ce72))
* **Stats View:** :goal_net: Error handling in wordCounts ([6ff5c3e](https://github.com/SkepticMystic/breadcrumbs/commit/6ff5c3e6183fe5d7fb619c633454b70b526ad2a6))

### [0.10.18](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.17...0.10.18) (2021-08-13)

### [0.10.17](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.16...0.10.17) (2021-08-13)


### Bug Fixes

* :bug: mergeGs was trying to copy the first graph in an arr of graphs, but that arr could be empty ([c3c23ea](https://github.com/SkepticMystic/breadcrumbs/commit/c3c23ea16a35658ac59a866bd18cf0a4420a0053))

### [0.10.16](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.15...0.10.16) (2021-08-13)

### [0.10.15](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.14...0.10.15) (2021-08-13)


### Features

* :lipstick: Labels for hierarchy input boxes ([0323edf](https://github.com/SkepticMystic/breadcrumbs/commit/0323edf74ef4675d0a1c7f9d818526a52f9aee10))

### [0.10.14](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.13...0.10.14) (2021-08-12)


### Features

* :sparkles: Get multiple hierarchies working with l/m view! ([558ae67](https://github.com/SkepticMystic/breadcrumbs/commit/558ae670eb050e945ef053199d31838fdf099861))
* :sparkles: Multiple field names for each direction in a hierarchy ([0f3babb](https://github.com/SkepticMystic/breadcrumbs/commit/0f3babbb3f507f5e48c06ade14de2435f8976f36))
* :sparkles: Multiple hierarchies setting! ([2eda709](https://github.com/SkepticMystic/breadcrumbs/commit/2eda7095c4b28d3fc28c847412646cbd1eebbf38))
* **Stats View:** :sparkles: Progress on new stats view ([5389720](https://github.com/SkepticMystic/breadcrumbs/commit/53897209aec532376c15e0e6bc1e8e9dee5896ba))
* **Stats View:** :sparkles: Update stats view for multiple hierarchies ([24f5dae](https://github.com/SkepticMystic/breadcrumbs/commit/24f5dae5aa3d2b454f46069dba0719142224759e))


### Bug Fixes

* :bug: Everything on the front-end works as it used to ([ea0e8ff](https://github.com/SkepticMystic/breadcrumbs/commit/ea0e8ff3beac9befeba75932b8c5fac51ec562be))

### [0.10.13](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.12...0.10.13) (2021-08-10)


### Features

* **Vis View:** :sparkles: Basic zoom on tidyTree ([935d8fc](https://github.com/SkepticMystic/breadcrumbs/commit/935d8fcd2fcfda65046112e986e894a7c659b0d5))
* **Vis View:** :sparkles: Better dfsFlatAdjList ([cbe3182](https://github.com/SkepticMystic/breadcrumbs/commit/cbe31827e75fac17bcbd1bfa881888da0c8e0ffb))

### [0.10.12](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.11...0.10.12) (2021-08-10)


### Features

* **List/Matrix View:** :sparkles: Setting to open matrixView in left or right side onLoad ([c56d3dc](https://github.com/SkepticMystic/breadcrumbs/commit/c56d3dc897c3ee8183d35dda42d3fb8303fb55eb))


### Bug Fixes

* **Path View:** :bug: Redraw path after updating settings ([fa323b8](https://github.com/SkepticMystic/breadcrumbs/commit/fa323b86caa82e6de149e403fcbf2e792c09c293))

### [0.10.11](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.10...0.10.11) (2021-08-09)


### Features

* **Vis View:** :sparkles: Functional zooming on arcDiagram ([27a22bf](https://github.com/SkepticMystic/breadcrumbs/commit/27a22bf4470acbd9eaa606782aff3cba99272059))
* **Vis View:** :sparkles: Progress on radialTree ([aa6d990](https://github.com/SkepticMystic/breadcrumbs/commit/aa6d990f7102453ab8532ed53b5ab3b2e1e397d8))

### [0.10.10](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.9...0.10.10) (2021-08-09)


### Features

* **Vis View:** :sparkles: Functional Tree Map! ([5489e94](https://github.com/SkepticMystic/breadcrumbs/commit/5489e948f7659ea13d5125f060c584dac34f6be5))
* **Vis View:** :sparkles: Much better tidy tree ([8a3a9a3](https://github.com/SkepticMystic/breadcrumbs/commit/8a3a9a38472ce531107c0d64962b22a1cbcac507))
* **Vis View:** :sparkles: Proof of Concept of hierarchy!!! ([b47f849](https://github.com/SkepticMystic/breadcrumbs/commit/b47f849cb7393ce26029439bb82b29d9b6a58627))

### [0.10.9](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.8...0.10.9) (2021-08-06)


### Features

* **Vis View:** :sparkles: Working Arc Diagram! ([71dd61b](https://github.com/SkepticMystic/breadcrumbs/commit/71dd61bd858916b5b57ebf5d82975539f4dc49b3))

### [0.10.8](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.7...0.10.8) (2021-08-06)


### Features

* **Vis View:** :sparkles: Add height property to adjList Items ([2f27bf4](https://github.com/SkepticMystic/breadcrumbs/commit/2f27bf43cc038ce36a2c69951232349cf7eee4cb))
* **Vis View:** :sparkles: Better Circle Packing ([14ee9d0](https://github.com/SkepticMystic/breadcrumbs/commit/14ee9d074c7457c46ee4c02ecb25a4ee73689b34))

### [0.10.7](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.6...0.10.7) (2021-08-05)


### Features

* **Vis View:** :sparkles: Lots more work on view view. Upgrade forceDirectedG, functional Circle Packing + TidyTree ([9769d9b](https://github.com/SkepticMystic/breadcrumbs/commit/9769d9b55251c5073d6c190ff9f29a4eaf36d537))

### [0.10.6](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.5...0.10.6) (2021-08-05)


### Features

* **Vis View:** :sparkles: Default visualisation type ([3dd2906](https://github.com/SkepticMystic/breadcrumbs/commit/3dd29068fd46e591d95f9086d9bf7d2e203bd737))
* **Vis View:** :sparkles: Working Zoom & Pan on Force Directed Graph! ([0b49359](https://github.com/SkepticMystic/breadcrumbs/commit/0b49359014d804160aad129fffba4bcb721a1187))


### Bug Fixes

* **Stats View:** :bug: Remove old styles from data-tooltip ([973bed2](https://github.com/SkepticMystic/breadcrumbs/commit/973bed209a05007318f24b37f4d3ffa7e267f85a))

### [0.10.5](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.4...0.10.5) (2021-08-05)


### Bug Fixes

* **getFieldValues:** :bug: splitAndDrop regex was => null when the link didn't have [[]] ([37083df](https://github.com/SkepticMystic/breadcrumbs/commit/37083dfc1aca536017615118fc6dba645e19fba9))

### [0.10.4](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.3...0.10.4) (2021-08-04)


### Features

* **Vis View:** :sparkles: Lots of new code (alot of it copied) to get started with various visualisations ([a98ac6a](https://github.com/SkepticMystic/breadcrumbs/commit/a98ac6a7aa3a8530caacf8a450c4b4908e480293))

### [0.10.3](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.2...0.10.3) (2021-08-04)

### [0.10.2](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.1...0.10.2) (2021-08-04)


### Features

* **Vis View:** :sparkles: Show node name on hover ([4c2ad5d](https://github.com/SkepticMystic/breadcrumbs/commit/4c2ad5dd80ce3b8a450de504f8a02ebcec642945))


### Bug Fixes

* **Vis View:** Center graph in Vis View ([56ee243](https://github.com/SkepticMystic/breadcrumbs/commit/56ee2434e70c791404a75ffd91d6bb1870cadbd8))

### [0.10.1](https://github.com/SkepticMystic/breadcrumbs/compare/0.10.0...0.10.1) (2021-08-03)

### [0.9.27](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.26...0.9.27) (2021-08-03)


### Features

* **Stats View:** :sparkles: Custom Tooltip + Copyable td info ([bedc5fd](https://github.com/SkepticMystic/breadcrumbs/commit/bedc5fd9801580e4e06647a889ce946b9b518f52))


### Bug Fixes

* **Path View:** :bug: Fix extra arrows showing on shorter paths ([8c71661](https://github.com/SkepticMystic/breadcrumbs/commit/8c716610cb7b43ba0c48f1d0b030c0a21b298542))
* **Stats View:** :bug: Close stats view on unload ([6931256](https://github.com/SkepticMystic/breadcrumbs/commit/69312563f5e6c4c6b20483ff3da5a04f9c293701))

### [0.9.26](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.25...0.9.26) (2021-08-03)


### Bug Fixes

* **getFieldValues:** :bug: Better falsey checking on rawValues ([ec717bc](https://github.com/SkepticMystic/breadcrumbs/commit/ec717bcef5acb0b075eec7cb4d802fa5df0ee3ef))

### [0.9.25](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.24...0.9.25) (2021-08-02)


### Features

* **Vis View:** :sparkles: Functional Vis Modal! ([ac59f6f](https://github.com/SkepticMystic/breadcrumbs/commit/ac59f6ffa11edf82388995efd9e4e239dc23e986))

### [0.9.24](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.23...0.9.24) (2021-08-02)


### Features

* **Stats View:** :sparkles: Initial Stats View set up, no content yet ([bfe0227](https://github.com/SkepticMystic/breadcrumbs/commit/bfe02278d18da1b3da596b24645e158cb817cb27))
* **Stats View:** :sparkles: Node, Real Edge, Implied Edge counts ([c89de64](https://github.com/SkepticMystic/breadcrumbs/commit/c89de64dc57b2f17ce3a5270d1a866b6395cf34b))


### Bug Fixes

* **List/Matrix View:** :bug: Draw l/m view onLoad, not onOpen ([7f4078d](https://github.com/SkepticMystic/breadcrumbs/commit/7f4078d7314fd942e354df43f684efbe80d39a67))

### [0.9.23](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.22...0.9.23) (2021-08-01)


### Bug Fixes

* :bug: less harsh falsey checking on rawValues content ([2e20b1e](https://github.com/SkepticMystic/breadcrumbs/commit/2e20b1e2977228c04c38c4e3eb127daf5ccce7c0))

### [0.9.22](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.21...0.9.22) (2021-08-01)


### Bug Fixes

* :bug: Initialise jugglLinks as empty array so that it always has .length ([96d32af](https://github.com/SkepticMystic/breadcrumbs/commit/96d32afa51b54d03dca391407f96e5c4882e78a3))

### [0.9.21](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.20...0.9.21) (2021-08-01)


### Bug Fixes

* **Grid View:** :bug: Forgot to change dotsColour instead of heatmapColour ([6e47621](https://github.com/SkepticMystic/breadcrumbs/commit/6e47621f07455a6a3194c012f2a271d621853624))
* **Juggl:** :bug: Fix Juggl links not showing ([b02377f](https://github.com/SkepticMystic/breadcrumbs/commit/b02377f3138136ef21b47b764dd4bd06bc4e2e41))

### [0.9.20](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.19...0.9.20) (2021-08-01)


### Bug Fixes

* :bug: Add debug logs to getFields and getFrontmatter functions ([193eb46](https://github.com/SkepticMystic/breadcrumbs/commit/193eb4603183581df71b70aabee4345ab1f819e2))
* :bug: Forgot to add default for aliasesInIndex setting ([1135617](https://github.com/SkepticMystic/breadcrumbs/commit/11356177167d062ad70308d2a60167e8083db022))

### [0.9.19](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.18...0.9.19) (2021-07-31)


### Features

* **CreateIndex:** :sparkles: Setting to show aliases in index ([670ae39](https://github.com/SkepticMystic/breadcrumbs/commit/670ae39b430eb5c8eb93f2d5b5951090add7f30f))

### [0.9.18](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.17...0.9.18) (2021-07-31)


### Features

* **Grid View:** :sparkles: Add dots visualisation to grid view ([146e126](https://github.com/SkepticMystic/breadcrumbs/commit/146e12632010a5899680b9e4703a3ba54cd0b22c))

### [0.9.17](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.16...0.9.17) (2021-07-31)


### Features

* **CreateIndex:** :sparkles: add Global Index command ([b12cf4b](https://github.com/SkepticMystic/breadcrumbs/commit/b12cf4bfd32e12552a03300e95fd42ad4cb21a7c))

### [0.9.16](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.15...0.9.16) (2021-07-21)


### Features

* **CreateIndex:** :lipstick: Add a notice when index is copied to clipboard ([a275f6f](https://github.com/SkepticMystic/breadcrumbs/commit/a275f6f685dbf56bd70396b5007cab76f93a92d3))

### [0.9.15](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.14...0.9.15) (2021-07-21)


### Bug Fixes

* **CreateIndex:** :bug: deep clone allPaths to mutate the copy instead ([664db77](https://github.com/SkepticMystic/breadcrumbs/commit/664db7752f0d7d8476785e4701896f3d1b2f3da0))

### [0.9.14](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.13...0.9.14) (2021-07-21)


### Features

* **CreateIndex:** Add setting to toggle wikilinks in index ([b76f919](https://github.com/SkepticMystic/breadcrumbs/commit/b76f919741042fd56dd24951261f02935e21d153))
* **CreateIndex:** CreateIndex Button now copies to clipboard ([3b9fa72](https://github.com/SkepticMystic/breadcrumbs/commit/3b9fa729ab918b6e977683f1a4744c417ed5c8fb))


### Bug Fixes

* :bug: closeImpliedLinks was mutating the input graphs ([5898872](https://github.com/SkepticMystic/breadcrumbs/commit/58988725d1a9343b6fb421df05b0ca1195ffaa5e))

### [0.9.13](https://github.com/SkepticMystic/breadcrumbs/compare/0.9.12...0.9.13) (2021-07-21)


### Features

* **CreateIndex:** :sparkles: Improve CreateIndexButton Functionality ([6a60509](https://github.com/SkepticMystic/breadcrumbs/commit/6a6050983831f87e9476ebcc4bb1deca62abc4ac))

### 0.9.1 (2021-07-20)


### Bug Fixes

* "normal" bug. Cannot destructure gParents ([00901ae](https://github.com/SkepticMystic/breadcrumbs/commit/00901ae87790f9f8ec9a8042331fc8b071463b19))
* "Not path to..." was a link ([3d8e237](https://github.com/SkepticMystic/breadcrumbs/commit/3d8e237dea0dbfd58823cfe4d579ce3f6dce03ad))
* breacrumb trail with multiple parent fields ([ab3a2a5](https://github.com/SkepticMystic/breadcrumbs/commit/ab3a2a562f8da3da5a66966d60f7c68631af3b57))
* **conventional commits:** add standard-version to project ([8863074](https://github.com/SkepticMystic/breadcrumbs/commit/8863074f83362eba8de9d524a5666f165c936dbb))
* don't show current note when `indexNote?` ([5cd032c](https://github.com/SkepticMystic/breadcrumbs/commit/5cd032c72cf3a1f990a86ca8a90e36ad34504daf))
* don't show trail on kanbans ([eb8fefc](https://github.com/SkepticMystic/breadcrumbs/commit/eb8fefcde6ae57e487ca547d90c04abd6cd29b21))
* drop alias for Juggl Links ([011f7ad](https://github.com/SkepticMystic/breadcrumbs/commit/011f7add7c73ba4a69927e348e0f3713f099e448))
* empty pane ([119a680](https://github.com/SkepticMystic/breadcrumbs/commit/119a68046a70ebc1e49447b1530553193beb048c))
* indexNote arr ([9800573](https://github.com/SkepticMystic/breadcrumbs/commit/98005734073269e9c77bfba339990fd74c5925a2))
* inefficient removeDuplicateImplied ([3d2b88e](https://github.com/SkepticMystic/breadcrumbs/commit/3d2b88edeb252da3acf583d1e080911ef9e71c20))
* links now have real href and data-href ([1f6b61c](https://github.com/SkepticMystic/breadcrumbs/commit/1f6b61cf558b3176dedd0482fa64de65f71f00f6))
* list view numbers "resetting" at 0 ([fc32d66](https://github.com/SkepticMystic/breadcrumbs/commit/fc32d667ba24456af80a685e1b359d770cc3074d))
* rather focus leaf if item.to is already open ([4757999](https://github.com/SkepticMystic/breadcrumbs/commit/4757999894c0d408767a4d79526e865594f63258))
* real sibling implies a sibling ([a9eefb5](https://github.com/SkepticMystic/breadcrumbs/commit/a9eefb57a3a4284047ba9c3c23a72ec6add440da))
* removeDuplicateImplied ([c6379c2](https://github.com/SkepticMystic/breadcrumbs/commit/c6379c2564d02670c00a5bec30c3f0b2abcb8c77))
* removeDupliedImplied ([82409d7](https://github.com/SkepticMystic/breadcrumbs/commit/82409d7499e62cbefcbe5d1fac0af87f5821c88b))
* show multiple paths if `indexNote?` ([e302a97](https://github.com/SkepticMystic/breadcrumbs/commit/e302a97e01e8861d49eb624dae24282af2e08b36))
* Trail stays open ([b665927](https://github.com/SkepticMystic/breadcrumbs/commit/b66592781024485aa38435d70bdfa5eb59b9a251))
* TrailGrid overlap ([627c64d](https://github.com/SkepticMystic/breadcrumbs/commit/627c64d856a2cf9d152c6205eaa660faabcbd8e7))
* trailOrTable ([ceb61cd](https://github.com/SkepticMystic/breadcrumbs/commit/ceb61cd4fdc4b7789ac52369d66541d109b4d878))

[Unreleased]: https://github.com/michaelpporter/breadcrumbs/compare/4.15.2...HEAD
