<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import {
		omit_hidden_view_fields,
		resolve_field_group_labels,
	} from "src/utils/edge_fields";
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
	import { prepareFuzzySearch } from "obsidian";
	import { effect_counter } from "src/utils/perf";
	import { to_node_stringify_options } from "src/graph/utils";
	import { log } from "src/logger";
	import { useViewSettings } from "src/stores/use_view_settings.svelte";
	import SearchToggleButton from "../button/SearchToggleButton.svelte";

	function walk_to_roots(
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

	let {
		plugin,
	}: {
		plugin: BreadcrumbsPlugin;
	} = $props();
	log.debug("Rendering Tree side view");

	// svelte-ignore state_referenced_locally — `plugin` is a constant singleton per instance
	const settings = useViewSettings(plugin, {
		label: "TreeView",
		read: (p) => p.settings.views.side.tree,
		write: (p, v) => {
			p.settings.views.side.tree = v;
		},
	});

	let edge_field_labels = $derived(
		omit_hidden_view_fields(
			plugin.settings.edge_fields,
			resolve_field_group_labels(
				plugin.settings.edge_field_groups,
				settings.field_group_labels,
			),
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
	const tick_tree_depth = effect_counter("TreeView.depth");
	$effect(() => {
		tick_tree_depth();
		depth = settings.default_depth;
	});

	let entry_paths = $derived.by(() => {
		if (!active_file || !plugin.graph.has_node(active_file.path))
			return undefined;
		if (settings.lock_view && plugin.graph.has_node(settings.lock_path!)) {
			log.debug("Using locked path for TreeView:", settings.lock_path);
			return [settings.lock_path!];
		} else if (settings.find_root && find_root_field_labels.length > 0) {
			const roots = walk_to_roots(
				plugin.graph,
				active_file.path,
				find_root_field_labels,
			);
			log.debug("find_root: walked up to roots", roots);
			return roots;
		}
		return [active_file.path];
	});

	let entry_path = $derived(
		entry_paths?.length === 1 ? entry_paths[0] : undefined,
	);

	let entry_node_data = $derived(
		entry_path ? plugin.graph.get_node(entry_path) : undefined,
	);

	let root_open = $state(true);
	const tick_tree_root_open = effect_counter("TreeView.root_open");
	$effect(() => {
		tick_tree_root_open();
		root_open = !settings.collapse;
	});

	let tree: FlatTraversalResult | undefined = $derived.by(() => {
		if (entry_paths && entry_paths.length > 0) {
			return plugin.graph.rec_traverse_and_process(
				new TraversalOptions(
					entry_paths,
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

	// Free WASM objects when derived values change or component unmounts.
	$effect(() => {
		const t = tree;
		return () => t?.free();
	});
	$effect(() => {
		const o = node_stringify_options;
		return () => o.free();
	});

	let search_open = $state(false);
	let search_query = $state("");

	let visible_indices = $derived.by<Set<number> | null>(() => {
		const query = search_query.trim();
		const tree = sorted_tree.tree;
		if (!query || !tree) return null;

		const matcher = prepareFuzzySearch(query);
		const visible = new Set<number>();

		const walk = (index: number): boolean => {
			const children = tree.children_at_index(index) ?? new Uint32Array();

			let child_visible = false;
			for (const child of children) {
				if (walk(child)) child_visible = true;
			}

			const render_data = tree.rendering_obj_at_index(
				index,
				plugin.graph,
				node_stringify_options,
				[],
			) as EdgeRenderingData | undefined;

			const self_match = render_data
				? matcher(render_data.link_display) !== null
				: false;

			if (self_match || child_visible) {
				visible.add(index);
				return true;
			}
			return false;
		};

		for (const entry of tree.entry_nodes) walk(entry);

		return visible;
	});
</script>

<div class="markdown-rendered BC-tree-view">
	<div class="nav-header">
		<div class="nav-buttons-container">
			<RebuildGraphButton
				cls="clickable-icon nav-action-button"
				{plugin}
			/>

			<SearchToggleButton
				cls="clickable-icon nav-action-button"
				bind:active={search_open}
			/>

			<LockViewButton
				cls="clickable-icon nav-action-button"
				bind:lock_view={settings.lock_view}
				bind:lock_path={settings.lock_path}
				active_path={active_file?.path}
			/>

			<FindRootButton
				cls="clickable-icon nav-action-button"
				bind:find_root={settings.find_root}
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
					aria-label={tree?.hit_depth_limit
						? "Some nodes have been truncated"
						: ""}
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

	{#if search_open}
		<div class="search-input-container BC-search-input-container">
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="search"
				placeholder="Search notes..."
				autofocus
				bind:value={search_query}
				onkeydown={(e) => {
					if (e.key === "Escape") {
						search_query = "";
						search_open = false;
					}
				}}
			/>
		</div>
	{/if}

	<div class="BC-tree-view-items">
		{#key sorted_tree}
			{#if sorted_tree.tree && !sorted_tree.tree.is_empty() && visible_indices?.size !== 0}
				{#if entry_node_data && entry_path}
					<details class="tree-item" bind:open={root_open}>
						<summary
							class="tree-item-self is-clickable flex items-center"
						>
							<div
								class="tree-item-icon collapse-icon mod-collapsible"
							>
								<ChevronOpener open={root_open} />
							</div>
							<div class="tree-item-inner">
								<ObsidianLink
									{plugin}
									display={node_stringify_options.stringify_node(
										entry_node_data,
									)}
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
									{visible_indices}
									show_attributes={settings.show_attributes}
									data={sorted_tree.tree}
									items={sorted_tree.tree.entry_nodes}
									open_signal={visible_indices
										? true
										: !settings.collapse}
								/>
							</div>
						{/if}
					</details>
				{:else}
					<NestedEdgeList
						{plugin}
						{node_stringify_options}
						{visible_indices}
						show_attributes={settings.show_attributes}
						data={sorted_tree.tree}
						items={sorted_tree.tree.entry_nodes}
						open_signal={visible_indices
							? true
							: !settings.collapse}
					/>
				{/if}
			{:else}
				<div class="search-empty-state">No paths found</div>
			{/if}
		{/key}
	</div>
</div>
