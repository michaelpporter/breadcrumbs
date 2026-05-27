import { DEFAULT_SETTINGS } from "src/const/settings";
import { implied_pair_close_field } from "src/utils/implied_pair_close_field";
import { describe, test } from "vitest";

// DEFAULT_SETTINGS has the canonical BC rules:
//   [up] <-  down  (chain=[up], close_field="down", close_reversed=true)
//   [down] <- up
//   [same] <- same
//   [next] <- prev
//   [prev] <- next

describe("implied_pair_close_field", () => {
	test("up → down via default rules", (t) => {
		t.expect(implied_pair_close_field(DEFAULT_SETTINGS, "up")).toBe("down");
	});

	test("down → up via default rules", (t) => {
		t.expect(implied_pair_close_field(DEFAULT_SETTINGS, "down")).toBe("up");
	});

	test("same returns undefined (close_field === field is skipped)", (t) => {
		// The function guards rule.close_field !== field, so the [same] <- same
		// rule is deliberately excluded. Dendron/JD builders only need up↔down.
		t.expect(
			implied_pair_close_field(DEFAULT_SETTINGS, "same"),
		).toBeUndefined();
	});

	test("next → prev via default rules", (t) => {
		t.expect(implied_pair_close_field(DEFAULT_SETTINGS, "next")).toBe(
			"prev",
		);
	});

	test("prev → next via default rules", (t) => {
		t.expect(implied_pair_close_field(DEFAULT_SETTINGS, "prev")).toBe(
			"next",
		);
	});

	test("unknown field returns undefined", (t) => {
		t.expect(
			implied_pair_close_field(DEFAULT_SETTINGS, "nonexistent"),
		).toBeUndefined();
	});

	test("multi-step rule is ignored (chain.length > 1)", (t) => {
		const settings = {
			...DEFAULT_SETTINGS,
			edge_fields: [{ label: "up" }, { label: "transitive-down" }],
			implied_relations: {
				transitive: [
					{
						name: "",
						rounds: 5,
						chain: [{ field: "up" }, { field: "up" }], // length 2 — must be skipped
						close_field: "transitive-down",
						close_reversed: false,
					},
				],
			},
		};
		t.expect(implied_pair_close_field(settings, "up")).toBeUndefined();
	});

	test("close_field equal to field itself is ignored", (t) => {
		// A rule where close_field === field should be skipped
		const settings = {
			...DEFAULT_SETTINGS,
			edge_fields: [{ label: "up" }],
			implied_relations: {
				transitive: [
					{
						name: "",
						rounds: 1,
						chain: [{ field: "up" }],
						close_field: "up", // same as field → skip
						close_reversed: true,
					},
				],
			},
		};
		t.expect(implied_pair_close_field(settings, "up")).toBeUndefined();
	});

	test("close_field not in edge_fields is ignored", (t) => {
		const settings = {
			...DEFAULT_SETTINGS,
			edge_fields: [{ label: "up" }], // "down" missing from edge_fields
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
		};
		t.expect(implied_pair_close_field(settings, "up")).toBeUndefined();
	});

	test("first matching rule wins when multiple candidates", (t) => {
		const settings = {
			...DEFAULT_SETTINGS,
			edge_fields: [{ label: "up" }, { label: "down" }, { label: "alt" }],
			implied_relations: {
				transitive: [
					{
						name: "",
						rounds: 1,
						chain: [{ field: "up" }],
						close_field: "down",
						close_reversed: true,
					},
					{
						name: "",
						rounds: 1,
						chain: [{ field: "up" }],
						close_field: "alt",
						close_reversed: true,
					},
				],
			},
		};
		// first rule matches → "down", not "alt"
		t.expect(implied_pair_close_field(settings, "up")).toBe("down");
	});
});
