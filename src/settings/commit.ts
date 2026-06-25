/**
 * The follow-up effects a settings change requires, named by *what the setting
 * affects* rather than by the effect to run:
 *
 * - `"graph"` — changes the edge graph (builder fields, implied rules) →
 *   rebuild + save. The rebuild cascades to a view refresh via `GRAPH_UPDATE`.
 * - `"views"` — changes only how existing edges render → refresh + save.
 * - `"none"` — affects neither the live graph nor the rendered views (command
 *   defaults, debug, etc.) → save only.
 *
 * Every setting change saves; the policy names the *extra* effect. Centralising
 * the mapping here keeps the ~140 settings callbacks from each re-deciding it.
 */
export type SettingEffect = "graph" | "views" | "none";

/** The plugin methods `commit_setting` composes (structurally satisfied by the plugin). */
export interface CommitDeps {
	rebuildGraph: () => Promise<void> | void;
	refreshViews: () => void;
	saveSettings: () => Promise<void>;
}

/** Apply the save + effect policy after a settings field has been written. */
export async function commit_setting(
	deps: CommitDeps,
	policy: SettingEffect,
): Promise<void> {
	switch (policy) {
		case "graph":
			// rebuild and save are independent — run them in parallel.
			await Promise.all([deps.rebuildGraph(), deps.saveSettings()]);
			break;
		case "views":
			deps.refreshViews();
			await deps.saveSettings();
			break;
		case "none":
			await deps.saveSettings();
			break;
	}
}
