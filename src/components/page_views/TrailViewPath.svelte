<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import EdgeLink from "../EdgeLink.svelte";
	import {
		NodeStringifyOptions,
		type Path,
	} from "wasm/pkg/breadcrumbs_graph_wasm";
	import { to_node_stringify_options } from "src/graph/utils";
	import { useOwned } from "src/stores/use_owned.svelte";

	interface Props {
		plugin: BreadcrumbsPlugin;
		all_paths: Path[];
	}

	let { plugin, all_paths }: Props = $props();

	const owned_stringify = useOwned(() =>
		to_node_stringify_options(
			plugin.settings,
			plugin.settings.views.page.trail.show_node_options,
		),
	);
	let node_stringify_options = $derived(owned_stringify.current);

	let reversed = $derived(all_paths.map((path) => path.reverse_edges));
</script>

<div class="BC-trail-view flex flex-col gap-1 px-3 py-2">
	{#each reversed as path}
		<div class="BC-trail-view-path flex gap-1.5">
			{#each path as edge, j}
				<div class="BC-trail-view-item">
					{#if j !== 0}
						<span
							class="BC-trail-view-item-separator"
							aria-label={edge.get_attribute_label(plugin.graph, [
								"source",
								"implied_kind",
								"round",
							])}
						></span>
					{/if}

					<EdgeLink {edge} {plugin} {node_stringify_options} />
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	.BC-trail-view {
		overflow: hidden;
		border-radius: var(--radius-m);
		border: 1px solid var(--background-modifier-border);
		background-color: var(--background-primary);
	}

	.BC-trail-view-item-separator::before {
		content: ">";
	}
</style>
