import type BreadcrumbsPlugin from "src/main";
import { json_clone } from "src/utils/json_clone";
import { effect_counter } from "src/utils/perf";
import { untrack } from "svelte";

export interface ViewSettingsSlice<T> {
	/** Perf / storm-detection label, e.g. `"TreeView"`. */
	label: string;
	/** Read the view's slice out of the (current) plugin settings. */
	read: (plugin: BreadcrumbsPlugin) => T;
	/** Write the view's slice back into the (current) plugin settings. */
	write: (plugin: BreadcrumbsPlugin, value: T) => void;
}

/**
 * Owns a local `$state` mirror of one view's settings slice and keeps it
 * two-way synced with `plugin.settings`, loop-safely.
 *
 * See `CONTEXT.md` ("View settings sync") for the full invariant. In short:
 * - the mirror is seeded once and resynced **in place** (`Object.assign`),
 *   never reassigned — the returned proxy stays the same object reference, so
 *   the caller's `bind:value`s keep pointing at it;
 * - the global write happens inside `untrack`, so the writeback creates no
 *   reactive dependency — this is what breaks the #685 infinite loop;
 * - the debounced save is skipped on the first run (mount is not a user edit).
 *
 * Call once at component init and bind the returned proxy in the template.
 */
export function useViewSettings<T>(
	plugin: BreadcrumbsPlugin,
	slice: ViewSettingsSlice<T>,
): T {
	const settings = $state<T>(json_clone(slice.read(plugin)));

	// `plugin` is a constant singleton per component instance, so this guard
	// only ever fires once (first run) — a faithful transcription of the
	// per-view resync block, which was written defensively for a plugin swap.
	let last_plugin: BreadcrumbsPlugin | null = null;
	$effect.pre(() => {
		if (last_plugin !== plugin) {
			last_plugin = plugin;
			Object.assign(
				settings as object,
				json_clone(untrack(() => $state.snapshot(slice.read(plugin)))),
			);
		}
	});

	const tick_writeback = effect_counter(`${slice.label}.writeback`);
	let is_initial_mount = true;
	$effect(() => {
		tick_writeback();
		const snapshot = $state.snapshot(settings) as T;
		untrack(() => {
			slice.write(plugin, snapshot);
			if (is_initial_mount) {
				is_initial_mount = false;
			} else {
				plugin.saveSettingsDebounced();
			}
		});
	});

	return settings;
}
