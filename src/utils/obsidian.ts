import type { App } from "obsidian";
import { Notice, TFile } from "obsidian";
import { log } from "src/logger";
import { Links } from "./links";
import { Paths } from "./paths";

interface NotebookNavigatorPlugin {
	reveal: (file: TFile) => Promise<boolean>;
}

type AppWithPlugins = App & {
	plugins?: { getPlugin: (id: string) => unknown };
};

export const reveal_in_notebook_navigator = async (
	app: App,
	file: TFile,
): Promise<void> => {
	const nn = (app as AppWithPlugins).plugins?.getPlugin(
		"notebook-navigator",
	) as NotebookNavigatorPlugin | null;
	if (!nn?.reveal) return;
	await nn.reveal(file);
};

/**
 * Try find a given target_path from a source_path. If not found, resolve_to_absolute_path.
 *
 * Returns `null` when the link is unresolvable AND the fallback path produced by
 * resolve_to_absolute_path coincidentally matches an existing vault file (e.g. a
 * stale link like [[old/folder/Note A]] where Note A.md was moved to the root).
 * Callers should skip the link entirely in that case — no node, no edge — to avoid
 * both creating a false connection and crashing the WASM graph with
 * "There already exists a resolved node with the same name".
 */
export const resolve_relative_target_path = (
	app: App,
	relative_target_path: string,
	source_path: string,
): readonly [string, TFile | null] | null => {
	// Try raw path first — handles canvas/pdf/other non-md links like [[A.canvas]]
	const target_file =
		app.metadataCache.getFirstLinkpathDest(
			relative_target_path,
			source_path,
		) ??
		app.metadataCache.getFirstLinkpathDest(
			Paths.ensure_ext(relative_target_path),
			source_path,
		);

	if (target_file) {
		return [target_file.path, target_file] as const;
	}

	// Use [a-zA-Z0-9]+ so dotted names like "Dr. Smith" are NOT treated as having an extension.
	const has_non_md_ext =
		/\.[a-zA-Z0-9]+$/.test(relative_target_path) &&
		!relative_target_path.endsWith(".md");

	if (has_non_md_ext) {
		// resolve_to_absolute_path always strips extension and adds .md, which
		// would turn "A.canvas" into "A.md". Bypass it for non-markdown files.
		// Try vault.getAbstractFileByPath in case metadataCache hasn't indexed the link yet.
		const direct = app.vault.getAbstractFileByPath(relative_target_path);
		if (direct instanceof TFile) {
			return [direct.path, direct] as const;
		}
		return [relative_target_path, null] as const;
	}

	const extensioned = Paths.ensure_ext(relative_target_path);
	const fallback_path = Links.resolve_to_absolute_path(
		app,
		extensioned,
		source_path,
	);

	// resolve_to_absolute_path uses only the basename, so [[wrong/path/Note A]]
	// can produce "Note A.md" — a path that may already belong to a real vault
	// file (e.g. after the note was moved). Treat this as a stale/broken link
	// and signal callers to ignore it entirely.
	if (app.vault.getAbstractFileByPath(fallback_path) instanceof TFile) {
		return null;
	}

	return [fallback_path, null] as const;
};

export const copy_to_clipboard = async (
	text: string,
	options?: { notify?: boolean; log?: boolean },
) => {
	const resolved = Object.assign({ notify: true, log: true }, options);

	if (resolved.log) {
		log.feat(text);
	}

	await navigator.clipboard.writeText(text);

	if (resolved.notify) {
		new Notice("Copied to clipboard and logged to console.");
	}
};
