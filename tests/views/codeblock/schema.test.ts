import { CodeblockSchema, type ICodeblock } from "src/codeblocks/schema";
import { describe, test } from "vitest";
import type { z } from "zod";

const data: ICodeblock["InputData"] = {
	edge_fields: [{ label: "up" }, { label: "down" }, { label: "same" }],
	field_groups: [
		{ label: "ups", fields: ["up"] },
		{ label: "downs", fields: ["down"] },
		{ label: "sames", fields: ["same"] },
	],
};

describe("happy", () => {
	test("minimal options", (t) => {
		const input: z.input<ReturnType<typeof CodeblockSchema.build>> = {};

		const parsed = CodeblockSchema.build(input, data).safeParse(input);

		t.expect(parsed.success).toEqual(true);
		t.expect(parsed.data).toStrictEqual({
			flat: false,
			type: "tree",
			collapse: false,
			depth: [0, Infinity],
			"merge-fields": true,
			sort: {
				field: "basename",
				order: 1,
			},
		});
	});

	test("maximal options", (t) => {
		const input: z.input<ReturnType<typeof CodeblockSchema.build>> = {
			flat: true,
			type: "tree",
			depth: [1, 2],
			title: "title",
			collapse: true,
			from: "#tag",
			sort: "basename asc",
			"merge-fields": true,
			fields: ["up", "down"],
			"start-note": "note.md",
			"mermaid-renderer": "elk",
			"mermaid-direction": "LR",
			"field-groups": ["ups", "downs"],
			"show-attributes": ["field", "explicit"],
		};

		const parsed = CodeblockSchema.build(input, data).safeParse(input);

		t.expect(parsed.success).toEqual(true);
		t.expect(parsed.data).toStrictEqual({
			...input,
			sort: { field: "basename", order: 1 },
		});
	});

	test("type: graph is a valid type", (t) => {
		const input: z.input<ReturnType<typeof CodeblockSchema.build>> = {
			type: "graph",
		};

		const parsed = CodeblockSchema.build(input, data).safeParse(input);
		if (!parsed.success) throw new Error("This should not happen");

		t.expect(parsed.success).toEqual(true);
		t.expect(parsed.data.type).toEqual("graph");
	});

	test("exclude-folders parses as a string array", (t) => {
		const input: z.input<ReturnType<typeof CodeblockSchema.build>> = {
			type: "graph",
			"exclude-folders": ["Templates", "Archive"],
		};

		const parsed = CodeblockSchema.build(input, data).safeParse(input);
		if (!parsed.success) throw new Error("This should not happen");

		t.expect(parsed.success).toEqual(true);
		t.expect(parsed.data["exclude-folders"]).toStrictEqual([
			"Templates",
			"Archive",
		]);
	});

	test("deprecated dataview-from coalesces into from", (t) => {
		const input: z.input<ReturnType<typeof CodeblockSchema.build>> = {
			"dataview-from": "#tag",
		};

		const parsed = CodeblockSchema.build(input, data).safeParse(input);
		if (!parsed.success) throw new Error("This should not happen");

		t.expect(parsed.success).toEqual(true);
		t.expect(parsed.data.from).toEqual("#tag");
	});

	test("field-groups get added to fields", (t) => {
		const input: z.input<ReturnType<typeof CodeblockSchema.build>> = {
			fields: ["up"],
			"field-groups": ["ups", "downs"],
		};

		const parsed = CodeblockSchema.build(input, data).safeParse(input);
		if (!parsed.success) throw new Error("This should not happen");

		t.expect(parsed.success).toEqual(true);
		t.expect(parsed.data.fields).toStrictEqual(["up", "down"]);
	});
});

