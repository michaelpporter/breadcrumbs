import { Platform } from "obsidian";

/**
 * Max vault reads in flight during a graph build. On mobile, reads complete
 * one at a time through the native bridge, so thousands in flight queue the
 * user's own reads (opening a note) behind them (#799). Desktop reads run in
 * parallel, so it stays unbounded.
 */
export const vault_read_concurrency = () =>
	Platform.isMobileApp ? 8 : Infinity;

/**
 * Like `await Promise.all(items.map(fn))`, but with at most `limit` calls of
 * `fn` in flight. `Infinity` starts every call at once. Rejects with the first
 * error; calls already started still run to completion.
 */
export async function for_each_with_concurrency<T>(
	items: readonly T[],
	limit: number,
	fn: (item: T) => Promise<void>,
): Promise<void> {
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			await fn(items[next++]);
		}
	};

	const workers = Math.min(Math.max(1, Math.floor(limit)), items.length);
	await Promise.all(Array.from({ length: workers }, worker));
}
