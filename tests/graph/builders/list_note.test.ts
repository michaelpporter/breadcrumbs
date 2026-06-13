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

	test("BC-list-note-section scopes edges to one heading", async (t) => {
		const content = "# Index\n- [[A]]\n- [[B]]\n# Other\n- [[C]]";
		const list = mock_file("list.md", {
			frontmatter: {
				"BC-list-note-field": "down",
				"BC-list-note-section": "Index",
			},
			headings: [
				{ line: 0, level: 1, heading: "Index" },
				{ line: 3, level: 1, heading: "Other" },
			],
			listItems: [
				{ line: 1, col: 0, parent: -1 },
				{ line: 2, col: 0, parent: -1 },
				{ line: 4, col: 0, parent: -1 },
			],
			links: [
				{ line: 1, link: "A" },
				{ line: 2, link: "B" },
				{ line: 4, link: "C" },
			],
		});

		const r = await _add_explicit_edges_list_note(
			make_plugin(
				{ edge_fields: EDGE_FIELDS, explicit_edge_sources: {} as never },
				[],
				link_resolver(["A", "B", "C"]),
				{ cachedRead: async () => content },
			),
			make_all_files([list]),
		);

		const targets = r.edges.map((e) => e.target);
		t.expect(targets).toContainEqual("A.md");
		t.expect(targets).toContainEqual("B.md");
		t.expect(targets).not.toContainEqual("C.md");
	});

	test("section boundary stops at next equal/higher-level heading, not sub-headings", async (t) => {
		const content =
			"# Index\n- [[A]]\n## Sub\n- [[B]]\n# Other\n- [[C]]";
		const list = mock_file("list.md", {
			frontmatter: {
				"BC-list-note-field": "down",
				"BC-list-note-section": "Index",
			},
			headings: [
				{ line: 0, level: 1, heading: "Index" },
				{ line: 2, level: 2, heading: "Sub" },
				{ line: 4, level: 1, heading: "Other" },
			],
			listItems: [
				{ line: 1, col: 0, parent: -1 },
				{ line: 3, col: 0, parent: -1 },
				{ line: 5, col: 0, parent: -1 },
			],
			links: [
				{ line: 1, link: "A" },
				{ line: 3, link: "B" },
				{ line: 5, link: "C" },
			],
		});

		const r = await _add_explicit_edges_list_note(
			make_plugin(
				{ edge_fields: EDGE_FIELDS, explicit_edge_sources: {} as never },
				[],
				link_resolver(["A", "B", "C"]),
				{ cachedRead: async () => content },
			),
			make_all_files([list]),
		);

		const targets = r.edges.map((e) => e.target);
		t.expect(targets).toContainEqual("A.md");
		t.expect(targets).toContainEqual("B.md");
		t.expect(targets).not.toContainEqual("C.md");
	});

	test("BC-list-note-section with no matching heading → 0 edges, 0 errors", async (t) => {
		const content = "# Index\n- [[A]]";
		const list = mock_file("list.md", {
			frontmatter: {
				"BC-list-note-field": "down",
				"BC-list-note-section": "Nope",
			},
			headings: [{ line: 0, level: 1, heading: "Index" }],
			listItems: [{ line: 1, col: 0, parent: -1 }],
			links: [{ line: 1, link: "A" }],
		});

		const r = await _add_explicit_edges_list_note(
			make_plugin(
				{ edge_fields: EDGE_FIELDS, explicit_edge_sources: {} as never },
				[],
				link_resolver(["A"]),
				{ cachedRead: async () => content },
			),
			make_all_files([list]),
		);

		t.expect(r.edges).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});

	test("BC-list-note-exclude skips edges to listed links", async (t) => {
		const content = "- [[A]]\n- [[B]]";
		const list = mock_file("list.md", {
			frontmatter: {
				"BC-list-note-field": "down",
				"BC-list-note-exclude": ["[[B]]"],
			},
			frontmatterLinks: [{ key: "BC-list-note-exclude", link: "B" }],
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

		const targets = r.edges.map((e) => e.target);
		t.expect(targets).toContainEqual("A.md");
		t.expect(targets).not.toContainEqual("B.md");
	});

	test("BC-list-note-exclude applies to a nested child target", async (t) => {
		const content = "- [[A]]\n\t- [[B]]\n\t- [[C]]";
		const list = mock_file("list.md", {
			frontmatter: {
				"BC-list-note-field": "down",
				"BC-list-note-exclude": ["[[B]]"],
			},
			frontmatterLinks: [{ key: "BC-list-note-exclude", link: "B" }],
			listItems: [
				{ line: 0, col: 0, parent: -1 },
				{ line: 1, col: 1, parent: 0 },
				{ line: 2, col: 1, parent: 0 },
			],
			links: [
				{ line: 0, link: "A" },
				{ line: 1, link: "B" },
				{ line: 2, link: "C" },
			],
		});

		const r = await _add_explicit_edges_list_note(
			make_plugin(
				{ edge_fields: EDGE_FIELDS, explicit_edge_sources: {} as never },
				[],
				link_resolver(["A", "B", "C"]),
				{ cachedRead: async () => content },
			),
			make_all_files([list]),
		);

		const pairs = r.edges.map((e) => [e.source, e.target]);
		t.expect(pairs).toContainEqual(["A.md", "C.md"]);
		t.expect(pairs).not.toContainEqual(["A.md", "B.md"]);
	});

	test("BC-list-note-exclude as a YAML list excludes every entry", async (t) => {
		const content = "- [[A]]\n- [[B]]\n- [[C]]";
		const list = mock_file("list.md", {
			frontmatter: {
				"BC-list-note-field": "down",
				"BC-list-note-exclude": ["[[B]]", "[[C]]"],
			},
			frontmatterLinks: [
				{ key: "BC-list-note-exclude.0", link: "B" },
				{ key: "BC-list-note-exclude.1", link: "C" },
			],
			listItems: [
				{ line: 0, col: 0, parent: -1 },
				{ line: 1, col: 0, parent: -1 },
				{ line: 2, col: 0, parent: -1 },
			],
			links: [
				{ line: 0, link: "A" },
				{ line: 1, link: "B" },
				{ line: 2, link: "C" },
			],
		});

		const r = await _add_explicit_edges_list_note(
			make_plugin(
				{ edge_fields: EDGE_FIELDS, explicit_edge_sources: {} as never },
				[],
				link_resolver(["A", "B", "C"]),
				{ cachedRead: async () => content },
			),
			make_all_files([list]),
		);

		const targets = r.edges.map((e) => e.target);
		t.expect(targets).toEqual(["A.md"]);
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
