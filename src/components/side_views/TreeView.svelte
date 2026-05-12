<script lang="ts">
	import type { BreadcrumbsSettings } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { resolve_field_group_labels } from "src/utils/edge_fields";
	import NestedEdgeList from "../NestedEdgeList.svelte";
	import ChevronCollapseButton from "../button/ChevronCollapseButton.svelte";
	import ChevronOpener from "../button/ChevronOpener.svelte";
	import FindRootButton from "../button/FindRootButton.svelte";
	import ObsidianLink from "../ObsidianLink.svelte";
	import LockViewButton from "../button/LockViewButton.svelte";
	import MergeFieldsButton from "../button/MergeFieldsButton.svelte";
	import RebuildGraphButton from "../button/RebuildGraphButton.svelte";
	import EdgeSortIdSelector from "../selector/EdgeSortIdSelector.svelte";
	import FieldGroupLabelsSelector from "../selector/FieldGroupLabelsSelector.svelte";
	import ShowAttributesSelectorMenu from "../selector/ShowAttributesSelectorMenu.svelte";
	import {
		FlatTraversalResult,
		NoteGraph,
		TraversalOptions,
		TraversalPostprocessOptions,
		create_edge_sorter,
	} from "wasm/pkg/breadcrumbs_graph_wasm";
	import { untrack } from "svelte";
	import { to_node_stringify_options } from "src/graph/utils";
	import { log } from "src/logger";
	import { json_clone } from "src/utils/json_clone";

	function walk_to_root(
		graph: NoteGraph,
		start: string,
		up_field_labels: string[],
	): string {
		const visited = new Set<string>([start]);
		let current = start;
		for (let i = 0; i < 50; i++) {
			const edges = graph
				.get_filtered_outgoing_edges(current, up_field_labels)
				.to_array();
			if (edges.length === 0) break;
			const next = edges[0].target_path(graph);
			if (visited.has(next)) break;
			visited.add(next);
			current = next;
		}
		return current;
	}

	let {
		plugin,
	}: {
		plugin: BreadcrumbsPlugin;
	} = $props();
	log.debug("Rendering Tree side view");

	type TreeSideSettings = BreadcrumbsSettings["views"]["side"]["tree"];

	let last_plugin: BreadcrumbsPlugin | null = null;
	// svelte-ignore state_referenced_locally — seed valid $state for bindings; `$effect.pre` resyncs if `plugin` changes
	let settings = $state<TreeSideSettings>(
		json_clone(plugin.settings.views.side.tree),
	);

	$effect.pre(() => {
		if (last_plugin !== plugin) {
			last_plugin = plugin;
			settings = json_clone(
				untrack(() => $state.snapshot(plugin.settings.views.side.tree)),
			);
		}
	});

	$effect(() => {
		const tree_snapshot = $state.snapshot(settings);
		untrack(() => {
			plugin.settings.views.side.tree = tree_snapshot;
			void plugin.saveSettings();
		});
	});

	let edge_field_labels = $derived(
		resolve_field_group_labels(
			plugin.settings.edge_field_groups,
			settings.field_group_labels,
		),
	);

	let find_root_field_labels = $derived(
		resolve_field_group_labels(
			plugin.settings.edge_field_groups,
			settings.find_root_field_group_labels,
		),
	);

	let sort = $derived(
		create_edge_sorter(
			settings.edge_sort_id.field,
			settings.edge_sort_id.order === -1,
		),
	);

	let active_file = $derived($active_file_store);

	let depth = $state(0);
	$effect(() => {
		depth = settings.default_depth;
	});

	let entry_path = $derived.by(() => {
		if (!active_file || !plugin.graph.has_node(active_file.path)) return undefined;
		if (settings.lock_view && plugin.graph.has_node(settings.lock_path!)) {
			log.debug("Using locked path for TreeView:", settings.lock_path);
			return settings.lock_path!;
		} else if (settings.find_root && find_root_field_labels.length > 0) {
			const root = walk_to_root(plugin.graph, active_file.path, find_root_field_labels);
			log.debug("find_root: walked up to", root);
			return root;
		}
		return active_file.path;
	});

	let entry_node_data = $derived(
		entry_path ? plugin.graph.get_node(entry_path) : undefined,
	);

	let root_open = $state(true);
	$effect(() => {
		root_open = !settings.collapse;
	});

	let tree: FlatTraversalResult | undefined = $derived.by(() => {
		if (entry_path) {
			return plugin.graph.rec_traverse_and_process(
				new TraversalOptions(
					[entry_path],
					edge_field_labels,
					depth,
					100,
					settings.merge_fields,
					undefined,
				),
				new TraversalPostprocessOptions(sort, false),
			);
		} else {
			return undefined;
		}
	});

	// We want to re-sort, when the sorter changes.
	// Because svelte can't track changes to the tree, we need to wrap it in an object.
	let sorted_tree = $derived.by(() => {
		const s = sort;
		untrack(() => tree?.sort(plugin.graph, s));
		return {
			tree: tree,
		};
	});

	let node_stringify_options = $derived(
		to_node_stringify_options(plugin.settings, settings.show_node_options),
	);
