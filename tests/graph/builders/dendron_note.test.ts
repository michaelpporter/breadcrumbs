import { _add_explicit_edges_dendron_note } from "src/graph/builders/explicit/dendron_note";
import { describe, test } from "vitest";
import { make_all_files, make_plugin, mock_file } from "./helpers";

/** Minimal plugin with dendron enabled and the standard up/down pair */
function plugin(
	opts: {
		default_field?: string;
		delimiter?: string;
		default_sibling_field?: string;
		known_paths?: string[];
	} = {},
) {
	const {
		default_field = "up",
		delimiter = ".",
		default_sibling_field = "",
		known_paths = [],
	} = opts;
	return make_plugin(
		{
			edge_fields: [{ label: "up" }, { label: "down" }, { label: "same" }],
			explicit_edge_sources: {
				dendron_note: {
					enabled: true,
					delimiter,
					default_field,
					default_sibling_field,
					display_trimmed: false,
				},
			} as never,
			// Up ↔ down pair so implied_pair_close_field("up") === "down"
			implied_relations: {
				transitive: [
					{
						name: "",
						rounds: 1,
						chain: [{ field: "up" }],
						close_field: "down",
						close_reversed: true,
					},
				],
			},
		},
		known_paths,
	);
}

describe("dendron_note builder", () => {
	// ---- disabled ----

	test("enabled=false → empty results", async (t) => {
		const p = make_plugin({
			explicit_edge_sources: {
				dendron_note: {
					enabled: false,
					delimiter: ".",
					default_field: "up",
					default_sibling_field: "",
					display_trimmed: false,
				},
			} as never,
		});
		const files = [mock_file("a.b.md")];
		const r = await _add_explicit_edges_dendron_note(p, make_all_files(files));
		t.expect(r.edges).toHaveLength(0);
	});

	// ---- single-level (no delimiter) ----

	test("single-segment basename → no edge", async (t) => {
		const files = [mock_file("root.md")];
		const r = await _add_explicit_edges_dendron_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(0);
	});

	// ---- basic hierarchy ----

	test("two-level: a.b → up edge to a, a is unresolved node", async (t) => {
		// a.md doesn't exist in vault → getFileByPath returns null
		const files = [mock_file("a.b.md")];
		const r = await _add_explicit_edges_dendron_note(
			plugin(), // no known_paths → a.md is unresolved
			make_all_files(files),
		);
		const up_edges = r.edges.filter((e) => e.edge_type === "up");
		t.expect(up_edges).toHaveLength(1);
		t.expect(up_edges[0]!.source).toBe("a.b.md");
		t.expect(up_edges[0]!.target).toBe("a.md");
		// a.md should be added as an unresolved node
		const unresolved = r.nodes.find((n) => n.toString().includes("a.md"));
		t.expect(unresolved).toBeDefined();
	});

	test("two-level: down return edge added when parent exists", async (t) => {
		const files = [mock_file("a.b.md"), mock_file("a.md")];
		const r = await _add_explicit_edges_dendron_note(
			plugin({ known_paths: ["a.md"] }),
			make_all_files(files),
		);
		const down_edges = r.edges.filter((e) => e.edge_type === "down");
		t.expect(down_edges.some((e) => e.source === "a.md" && e.target === "a.b.md")).toBe(true);
	});

	test("two-level: edge_source is dendron_note", async (t) => {
		const files = [mock_file("a.b.md")];
		const r = await _add_explicit_edges_dendron_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.edges[0]!.edge_source).toBe("dendron_note");
	});

	// ---- three-level chain ----

	test("three-level: a.b.c → edges to a.b and a.b → a (recursive)", async (t) => {
		const files = [mock_file("a.b.c.md")];
		const r = await _add_explicit_edges_dendron_note(
			plugin(),
			make_all_files(files),
		);
		const up_edges = r.edges.filter((e) => e.edge_type === "up");
		// a.b.c → a.b and a.b → a (recursive for unresolved parent)
		const sources = up_edges.map((e) => e.source);
		t.expect(sources).toContain("a.b.c.md");
		t.expect(sources).toContain("a.b.md");
	});

	// ---- JD skip guard ----

	test("first segment all-digits (JD style) → skipped", async (t) => {
		// "12.01 Title.md" has basename "12.01 Title"; split by "." gives ["12", "01 Title"]
		// First segment "12" is all digits → skip
		const files = [mock_file("12.01 Title.md")];
		const r = await _add_explicit_edges_dendron_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.edges.filter((e) => e.edge_type === "up")).toHaveLength(0);
	});

	test("first segment has letters (not JD) → not skipped", async (t) => {
		// "git.config.md" — first segment "git" is not all digits
		const files = [mock_file("git.config.md")];
		const r = await _add_explicit_edges_dendron_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.edges.filter((e) => e.edge_type === "up")).toHaveLength(1);
	});

	// ---- custom delimiter ----

	test("dash delimiter: a-b.md → edge to a.md", async (t) => {
		const files = [mock_file("a-b.md")];
		const r = await _add_explicit_edges_dendron_note(
			plugin({ delimiter: "-" }),
			make_all_files(files),
		);
		const up_edges = r.edges.filter((e) => e.edge_type === "up");
		t.expect(up_edges).toHaveLength(1);
		t.expect(up_edges[0]!.target).toBe("a.md");
	});

	// ---- sibling edges ----

	test("sibling edges when default_sibling_field is set", async (t) => {
		const files = [mock_file("a.b.md"), mock_file("a.c.md")];
		const r = await _add_explicit_edges_dendron_note(
			plugin({ default_sibling_field: "same" }),
			make_all_files(files),
		);
		const sibling_edges = r.edges.filter((e) => e.edge_type === "same");
		// a.b and a.c share parent "a" → one sibling edge pair
		t.expect(sibling_edges.length).toBeGreaterThan(0);
	});

	test("no sibling edges when default_sibling_field is empty", async (t) => {
		const files = [mock_file("a.b.md"), mock_file("a.c.md")];
		const r = await _add_explicit_edges_dendron_note(
			plugin({ default_sibling_field: "" }),
			make_all_files(files),
		);
		const sibling_edges = r.edges.filter((e) => e.edge_type === "same");
		t.expect(sibling_edges).toHaveLength(0);
	});

	// ---- per-note field override ----

	test("BC-dendron-note-field overrides default_field", async (t) => {
		const files = [
			mock_file("a.b.md", {
				frontmatter: { "BC-dendron-note-field": "down" },
			}),
		];
		const r = await _add_explicit_edges_dendron_note(
			plugin({ default_field: "up" }),
			make_all_files(files),
		);
		const edges = r.edges.filter(
			(e) => e.source === "a.b.md" && e.target === "a.md",
		);
		t.expect(edges[0]!.edge_type).toBe("down");
	});

	// ---- errors ----

	test("non-string BC-dendron-note-field → error", async (t) => {
		const files = [
			mock_file("a.b.md", { frontmatter: { "BC-dendron-note-field": 42 } }),
		];
		const r = await _add_explicit_edges_dendron_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.errors).toHaveLength(1);
		t.expect(r.errors[0]!.code).toBe("invalid_field_value");
	});

	test("BC-dendron-note-field not in edge_fields → error", async (t) => {
		const files = [
			mock_file("a.b.md", {
				frontmatter: { "BC-dendron-note-field": "nonexistent" },
			}),
		];
		const r = await _add_explicit_edges_dendron_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.errors).toHaveLength(1);
		t.expect(r.errors[0]!.code).toBe("invalid_edge_field");
	});

	test("no default_field and no frontmatter field → no edge (skip)", async (t) => {
		const files = [mock_file("a.b.md")];
		const r = await _add_explicit_edges_dendron_note(
			plugin({ default_field: "" }),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});

	// ---- hub parent down edges ----

	test("hub note (a.md) gets down edge to children added by scan", async (t) => {
		// a.md is the hub (single-segment); a.b.md is the child
		// add_dendron_hub_parent_down_edges should add a.md → a.b.md (down)
		const files = [
			mock_file("a.md"),
			mock_file("a.b.md"),
		];
		const r = await _add_explicit_edges_dendron_note(
			plugin({ known_paths: ["a.md"] }),
			make_all_files(files),
		);
		const down_from_hub = r.edges.filter(
			(e) => e.source === "a.md" && e.edge_type === "down",
		);
		t.expect(down_from_hub.some((e) => e.target === "a.b.md")).toBe(true);
	});
});
