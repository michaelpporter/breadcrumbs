import { _add_explicit_edges_typed_link } from "src/graph/builders/explicit/typed_link";
import { TFile } from "obsidian";
import { describe, test } from "vitest";
import { make_all_files, make_plugin, mock_file } from "./helpers";

function mock_tfile(path: string): TFile {
	return Object.assign(new TFile(), { path }) as TFile;
}

function plugin(
	edge_labels = ["up", "down", "same"],
	resolve_link?: (link: string, source_path: string) => TFile | null,
) {
	return make_plugin(
		{ edge_fields: edge_labels.map((l) => ({ label: l })) },
		[],
		resolve_link,
	);
}

// ---- Obsidian frontmatterLinks branch ----

describe("typed_link builder — Obsidian branch", () => {
	test("no files → empty results", (t) => {
		const r = _add_explicit_edges_typed_link(plugin(), make_all_files([]));
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.nodes).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});

	test("files without frontmatterLinks → no edges", (t) => {
		const files = [mock_file("a.md"), mock_file("b.md", { frontmatter: { title: "hi" } })];
		const r = _add_explicit_edges_typed_link(plugin(), make_all_files(files));
		t.expect(r.edges).toHaveLength(0);
	});

	test("frontmatterLink with field not in edge_fields → no edge", (t) => {
		const files = [
			mock_file("a.md", {
				frontmatterLinks: [{ key: "unknown-field", link: "b" }],
			}),
		];
		const r = _add_explicit_edges_typed_link(plugin(), make_all_files(files));
		t.expect(r.edges).toHaveLength(0);
	});

	test("unresolved link → edge + unresolved node added", (t) => {
		const files = [
			mock_file("a.md", {
				frontmatterLinks: [{ key: "up", link: "b" }],
			}),
		];
		const r = _add_explicit_edges_typed_link(plugin(), make_all_files(files));
		t.expect(r.edges).toHaveLength(1);
		t.expect(r.edges[0]!.source).toBe("a.md");
		t.expect(r.edges[0]!.edge_type).toBe("up");
		t.expect(r.edges[0]!.edge_source).toBe("typed_link");
		t.expect(r.nodes).toHaveLength(1);
	});

	test("resolved link → edge only, no unresolved node", (t) => {
		const files = [
			mock_file("a.md", {
				frontmatterLinks: [{ key: "up", link: "b" }],
			}),
		];
		const r = _add_explicit_edges_typed_link(
			plugin(["up", "down"], () => mock_tfile("b.md")),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(1);
		t.expect(r.edges[0]!.target).toBe("b.md");
		t.expect(r.nodes).toHaveLength(0);
	});

	test("list-type key 'up.0' → field extracted as 'up'", (t) => {
		const files = [
			mock_file("a.md", {
				frontmatterLinks: [{ key: "up.0", link: "b" }],
			}),
		];
		const r = _add_explicit_edges_typed_link(plugin(), make_all_files(files));
		t.expect(r.edges).toHaveLength(1);
		t.expect(r.edges[0]!.edge_type).toBe("up");
	});

	test("multiple frontmatterLinks → multiple edges", (t) => {
		const files = [
			mock_file("a.md", {
				frontmatterLinks: [
					{ key: "up", link: "parent" },
					{ key: "down", link: "child" },
					{ key: "same", link: "sibling" },
				],
			}),
		];
		const r = _add_explicit_edges_typed_link(plugin(), make_all_files(files));
		t.expect(r.edges).toHaveLength(3);
	});

	test("multiple files with frontmatterLinks → edges from each", (t) => {
		const files = [
			mock_file("a.md", { frontmatterLinks: [{ key: "up", link: "root" }] }),
			mock_file("b.md", { frontmatterLinks: [{ key: "up", link: "root" }] }),
		];
		const r = _add_explicit_edges_typed_link(plugin(), make_all_files(files));
		const sources = r.edges.map((e) => e.source);
		t.expect(r.edges).toHaveLength(2);
		t.expect(sources).toContain("a.md");
		t.expect(sources).toContain("b.md");
	});
});

// ---- Dataview branch ----