</script>

<div class="markdown-rendered BC-tree-view">
	<div class="nav-header">
		<div class="nav-buttons-container">
			<RebuildGraphButton
				cls="clickable-icon nav-action-button"
				{plugin}
			/>

			<LockViewButton
				cls="clickable-icon nav-action-button"
				bind:lock_view={settings.lock_view}
				bind:lock_path={settings.lock_path}
				active_path={active_file?.path}
			/>


			<EdgeSortIdSelector
				cls="clickable-icon nav-action-button"
				exclude_fields={[]}
				bind:edge_sort_id={settings.edge_sort_id}
			/>

			<ShowAttributesSelectorMenu
				cls="clickable-icon nav-action-button"
				bind:show_attributes={settings.show_attributes}
			/>

			<ChevronCollapseButton
				cls="clickable-icon nav-action-button"
				bind:collapse={settings.collapse}
			/>

			<MergeFieldsButton
				cls="clickable-icon nav-action-button"
				bind:merge_fields={settings.merge_fields}
			/>
			<FieldGroupLabelsSelector
				cls="clickable-icon nav-action-button"
				edge_field_groups={plugin.settings.edge_field_groups}
				bind:field_group_labels={settings.field_group_labels}
			/>

			<div class="flex items-center gap-1">
				<button
					class="clickable-icon nav-action-button aspect-square text-lg"
					aria-label="Decrease max depth"
					disabled={depth <= 1}
					onclick={() => (depth = Math.max(1, depth - 1))}
				>
					-
				</button>

				<span
					class="font-mono text-sm"
					aria-label={tree?.hit_depth_limit ? "Some nodes have been truncated" : ""}
				>
					{depth}{tree?.hit_depth_limit ? "+" : ""}
				</span>

				<button
					class="clickable-icon nav-action-button aspect-square text-lg"
					aria-label="Increase max depth"
					onclick={() => (depth = depth + 1)}
				>
					+
				</button>
			</div>
		</div>
	</div>

	<div class="BC-tree-view-items">
		{#key sorted_tree}
			{#if sorted_tree.tree && !sorted_tree.tree.is_empty()}
				{#if entry_node_data && entry_path}
					<details class="tree-item" bind:open={root_open}>
						<summary class="tree-item-self is-clickable flex items-center">
							<div class="tree-item-icon collapse-icon mod-collapsible">
								<ChevronOpener open={root_open} />
							</div>
							<div class="tree-item-inner">
								<ObsidianLink
									{plugin}
									display={node_stringify_options.stringify_node(entry_node_data)}
									path={entry_path}
									resolved={true}
									cls="tree-item-inner-text"
								/>
							</div>
						</summary>
						{#if root_open}
							<div class="tree-item-children">
								<NestedEdgeList
									{plugin}
									{node_stringify_options}
									show_attributes={settings.show_attributes}
									data={sorted_tree.tree}
									items={sorted_tree.tree.entry_nodes}
									open_signal={!settings.collapse}
								/>
							</div>
						{/if}
					</details>
				{:else}
					<NestedEdgeList
						{plugin}
						{node_stringify_options}
						show_attributes={settings.show_attributes}
						data={sorted_tree.tree}
						items={sorted_tree.tree.entry_nodes}
						open_signal={!settings.collapse}
					/>
				{/if}
			{:else}
				<div class="search-empty-state">No paths found</div>
			{/if}
		{/key}
	</div>
</div>
