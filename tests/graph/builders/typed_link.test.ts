import {
	_add_explicit_edges_typed_link,
	parse_inline_field,
} from "src/graph/builders/explicit/typed_link";
import { TFile } from "obsidian";
import { describe, expect, test } from "vitest";
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

// ---- Body inline-field branch ----

/** Build a plugin whose cachedRead returns `body` for any file. */
function inline_plugin(body: string) {
	return make_plugin(
		{ edge_fields: ["up", "down", "same"].map((l) => ({ label: l })) },
		[],
		undefined,
		{ cachedRead: async () => body },
	);
}

describe("typed_link builder — body inline fields", () => {
	// One integration case proving the builder wires
	// parse_inline_field → resolve → edge. The regex matrix itself is
	// covered directly by the parse_inline_field tests below.
	test("detects inline field and builds edge", async () => {
		const line = "- down:: [[Convolutions]]";
		const files = [mock_file("a.md", { links: [{ line: 0, link: "Convolutions" }] })];
		const r = await _add_explicit_edges_typed_link(
			inline_plugin(line),
			make_all_files(files),
		);
		expect(r.edges).toHaveLength(1);
		expect(r.edges[0]!.edge_type).toBe("down");
		expect(r.edges[0]!.target).toBe("Convolutions.md");
	});

	test("field not in edge_fields → no edge", async (t) => {
		const files = [mock_file("a.md", { links: [{ line: 0, link: "X" }] })];
		const r = await _add_explicit_edges_typed_link(
			inline_plugin("(unknown:: [[X]])"),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(0);
	});
});

describe("parse_inline_field", () => {
	test.each([
		["plain", "down:: [[Convolutions]]", "down"],
		["dash list marker", "- down:: [[X]]", "down"],
		["asterisk list marker", "* down:: [[X]]", "down"],
		["plus list marker", "+ down:: [[X]]", "down"],
		["numbered list marker", "1. down:: [[X]]", "down"],
		["space before ::", "down :: [[X]]", "down"],
		["paren wrapper", "(down:: [[X]])", "down"],
		["bracket wrapper", "[down:: [[X]]]", "down"],
		["indented list marker", "  - down:: [[X]]", "down"],
		["hyphenated field", "my-field:: [[X]]", "my-field"],
		// Pinned behaviour: the field-name char class allows internal spaces,
		// so a prose prefix ending in `word:: ` is captured verbatim. Harmless
		// downstream — such a "field" never matches a configured label.
		["field name with internal spaces", "my field:: [[X]]", "my field"],
		["prose prefix before ::", "some text down:: [[X]]", "some text down"],
	])("returns field name — %s", (_label, line, expected) => {
		expect(parse_inline_field(line)).toBe(expected);
	});

	test.each([
		["single colon", "down: [[X]]"],
		["no field name", ":: [[X]]"],
		["non-word line start (blockquote)", "> down:: [[X]]"],
		["plain prose", "just a normal sentence"],
		["empty line", ""],
	])("returns null — %s", (_label, line) => {
		expect(parse_inline_field(line)).toBeNull();
	});
});

