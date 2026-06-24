import { read_edge_field } from "src/graph/builders/explicit/read_edge_field";
import { describe, test } from "vitest";
import { make_plugin } from "./helpers";

// One place asserting the override → default → validate contract that every
// explicit builder's primary edge-field resolution now shares.
describe("read_edge_field", () => {
	const PATH = "note.md";

	describe("defaulted sources (tag_note, dendron_note, …)", () => {
		test("per-note override beats the builder default", (t) => {
			// tag_note's default_field is "up"; the note overrides to "down".
			const r = read_edge_field(
				make_plugin(),
				"tag_note",
				{ "BC-tag-note-field": "down" },
				PATH,
			);

			t.expect(r.ok).toBe(true);
			t.expect(r.ok && r.data).toBe("down");
		});

		test("falls back to default_field when the override is absent", (t) => {
			const r = read_edge_field(make_plugin(), "tag_note", {}, PATH);

			t.expect(r.ok).toBe(true);
			t.expect(r.ok && r.data).toBe("up");
		});

		test("resolves via default_field even with no frontmatter at all", (t) => {
			// dendron/johnny notes can be valid without any metadata — the
			// optional chaining inside read_edge_field must not throw.
			const r = read_edge_field(
				make_plugin(),
				"dendron_note",
				undefined,
				PATH,
			);

			t.expect(r.ok).toBe(true);
			t.expect(r.ok && r.data).toBe("up");
		});
	});

	describe("required sources (folder_note, list_note)", () => {
		test("skips silently when the required field is absent", (t) => {
			const r = read_edge_field(make_plugin(), "folder_note", {}, PATH);

			t.expect(r.ok).toBe(false);
			// `undefined` error == "doesn't opt in", not a reported build error.
			t.expect(!r.ok && r.error).toBeUndefined();
		});

		test("skips silently when there is no frontmatter", (t) => {
			const r = read_edge_field(
				make_plugin(),
				"folder_note",
				undefined,
				PATH,
			);

			t.expect(r.ok).toBe(false);
			t.expect(!r.ok && r.error).toBeUndefined();
		});

		test("resolves the explicit per-note field", (t) => {
			const r = read_edge_field(
				make_plugin(),
				"list_note",
				{ "BC-list-note-field": "down" },
				PATH,
			);

			t.expect(r.ok).toBe(true);
			t.expect(r.ok && r.data).toBe("down");
		});
	});

	describe("validation errors carry the BC- label", () => {
		test("unregistered field → invalid_edge_field", (t) => {
			const r = read_edge_field(
				make_plugin(),
				"tag_note",
				{ "BC-tag-note-field": "not-a-real-field" },
				PATH,
			);

			t.expect(r.ok).toBe(false);
			t.expect(!r.ok && r.error?.code).toBe("invalid_edge_field");
			// BC- form chosen so the message names the key the user actually typed.
			t.expect(!r.ok && r.error?.message).toContain("BC-tag-note-field");
		});

		test("non-string value → invalid_field_value", (t) => {
			const r = read_edge_field(
				make_plugin(),
				"tag_note",
				{ "BC-tag-note-field": 123 },
				PATH,
			);

			t.expect(r.ok).toBe(false);
			t.expect(!r.ok && r.error?.code).toBe("invalid_field_value");
		});
	});
});
