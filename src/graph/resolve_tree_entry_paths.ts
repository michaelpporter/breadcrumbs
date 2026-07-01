import type { NoteGraph } from "wasm/pkg/breadcrumbs_graph_wasm";
import { walk_to_roots } from "./walk_to_roots";

/**
 * Decide which node(s) a tree side-view should start rendering from:
 * a locked path, the find-root walk, or the active file itself — in that
 * precedence order, falling through when a preferred option isn't available.
 */
export function resolve_tree_entry_paths(
	graph: NoteGraph,
	active_file_path: string | undefined,
	options: {
		lock_view: boolean;
		lock_path: string;
		find_root: boolean;
		find_root_field_labels: string[];
	},
): string[] | undefined {
	if (!active_file_path || !graph.has_node(active_file_path)) return undefined;

	if (options.lock_view && graph.has_node(options.lock_path)) {
		return [options.lock_path];
	}

	if (options.find_root && options.find_root_field_labels.length > 0) {
		return walk_to_roots(
			graph,
			active_file_path,
			options.find_root_field_labels,
		);
	}

	return [active_file_path];
}
