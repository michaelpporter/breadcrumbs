import { commit_setting, type CommitDeps } from "src/settings/commit";
import { describe, expect, it, vi } from "vitest";

function spyDeps() {
	return {
		rebuildGraph: vi.fn().mockResolvedValue(undefined),
		refreshViews: vi.fn(),
		saveSettings: vi.fn().mockResolvedValue(undefined),
	} satisfies CommitDeps;
}

describe("commit_setting", () => {
	it('"graph" rebuilds and saves, but does not directly refresh', async () => {
		const deps = spyDeps();
		await commit_setting(deps, "graph");

		expect(deps.rebuildGraph).toHaveBeenCalledOnce();
		expect(deps.saveSettings).toHaveBeenCalledOnce();
		// rebuild cascades to a refresh via GRAPH_UPDATE — not called here directly.
		expect(deps.refreshViews).not.toHaveBeenCalled();
	});

	it('"views" refreshes and saves, but does not rebuild', async () => {
		const deps = spyDeps();
		await commit_setting(deps, "views");

		expect(deps.refreshViews).toHaveBeenCalledOnce();
		expect(deps.saveSettings).toHaveBeenCalledOnce();
		expect(deps.rebuildGraph).not.toHaveBeenCalled();
	});

	it('"none" saves only', async () => {
		const deps = spyDeps();
		await commit_setting(deps, "none");

		expect(deps.saveSettings).toHaveBeenCalledOnce();
		expect(deps.rebuildGraph).not.toHaveBeenCalled();
		expect(deps.refreshViews).not.toHaveBeenCalled();
	});
});
