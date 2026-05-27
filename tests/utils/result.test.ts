import { fail, graph_build_fail, succ } from "src/utils/result";
import { describe, test } from "vitest";

describe("succ", () => {
	test("ok flag is true", (t) => {
		t.expect(succ(42).ok).toBe(true);
	});

	test("data is preserved", (t) => {
		t.expect(succ("hello").data).toBe("hello");
	});

	test("object data is preserved", (t) => {
		const obj = { field: "up" };
		t.expect(succ(obj).data).toStrictEqual(obj);
	});

	test("undefined data", (t) => {
		t.expect(succ(undefined).data).toBeUndefined();
	});
});

describe("fail", () => {
	test("ok flag is false", (t) => {
		t.expect(fail(null).ok).toBe(false);
	});

	test("error is preserved", (t) => {
		t.expect(fail("bad input").error).toBe("bad input");
	});

	test("undefined error", (t) => {
		t.expect(fail(undefined).error).toBeUndefined();
	});
});

describe("graph_build_fail", () => {
	test("ok flag is false", (t) => {
		const result = graph_build_fail({
			path: "note.md",
			code: "invalid_field_value",
			message: "bad value",
		});
		t.expect(result.ok).toBe(false);
	});

	test("error preserves the BreadcrumbsError", (t) => {
		const err = {
			path: "note.md",
			code: "invalid_field_value" as const,
			message: "bad value",
		};
		const result = graph_build_fail(err);
		t.expect(result.error).toStrictEqual(err);
	});
});
