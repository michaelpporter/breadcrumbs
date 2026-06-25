<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import {
		omit_hidden_view_fields,
		resolve_field_group_labels,
	} from "src/utils/edge_fields";
	import { create_edge_sorter } from "wasm/pkg/breadcrumbs_graph_wasm";
	import ChevronCollapseButton from "../button/ChevronCollapseButton.svelte";
	import LockViewButton from "../button/LockViewButton.svelte";
	import RebuildGraphButton from "../button/RebuildGraphButton.svelte";
	import EdgeSortIdSelector from "../selector/EdgeSortIdSelector.svelte";
	import FieldGroupSelector from "../selector/FieldGroupLabelsSelector.svelte";
	import ShowAttributesSelectorMenu from "../selector/ShowAttributesSelectorMenu.svelte";
	import MatrixEdgeField from "./MatrixEdgeField.svelte";
	import SearchToggleButton from "../button/SearchToggleButton.svelte";
	import { prepareFuzzySearch } from "obsidian";
	import { log } from "src/logger";
	import { to_node_stringify_options } from "src/graph/utils";
	import { useViewSettings } from "src/stores/use_view_settings.svelte";
	import { useOwned } from "src/stores/use_owned.svelte";

	interface Props {
		plugin: BreadcrumbsPlugin;
	}

	let { plugin }: Props = $props();
	log.debug("Rendering Matrix side view");

	// svelte-ignore state_referenced_locally — `plugin` is a constant singleton per instance
	const settings = useViewSettings(plugin, {
		label: "Matrix",
		read: (p) => p.settings.views.side.matrix,
		write: (p, v) => {
			p.settings.views.side.matrix = v;
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

	let active_file = $derived($active_file_store);

	let grouped_out_edges = $derived.by(() => {
		if (
			active_file &&
			// Even tho we ensure the graph is built before the views are registered,
			// Existing views still try render before the graph is built.
			plugin.graph.has_node(active_file.path)
		) {
			if (
				settings.lock_view &&
				plugin.graph.has_node(settings.lock_path!)
			) {
				log.debug(
					"Using locked path for MatrixView:",
					settings.lock_path,
				);
				return plugin.graph.get_filtered_grouped_outgoing_edges(
					settings.lock_path!,
					edge_field_labels,
				);
			}
			return plugin.graph.get_filtered_grouped_outgoing_edges(
				active_file.path,
				edge_field_labels,
			);
		} else {
			return null;
		}
	});

	let sort = $derived(
		create_edge_sorter(
			settings.edge_sort_id.field,
			settings.edge_sort_id.order === -1,
		),
	);

	const owned_stringify = useOwned(() =>
		to_node_stringify_options(plugin.settings, settings.show_node_options),
	);
	let node_stringify_options = $derived(owned_stringify.current);

	let search_open = $state(false);
	let search_query = $state("");

	let matcher = $derived.by(() => {
		const query = search_query.trim();
		return query ? prepareFuzzySearch(query) : null;
	});

	let matrix_fields = $derived.by(() => {
		const fields = plugin.settings.edge_fields;

		if (!settings.custom_sort_fields) return fields;

		const order = settings.custom_sort_field_labels.filter((label) =>
			fields.some((field) => field.label === label),
		);

		if (!order.length) return fields;

		const rank = new Map(order.map((label, i) => [label, i] as const));

		return [...fields].sort((a, b) => {
			const rank_a = rank.get(a.label) ?? Number.MAX_SAFE_INTEGER;
			const rank_b = rank.get(b.label) ?? Number.MAX_SAFE_INTEGER;

			if (rank_a !== rank_b) return rank_a - rank_b;

			return (
				fields.findIndex((x) => x.label === a.label) -
				fields.findIndex((x) => x.label === b.label)
			);
		});
	});
</script>

<div class="markdown-rendered BC-matrix-view">
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

			<EdgeSortIdSelector
				cls="clickable-icon nav-action-button"
				exclude_fields={["field", "neighbour-field:"]}
				bind:edge_sort_id={settings.edge_sort_id}
			/>

			<ChevronCollapseButton
				cls="clickable-icon nav-action-button"
				bind:collapse={settings.collapse}
			/>

			<!-- We can exclude alot of attrs, since they're implied by other info on the Matrix -->
			<ShowAttributesSelectorMenu
				cls="clickable-icon nav-action-button"
				exclude_attributes={["field", "explicit"]}
				bind:show_attributes={settings.show_attributes}
			/>

			<FieldGroupSelector
				cls="clickable-icon nav-action-button"
				edge_field_groups={plugin.settings.edge_field_groups}
				bind:field_group_labels={settings.field_group_labels}
			/>
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

	{#key grouped_out_edges}
		{#if grouped_out_edges}
			<div>
				{#each matrix_fields as field}
					{@const all_edges = grouped_out_edges.get_sorted_edges(
						field.label,
						plugin.graph,
						sort,
					)}
					{@const edges = matcher
						? all_edges?.filter(
								(edge) =>
									matcher!(
										edge.stringify_target(
											plugin.graph,
											node_stringify_options,
										),
									) !== null,
							)
						: all_edges}

					{#if edges?.length}
						<MatrixEdgeField
							{edges}
							{field}
							{plugin}
							show_attributes={settings.show_attributes}
							open={!settings.collapse}
						/>
					{/if}
				{/each}
			</div>
		{:else}
			<p class="search-empty-state">No outgoings edges</p>
		{/if}
	{/key}
</div>
