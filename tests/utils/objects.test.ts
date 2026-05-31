import { deep_merge_objects } from "src/utils/objects";
import { describe, test } from "vitest";

describe("deep_merge_objects", () => {
	test("depth 1", (t) => {
		const obj1: Record<string, any> = { a: 1, c: 3 };
		const obj2: Record<string, any> = { b: 2, c: 4 };

		t.expect(deep_merge_objects(obj1, obj2)).toEqual({
			a: 1,
			b: 2,
			c: 3,
		});
	});

	test("depth 2", (t) => {
		const obj1: Record<string, any> = {
			top1: { a: 1, c: 3 },
			top2: { d: 5 },
		};
		const obj2: Record<string, any> = {
			top1: { b: 2, c: 4 },
			top2: { e: 6 },
		};

		t.expect(deep_merge_objects(obj1, obj2)).toEqual({
			top1: { a: 1, b: 2, c: 3 },
			top2: { d: 5, e: 6 },
		});
	});

	test("arrays: obj1 array kept as-is", (t) => {
		const obj1: Record<string, any> = { items: ["a", "b"] };
		const obj2: Record<string, any> = { items: ["c", "d", "e"] };

		t.expect(deep_merge_objects(obj1, obj2)).toEqual({ items: ["a", "b"] });
	});

	test("arrays: missing in obj1 uses obj2", (t) => {
		const obj1: Record<string, any> = {};
		const obj2: Record<string, any> = { items: ["c", "d"] };

		t.expect(deep_merge_objects(obj1, obj2)).toEqual({ items: ["c", "d"] });
	});

	test("arrays: null in obj1 uses obj2", (t) => {
		const obj1: Record<string, any> = { items: null };
		const obj2: Record<string, any> = { items: ["c", "d"] };

		t.expect(deep_merge_objects(obj1, obj2)).toEqual({ items: ["c", "d"] });
	});

	test("objects: null in obj1 uses obj2 object", (t) => {
		const obj1: Record<string, any> = { nested: null };
		const obj2: Record<string, any> = { nested: { a: 1 } };

		t.expect(deep_merge_objects(obj1, obj2)).toEqual({ nested: { a: 1 } });
	});
});