describe("typed_link builder — Dataview branch", () => {
	function dv_page(
		path: string,
		fields: Record<string, unknown>,
		frontmatter: Record<string, unknown> = {},
	) {
		return { file: { path, frontmatter }, ...fields };
	}

	function make_dv_files(
		pages: ReturnType<typeof dv_page>[],
		with_obsidian = false,
	) {
		return {
			obsidian: with_obsidian
				? (pages.map((p) => ({
						file: mock_file(p.file.path).file,
						cache: { frontmatter: p.file.frontmatter },
					})) as never)
				: null,
			dataview: pages as never,
		};
	}

	test("Link object → edge created", (t) => {
		const pages = [dv_page("a.md", { up: { path: "b.md" } })];
		const r = _add_explicit_edges_typed_link(plugin(), make_dv_files(pages));
		t.expect(r.edges).toHaveLength(1);
		t.expect(r.edges[0]!.source).toBe("a.md");
		t.expect(r.edges[0]!.edge_type).toBe("up");
		t.expect(r.edges[0]!.edge_source).toBe("typed_link");
	});

	test("markdown link string → edge created", (t) => {
		const pages = [dv_page("a.md", { up: "[Parent](parent.md)" })];
		const r = _add_explicit_edges_typed_link(plugin(), make_dv_files(pages));
		t.expect(r.edges).toHaveLength(1);
		t.expect(r.edges[0]!.edge_type).toBe("up");
	});

	test("array of Link objects → one edge per link", (t) => {
		const pages = [
			dv_page("a.md", { up: [{ path: "b.md" }, { path: "c.md" }] }),
		];
		const r = _add_explicit_edges_typed_link(plugin(), make_dv_files(pages));
		t.expect(r.edges).toHaveLength(2);
	});

	test("non-link string (no markdown link pattern) → silently skipped", (t) => {
		// Strings that don't match [text](path) are skipped, not errors
		const pages = [dv_page("a.md", { up: "not-a-link" })];
		const r = _add_explicit_edges_typed_link(plugin(), make_dv_files(pages));
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});

	test("invalid value type (number) → error", (t) => {
		const pages = [dv_page("a.md", { up: 42 })];
		const r = _add_explicit_edges_typed_link(plugin(), make_dv_files(pages));
		t.expect(r.errors).toHaveLength(1);
		t.expect(r.errors[0]!.code).toBe("invalid_field_value");
	});

	test("LuxonDateTime-like value → error", (t) => {
		const pages = [dv_page("a.md", { up: { isLuxonDateTime: true, toString: () => "2024-01-01" } })];
		const r = _add_explicit_edges_typed_link(plugin(), make_dv_files(pages));
		t.expect(r.errors).toHaveLength(1);
		t.expect(r.errors[0]!.code).toBe("invalid_field_value");
	});

	test("null/falsy value → skipped, no error", (t) => {
		const pages = [dv_page("a.md", { up: null })];
		const r = _add_explicit_edges_typed_link(plugin(), make_dv_files(pages));
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});

	test("when obsidian branch active, skips fields already in frontmatter", (t) => {
		// 'up' is in frontmatter → dataview should skip it (no duplicate edge)
		const pages = [dv_page("a.md", { up: { path: "b.md" } }, { up: "[[b]]" })];
		const r = _add_explicit_edges_typed_link(plugin(), make_dv_files(pages, true));
		// obsidian branch has no frontmatterLinks, so 0 from there
		// dataview branch skips 'up' because it's in frontmatter_keys
		t.expect(r.edges).toHaveLength(0);
	});

	test("when obsidian branch null, dataview processes frontmatter fields", (t) => {
		// obsidian: null → frontmatter_keys is null → dataview processes all
		const pages = [dv_page("a.md", { up: { path: "b.md" } }, { up: "[[b]]" })];
		const r = _add_explicit_edges_typed_link(plugin(), make_dv_files(pages, false));
		t.expect(r.edges).toHaveLength(1);
	});

	test("'file' and 'aliases' fields always skipped", (t) => {
		// These are Dataview reserved keys, never treated as edge fields
		const labels = ["up", "file", "aliases"];
		const pages = [
			dv_page("a.md", {
				file: { path: "a.md", frontmatter: {} },
				aliases: [{ path: "b.md" }],
				up: { path: "c.md" },
			}),
		];
		const r = _add_explicit_edges_typed_link(
			make_plugin({ edge_fields: labels.map((l) => ({ label: l })) }),
			make_dv_files(pages),
		);
		const types = r.edges.map((e) => e.edge_type);
		t.expect(types).not.toContain("aliases");
		t.expect(types).toContain("up");
	});
});
