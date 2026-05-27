import { resolve_field_group_labels } from "src/utils/edge_fields";
import { describe, test } from "vitest";

const groups = [
	{ label: "hierarchy", fields: ["up", "down"] },
	{ label: "siblings", fields: ["same"] },
	{ label: "sequence", fields: ["next", "prev"] },
];

describe("resolve_field_group_labels", () => {
	test("single matching group", (t) => {
		t.expect(
			resolve_field_group_labels(groups, ["hierarchy"]),
		).toStrictEqual(["up", "down"]);
	});

	test("multiple matching groups", (t) => {
		const result = resolve_field_group_labels(groups, [
			"hierarchy",
			"siblings",
		]);
		t.expect(result).toStrictEqual(["up", "down", "same"]);
	});

	test("unknown group label returns empty", (t) => {
		t.expect(
			resolve_field_group_labels(groups, ["nonexistent"]),
		).toStrictEqual([]);
	});

	test("empty label list returns empty", (t) => {
		t.expect(resolve_field_group_labels(groups, [])).toStrictEqual([]);
	});

	test("empty groups returns empty", (t) => {
		t.expect(resolve_field_group_labels([], ["hierarchy"])).toStrictEqual(
			[],
		);
	});

	test("deduplicates fields appearing in multiple groups", (t) => {
		const overlapping = [
			{ label: "A", fields: ["up", "down"] },
			{ label: "B", fields: ["down", "same"] }, // "down" duplicated
		];
		const result = resolve_field_group_labels(overlapping, ["A", "B"]);
		t.expect(result).toStrictEqual(["up", "down", "same"]);
	});

	test("all groups selected", (t) => {
		const result = resolve_field_group_labels(groups, [
			"hierarchy",
			"siblings",
			"sequence",
		]);
		t.expect(result).toStrictEqual(["up", "down", "same", "next", "prev"]);
	});
});
