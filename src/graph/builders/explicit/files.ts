import type { App, CachedMetadata } from "obsidian";
import { TFile } from "obsidian";
import type { IDataview } from "src/external/dataview/interfaces";

interface TFileWithCache {
	file: TFile;
	cache: CachedMetadata | null;
}

const NON_MD_EXTENSIONS = ["canvas", "base"] as const;

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
 * We always use Obsidian’s vault list plus `metadataCache` for each file.
 * Historically, when Dataview was enabled we used `dataview.api.pages().values`
 * instead; that list comes from Dataview’s index and API, which changed across
 * versions (0.4 → 0.5) and can omit markdown notes the graph still needs, so
 * views like the tree could miss edges. Dataview remains used elsewhere (e.g.
 * `dataview-from` in codeblocks) via `dataview_plugin.get_api()`.
 *
 * `dataview` is always `null` here; optional `all_files.dataview?.forEach` in
 * builders remains a no-op. The old dual-source shape is not used for rebuild.
 */
export interface AllFiles {
	obsidian: TFileWithCache[];
	/** Not populated during rebuild; optional Dataview page list for legacy branches. */
	dataview: IDataview.Page[] | null;
}

export const get_all_files = (app: App): AllFiles => ({
	obsidian: collect_vault_files(app).map((file) => ({
		file,
		cache: app.metadataCache.getFileCache(file),
	})),
	dataview: null,
});
