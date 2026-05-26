<script lang="ts">
	import type { ICodeblock } from "src/codeblocks/schema";
	import { edge_tree_to_list_index } from "src/commands/list_index";
	import { to_node_stringify_options } from "src/graph/utils";
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { onMount, onDestroy } from "svelte";
	import CopyToClipboardButton from "../button/CopyToClipboardButton.svelte";
	import RenderExternalCodeblock from "../obsidian/RenderExternalCodeblock.svelte";
	import CodeblockErrors from "./CodeblockErrors.svelte";
	import {
		create_edge_sorter,
		FlatTraversalResult,
		NoteGraphError,
		TraversalOptions,
		TraversalPostprocessOptions,
	} from "wasm/pkg/breadcrumbs_graph_wasm";
	import { log } from "src/logger";
	import { Links } from "src/utils/links";

	interface Props {
		plugin: BreadcrumbsPlugin;
		options: ICodeblock["Options"];
		errors: BreadcrumbsError[];
		file_path: string;
	}

	let { plugin, options, errors, file_path }: Props = $props();

	let sort = $derived(
		create_edge_sorter(options.sort.field, options.sort.order === -1),
	);
	let show_node_options = $derived(
		plugin.settings.views.codeblocks.show_node_options,
	);

	const DEFAULT_MAX_DEPTH = 5;

	let data: FlatTraversalResult | undefined = $state(undefined);
	let error: string | undefined = $state(undefined);

	let active_file = $derived($active_file_store);

	export function update() {
		const max_depth =
			options.depth[1] === Infinity
				? DEFAULT_MAX_DEPTH
				: (options.depth[1] ?? DEFAULT_MAX_DEPTH);

		const source_path =
			options["start-note"] || file_path || active_file?.path || "";

		if (!plugin.graph.has_node(source_path)) {
			data = undefined;
			error = "The file does not exist in the graph.";
			return;
		}

		const traversal_options = new TraversalOptions(
			[source_path],
			options.fields,
			max_depth,
			100, // max nodes to traverse
			!options["merge-fields"],
			options["dataview-from-paths"],
		);

		const postprocess_options = new TraversalPostprocessOptions(
			sort,
			options.flat,
		);

		try {
			const new_data = plugin.graph.rec_traverse_and_process(
				traversal_options,
				postprocess_options,
			);
			data?.free(); // free previous FlatTraversalResult
			data = new_data;
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

	let code = $derived.by(() => {
		if (data) {
			const stringify_options = to_node_stringify_options(
				plugin.settings,
				show_node_options,
			);
			const node_data = plugin.graph.get_node(file_path)!;

			const link = Links.ify(
				file_path,
				stringify_options.stringify_node(node_data),
				{
					link_kind:
						plugin.settings.commands.list_index.default_options
							.link_kind,
				},
			);
			stringify_options.free();

			return (
				"# " +
				link +
				"\n" +
				edge_tree_to_list_index(plugin.graph, data, plugin.settings, {
					...plugin.settings.commands.list_index.default_options,
					show_node_options,
					show_attributes: options["show-attributes"] ?? [],
				})
			);
		} else {
			return "";
		}
	});

	$inspect(code);

	// Free final FlatTraversalResult when component unmounts.
	onDestroy(() => data?.free());

	// export let plugin: BreadcrumbsPlugin;
	// export let options: ICodeblock["Options"];
	// export let errors: BreadcrumbsError[];
	// export let file_path: string;

	// // TODO(RUST): Translate

	// const sort = get_edge_sorter(options.sort, plugin.graph);
	// const { show_node_options } = plugin.settings.views.codeblocks;

	// let tree: EdgeTree[] = [];

	// // if the file_path is an empty string, so the code block is not rendered inside note, we fall back to the active file store
	// $: source_path = file_path
	// 	? file_path
	// 	: $active_file_store
	// 		? $active_file_store.path
	// 		: "";

	// // this is an exposed function that we can call from the outside to update the codeblock
	// export const update = () => {
	// 	tree = Traverse.sort_edge_tree(get_tree(), sort);
	// };

	// const base_traversal = (attr: EdgeAttrFilters) =>
	// 	Traverse.build_tree(
	// 		plugin.graph,
	// 		source_path,
	// 		{ max_depth: options.depth[1] },
	// 		(e) =>
	// 			has_edge_attrs(e, {
	// 				...attr,
	// 				$or_target_ids: options["dataview-from-paths"],
	// 			}),
	// 	);

	// const edge_field_labels =
	// 	options.fields ?? plugin.settings.edge_fields.map((f) => f.label);

	// const get_tree = () => {
	// 	if (source_path && plugin.graph.hasNode(source_path)) {
	// 		const traversal = options["merge-fields"]
	// 			? base_traversal({ $or_fields: options.fields })
	// 			: edge_field_labels.flatMap((field) =>
	// 					base_traversal({ field }),
	// 				);

	// 		// NOTE: The flattening is done here so that:
	// 		// - We can use NestedEdgeList for both modes
	// 		// - ListIndex builds from an EdgeTree[] as well
	// 		return options.flat
	// 			? Traverse.flatten_tree(traversal).map((item) => ({
	// 					depth: 0,
	// 					children: [],
	// 					edge: item.edge,
	// 				}))
	// 			: traversal;
	// 	} else {
	// 		return [];
	// 	}
	// };

	// $: code = ListIndex.edge_tree_to_list_index(tree, {
	// 	...plugin.settings.commands.list_index.default_options,
	// 	show_node_options,
	// 	show_attributes: options["show-attributes"] ?? [],
	// });

	onMount(() => {
		update();
	});
</script>

<div class="BC-codeblock-markmap">
	<CodeblockErrors {plugin} {errors} />

	{#if options.title}
		<h3 class="BC-codeblock-markmap-title">
			{options.title}
		</h3>
	{/if}

	{#if code}
		<div class="relative">
			<div class="absolute left-2 top-2 flex">
				<CopyToClipboardButton
					text={code}
					cls="clickable-icon nav-action-button"
				/>
			</div>

			<RenderExternalCodeblock
				{code}
				{plugin}
				source_path={file_path}
				type="markmap"
			/>
		</div>
	{:else if error}
		<p class="search-empty-state">{error}</p>
	{:else}
		<p class="search-empty-state">No paths found.</p>
	{/if}
</div>
