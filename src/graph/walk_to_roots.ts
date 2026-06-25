import type { NoteGraph } from "wasm/pkg/breadcrumbs_graph_wasm";

/**
 * Walk *up* from `start` along `up_field_labels` and return the root notes
 * reached — nodes with no further outgoing edge in those fields.
 *
 * - Breadth-first, deduped by a `visited` set (cycle-safe).
 * - Capped at 50 levels as a runaway guard.
 * - Falls back to `[start]` when no roots are found (e.g. `start` itself is a
 *   root, or the walk is cut short).
 */
export function walk_to_roots(
	graph: NoteGraph,
	start: string,
	up_field_labels: string[],
): string[] {
	const visited = new Set<string>([start]);
	let frontier: string[] = [start];
	const roots: string[] = [];

	for (let depth = 0; depth < 50; depth++) {
		if (frontier.length === 0) break;
		const next_frontier: string[] = [];
		for (const current of frontier) {
			const edges = graph
				.get_filtered_outgoing_edges(current, up_field_labels)
				.to_array();
			if (edges.length === 0) {
				if (!roots.includes(current)) roots.push(current);
			} else {
				for (const edge of edges) {
					const target = edge.target_path(graph);
					if (!visited.has(target)) {
						visited.add(target);
						next_frontier.push(target);
					}
				}
			}
		}
		frontier = next_frontier;
	}

	return roots.length > 0 ? roots : [start];
}
