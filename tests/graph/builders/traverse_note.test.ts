import { _add_explicit_edges_traverse_note } from "src/graph/builders/explicit/traverse_note";
import { describe, test } from "vitest";
import { make_all_files, make_plugin, mock_file } from "./helpers";

function plugin(
	resolvedLinks: Record<string, Record<string, number>> = {},
	edge_fields = [{ label: "up" }],
) {
	return make_plugin(
		{ edge_fields, explicit_edge_sources: {} as never },
		[],
		undefined,
		{ resolvedLinks },
	);
}

const FIELD = { "BC-traverse-note-field": "up" };

describe("traverse_note builder", () => {
	test("note without BC-traverse-note-field → no edges", async (t) => {
		const r = await _add_explicit_edges_traverse_note(
			plugin({ "A.md": { "B.md": 1 } }),
			make_all_files([mock_file("A.md")]),
		);
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});

	test("DFS edges follow resolvedLinks from the start note", async (t) => {
		const r = await _add_explicit_edges_traverse_note(
			plugin({ "A.md": { "B.md": 1 }, "B.md": { "C.md": 1 } }),
			make_all_files([mock_file("A.md", { frontmatter: FIELD })]),
		);
		const pairs = r.edges.map((e) => [e.source, e.target]);
		t.expect(pairs).toContainEqual(["A.md", "B.md"]);
		t.expect(pairs).toContainEqual(["B.md", "C.md"]);
		t.expect(r.edges.every((e) => e.edge_type === "up")).toBe(true);
	});

	test("cycles are not revisited", async (t) => {
		const r = await _add_explicit_edges_traverse_note(
			plugin({ "A.md": { "B.md": 1 }, "B.md": { "A.md": 1 } }),
			make_all_files([mock_file("A.md", { frontmatter: FIELD })]),
		);
		// A is the visited start, so B's link back to A is dropped — only A→B remains
		const pairs = r.edges.map((e) => [e.source, e.target]);
		t.expect(pairs).toContainEqual(["A.md", "B.md"]);
		t.expect(r.edges).toHaveLength(1);
	});

	test("non-string field → invalid_field_value", async (t) => {
		const r = await _add_explicit_edges_traverse_note(
			plugin({ "A.md": { "B.md": 1 } }),
			make_all_files([
				mock_file("A.md", {
					frontmatter: { "BC-traverse-note-field": 7 },
				}),
			]),
		);
		t.expect(r.errors[0]!.code).toBe("invalid_field_value");
	});

	test("field not in edge_fields → invalid_edge_field", async (t) => {
		const r = await _add_explicit_edges_traverse_note(
			plugin({ "A.md": { "B.md": 1 } }),
			make_all_files([
				mock_file("A.md", {
					frontmatter: { "BC-traverse-note-field": "nope" },
				}),
			]),
		);
		t.expect(r.errors[0]!.code).toBe("invalid_edge_field");
	});

	test("edge_source is traverse_note", async (t) => {
		const r = await _add_explicit_edges_traverse_note(
			plugin({ "A.md": { "B.md": 1 } }),
			make_all_files([mock_file("A.md", { frontmatter: FIELD })]),
		);
		t.expect(r.edges[0]!.edge_source).toBe("traverse_note");
	});
});
