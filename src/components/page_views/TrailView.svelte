<script lang="ts">
	import type { BreadcrumbsSettings } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import { resolve_field_group_labels } from "src/utils/edge_fields";
	import MergeFieldsButton from "../button/MergeFieldsButton.svelte";
	import TrailViewGrid from "./TrailViewGrid.svelte";
	import TrailViewPath from "./TrailViewPath.svelte";
	import {
		PathList,
		TraversalOptions,
	} from "wasm/pkg/breadcrumbs_graph_wasm";
	import { untrack } from "svelte";
	import { log } from "src/logger";
	import { json_clone } from "src/utils/json_clone";
	import { effect_counter } from "src/utils/perf";

	interface Props {
		plugin: BreadcrumbsPlugin;
		file_path: string;
	}

	let { plugin, file_path }: Props = $props();

	type TrailPageSettings = BreadcrumbsSettings["views"]["page"]["trail"];

	let last_plugin: BreadcrumbsPlugin | null = null;
	// svelte-ignore state_referenced_locally — seed valid $state for bindings; `$effect.pre` resyncs if `plugin` changes
	let settings = $state<TrailPageSettings>(
		json_clone(plugin.settings.views.page.trail),
	);

	$effect.pre(() => {
		if (last_plugin !== plugin) {
			last_plugin = plugin;
			settings = json_clone(
				untrack(() => $state.snapshot(plugin.settings.views.page.trail)),
			);
		}
	});

	const tick_trail_log = effect_counter("TrailView.log");
	$effect(() => {
		tick_trail_log();
		log.debug("Rendering Trail page view for file:", file_path);
	});

	let is_initial_mount = true;
	const tick_trail_writeback = effect_counter("TrailView.writeback");

	$effect(() => {
		tick_trail_writeback();
		const trail_snapshot = $state.snapshot(settings);
		untrack(() => {
			plugin.settings.views.page.trail = trail_snapshot;
		});
		if (is_initial_mount) {
			is_initial_mount = false;
		} else {
			untrack(() => void plugin.saveSettings());
		}
	});

	let data: {
		selected_paths: PathList | undefined;
		hit_depth_limit: boolean;
	} = $derived.by(() => {
		let edge_field_labels = resolve_field_group_labels(
			plugin.settings.edge_field_groups,
			settings.field_group_labels,
		);

		let traversal_options = new TraversalOptions(
			[file_path],
			edge_field_labels,
			5, // depth limit
			100, // max nodes to traverse
			!settings.merge_fields,
			undefined,
		);

		let traversal_data = plugin.graph.rec_traverse(traversal_options);
		// Extract primitives before freeing; TraversalResult must be freed explicitly.
		const hit_depth_limit = traversal_data.hit_depth_limit;
		let all_paths = traversal_data.to_paths();
		traversal_data.free();

		const selected_paths = all_paths.select(settings.selection);
		all_paths.free();

		return { selected_paths, hit_depth_limit };
	});

	let MAX_DEPTH = $derived(
		Math.max(0, data.selected_paths?.max_depth() ?? 0),
	);
	let depth = $state(0);
	const tick_trail_depth = effect_counter("TrailView.depth");
	$effect(() => {
		tick_trail_depth();
		depth = Math.min(MAX_DEPTH, settings.default_depth);
	});

	let sorted_paths = $derived(
		data.selected_paths?.process(plugin.graph, depth),
	);

	// Free WASM objects when the derived values change or the component unmounts.
	$effect(() => {
		const p = data.selected_paths;
		return () => p?.free();
	});
	$effect(() => {
		const paths = sorted_paths;
		return () => paths?.forEach((p) => p.free());
	});
</script>

<div>
	{#if sorted_paths && sorted_paths.length}
		<div
			class="mb-1 flex flex-wrap justify-between gap-3"
			class:hidden={!settings.show_controls}
		>
			<select class="dropdown" bind:value={settings.format}>
				{#each ["grid", "path"] as format}
					<option value={format}> {format} </option>
				{/each}
			</select>

			<select class="dropdown" bind:value={settings.selection}>
				{#each ["all", "shortest", "longest"] as s}
					<option value={s}> {s} </option>
				{/each}
			</select>

			<MergeFieldsButton bind:merge_fields={settings.merge_fields} />

			<div class="flex items-center gap-1">
				<button
					class="aspect-square text-lg"
					aria-label="Decrease max depth"
					disabled={depth <= 1}
					onclick={() => (depth = Math.max(1, depth - 1))}
				>
					-
				</button>

				<span
					class="font-mono"
					aria-label={data.hit_depth_limit
						? "Some paths have been truncated"
						: ""}
				>
					{depth}/{MAX_DEPTH}
					{data.hit_depth_limit ? " (truncated)" : ""}
				</span>

				<button
					class="aspect-square text-lg"
					aria-label="Increase max depth"
					disabled={depth >= MAX_DEPTH}
					onclick={() => (depth = Math.min(MAX_DEPTH, depth + 1))}
				>
					+
				</button>
			</div>
		</div>

		{#key sorted_paths}
			{#if settings.format === "grid"}
				<TrailViewGrid {plugin} all_paths={sorted_paths} />
			{:else if settings.format === "path"}
				<TrailViewPath {plugin} all_paths={sorted_paths} />
			{/if}
		{/key}
	{:else if settings.no_path_message}
		<p class="BC-trail-view-no-path search-empty-state">
			{settings.no_path_message}
		</p>
	{/if}
</div>
