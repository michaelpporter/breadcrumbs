<script lang="ts">
	import type { EdgeField } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import type { EdgeStruct } from "wasm/pkg/breadcrumbs_graph_wasm";
	import EdgeLink from "../EdgeLink.svelte";
	import ChevronOpener from "../button/ChevronOpener.svelte";
	import TreeItemFlair from "../obsidian/TreeItemFlair.svelte";
	import {
		to_node_stringify_options,
		type EdgeAttribute,
	} from "src/graph/utils";

	// NOTE: These are available on settings, but they're modified in the parent component,

	interface Props {
		open: boolean;
		field: EdgeField;
		edges: EdgeStruct[];
		plugin: BreadcrumbsPlugin;
		// 	so rather pass them in to receive updates
		show_attributes: EdgeAttribute[];
	}

	let {
		open = $bindable(),
		field,
		edges,
		plugin,
		show_attributes,
	}: Props = $props();

	let show_node_options = $derived(
		plugin.settings.views.side.matrix.show_node_options,
	);

	let node_stringify_options = $derived(
		to_node_stringify_options(plugin.settings, show_node_options),
	);

	$effect(() => {
		const o = node_stringify_options;
		return () => o.free();
	});
</script>

<details
	class="BC-matrix-view-field BC-matrix-view-field-{field.label} tree-item"
	bind:open
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<summary class="tree-item-self is-clickable mod-collapsible text-lg">
		<div class="tree-item-icon collapse-icon">
			<ChevronOpener {open} />
		</div>

		<div class="tree-item-inner">
			<span class="tree-item-inner-text">
				{field.label}
			</span>
		</div>

		<div class="tree-item-flair-outer">
			<span class="tree-item-flair font-mono text-lg">
				{edges.length}
			</span>
		</div>
	</summary>

	<div class="tree-item-children flex flex-col">
		{#key edges}
			{#each edges as edge}
				<div class="tree-item">
					<div class="tree-item-self is-clickable">
						<div class="tree-item-inner flex grow">
							<EdgeLink
								{edge}
								{plugin}
								{node_stringify_options}
								cls="grow tree-item-inner-text"
							/>
						</div>

						<TreeItemFlair
							cls="font-mono"
							label={edge.explicit(plugin.graph) ? "x" : "i"}
							aria_label={edge.get_attribute_label(
								plugin.graph,
								show_attributes,
							)}
						/>
					</div>
				</div>
			{/each}
		{/key}
	</div>
</details>