describe("sad", () => {
	test("simple not string", (t) => {
		const input = { type: 1 };

		const parsed = CodeblockSchema.build(input, data).safeParse(input);
		if (parsed.success) throw new Error("This should not happen");
		const issue = parsed.error.issues[0];

		t.expect(parsed.success).toEqual(false);
		t.expect(issue.code).toEqual("invalid_value"); // Zod 4: enum type errors use invalid_value
		t.expect(issue.path).toStrictEqual(["type"]);
	});

	test("simple not array", (t) => {
		const input = { fields: "up" };

		const parsed = CodeblockSchema.build(input, data).safeParse(input);
		if (parsed.success) throw new Error("This should not happen");
		const issue = parsed.error.issues[0];

		t.expect(parsed.success).toEqual(false);
		t.expect(issue.code).toEqual("invalid_type");
		t.expect(issue.path).toStrictEqual(["fields"]);
	});

	test("simple invalid enum", (t) => {
		const input = { type: "invalid" };

		const parsed = CodeblockSchema.build(input, data).safeParse(input);
		if (parsed.success) throw new Error("This should not happen");
		const issue = parsed.error.issues[0];

		t.expect(parsed.success).toEqual(false);
		t.expect(issue.code).toEqual("invalid_value"); // Zod 4: invalid_enum_value renamed
		t.expect(issue.path).toStrictEqual(["type"]);
	});

	test("dyanmic enum array", (t) => {
		const input = { fields: ["missing", "up"] };

		const parsed = CodeblockSchema.build(input, data).safeParse(input);
		if (parsed.success) throw new Error("This should not happen");
		const issue = parsed.error.issues[0];

		t.expect(parsed.success).toEqual(false);
		t.expect(issue.code).toEqual("custom"); // Zod 4: dynamic_enum_schema uses custom issues
		t.expect(issue.path).toStrictEqual(["fields", 0]);
	});

	describe("depth", () => {
		test("invalid type", (t) => {
			const input = { depth: "1" };

			const parsed = CodeblockSchema.build(input, data).safeParse(input);
			if (parsed.success) throw new Error("This should not happen");
			const issue = parsed.error.issues[0];

			t.expect(parsed.success).toEqual(false);
			t.expect(issue.code).toEqual("invalid_type");
			t.expect(issue.path).toStrictEqual(["depth"]);
		});

		test("too short", (t) => {
			const input = { depth: [] };
			const parsed = CodeblockSchema.build(input, data).safeParse(input);

			t.expect(parsed.success).toEqual(false);
			if (parsed.success) throw new Error("This should not happen");

			const issue = parsed.error.issues[0];

			t.expect(issue.code).toEqual("too_small");
			t.expect(issue.path).toStrictEqual(["depth"]);
		});

		test("too long", (t) => {
			const input = { depth: [0, 1, 2] };
			const parsed = CodeblockSchema.build(input, data).safeParse(input);

			t.expect(parsed.success).toEqual(false);
			if (parsed.success) throw new Error("This should not happen");

			const issue = parsed.error.issues[0];

			t.expect(issue.code).toEqual("too_big");
			t.expect(issue.path).toStrictEqual(["depth"]);
		});

		test("out-of-range", (t) => {
			const input = { depth: [-1, 2] };
			const parsed = CodeblockSchema.build(input, data).safeParse(input);

			t.expect(parsed.success).toEqual(false);
			if (parsed.success) throw new Error("This should not happen");

			const issue = parsed.error.issues[0];

			t.expect(issue.code).toEqual("too_small");
			t.expect(issue.path).toStrictEqual(["depth", 0]);
		});

		test("wrong-order", (t) => {
			const input = { depth: [2, 1] };
			const parsed = CodeblockSchema.build(input, data).safeParse(input);

			t.expect(parsed.success).toEqual(false);
			if (parsed.success) throw new Error("This should not happen");

			const issue = parsed.error.issues[0];

			t.expect(issue.code).toEqual("custom");
			t.expect(issue.path).toStrictEqual(["depth"]);
		});
	});

	describe("sort", () => {
		test("invalid type", (t) => {
			const input = { sort: 1 };
			const parsed = CodeblockSchema.build(input, data).safeParse(input);

			t.expect(parsed.success).toEqual(false);
			if (parsed.success) throw new Error("This should not happen");

			const issue = parsed.error.issues[0];

			t.expect(issue.code).toEqual("invalid_type");
			t.expect(issue.path).toStrictEqual(["sort"]);
		});

		test("invalid string", (t) => {
			const input = { sort: "invalid" };
			const parsed = CodeblockSchema.build(input, data).safeParse(input);

			t.expect(parsed.success).toEqual(false);
			if (parsed.success) throw new Error("This should not happen");

			const issue = parsed.error.issues[0];

			// Implication is that a single string is interpreted as an edge field with default asc order
			// ie. it's a sort.field problem, specifically
			t.expect(issue.code).toEqual("custom"); // Zod 4: dynamic_enum_schema uses custom issues
			t.expect(issue.path).toStrictEqual(["sort", "field"]);
		});

		test("invalid field", (t) => {
			const input = { sort: "invalid asc" };
			const parsed = CodeblockSchema.build(input, data).safeParse(input);

			t.expect(parsed.success).toEqual(false);
			if (parsed.success) throw new Error("This should not happen");

			const issue = parsed.error.issues[0];

			t.expect(issue.code).toEqual("custom"); // Zod 4: dynamic_enum_schema uses custom issues
			t.expect(issue.path).toStrictEqual(["sort", "field"]);
		});

		test("invalid order", (t) => {
			const input = { sort: "basename invalid" };
			const parsed = CodeblockSchema.build(input, data).safeParse(input);

			t.expect(parsed.success).toEqual(false);
			if (parsed.success) throw new Error("This should not happen");

			const issue = parsed.error.issues[0];

			t.expect(issue.code).toEqual("invalid_union");
			t.expect(issue.path).toStrictEqual(["sort", "order"]);
		});
	});
});
