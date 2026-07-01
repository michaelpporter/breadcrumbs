import type { App, TFile } from "obsidian";
import { getAllTags } from "obsidian";

type FilePredicate = (file: TFile) => boolean;

const VALID_EXTENSIONS = new Set(["md", "canvas", "base"]);

function skip_ws(q: string, pos: { i: number }) {
	while (pos.i < q.length && /\s/.test(q[pos.i])) pos.i++;
}

function consume_keyword(
	q: string,
	pos: { i: number },
	keyword: string,
): boolean {
	skip_ws(q, pos);
	if (q.slice(pos.i, pos.i + keyword.length).toUpperCase() !== keyword)
		return false;
	const next = q[pos.i + keyword.length];
	if (next && !/[\s("'[#]/.test(next)) return false;
	pos.i += keyword.length;
	return true;
}

function parse_atom(
	q: string,
	pos: { i: number },
	app: App,
	source_path: string,
): FilePredicate {
	skip_ws(q, pos);

	if (q[pos.i] === "(") {
		pos.i++;
		const inner = parse_or(q, pos, app, source_path);
		skip_ws(q, pos);
		if (q[pos.i] === ")") pos.i++;
		return inner;
	}

	// #tag
	if (q[pos.i] === "#") {
		const start = pos.i;
		while (pos.i < q.length && !/[\s)&|]/.test(q[pos.i])) pos.i++;
		const tag = q.slice(start, pos.i);
		return (file) => {
			const cache = app.metadataCache.getFileCache(file);
			if (!cache) return false;
			const tags = getAllTags(cache) ?? [];
			return tags.some((t) => t === tag || t.startsWith(tag + "/"));
		};
	}

	// "folder"
	if (q[pos.i] === '"') {
		pos.i++;
		const start = pos.i;
		while (pos.i < q.length && q[pos.i] !== '"') pos.i++;
		const folder = q.slice(start, pos.i);
		if (q[pos.i] === '"') pos.i++;
		// Case-insensitive, matching Dataview's folder FROM behaviour.
		const folder_lc = folder.toLowerCase();
		return (file) => {
			if (folder_lc === "") return true;
			const file_folder = (file.parent?.path ?? "").toLowerCase();
			return (
				file_folder === folder_lc ||
				file_folder.startsWith(folder_lc + "/")
			);
		};
	}

	// [[link]]
	if (q.slice(pos.i, pos.i + 2) === "[[") {
		pos.i += 2;
		const start = pos.i;
		while (pos.i < q.length && q.slice(pos.i, pos.i + 2) !== "]]") pos.i++;
		const link_text = q.slice(start, pos.i).split("|")[0].trim();
		if (q.slice(pos.i, pos.i + 2) === "]]") pos.i += 2;
		const target = app.metadataCache.getFirstLinkpathDest(
			link_text,
			source_path,
		);
		if (!target) return () => false;
		const target_path = target.path;
		return (file) => {
			const outlinks = app.metadataCache.resolvedLinks[file.path] ?? {};
			return target_path in outlinks;
		};
	}

	// Unknown atom — skip to next whitespace/operator and return false
	while (pos.i < q.length && !/[\s)]/.test(q[pos.i])) pos.i++;
	return () => false;
}

function parse_not(
	q: string,
	pos: { i: number },
	app: App,
	source_path: string,
): FilePredicate {
	skip_ws(q, pos);
	if (consume_keyword(q, pos, "NOT")) {
		const inner = parse_atom(q, pos, app, source_path);
		return (file) => !inner(file);
	}
	return parse_atom(q, pos, app, source_path);
}

function parse_and(
	q: string,
	pos: { i: number },
	app: App,
	source_path: string,
): FilePredicate {
	let left = parse_not(q, pos, app, source_path);
	while (consume_keyword(q, pos, "AND")) {
		const right = parse_not(q, pos, app, source_path);
		const prev = left;
		left = (file) => prev(file) && right(file);
	}
	return left;
}

function parse_or(
	q: string,
	pos: { i: number },
	app: App,
	source_path: string,
): FilePredicate {
	let left = parse_and(q, pos, app, source_path);
	while (consume_keyword(q, pos, "OR")) {
		const right = parse_and(q, pos, app, source_path);
		const prev = left;
		left = (file) => prev(file) || right(file);
	}
	return left;
}

/**
 * Evaluate a minimal Dataview FROM-clause against the vault.
 *
 * Supported atoms: `#tag`, `"folder"`, `[[link]]`
 * Supported operators: `AND`, `OR`, `NOT` (standard precedence)
 *
 * Returns paths of matching vault files (md, canvas, base).
 */
export function dataview_from_query(
	query: string,
	app: App,
	source_path: string,
): string[] {
	const pos = { i: 0 };
	const predicate = parse_or(query, pos, app, source_path);
	return app.vault
		.getFiles()
		.filter(
			(file) => VALID_EXTENSIONS.has(file.extension) && predicate(file),
		)
		.map((file) => file.path);
}

/**
 * Evaluate a `from` query, swallowing parse errors (invalid syntax is
 * surfaced separately at codeblock parse-time) and re-running on every call
 * so callers see fresh vault state rather than a value cached from load.
 */
export function try_dataview_from_query(
	query: string | undefined,
	app: App,
	source_path: string,
): string[] | undefined {
	if (!query) return undefined;
	try {
		return dataview_from_query(query, app, source_path);
	} catch {
		return undefined;
	}
}
