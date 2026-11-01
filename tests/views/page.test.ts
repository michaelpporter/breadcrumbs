import { can_reuse_page_view } from "src/views/page";
import { describe, expect, test, vi } from "vitest";

// page.ts mounts a Svelte component; the decision under test doesn't need it.
vi.mock("src/components/page_views/index.svelte", () => ({ default: {} }));

const state = {
	mode: "preview",
	sticky: false,
	file_path: "a.md",
	graph_version: 1,
};

describe("can_reuse_page_view", () => {
	test("reuses the mount when nothing changed (#698 layout-change flood)", (t) => {
		t.expect(can_reuse_page_view(state, { ...state })).toBe(true);
	});

	test("remounts when there is no existing mount", (t) => {
		t.expect(can_reuse_page_view(undefined, state)).toBe(false);
	});

	test.each(["mode", "sticky", "file_path"] as const)(
		"remounts when %s changes",
		(key) => {
			const next = {
				...state,
				[key]: key === "sticky" ? true : "other",
			};
			expect(can_reuse_page_view(state, next)).toBe(false);
		},
	);

	// Regression: page views kept PathLists from the old graph revision after a
	// rebuild, so the trail went stale and its depth controls threw
	// "Revision mismatch".
	test("remounts after a graph update", (t) => {
		t.expect(
			can_reuse_page_view(state, { ...state, graph_version: 2 }),
		).toBe(false);
	});
});
