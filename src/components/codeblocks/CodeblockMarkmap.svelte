<script lang="ts">
	import { Keymap } from "obsidian";
	import type { Component } from "obsidian";
	import type { ICodeblock } from "src/codeblocks/schema";
	import { edge_tree_to_list_index } from "src/commands/list_index";
	import { to_node_stringify_options } from "src/graph/utils";
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { onMount, onDestroy } from "svelte";
	import CopyToClipboardButton from "../button/CopyToClipboardButton.svelte";
	import CodeblockErrors from "./CodeblockErrors.svelte";
	import {
		create_edge_sorter,
		FlatTraversalResult,
		NoteGraphError,
		TraversalOptions,
		TraversalPostprocessOptions,
	} from "wasm/pkg/breadcrumbs_graph_wasm";
	import { dataview_plugin } from "src/external/dataview";
	import { dataview_pages_to_plain_array } from "src/external/dataview/pages_to_array";
	import type { IDataview } from "src/external/dataview/interfaces";
	import { log } from "src/logger";
	import { Links } from "src/utils/links";
	import { Transformer } from "markmap-lib";
	import { Markmap, globalCSS, loadCSS } from "markmap-view";

	// Inject markmap styles into the document once.
	loadCSS([{ type: "style", data: globalCSS }]);

	interface Props {
		plugin: BreadcrumbsPlugin;
		options: ICodeblock["Options"];
		errors: BreadcrumbsError[];
		file_path: string;
		parent_component?: Component | undefined;
	}

	let { plugin, options, errors, file_path, parent_component = undefined }: Props = $props();

	let sort = $derived(
		create_edge_sorter(options.sort.field, options.sort.order === -1),
	);
	let show_node_options = $derived(
		plugin.settings.views.codeblocks.show_node_options,
	);

	const DEFAULT_MAX_DEPTH = 5;

	let data: FlatTraversalResult | undefined = $state(undefined);
	let error: string | undefined = $state(undefined);
	let active_dv_paths: string[] | undefined = $state(undefined);

	let active_file = $derived($active_file_store);

	export function update() {
		const max_depth =
			options.depth[1] === Infinity
				? DEFAULT_MAX_DEPTH
				: (options.depth[1] ?? DEFAULT_MAX_DEPTH);

		const source_path =
			options["start-note"] || file_path || active_file?.path || "";

		// Re-query Dataview on every update so we pick up a fresh index
		// (the paths pre-computed in postprocess_options may be stale if DV
		// wasn't ready when the MDRC first loaded).
		let live_dv_paths: string[] | undefined;
		if (options["dataview-from"]) {
			try {
				const pages = dataview_pages_to_plain_array(
					dataview_plugin
						.get_api(plugin.app)
						?.pages(options["dataview-from"], file_path),
				) as IDataview.Page[];
				live_dv_paths = pages.map((p) => p.file.path);
			} catch (_) {
				// DV not available; fall through to source_path traversal
			}
		}

		const has_dv_paths = !!live_dv_paths?.length;
		active_dv_paths = live_dv_paths;

		if (has_dv_paths) {
			const any_in_graph = live_dv_paths!.some((p) =>
				plugin.graph.has_node(p),
			);
			if (!any_in_graph) {
				data = undefined;
				error = "None of the dataview-from notes exist in the graph.";
				return;
			}
		} else if (!plugin.graph.has_node(source_path)) {
			data = undefined;
			error = "The file does not exist in the graph.";
			return;
		}

		const entry_nodes = has_dv_paths ? live_dv_paths! : [source_path];

		const traversal_options = new TraversalOptions(
			entry_nodes,
			options.fields,
			max_depth,
			100, // max nodes to traverse
			!options["merge-fields"],
			undefined,
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
			const old_data = data;
			data = new_data; // update state before freeing so derivations read valid data
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

	let code = $derived.by(() => {
		if (data) {
			const has_dv_paths = !!active_dv_paths?.length;

			const list = edge_tree_to_list_index(
				plugin.graph,
				data,
				plugin.settings,
				{
					...plugin.settings.commands.list_index.default_options,
					show_node_options,
					show_attributes: options["show-attributes"] ?? [],
				},
				plugin.app,
			);

			if (has_dv_paths) {
				return (options.title ? "# " + options.title + "\n" : "") + list;
			}

			const source_path =
				options["start-note"] || file_path || active_file?.path || "";
			const stringify_options = to_node_stringify_options(
				plugin.settings,
				show_node_options,
			);
			const node_data = plugin.graph.get_node(source_path);
			const link = node_data
				? Links.ify(
						source_path,
						stringify_options.stringify_node(node_data),
						{
							link_kind:
								plugin.settings.commands.list_index
									.default_options.link_kind,
						},
					)
				: source_path;
			stringify_options.free();

			return "# " + link + "\n" + list;
		} else {
			return "";
		}
	});

	// Markmap SVG rendering
	let svg_el: SVGElement | undefined = $state(undefined);
	let mm: Markmap | undefined;
	const transformer = new Transformer();

	// Strip [[path|alias]] wikilinks to clean display names and build a
	// reverse Map (display → path) for click navigation.
	function strip_wikilinks(md: string): { clean: string; path_map: Map<string, string> } {
		const path_map = new Map<string, string>();
		const clean = md.replace(
			/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g,
			(_, path: string, alias?: string) => {
				const display =
					alias ?? path.split("/").pop()?.replace(/\.md$/, "") ?? path;
				if (!path_map.has(display)) path_map.set(display, path);
				return display;
			},
		);
		return { clean, path_map };
	}

	let processed = $derived.by(() => strip_wikilinks(code));
	let display_code = $derived(processed.clean);
	let path_map = $derived(processed.path_map);

	function handle_node_click(e: MouseEvent) {
		const target = e.target as HTMLElement | SVGElement;
		// Circle clicks toggle collapse — don't also navigate
		if (target instanceof SVGCircleElement) return;
		const fo = (target as HTMLElement).closest?.("foreignObject");
		if (!fo) return;
		const text = (fo as unknown as HTMLElement).textContent?.trim() ?? "";
		if (!text) return;
		const path = path_map.get(text);
		if (!path) return;
		e.stopPropagation();
		const newLeaf = Keymap.isModEvent(e);
		void plugin.app.workspace.openLinkText(path, file_path, newLeaf ?? false);
	}

	$effect(() => {
		if (!svg_el || !display_code) return;
		const { root } = transformer.transform(display_code);
		if (mm) {
			mm.setData(root);
			void mm.fit();
		} else {
			mm = Markmap.create(svg_el, undefined, root);
			svg_el.addEventListener("click", handle_node_click);
			void mm.fit();
		}
	});

	onDestroy(() => {
		svg_el?.removeEventListener("click", handle_node_click);
		mm?.destroy();
		data?.free();
	});

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
			<div class="absolute left-2 top-2 flex" style="z-index: 1;">
				<CopyToClipboardButton
					text={code}
					cls="clickable-icon nav-action-button"
				/>
				</div>
			<svg
				bind:this={svg_el}
				style="width: 100%; height: 400px; display: block;"
			></svg>
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
