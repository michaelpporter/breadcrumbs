import { _add_explicit_edges_johnny_decimal_note } from "src/graph/builders/explicit/johnny_decimal_note";
import { describe, test } from "vitest";
import { make_all_files, make_plugin, mock_file } from "./helpers";

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
				johnny_decimal_note: {
					enabled: true,
					delimiter,
					default_field,
					default_sibling_field,
				},
			} as never,
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

describe("johnny_decimal_note builder", () => {
	// ---- disabled ----

	test("enabled=false → empty results", async (t) => {
		const p = make_plugin({
			explicit_edge_sources: {
				johnny_decimal_note: {
					enabled: false,
					delimiter: ".",
					default_field: "up",
					default_sibling_field: "",
				},
			} as never,
		});
		const files = [
			mock_file("01 Area.md"),
			mock_file("01.02 Category.md"),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			p,
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(0);
	});

	// ---- non-JD basenames ----

	test("plain basename without numeric prefix → no edge", async (t) => {
		const files = [mock_file("plain-note.md"), mock_file("another.md")];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(0);
	});

	// ---- basic hierarchy ----

	test("01.02 Category → up edge to 01 Area", async (t) => {
		// Child: "01.02 Category.md" → decimals "01.02"
		// Parent: "01 Area.md" → decimals "01"
		const files = [
			mock_file("01 Area.md"),
			mock_file("01.02 Category.md"),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin({ known_paths: ["01 Area.md"] }),
			make_all_files(files),
		);
		const up_edges = r.edges.filter((e) => e.edge_type === "up");
		t.expect(up_edges).toHaveLength(1);
		t.expect(up_edges[0]!.source).toBe("01.02 Category.md");
		t.expect(up_edges[0]!.target).toBe("01 Area.md");
	});

	test("down return edge added when parent exists", async (t) => {
		const files = [
			mock_file("01 Area.md"),
			mock_file("01.02 Category.md"),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin({ known_paths: ["01 Area.md"] }),
			make_all_files(files),
		);
		const down_edges = r.edges.filter((e) => e.edge_type === "down");
		t.expect(
			down_edges.some(
				(e) =>
					e.source === "01 Area.md" && e.target === "01.02 Category.md",
			),
		).toBe(true);
	});

	test("no edge when parent note not in notes list", async (t) => {
		// "01 Area.md" not in files → no parent found → no edge
		const files = [mock_file("01.02 Category.md")];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(0);
	});

	// ---- real JD area→category (no delimiter) ----

	test("11 Finance → up edge to 10 Life Admin (area parent)", async (t) => {
		const files = [
			mock_file("10 Life Admin.md"),
			mock_file("11 Finance.md"),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin({ known_paths: ["10 Life Admin.md"] }),
			make_all_files(files),
		);
		const up_edges = r.edges.filter((e) => e.edge_type === "up");
		t.expect(up_edges).toHaveLength(1);
		t.expect(up_edges[0]!.source).toBe("11 Finance.md");
		t.expect(up_edges[0]!.target).toBe("10 Life Admin.md");
	});

	test("10 Life Admin has no parent (area is top-level)", async (t) => {
		const files = [
			mock_file("10 Life Admin.md"),
			mock_file("20 Work.md"),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(0);
	});

	test("11.01 item → 11 category → 10 area full three-level chain", async (t) => {
		const files = [
			mock_file("10 Life Admin.md"),
			mock_file("11 Finance.md"),
			mock_file("11.01 Tax Returns.md"),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin({
				known_paths: ["10 Life Admin.md", "11 Finance.md"],
			}),
			make_all_files(files),
		);
		const up_edges = r.edges.filter((e) => e.edge_type === "up");
		// 11 → 10 and 11.01 → 11
		t.expect(
			up_edges.some(
				(e) =>
					e.source === "11 Finance.md" && e.target === "10 Life Admin.md",
			),
		).toBe(true);
		t.expect(
			up_edges.some(
				(e) =>
					e.source === "11.01 Tax Returns.md" &&
					e.target === "11 Finance.md",
			),
		).toBe(true);
	});

	// ---- three-level ----

	test("01.02.03 → edge to 01.02", async (t) => {
		const files = [
			mock_file("01 Area.md"),
			mock_file("01.02 Category.md"),
			mock_file("01.02.03 Item.md"),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin({ known_paths: ["01 Area.md", "01.02 Category.md"] }),
			make_all_files(files),
		);
		const child_up = r.edges.filter(
			(e) =>
				e.source === "01.02.03 Item.md" &&
				e.target === "01.02 Category.md" &&
				e.edge_type === "up",
		);
		t.expect(child_up).toHaveLength(1);
	});

	// ---- sibling edges ----

	test("sibling edges between notes sharing same parent", async (t) => {
		const files = [
			mock_file("01 Area.md"),
			mock_file("01.01 Cat-A.md"),
			mock_file("01.02 Cat-B.md"),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin({
				known_paths: ["01 Area.md"],
				default_sibling_field: "same",
			}),
			make_all_files(files),
		);
		const sibling_edges = r.edges.filter((e) => e.edge_type === "same");
		t.expect(sibling_edges.length).toBeGreaterThan(0);
	});

	test("no sibling edges when default_sibling_field is empty", async (t) => {
		const files = [
			mock_file("01 Area.md"),
			mock_file("01.01 Cat-A.md"),
			mock_file("01.02 Cat-B.md"),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin({ known_paths: ["01 Area.md"], default_sibling_field: "" }),
			make_all_files(files),
		);
		const sibling_edges = r.edges.filter((e) => e.edge_type === "same");
		t.expect(sibling_edges).toHaveLength(0);
	});

	// ---- edge_source ----

	test("edge_source is johnny_decimal_note", async (t) => {
		const files = [
			mock_file("01 Area.md"),
			mock_file("01.02 Category.md"),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin({ known_paths: ["01 Area.md"] }),
			make_all_files(files),
		);
		t.expect(r.edges[0]!.edge_source).toBe("johnny_decimal_note");
	});

	// ---- per-note field override ----

	test("BC-johnny-decimal-note-field overrides default_field", async (t) => {
		const files = [
			mock_file("01 Area.md"),
			mock_file("01.02 Category.md", {
				frontmatter: { "BC-johnny-decimal-note-field": "down" },
			}),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin({ known_paths: ["01 Area.md"] }),
			make_all_files(files),
		);
		const explicit_edge = r.edges.find(
			(e) =>
				e.source === "01.02 Category.md" && e.target === "01 Area.md",
		);
		t.expect(explicit_edge?.edge_type).toBe("down");
	});

	// ---- errors ----

	test("non-string BC-johnny-decimal-note-field → error", async (t) => {
		const files = [
			mock_file("01 Area.md"),
			mock_file("01.02 Category.md", {
				frontmatter: { "BC-johnny-decimal-note-field": 99 },
			}),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin({ known_paths: ["01 Area.md"] }),
			make_all_files(files),
		);
		t.expect(r.errors).toHaveLength(1);
		t.expect(r.errors[0]!.code).toBe("invalid_field_value");
	});

	test("BC-johnny-decimal-note-field not in edge_fields → error", async (t) => {
		const files = [
			mock_file("01 Area.md"),
			mock_file("01.02 Category.md", {
				frontmatter: { "BC-johnny-decimal-note-field": "nonexistent" },
			}),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin({ known_paths: ["01 Area.md"] }),
			make_all_files(files),
		);
		t.expect(r.errors).toHaveLength(1);
		t.expect(r.errors[0]!.code).toBe("invalid_edge_field");
	});

	test("no default_field → no edge (skip)", async (t) => {
		const files = [
			mock_file("01 Area.md"),
			mock_file("01.02 Category.md"),
		];
		const r = await _add_explicit_edges_johnny_decimal_note(
			plugin({ known_paths: ["01 Area.md"], default_field: "" }),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});
});
