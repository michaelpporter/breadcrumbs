/** For each field in obj1, if it's defined, keep it. If not, merge in the corresponding field in obj2.
 * If both fields are objects, merge them recursively.
 */
export function deep_merge_objects<T>(obj1: T, obj2: T): T {
	const result = { ...obj1 };

	for (const key in obj2) {
		const val1 = obj1[key];
		const val2 = obj2[key];

		if (val1 === undefined || val1 === null) {
			result[key] = val2;
		} else if (
			typeof val1 === "object" &&
			typeof val2 === "object" &&
			val2 !== null &&
			!Array.isArray(val1) &&
			!Array.isArray(val2)
		) {
			result[key] = deep_merge_objects(val1, val2);
		}
	}

	return result;
}

export const deep_access = <
	T extends Record<string, unknown>,
	K extends string,
>(
	obj: T,
	path: K[],
) => {
	let current = obj;

	for (const key of path) {
		if (current[key] === undefined) {
			return undefined;
		}

		current = current[key] as T;
	}

	return current as unknown;
};

export const untyped_pick = <
	T extends Record<string, unknown>,
	K extends string,
>(
	obj: T,
	keys: K[],
) =>
	Object.fromEntries(
		Object.entries(obj).filter(([key]) => keys.includes(key as K)),
	);

export const pick = <T extends Record<string, unknown>, K extends keyof T>(
	obj: T,
	keys: K[],
) =>
	Object.fromEntries(
		Object.entries(obj).filter(([key]) => keys.includes(key as K)),
	) as Pick<T, K>;

/** Returns a new object */
export const remove_nullish_keys = <T extends Record<string, unknown>>(
	obj: T,
) =>
	Object.fromEntries(
		Object.entries(obj).filter(
			([_, val]) => val !== null && val !== undefined,
		),
	) as Partial<T>;
