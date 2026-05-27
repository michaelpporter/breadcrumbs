import { parseFrontMatterAliases } from "obsidian";
import { EXPLICIT_EDGE_SOURCES } from "src/const/graph";
import { META_ALIAS } from "src/const/metadata_fields";
import { dataview_plugin } from "src/external/dataview/index";
import type { IDataview } from "src/external/dataview/interfaces";
import { dataview_pages_to_plain_array } from "src/external/dataview/pages_to_array";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { Timer } from "src/utils/timer";
import type { GCEdgeData } from "wasm/pkg/breadcrumbs_graph_wasm";
import {
	GCNodeData,
	TransitiveGraphRule,
} from "wasm/pkg/breadcrumbs_graph_wasm";
import { add_explicit_edges } from "./explicit";
import type { AllFiles } from "./explicit/files";
import { get_all_files } from "./explicit/files";

/**
 * Build the initial node list from every vault file.
 *
 * Every markdown/canvas/base file becomes a `GCNodeData` node before any edge
 * builder runs. Builders may add *extra* nodes (e.g. unresolved link targets)
 * in their own results; duplicates are safe — the WASM engine deduplicates by
 * node id. Reads `BC-ignore-in-edges` / `BC-ignore-out-edges` frontmatter flags
 * and all `aliases` values from the Obsidian metadata cache.
 */
function get_initial_nodes(all_files: AllFiles) {
	const nodes: GCNodeData[] = [];

	for (const { file, cache } of all_files.obsidian) {
		let node_aliases: string[] = [];
		let ignore_in_edges = false;
		let ignore_out_edges = false;

		const aliases = parseFrontMatterAliases(cache?.frontmatter);
		if (Array.isArray(aliases) && aliases.length > 0) {
			node_aliases = aliases;
		}

		if (cache?.frontmatter?.[META_ALIAS["ignore-in-edges"]]) {
			ignore_in_edges = true;
		}
		if (cache?.frontmatter?.[META_ALIAS["ignore-out-edges"]]) {
			ignore_out_edges = true;
		}

		nodes.push(
			new GCNodeData(
				file.path,
				node_aliases,
				true,
				ignore_in_edges,
				ignore_out_edges,
			),
		);
	}

	return nodes;
}

/**
 * Full graph rebuild pipeline. Called on plugin load, vault-ready, and
 * whenever the user triggers a manual rebuild. Steps:
 *
 * 1. Collect all vault files + metadata cache entries once (`get_all_files`).
 * 2. Optionally populate Dataview pages for inline-field support.
 * 3. Build initial nodes from every file (`get_initial_nodes`).
 * 4. Run all 9 explicit edge builders **in parallel** (`add_explicit_edges`).
 * 5. Merge builder results (nodes + edges; log errors separately).
 * 6. Convert settings' transitive implied-relation rules to WASM objects.
 * 7. Call `plugin.graph.build_graph()` — the WASM engine takes ownership and
 *    applies transitive rules, producing the final graph.
 *
 * Returns `explicit_edge_results` so callers can inspect per-builder errors.
 */
export const rebuild_graph = async (plugin: BreadcrumbsPlugin) => {
	const timer = new Timer();
	const timer2 = new Timer();

	// Get once, send to all builders
	const all_files = get_all_files(plugin.app);

	// Populate Dataview pages when available so typed_link can read inline fields.
	// The Obsidian list remains authoritative for node discovery; Dataview is only
	// used as supplementary field data (inline fields aren't in frontmatterLinks).
	const dv_api = dataview_plugin.get_api(plugin.app);
	if (dv_api) {
		all_files.dataview = dataview_pages_to_plain_array(
			dv_api.pages(),
		) as IDataview.Page[];
	}

	// Add initial nodes
	const nodes = get_initial_nodes(all_files);

	log.debug(timer.elapsedMessage("get_initial_nodes"));
	timer.reset();

	// Explicit edges
	const explicit_edge_results = await Promise.all(
		EXPLICIT_EDGE_SOURCES.map(async (source) => {
			const results = await add_explicit_edges[source](plugin, all_files);

			return { source, results };
		}),
	);

	const edges: GCEdgeData[] = [];
	for (const { results } of explicit_edge_results) {
		nodes.push(...results.nodes);
		edges.push(...results.edges);
	}

	log.debug(timer.elapsedMessage("Collecting edges and nodes"));
	timer.reset();

	const transitive_rules = plugin.settings.implied_relations.transitive.map(
		(rule) => {
			return new TransitiveGraphRule(
				rule.name,
				rule.chain.map((attr) => attr.field!),
				rule.close_field,
				rule.rounds,
				false,
				rule.close_reversed,
			);
		},
	);

	plugin.graph.build_graph(nodes, edges, transitive_rules);
	log.debug(timer.elapsedMessage("WASM call"));
	log.debug(timer2.elapsedMessage("Total"));

	return { explicit_edge_results };
};
