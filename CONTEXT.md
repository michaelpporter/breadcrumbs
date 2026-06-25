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
