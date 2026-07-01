import type { NoteGraph } from "wasm/pkg/breadcrumbs_graph_wasm";

export interface ResolvedCodeblockSource {
	source_path: string;
	max_depth: number;
}

/**
 * The source-note and max-depth arithmetic shared by all three codeblock
 * types (Tree/Mermaid/Markmap): `start-note` override, else the codeblock's
 * containing file, else the active file; `depth[1] === Infinity` falls back
 * to the caller's default (each type has its own).
 */
export function resolve_codeblock_source(
	options: { "start-note"?: string; depth: number[] },
	file_path: string,
	active_file_path: string | undefined,
	default_max_depth: number,
): ResolvedCodeblockSource {
	const source_path =
		options["start-note"] || file_path || active_file_path || "";

	const max_depth =
		options.depth[1] === Infinity
			? default_max_depth
			: (options.depth[1] ?? default_max_depth);

	return { source_path, max_depth };
}

/** Error message for a resolved source_path that isn't in the graph, or undefined if valid. */
export function validate_codeblock_entry(
	graph: NoteGraph,
	source_path: string,
): string | undefined {
	return graph.has_node(source_path)
		? undefined
		: "The file does not exist in the graph.";
}
