import type { ListIndexOptions } from "src/commands/list_index";
import {
	build_list_index,
	LIST_INDEX_DEFAULT_OPTIONS,
} from "src/commands/list_index";
import { active_file_store } from "src/stores/active_file";
import { get } from "svelte/store";
import type { EdgeList } from "wasm/pkg/breadcrumbs_graph_wasm";
import type BCPlugin from "../main";

export class BCAPI {
	plugin: BCPlugin;

	public constructor(plugin: BCPlugin) {
		this.plugin = plugin;
	}

	get fields() {
		return this.plugin.settings.edge_fields;
	}

	get field_groups() {
		return this.plugin.settings.edge_field_groups;
	}

	public async refresh() {
		await this.plugin.rebuildGraph();
	}

	// TODO(RUST)
	// public build_tree = Traverse.build_tree;
	// public breadth_first_traversal = Traverse.breadth_first;

	/**
	 * Create a list index from a starting node.
	 * If no start node is provided, it defaults to the active file.
	 *
	 * @param start_node
	 * @param options
	 * @returns
	 */
	public create_list_index(
		start_node?: string,
		options?: ListIndexOptions,
	): string {
		start_node ??= get(active_file_store)?.path;
		if (!start_node) throw new Error("No active file");

		return build_list_index(
			this.plugin.graph,
			start_node,
			this.plugin.settings,
			Object.assign({ ...LIST_INDEX_DEFAULT_OPTIONS }, options),
			this.plugin.app,
		);
	}

	/**
	 * Gets all outgoing edges from a node in the graph.
	 * If no node is specified, it defaults to the active file.
	 *
	 * @param node
	 * @returns
	 */
	public get_neighbours(node?: string): EdgeList | undefined {
		node ??= get(active_file_store)?.path;
		return node && this.plugin.graph.has_node(node)
			? this.plugin.graph.get_outgoing_edges(node)
			: undefined;
	}
}
