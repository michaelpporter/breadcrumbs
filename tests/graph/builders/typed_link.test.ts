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
	test("no files → empty results", async (t) => {
		const r = await _add_explicit_edges_typed_link(plugin(), make_all_files([]));
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.nodes).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});

	test("files without frontmatterLinks → no edges", async (t) => {
		const files = [mock_file("a.md"), mock_file("b.md", { frontmatter: { title: "hi" } })];
		const r = await _add_explicit_edges_typed_link(plugin(), make_all_files(files));
		t.expect(r.edges).toHaveLength(0);
	});

	test("frontmatterLink with field not in edge_fields → no edge", async (t) => {
		const files = [
			mock_file("a.md", {
				frontmatterLinks: [{ key: "unknown-field", link: "b" }],
			}),
		];
		const r = await _add_explicit_edges_typed_link(plugin(), make_all_files(files));
		t.expect(r.edges).toHaveLength(0);
	});

	test("unresolved link → edge + unresolved node added", async (t) => {
		const files = [
			mock_file("a.md", {
				frontmatterLinks: [{ key: "up", link: "b" }],
			}),
		];
		const r = await _add_explicit_edges_typed_link(plugin(), make_all_files(files));
		t.expect(r.edges).toHaveLength(1);
		t.expect(r.edges[0]!.source).toBe("a.md");
		t.expect(r.edges[0]!.edge_type).toBe("up");
		t.expect(r.edges[0]!.edge_source).toBe("typed_link");
		t.expect(r.nodes).toHaveLength(1);
	});

	test("resolved link → edge only, no unresolved node", async (t) => {
		const files = [
			mock_file("a.md", {
				frontmatterLinks: [{ key: "up", link: "b" }],
			}),
		];
		const r = await _add_explicit_edges_typed_link(
			plugin(["up", "down"], () => mock_tfile("b.md")),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(1);
		t.expect(r.edges[0]!.target).toBe("b.md");
		t.expect(r.nodes).toHaveLength(0);
	});

	test("list-type key 'up.0' → field extracted as 'up'", async (t) => {
		const files = [
			mock_file("a.md", {
				frontmatterLinks: [{ key: "up.0", link: "b" }],
			}),
		];
		const r = await _add_explicit_edges_typed_link(plugin(), make_all_files(files));
		t.expect(r.edges).toHaveLength(1);
		t.expect(r.edges[0]!.edge_type).toBe("up");
	});

	test("multiple frontmatterLinks → multiple edges", async (t) => {
		const files = [
			mock_file("a.md", {
				frontmatterLinks: [
					{ key: "up", link: "parent" },
					{ key: "down", link: "child" },
					{ key: "same", link: "sibling" },
				],
			}),
		];
		const r = await _add_explicit_edges_typed_link(plugin(), make_all_files(files));
		t.expect(r.edges).toHaveLength(3);
	});

	test("multiple files with frontmatterLinks → edges from each", async (t) => {
		const files = [
			mock_file("a.md", { frontmatterLinks: [{ key: "up", link: "root" }] }),
			mock_file("b.md", { frontmatterLinks: [{ key: "up", link: "root" }] }),
		];
		const r = await _add_explicit_edges_typed_link(plugin(), make_all_files(files));
		const sources = r.edges.map((e) => e.source);
		t.expect(r.edges).toHaveLength(2);
		t.expect(sources).toContain("a.md");
		t.expect(sources).toContain("b.md");
	});
});

