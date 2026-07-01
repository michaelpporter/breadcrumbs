<script lang="ts">
	import type { ICodeblock } from "src/codeblocks/schema";
	import { edge_tree_to_list_index } from "src/commands/list_index";
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import { log } from "src/logger";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { Timer } from "src/utils/timer";
	import { onMount, onDestroy } from "svelte";
	import {
		FlatTraversalResult,
		NoteGraphError,
	} from "wasm/pkg/breadcrumbs_graph_wasm";
	import { traverse } from "src/graph/traversal";
	import {
		resolve_codeblock_source,
		validate_codeblock_entry,
	} from "src/codeblocks/resolve_codeblock_source";
	import { try_dataview_from_query } from "src/codeblocks/dataview_from";
	import NestedEdgeList from "../NestedEdgeList.svelte";
	import CopyToClipboardButton from "../button/CopyToClipboardButton.svelte";
	import CodeblockErrors from "./CodeblockErrors.svelte";
	import { to_node_stringify_options } from "src/graph/utils";
	import { useOwned } from "src/stores/use_owned.svelte";

	interface Props {
		plugin: BreadcrumbsPlugin;
		options: ICodeblock["Options"];
		errors: BreadcrumbsError[];
		file_path: string;
	}

	let { plugin, options, errors, file_path }: Props = $props();

	const owned_stringify = useOwned(() =>
		to_node_stringify_options(
			plugin.settings,
			plugin.settings.views.codeblocks.show_node_options,
		),
	);
	let node_stringify_options = $derived(owned_stringify.current);

	const DEFAULT_MAX_DEPTH = 5;

	let data: FlatTraversalResult | undefined = $state(undefined);
	let error: string | undefined = $state(undefined);

	let active_file = $derived($active_file_store);

	export function update() {
		const { source_path, max_depth } = resolve_codeblock_source(
			options,
			file_path,
			active_file?.path,
			DEFAULT_MAX_DEPTH,
		);

		const validation_error = validate_codeblock_entry(
			plugin.graph,
			source_path,
		);
		if (validation_error) {
			data = undefined;
			error = validation_error;
			return;
		}

		const dv_paths = try_dataview_from_query(
			options.from,
			plugin.app,
			file_path,
		);

		try {
			const new_data = traverse(plugin.graph, {
				entry: [source_path],
				fields: options.fields,
				depth: max_depth,
				separateEdges: !options["merge-fields"],
				dataviewFrom: dv_paths,
				sort: options.sort,
				flatten: options.flat,
			});
			const old_data = data;
			data = new_data; // assign before freeing so derivations never read a freed handle
			old_data?.free();
			error = undefined;
		} catch (e) {
			log.error("Error updating codeblock tree", e);
			data?.free();
			data = undefined;
			if (e instanceof NoteGraphError) {
				error = e.message;
			} else {
				error =
					"An error occurred while updating the codeblock tree. Check the console for more information (Ctrl + Shift + I).";
			}
		}
	}

	onMount(() => {
		const timer = new Timer();

		update();

		log.debug(timer.elapsedMessage("CodeblockTree initial traversal"));
	});

	// Free final FlatTraversalResult when component unmounts.
	onDestroy(() => data?.free());
</script>

<div class="BC-codeblock-tree">
	<CodeblockErrors {plugin} {errors} />

	{#if options.title}
		<h3 class="BC-codeblock-tree-title">
			{options.title}
		</h3>
	{/if}

	{#if data && !data.is_empty()}
		<div class="BC-codeblock-tree-items relative">
			<div class="absolute bottom-2 right-2 flex">
				<CopyToClipboardButton
					cls="clickable-icon nav-action-button"
					text={() =>
						edge_tree_to_list_index(
							plugin.graph,
							data,
							plugin.settings,
							{
								...plugin.settings.commands.list_index
									.default_options,
								show_attributes:
									options["show-attributes"] ?? [],
							},
							plugin.app,
						)}
				/>
			</div>

			<!-- NOTE: Padded so that the flair doesn't interfere with the floating buttons -->
			<div class="pr-10">
				<NestedEdgeList
					{plugin}
					{node_stringify_options}
					{data}
					items={data.entry_nodes}
					open_signal={!options.collapse}
					show_attributes={options["show-attributes"]}
				/>
			</div>
		</div>
	{:else if error}
		<p class="search-empty-state">{error}</p>
	{:else}
		<p class="search-empty-state">
			No paths found{options.fields?.length
				? ` for field(s): ${options.fields.join(", ")}`
				: ""}.
		</p>
	{/if}
</div>
