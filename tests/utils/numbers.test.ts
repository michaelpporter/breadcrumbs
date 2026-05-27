import { is_between } from "src/utils/numbers";
import { describe, test } from "vitest";

describe("is_between", () => {
	test("value within range", (t) => {
		t.expect(is_between(5, 1, 10)).toBe(true);
	});

	test("value equals min (inclusive)", (t) => {
		t.expect(is_between(1, 1, 10)).toBe(true);
	});

	test("value equals max (inclusive)", (t) => {
		t.expect(is_between(10, 1, 10)).toBe(true);
	});

	test("value below min", (t) => {
		t.expect(is_between(0, 1, 10)).toBe(false);
	});

	test("value above max", (t) => {
		t.expect(is_between(11, 1, 10)).toBe(false);
	});

	test("min equals max (point range), value matches", (t) => {
		t.expect(is_between(5, 5, 5)).toBe(true);
	});

	test("min equals max (point range), value misses", (t) => {
		t.expect(is_between(4, 5, 5)).toBe(false);
	});

	test("negative range", (t) => {
		t.expect(is_between(-3, -5, -1)).toBe(true);
	});

	test("negative range, value out", (t) => {
		t.expect(is_between(0, -5, -1)).toBe(false);
	});
});
