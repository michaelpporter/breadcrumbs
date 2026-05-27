/**
 * Shared mock factories for graph builder tests.
 *
 * Builders take (plugin, all_files). Both are heavily coupled to Obsidian.
 * These helpers create minimal stand-ins that satisfy the structural interfaces
 * used by the builder functions under test.
 */
import { DEFAULT_SETTINGS } from "src/const/settings";
import type { AllFiles } from "src/graph/builders/explicit/files";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { TFile } from "obsidian";

/** Build a TFile-like object plus its optional cache entry */
export function mock_file(
	path: string,
	opts: {
		frontmatter?: Record<string, unknown>;
		/** Body-level tags (cache.tags) — each becomes { tag, position } */
		tags?: string[];
	} = {},
) {
	const slash_path = path.replace(/\\/g, "/");
	const parts = slash_path.split("/");
	const filename = parts[parts.length - 1]!;
	const dot = filename.lastIndexOf(".");
	const basename = dot > -1 ? filename.slice(0, dot) : filename;
	const extension = dot > -1 ? filename.slice(dot + 1) : "";

	const file = Object.assign(new TFile(), {
		path: slash_path,
		name: filename,
		basename,
		extension,
		parent: { path: parts.slice(0, -1).join("/") || "" },
	}) as TFile & { parent: { path: string } };

	const cache =
		opts.frontmatter || opts.tags
			? {
					frontmatter: opts.frontmatter ?? {},
					tags: opts.tags?.map((tag) => ({
						tag,
						position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 0, offset: 0 } },
					})),
				}
			: null;

	return { file, cache };
}

/** Wrap an array of mock_file results into the AllFiles shape */
export function make_all_files(
	files: ReturnType<typeof mock_file>[],
): AllFiles {
	return {
		obsidian: files as unknown as AllFiles["obsidian"],
		dataview: null,
	};
}

/**
 * Build a minimal BreadcrumbsPlugin stub.
 *
 * @param settings_override — merged on top of DEFAULT_SETTINGS.
 * @param known_paths — paths for which vault.getFileByPath returns a truthy
 *   object (i.e. the file "exists" in the vault). All other paths return null.
 */
export function make_plugin(
	settings_override: Partial<BreadcrumbsSettings> = {},
	known_paths: string[] = [],
): BreadcrumbsPlugin {
	const settings = {
		...DEFAULT_SETTINGS,
		...settings_override,
		// Merge nested objects one level deep rather than replacing them
		explicit_edge_sources: {
			...DEFAULT_SETTINGS.explicit_edge_sources,
			...(settings_override.explicit_edge_sources ?? {}),
		},
	} as BreadcrumbsSettings;

	return {
		settings,
		app: {
			vault: {
				getFileByPath: (path: string) =>
					known_paths.includes(path) ? ({} as TFile) : null,
				getAbstractFileByPath: () => null,
			},
			metadataCache: {
				getFirstLinkpathDest: () => null,
			},
		},
	} as unknown as BreadcrumbsPlugin;
}
