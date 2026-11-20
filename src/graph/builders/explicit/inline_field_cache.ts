import type { DataAdapter, TFile } from "obsidian";

/**
 * A `[field, link]` pair found in a note body: `field:: [[link]]`. Stores
 * every inline field, not only those matching an edge field label, so a
 * change to `edge_fields` filters cached results instead of invalidating them.
 */
export type InlineFieldLink = [field: string, link: string];

interface CacheEntry {
	mtime: number;
	size: number;
	links: InlineFieldLink[];
}

/**
 * Bump when the parse rules in `typed_link.ts` change, so files parsed under
 * the old rules are re-read instead of served stale.
 */
const CACHE_VERSION = 1;

/**
 * Per-file cache of inline-field parse results, keyed by `mtime` + `size`,
 * so a rebuild only `cachedRead`s notes that changed since the last one (#802).
 *
 * Each rebuild reads from the previous generation and writes a fresh one, so
 * entries for deleted or link-free notes drop out on their own.
 */
export class InlineFieldCache {
	private next: Record<string, CacheEntry> = {};
	private changed = false;

	constructor(private prev: Record<string, CacheEntry> = {}) {}

	/** The cached links for `file`, or `null` when it changed or is unseen. */
	get(file: TFile): InlineFieldLink[] | null {
		const entry = this.prev[file.path];
		if (entry?.mtime !== file.stat.mtime || entry.size !== file.stat.size) {
			return null;
		}

		this.next[file.path] = entry;
		return entry.links;
	}

	set(file: TFile, links: InlineFieldLink[]) {
		this.next[file.path] = {
			mtime: file.stat.mtime,
			size: file.stat.size,
			links,
		};
		this.changed = true;
	}

	/**
	 * End a rebuild: the entries touched this pass become the next generation.
	 * Returns whether that generation differs from the last (worth saving).
	 */
	commit(): boolean {
		const dirty =
			this.changed ||
			Object.keys(this.prev).length !== Object.keys(this.next).length;

		this.prev = this.next;
		this.next = {};
		this.changed = false;

		return dirty;
	}

	to_json(): string {
		return JSON.stringify({ version: CACHE_VERSION, entries: this.prev });
	}

	/** Parse a saved cache. A missing, corrupt, or outdated file starts empty. */
	static from_json(raw: string | null): InlineFieldCache {
		if (!raw) return new InlineFieldCache();

		try {
			const parsed = JSON.parse(raw) as {
				version?: number;
				entries?: Record<string, CacheEntry>;
			};
			return parsed.version === CACHE_VERSION && parsed.entries
				? new InlineFieldCache(parsed.entries)
				: new InlineFieldCache();
		} catch {
			return new InlineFieldCache();
		}
	}

	static async load(
		adapter: DataAdapter,
		path: string,
	): Promise<InlineFieldCache> {
		const raw = (await adapter.exists(path))
			? await adapter.read(path)
			: null;
		return InlineFieldCache.from_json(raw);
	}
}
