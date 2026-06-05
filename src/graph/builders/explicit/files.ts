import type { App, CachedMetadata } from "obsidian";
import { TFile } from "obsidian";

interface TFileWithCache {
	file: TFile;
	cache: CachedMetadata | null;
}

export const NON_MD_EXTENSIONS = ["canvas", "base"] as const;

/**
 * Collect markdown, canvas, and base files from the vault for graph rebuild.
 *
 * `getMarkdownFiles()` is normally authoritative for markdown; if it is empty
 * while the vault already has files (startup / indexing race; see Obsidian API
 * FAQ), fall back to `getFiles()` so explicit builders still run. Non-markdown
 * types are always collected via `getFiles()` since there is no dedicated API.
 */
function collect_vault_files(app: App): TFile[] {
	const all = app.vault.getFiles();
	const non_md = all.filter(
		(f): f is TFile =>
			f instanceof TFile &&
			(NON_MD_EXTENSIONS as readonly string[]).includes(f.extension),
	);

	const md = app.vault.getMarkdownFiles();
	if (md.length > 0 || non_md.length > 0) return [...md, ...non_md];

	return all.filter(
		(f): f is TFile =>
			f instanceof TFile &&
			(f.extension === "md" ||
				(NON_MD_EXTENSIONS as readonly string[]).includes(f.extension)),
	);
}

/**
 * Files passed to graph rebuild.
 *
 * We use Obsidian’s vault list plus `metadataCache` for each file. (Historically a
 * Dataview-page list was an alternative source, but it could omit markdown notes
 * the graph needs — so the rebuild always uses the vault list now. Dataview is
 * still used elsewhere, e.g. `dataview-from` in codeblocks, via
 * `dataview_plugin.get_api()`.)
 */
export interface AllFiles {
	obsidian: TFileWithCache[];
}

export const get_all_files = (app: App): AllFiles => ({
	obsidian: collect_vault_files(app).map((file) => ({
		file,
		cache: app.metadataCache.getFileCache(file),
	})),
});
