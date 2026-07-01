/**
 * Minimal Obsidian API mock for vitest.
 *
 * The real `obsidian` npm package ships only TypeScript declarations (no JS).
 * vite.config.mjs aliases `obsidian` → this file so builders can be tested
 * without a running Obsidian instance.
 */

export function normalizePath(path: string): string {
	// Match real Obsidian: normalise backslashes, collapse double-slashes,
	// strip leading slash.
	return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\//, "");
}

export class TAbstractFile {
	path: string = "";
	name: string = "";
}

export class TFile extends TAbstractFile {
	basename: string = "";
	extension: string = "md";
	parent: TFolder | null = null;
}

export class TFolder extends TAbstractFile {
	children: TAbstractFile[] = [];
	isRoot() {
		return false;
	}
}

/** Matches real Obsidian closely enough for dataview_from's `#tag` atom: body
 *  tags plus frontmatter `tags` (string or array), each normalised to `#`. */
export function getAllTags(cache: {
	tags?: { tag: string }[];
	frontmatter?: Record<string, unknown>;
}): string[] | null {
	const tags: string[] = cache.tags?.map((t) => t.tag) ?? [];

	const fm_tags = cache.frontmatter?.tags;
	const raw = typeof fm_tags === "string" ? [fm_tags] : (fm_tags ?? []);
	if (Array.isArray(raw)) {
		for (const t of raw) {
			if (typeof t === "string") tags.push(t.startsWith("#") ? t : `#${t}`);
		}
	}

	return tags.length ? tags : null;
}

export class Plugin {}
export class PluginSettingTab {}
export class Modal {}
export class Notice {}
export class Setting {}
export class App {}
