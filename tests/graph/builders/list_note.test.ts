import { _add_explicit_edges_list_note } from "src/graph/builders/explicit/list_note";
import type { TFile } from "obsidian";
import { describe, test } from "vitest";
import { make_all_files, make_plugin, mock_file } from "./helpers";

const EDGE_FIELDS = [{ label: "up" }, { label: "down" }];

/** Resolve bare link names ("A") to a TFile at "A.md". */
function link_resolver(names: string[]) {
	const files = new Map<string, TFile>(
		names.map((n) => [n, mock_file(`${n}.md`).file as unknown as TFile]),
	);
	return (link: string) => files.get(link) ?? null;
}

describe("list_note builder", () => {
	test("top-level list items become child edges", async (t) => {
		const content = "- [[A]]\n- [[B]]";
		const list = mock_file("list.md", {
			frontmatter: { "BC-list-note-field": "down" },
			listItems: [
				{ line: 0, col: 0, parent: -1 },
				{ line: 1, col: 0, parent: -1 },
			],
			links: [
				{ line: 0, link: "A" },
				{ line: 1, link: "B" },
			],
		});

		const r = await _add_explicit_edges_list_note(
			make_plugin(
				{ edge_fields: EDGE_FIELDS, explicit_edge_sources: {} as never },
				[],
				link_resolver(["A", "B"]),
				{ cachedRead: async () => content },
			),
			make_all_files([list]),
		);

		const pairs = r.edges.map((e) => [e.source, e.target]);
		t.expect(pairs).toContainEqual(["list.md", "A.md"]);
		t.expect(pairs).toContainEqual(["list.md", "B.md"]);
		t.expect(r.edges.every((e) => e.edge_type === "down")).toBe(true);
		t.expect(r.edges[0]!.edge_source).toBe("list_note");
	});

	test("note without BC-list-note-field is skipped", async (t) => {
		const r = await _add_explicit_edges_list_note(
			make_plugin(
				{ edge_fields: EDGE_FIELDS, explicit_edge_sources: {} as never },
				[],
				link_resolver(["A"]),
				{ cachedRead: async () => "- [[A]]" },
			),
			make_all_files([mock_file("plain.md", { frontmatter: {} })]),
		);
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});

	test("non-string field → invalid_field_value", async (t) => {
		const r = await _add_explicit_edges_list_note(
			make_plugin({
				edge_fields: EDGE_FIELDS,
				explicit_edge_sources: {} as never,
			}),
			make_all_files([
				mock_file("list.md", {
					frontmatter: { "BC-list-note-field": 5 },
				}),
			]),
		);
		t.expect(r.errors[0]!.code).toBe("invalid_field_value");
	});

	test("field not in edge_fields → invalid_edge_field", async (t) => {
		const r = await _add_explicit_edges_list_note(
			make_plugin({
				edge_fields: EDGE_FIELDS,
				explicit_edge_sources: {} as never,
			}),
			make_all_files([
				mock_file("list.md", {
					frontmatter: { "BC-list-note-field": "nope" },
				}),
			]),
		);
		t.expect(r.errors[0]!.code).toBe("invalid_edge_field");
	});
});
