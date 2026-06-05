import { _add_explicit_edges_dataview_note } from "src/graph/builders/explicit/dataview_note";
import { describe, test } from "vitest";
import { make_all_files, make_plugin, mock_file } from "./helpers";

function plugin(
	dataview_pages?: (query: string, path: string) => unknown,
	edge_fields = [{ label: "up" }],
) {
	return make_plugin(
		{ edge_fields, explicit_edge_sources: {} as never },
		[],
		undefined,
		dataview_pages ? { dataview_pages } : {},
	);
}

const QUERY_NOTE = {
	"BC-dataview-note-query": '"some/folder"',
	"BC-dataview-note-field": "up",
};

describe("dataview_note builder", () => {
	test("query results → edges to each page", async (t) => {
		const r = await _add_explicit_edges_dataview_note(
			plugin(() => [{ file: { path: "X.md" } }, { file: { path: "Y.md" } }]),
			make_all_files([mock_file("hub.md", { frontmatter: QUERY_NOTE })]),
		);
		const pairs = r.edges.map((e) => [e.source, e.target]);
		t.expect(pairs).toContainEqual(["hub.md", "X.md"]);
		t.expect(pairs).toContainEqual(["hub.md", "Y.md"]);
		t.expect(r.edges.every((e) => e.edge_type === "up")).toBe(true);
	});

	test("Dataview DataArray ({ values }) is normalized", async (t) => {
		const r = await _add_explicit_edges_dataview_note(
			plugin(() => ({ values: [{ file: { path: "X.md" } }] })),
			make_all_files([mock_file("hub.md", { frontmatter: QUERY_NOTE })]),
		);
		t.expect(r.edges.map((e) => e.target)).toContain("X.md");
	});

	test("Dataview not installed → missing_other_plugin error", async (t) => {
		const r = await _add_explicit_edges_dataview_note(
			plugin(undefined),
			make_all_files([mock_file("hub.md", { frontmatter: QUERY_NOTE })]),
		);
		t.expect(r.errors[0]!.code).toBe("missing_other_plugin");
	});

	test("query throwing → invalid query error", async (t) => {
		const r = await _add_explicit_edges_dataview_note(
			plugin(() => {
				throw new Error("bad DQL");
			}),
			make_all_files([mock_file("hub.md", { frontmatter: QUERY_NOTE })]),
		);
		t.expect(r.errors[0]!.code).toBe("invalid_field_value");
	});

	test("field not in edge_fields → invalid_edge_field", async (t) => {
		const r = await _add_explicit_edges_dataview_note(
			plugin(() => []),
			make_all_files([
				mock_file("hub.md", {
					frontmatter: {
						"BC-dataview-note-query": '"x"',
						"BC-dataview-note-field": "nope",
					},
				}),
			]),
		);
		t.expect(r.errors[0]!.code).toBe("invalid_edge_field");
	});

	test("note without a query is skipped", async (t) => {
		const r = await _add_explicit_edges_dataview_note(
			plugin(() => []),
			make_all_files([mock_file("plain.md", { frontmatter: {} })]),
		);
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});
});
