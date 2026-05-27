import { _add_explicit_edges_regex_note } from "src/graph/builders/explicit/regex_note";
import { describe, test } from "vitest";
import { make_all_files, make_plugin, mock_file } from "./helpers";

// Minimal plugin with regex_note.default_field="" (no default) and edge_fields containing "down"
function plugin(default_field = "") {
	return make_plugin({
		edge_fields: [{ label: "up" }, { label: "down" }, { label: "same" }],
		explicit_edge_sources: {
			regex_note: { default_field },
		} as never,
	});
}

describe("regex_note builder", () => {
	// ---- disabled / empty ----

	test("no files → empty results", (t) => {
		const r = _add_explicit_edges_regex_note(plugin(), make_all_files([]));
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});

	test("files without BC-regex-note-regex → no edges", (t) => {
		const files = [
			mock_file("a.md"),
			mock_file("b.md", { frontmatter: { title: "hello" } }),
		];
		const r = _add_explicit_edges_regex_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(0);
	});

	// ---- basic matching ----

	test("regex matches other notes → edges created", (t) => {
		const files = [
			// Hub note: matches any note with "topic" in the path
			mock_file("hub.md", {
				frontmatter: {
					"BC-regex-note-regex": "topic",
					"BC-regex-note-field": "down",
				},
			}),
			mock_file("topic-a.md"),
			mock_file("topic-b.md"),
			mock_file("unrelated.md"),
		];
		const r = _add_explicit_edges_regex_note(
			plugin(),
			make_all_files(files),
		);
		const targets = r.edges.map((e) => e.target);
		// "hub.md" and "unrelated.md" don't contain "topic"; only topic-a and topic-b match
		t.expect(r.edges).toHaveLength(2);
		t.expect(targets).toContain("topic-a.md");
		t.expect(targets).toContain("topic-b.md");
	});

	test("regex matches self too", (t) => {
		const files = [
			mock_file("my-hub.md", {
				frontmatter: {
					"BC-regex-note-regex": "my-hub",
					"BC-regex-note-field": "down",
				},
			}),
			mock_file("other.md"),
		];
		const r = _add_explicit_edges_regex_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(1);
		t.expect(r.edges[0]!.target).toBe("my-hub.md");
	});

	// ---- field resolution ----

	test("uses BC-regex-note-field from frontmatter", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: {
					"BC-regex-note-regex": "child",
					"BC-regex-note-field": "down",
				},
			}),
			mock_file("child.md"),
		];
		const r = _add_explicit_edges_regex_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.edges[0]!.edge_type).toBe("down");
	});

	test("falls back to default_field when no frontmatter field", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: { "BC-regex-note-regex": "child" },
			}),
			mock_file("child.md"),
		];
		const r = _add_explicit_edges_regex_note(
			plugin("up"),
			make_all_files(files),
		);
		t.expect(r.edges[0]!.edge_type).toBe("up");
	});

	test("no field and no default → no edge (fail undefined)", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: { "BC-regex-note-regex": "child" },
			}),
			mock_file("child.md"),
		];
		const r = _add_explicit_edges_regex_note(
			plugin(""),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});

	// ---- case-insensitive flag ----

	test("BC-regex-note-flags: i enables case-insensitive matching", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: {
					"BC-regex-note-regex": "TOPIC",
					"BC-regex-note-flags": "i",
					"BC-regex-note-field": "down",
				},
			}),
			mock_file("topic-a.md"),
			mock_file("TOPIC-b.md"),
		];
		const r = _add_explicit_edges_regex_note(
			plugin(),
			make_all_files(files),
		);
		const targets = r.edges.map((e) => e.target);
		t.expect(targets).toContain("topic-a.md");
		t.expect(targets).toContain("TOPIC-b.md");
	});

	test("without flags: case-sensitive (no match)", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: {
					"BC-regex-note-regex": "TOPIC",
					"BC-regex-note-field": "down",
				},
			}),
			mock_file("topic-a.md"),
		];
		const r = _add_explicit_edges_regex_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(0);
	});

	// ---- errors ----

	test("invalid regex → error, no edge", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: {
					"BC-regex-note-regex": "[invalid((",
					"BC-regex-note-field": "down",
				},
			}),
			mock_file("target.md"),
		];
		const r = _add_explicit_edges_regex_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.errors).toHaveLength(1);
		t.expect(r.errors[0]!.code).toBe("invalid_field_value");
		t.expect(r.edges).toHaveLength(0);
	});

	test("non-string regex → error", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: {
					"BC-regex-note-regex": 42,
					"BC-regex-note-field": "down",
				},
			}),
		];
		const r = _add_explicit_edges_regex_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.errors).toHaveLength(1);
		t.expect(r.errors[0]!.code).toBe("invalid_field_value");
	});

	test("field not in edge_fields → error", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: {
					"BC-regex-note-regex": "child",
					"BC-regex-note-field": "nonexistent-field",
				},
			}),
			mock_file("child.md"),
		];
		const r = _add_explicit_edges_regex_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.errors).toHaveLength(1);
		t.expect(r.errors[0]!.code).toBe("invalid_edge_field");
		t.expect(r.edges).toHaveLength(0);
	});

	test("non-string flags → error", (t) => {
		const files = [
			mock_file("hub.md", {
				frontmatter: {
					"BC-regex-note-regex": "child",
					"BC-regex-note-flags": 123,
					"BC-regex-note-field": "down",
				},
			}),
		];
		const r = _add_explicit_edges_regex_note(
			plugin(),
			make_all_files(files),
		);
		t.expect(r.errors).toHaveLength(1);
		t.expect(r.errors[0]!.code).toBe("invalid_field_value");
	});

	// ---- multiple hub notes ----

	test("multiple hub notes each create their own edges", (t) => {
		const files = [
			mock_file("hub-a.md", {
				frontmatter: {
					"BC-regex-note-regex": "alpha",
					"BC-regex-note-field": "down",
				},
			}),
			mock_file("hub-b.md", {
				frontmatter: {
					"BC-regex-note-regex": "beta",
					"BC-regex-note-field": "down",
				},
			}),
			mock_file("alpha-1.md"),
			mock_file("beta-1.md"),
		];
		const r = _add_explicit_edges_regex_note(
			plugin(),
			make_all_files(files),
		);
		const sources = r.edges.map((e) => e.source);
		t.expect(sources.filter((s) => s === "hub-a.md")).toHaveLength(1);
		t.expect(sources.filter((s) => s === "hub-b.md")).toHaveLength(1);
	});
});
