import {
	get_transitive_rule_name,
	parse_transitive_relation,
	stringify_transitive_relation,
} from "src/utils/transitive_rules";
import { describe, test } from "vitest";

// ---- stringify_transitive_relation ----

describe("stringify_transitive_relation", () => {
	test("single-step forward", (t) => {
		t.expect(
			stringify_transitive_relation({
				chain: [{ field: "up" }],
				close_field: "down",
				close_reversed: false,
			}),
		).toBe("[up] -> down");
	});

	test("single-step reversed (<-)", (t) => {
		t.expect(
			stringify_transitive_relation({
				chain: [{ field: "up" }],
				close_field: "down",
				close_reversed: true,
			}),
		).toBe("[up] <- down");
	});

	test("multi-step chain", (t) => {
		t.expect(
			stringify_transitive_relation({
				chain: [{ field: "up" }, { field: "down" }],
				close_field: "same",
				close_reversed: false,
			}),
		).toBe("[up, down] -> same");
	});

	test("single-step, same field forward", (t) => {
		t.expect(
			stringify_transitive_relation({
				chain: [{ field: "same" }],
				close_field: "same",
				close_reversed: true,
			}),
		).toBe("[same] <- same");
	});
});

// ---- parse_transitive_relation ----

describe("parse_transitive_relation", () => {
	test("single-step forward", (t) => {
		const result = parse_transitive_relation("[up] -> down");
		t.expect(result.ok).toBe(true);
		if (!result.ok) return;
		t.expect(result.data.chain).toStrictEqual([{ field: "up" }]);
		t.expect(result.data.close_field).toBe("down");
		t.expect(result.data.close_reversed).toBe(false);
	});

	test("single-step reversed", (t) => {
		const result = parse_transitive_relation("[up] <- down");
		t.expect(result.ok).toBe(true);
		if (!result.ok) return;
		t.expect(result.data.close_reversed).toBe(true);
		t.expect(result.data.close_field).toBe("down");
	});

	test("multi-step chain", (t) => {
		const result = parse_transitive_relation("[up, down] -> same");
		t.expect(result.ok).toBe(true);
		if (!result.ok) return;
		t.expect(result.data.chain).toStrictEqual([
			{ field: "up" },
			{ field: "down" },
		]);
		t.expect(result.data.close_field).toBe("same");
	});

	test("extra whitespace around arrow", (t) => {
		const result = parse_transitive_relation("[up]  ->  down");
		t.expect(result.ok).toBe(true);
		if (!result.ok) return;
		t.expect(result.data.close_field).toBe("down");
	});

	test("invalid string returns fail", (t) => {
		const result = parse_transitive_relation("not a rule");
		t.expect(result.ok).toBe(false);
		if (result.ok) return;
		t.expect(result.error).toBeNull();
	});

	test("empty string returns fail", (t) => {
		t.expect(parse_transitive_relation("").ok).toBe(false);
	});

	test("missing brackets returns fail", (t) => {
		t.expect(parse_transitive_relation("up -> down").ok).toBe(false);
	});
});

// ---- round-trip ----

describe("parse_transitive_relation round-trip", () => {
	const cases = [
		{
			label: "single forward",
			rule: {
				chain: [{ field: "up" }],
				close_field: "down",
				close_reversed: false,
			},
		},
		{
			label: "single reversed",
			rule: {
				chain: [{ field: "up" }],
				close_field: "down",
				close_reversed: true,
			},
		},
		{
			label: "multi-step",
			rule: {
				chain: [{ field: "up" }, { field: "down" }],
				close_field: "same",
				close_reversed: false,
			},
		},
		{
			label: "same field both sides",
			rule: {
				chain: [{ field: "same" }],
				close_field: "same",
				close_reversed: true,
			},
		},
	];

	for (const { label, rule } of cases) {
		test(label, (t) => {
			const stringified = stringify_transitive_relation(rule);
			const parsed = parse_transitive_relation(stringified);
			t.expect(parsed.ok).toBe(true);
			if (!parsed.ok) return;
			t.expect(parsed.data.chain).toStrictEqual(rule.chain);
			t.expect(parsed.data.close_field).toBe(rule.close_field);
			t.expect(parsed.data.close_reversed).toBe(rule.close_reversed);
		});
	}
});

// ---- get_transitive_rule_name ----

describe("get_transitive_rule_name", () => {
	test("uses explicit name when set", (t) => {
		t.expect(
			get_transitive_rule_name({
				name: "my rule",
				chain: [{ field: "up" }],
				close_field: "down",
				close_reversed: false,
			}),
		).toBe("my rule");
	});

	test("falls back to stringify when name is empty string", (t) => {
		t.expect(
			get_transitive_rule_name({
				name: "",
				chain: [{ field: "up" }],
				close_field: "down",
				close_reversed: false,
			}),
		).toBe("[up] -> down");
	});
});
