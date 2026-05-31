import { META_ALIAS } from "src/const/metadata_fields";
import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { fail, graph_build_fail, succ } from "src/utils/result";
import { GCEdgeData } from "wasm/pkg/breadcrumbs_graph_wasm";

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

const get_traverse_note_field = (
	plugin: Parameters<ExplicitEdgeBuilder>[0],
	metadata: Record<string, unknown> | undefined,
	path: string,
) => {
	if (!metadata) return fail(undefined);

	const raw = metadata[META_ALIAS["traverse-note-field"]];
	if (!raw) return fail(undefined);

	if (typeof raw !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `traverse-note-field is not a string: '${raw}'`,
		});
	}

	const field =
		raw || plugin.settings.explicit_edge_sources.traverse_note.default_field;

	if (!plugin.settings.edge_fields.find((f) => f.label === field)) {
		return graph_build_fail({
			path,
			code: "invalid_edge_field",
			message: `traverse-note-field is not a valid BC field: '${field}'`,
		});
	}

	return succ(field);
};

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
		const field_result = get_traverse_note_field(
			plugin,
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
