<script lang="ts">
	import NestedEdgeList from "./NestedEdgeList.svelte";
	import type BreadcrumbsPlugin from "src/main";
	import ChevronOpener from "./button/ChevronOpener.svelte";
	import TreeItemFlair from "./obsidian/TreeItemFlair.svelte";
	import {
		FlatTraversalResult,
		NodeStringifyOptions,
	} from "wasm/pkg/breadcrumbs_graph_wasm";
	import type { EdgeAttribute } from "src/graph/utils";
	import ObsidianLink from "./ObsidianLink.svelte";
	import { effect_counter } from "src/utils/perf";

	interface Props {
		plugin: BreadcrumbsPlugin;
		data: FlatTraversalResult;
		items: Uint32Array;
		open_signal: boolean | null;
		node_stringify_options: NodeStringifyOptions;
		show_attributes: EdgeAttribute[] | undefined;
	}

	let {
		plugin,
		data,
		items,
		open_signal = $bindable(),
		node_stringify_options,
		show_attributes,
	}: Props = $props();

	let opens = $state<boolean[]>([]);

	const tick_nested_opens = effect_counter("NestedEdgeList.opens_sync");
	$effect(() => {
		tick_nested_opens();
		const n = items.length;
		if (opens.length !== n) {
			opens = Array(n).fill(true);
		}
		if (open_signal === true) {
			opens = Array(n).fill(true);
			open_signal = null;
		} else if (open_signal === false) {
			opens = Array(n).fill(false);
			open_signal = null;
		}
	});
</script>

{#each items as item, i}
	{@const children = data.children_at_index(item)}
	{@const render_data = data.rendering_obj_at_index(
		item,
		plugin.graph,
		node_stringify_options,
		show_attributes ?? [],
	) as EdgeRenderingData}

	{#if children && render_data}
		{@const link_class = render_data.explicit
			? "BC-edge BC-edge-explicit"
			: `BC-edge BC-edge-implied BC-edge-implied-${render_data.edge_source}`}

		<details class="tree-item" bind:open={opens[i]}>
			<summary class="tree-item-self is-clickable flex items-center">
				{#if children.length || render_data.has_cut_of_children}
					<div class="tree-item-icon collapse-icon mod-collapsible">
						<ChevronOpener open={opens[i]} />
					</div>
				{/if}

				<div class="tree-item-inner">
					<!-- <EdgeLink
						{plugin}
						edge={datum.edge}
						{node_stringify_options}
						cls="tree-item-inner-text"
					/> -->

					<ObsidianLink
						{plugin}
						display={render_data.link_display}
						path={render_data.link_path}
						resolved={render_data.target_resolved}
						cls="tree-item-inner-text BC-edge {link_class}"
					/>
				</div>

				{#if show_attributes?.length}
					<TreeItemFlair label={render_data.attribute_label} />
				{/if}
			</summary>

			{#if children.length && opens[i]}
				<div class="tree-item-children">
					<NestedEdgeList
						{plugin}
						{show_attributes}
						{node_stringify_options}
						{data}
						{open_signal}
						items={children}
					/>
				</div>
			{/if}

			{#if render_data.has_cut_of_children && opens[i]}
				<div class="tree-item-children">
					<details class="tree-item">
						<summary class="tree-item-self flex items-center">
							<div class="tree-item-inner">
								<span>Traversal limit reached...</span>
							</div>
						</summary>
					</details>
				</div>
			{/if}
		</details>
	{/if}
{/each}
