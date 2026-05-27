import { _add_explicit_edges_tag_note } from "src/graph/builders/explicit/tag_note";
import { describe, test } from "vitest";
import { make_all_files, make_plugin, mock_file } from "./helpers";

function plugin(default_field = "down", default_sibling_field = "") {
	return make_plugin({
		edge_fields: [
			{ label: "up" },
			{ label: "down" },
			{ label: "same" },
		],
		explicit_edge_sources: {
			tag_note: { default_field, default_sibling_field },
		} as never,
	});
}

describe("tag_note builder", () => {
	// ---- empty / no hub ----

	test("no files → empty results", (t) => {
		const r = _add_explicit_edges_tag_note(plugin(), make_all_files([]));
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});

	test("files without BC-tag-note-tag → no edges", (t) => {
		const files = [
			mock_file("a.md"),
			mock_file("b.md", { frontmatter: { title: "hello" } }),
		];
		const r = _add_explicit_edges_tag_note(plugin(), make_all_files(files));
		t.expect(r.edges).toHaveLength(0);
	});

	// ---- basic matching ----

	test("hub note matches tagged notes → edge from hub to target", (t) => {
		const files = [
			// The hub note
			mock_file("hub.md", {
				frontmatter: { "BC-tag-note-tag": "#foo" },
			}),
			// Tagged note — has the matching tag in frontmatter tags
			mock_file("tagged.md", {
				frontmatter: { tags: ["foo"] },
			}),
			mock_file("untagged.md"),
		];
		const r = _add_explicit_edges_tag_note(plugin(), make_all_files(files));
		t.expect(r.edges).toHaveLength(1);
		t.expect(r.edges[0]!.source).toBe("hub.md");
		t.expect(r.edges[0]!.target).toBe("tagged.md");
		t.expect(r.edges[0]!.edge_type).toBe("down");
	});

	test("hub adds # prefix automatically when tag lacks it", (t) => {
		const files = [
			// tag without #
			mock_file("hub.md", {
				frontmatter: { "BC-tag-note-tag": "foo" },
			}),
			mock_file("tagged.md", {
				frontmatter: { tags: ["foo"] },
			}),
		];
		const r = _add_explicit_edges_tag_note(plugin(), make_all_files(files));
		t.expect(r.edges).toHaveLength(1);
	});

	test("hub matches multiple tagged notes", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: { "BC-tag-note-tag": "#project" },
			}),
			mock_file("a.md", { frontmatter: { tags: ["project"] } }),
			mock_file("b.md", { frontmatter: { tags: ["project"] } }),
			mock_file("c.md", { frontmatter: { tags: ["other"] } }),
		];
		const r = _add_explicit_edges_tag_note(plugin(), make_all_files(files));
		const targets = r.edges.map((e) => e.target);
		t.expect(r.edges).toHaveLength(2);
		t.expect(targets).toContain("a.md");
		t.expect(targets).toContain("b.md");
	});

	// ---- sub-tag (prefix) matching ----

	test("sub-tag matching (non-exact): #foo matches #foo/bar", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: { "BC-tag-note-tag": "#topic" },
			}),
			// exact match
			mock_file("exact.md", { frontmatter: { tags: ["topic"] } }),
			// sub-tag
			mock_file("sub.md", { frontmatter: { tags: ["topic/sub"] } }),
		];
		const r = _add_explicit_edges_tag_note(plugin(), make_all_files(files));
		const targets = r.edges.map((e) => e.target);
		t.expect(targets).toContain("exact.md");
		t.expect(targets).toContain("sub.md");
	});

	test("exact mode: #foo does NOT match #foo/bar", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: {
					"BC-tag-note-tag": "#topic",
					"BC-tag-note-exact": true,
				},
			}),
			mock_file("exact.md", { frontmatter: { tags: ["topic"] } }),
			mock_file("sub.md", { frontmatter: { tags: ["topic/sub"] } }),
		];
		const r = _add_explicit_edges_tag_note(plugin(), make_all_files(files));
		const targets = r.edges.map((e) => e.target);
		t.expect(targets).toContain("exact.md");
		t.expect(targets).not.toContain("sub.md");
	});

	// ---- field resolution ----

	test("uses BC-tag-note-field from frontmatter", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: {
					"BC-tag-note-tag": "#foo",
					"BC-tag-note-field": "up",
				},
			}),
			mock_file("tagged.md", { frontmatter: { tags: ["foo"] } }),
		];
		const r = _add_explicit_edges_tag_note(plugin(), make_all_files(files));
		t.expect(r.edges[0]!.edge_type).toBe("up");
	});

	test("falls back to default_field", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: { "BC-tag-note-tag": "#foo" },
			}),
			mock_file("tagged.md", { frontmatter: { tags: ["foo"] } }),
		];
		const r = _add_explicit_edges_tag_note(
			plugin("same"),
			make_all_files(files),
		);
		t.expect(r.edges[0]!.edge_type).toBe("same");
	});

	test("no field and no default → no edge", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: { "BC-tag-note-tag": "#foo" },
			}),
			mock_file("tagged.md", { frontmatter: { tags: ["foo"] } }),
		];
		const r = _add_explicit_edges_tag_note(
			plugin(""),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});

	// ---- sibling edges ----

	test("sibling edges between tag-matched notes", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: { "BC-tag-note-tag": "#foo" },
			}),
			mock_file("a.md", { frontmatter: { tags: ["foo"] } }),
			mock_file("b.md", { frontmatter: { tags: ["foo"] } }),
		];
		const r = _add_explicit_edges_tag_note(
			plugin("down", "same"),
			make_all_files(files),
		);
		// 2 hub→target edges + 1 sibling edge (a↔b one direction)
		const sibling_edges = r.edges.filter((e) => e.edge_type === "same");
		t.expect(sibling_edges).toHaveLength(1);
	});

	// ---- errors ----

	test("non-string tag → error", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: { "BC-tag-note-tag": 42 },
			}),
		];
		const r = _add_explicit_edges_tag_note(plugin(), make_all_files(files));
		t.expect(r.errors).toHaveLength(1);
		t.expect(r.errors[0]!.code).toBe("invalid_field_value");
	});

	test("field not in edge_fields → error", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: {
					"BC-tag-note-tag": "#foo",
					"BC-tag-note-field": "nonexistent",
				},
			}),
		];
		const r = _add_explicit_edges_tag_note(plugin(), make_all_files(files));
		t.expect(r.errors).toHaveLength(1);
		t.expect(r.errors[0]!.code).toBe("invalid_edge_field");
	});

	test("edge_source is tag_note", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: { "BC-tag-note-tag": "#foo" },
			}),
			mock_file("tagged.md", { frontmatter: { tags: ["foo"] } }),
		];
		const r = _add_explicit_edges_tag_note(plugin(), make_all_files(files));
		t.expect(r.edges[0]!.edge_source).toBe("tag_note");
	});
});
