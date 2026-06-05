# Perf + cleanup pass — progress log

Tracks an incremental cleanup/performance pass. **One item per commit.** Resuming a
session? Read this file first, find the next `todo`, do that one item, verify, update
the row, stop.

Full plan rationale lives in the approved plan file (Claude plan
`do-you-suggest-any-agile-kazoo`). Branch: `perf-cleanup`.

## Items

| # | Item | Status | Commit | Notes |
|---|------|--------|--------|-------|
| 1a | Debounce view setting write-backs (TreeView/Matrix/TrailView → `saveSettingsDebounced`) | done | 53a1f89 | build clean, 0 errors |
| 1b | Index date_note period lookups (Map instead of `.find()`, O(n·m)→O(n)) | todo | | |
| 1c | Debounce opt-in layout-change rebuild (`main.ts:218` → `rebuildGraphDebounced`) | todo | | |
| 2a | Remove dead code (`utils/markmap.ts`, commented Traverse import, EdgeToAdd type) | todo | | |
| 2b | Tighten `any` casts (dataview plugin access, metadataTypeManager) | todo | | |
| 3 | Dedup `validate_edge_field` across 9 explicit builders | todo | | bigger diff, hot path |
| 4 | Tests for untested builders (date_note, list_note, folder_note, dataview_note, traverse_note) | todo | | date_note test guards 1b |

## Notes per item

### 1a — Debounce view setting write-backs
Three view components saved settings to disk on every local `$state` change. Swapped
`void plugin.saveSettings()` → `plugin.saveSettingsDebounced()` (existing 600ms
debouncer, `main.ts:51`) in the writeback `$effect` of:
- `src/components/side_views/TreeView.svelte`
- `src/components/side_views/Matrix.svelte`
- `src/components/page_views/TrailView.svelte` (also dropped the now-needless `untrack`
  wrapper — the debouncer reads nothing reactive)

No behavior change beyond coalescing rapid disk writes. Verify: `bun run build`.
