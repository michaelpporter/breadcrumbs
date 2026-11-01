import { Platform } from "obsidian";
import {
	for_each_with_concurrency,
	vault_read_concurrency,
} from "src/utils/promises";
import { afterEach, describe, test } from "vitest";

/** Run `items` through the helper, recording the peak number of calls in flight. */
const run = async (items: number[], limit: number) => {
	let in_flight = 0;
	let peak = 0;
	const seen: number[] = [];

	await for_each_with_concurrency(items, limit, async (item) => {
		in_flight++;
		peak = Math.max(peak, in_flight);
		await new Promise((r) => setTimeout(r, 1));
		seen.push(item);
		in_flight--;
	});

	return { peak, seen };
};

describe("for_each_with_concurrency", () => {
	const items = Array.from({ length: 20 }, (_, i) => i);

	test("caps calls in flight at the limit", async (t) => {
		const { peak, seen } = await run(items, 3);
		t.expect(peak).toBe(3);
		t.expect(seen.sort((a, b) => a - b)).toEqual(items);
	});

	test("Infinity starts every call at once", async (t) => {
		const { peak } = await run(items, Infinity);
		t.expect(peak).toBe(items.length);
	});

	test("limit below 1 still processes items one at a time", async (t) => {
		const { peak, seen } = await run(items, 0);
		t.expect(peak).toBe(1);
		t.expect(seen).toEqual(items);
	});

	test("empty input resolves without calling fn", async (t) => {
		const { seen } = await run([], 8);
		t.expect(seen).toEqual([]);
	});

	test("rejects with the first error", async (t) => {
		await t
			.expect(
				for_each_with_concurrency([1, 2, 3], 2, async (item) => {
					if (item === 2) throw new Error("boom");
				}),
			)
			.rejects.toThrow("boom");
	});
});

describe("vault_read_concurrency", () => {
	afterEach(() => {
		Platform.isMobileApp = false;
	});

	test("unbounded on desktop", (t) => {
		t.expect(vault_read_concurrency()).toBe(Infinity);
	});

	test("capped on mobile", (t) => {
		Platform.isMobileApp = true;
		t.expect(vault_read_concurrency()).toBe(8);
	});
});
