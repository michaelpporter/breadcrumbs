import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { GCEdgeData } from "wasm/pkg/breadcrumbs_graph_wasm";
import { read_edge_field } from "./read_edge_field";

/**
 * Walk the Obsidian vault link graph from a starting note using iterative DFS.
 * Returns one [parent, child] pair per edge in the DFS tree (cycles ignored).
 */
function dfs_edges(
	start: string,
	links: Record<string, Record<string, number>>,
): [string, string][] {
	const edges: [string, string][] = [];
	const visited = new Set<string>();
	const stack: { node: string; parent: string | null }[] = [
		{ node: start, parent: null },
	];

	while (stack.length) {
		const item = stack.pop()!;
		if (visited.has(item.node)) continue;
		visited.add(item.node);
		if (item.parent !== null) edges.push([item.parent, item.node]);
		for (const child of Object.keys(links[item.node] ?? {})) {
			if (!visited.has(child)) {
				stack.push({ node: child, parent: item.node });
			}
		}
	}

	return edges;
}

/**
 * **traverse_note** — vault-link DFS edge builder.
 *
 * A note annotated with `BC-traverse-note-field: <field>` becomes a traversal
 * root. The builder walks the Obsidian vault link graph (resolved wikilinks /
 * markdown links) via an iterative DFS starting from that note, collecting one
 * parent→child edge per hop. All edges are typed with the specified BC field.
 *
 * Cycles are automatically skipped (visited-set). Only resolved link targets
 * (paths present in `metadataCache.resolvedLinks`) produce edges; unresolved
 * links are ignored.
 */
export const _add_explicit_edges_traverse_note: ExplicitEdgeBuilder = (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };

	const resolved_links = plugin.app.metadataCache.resolvedLinks;

	all_files.obsidian.forEach(({ file, cache }) => {
		const field_result = read_edge_field(
			plugin,
			"traverse_note",
			cache?.frontmatter,
			file.path,
		);

		if (!field_result.ok) {
			if (field_result.error) results.errors.push(field_result.error);
			return;
		}

		const field = field_result.data;

		for (const [parent, child] of dfs_edges(file.path, resolved_links)) {
			results.edges.push(
				new GCEdgeData(parent, child, field, "traverse_note"),
			);
		}
	});

	return results;
};
