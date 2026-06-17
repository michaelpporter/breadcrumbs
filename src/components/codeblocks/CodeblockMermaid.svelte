<script lang="ts">
	import { ImageIcon, PencilIcon } from "lucide-svelte";
	import type { ICodeblock } from "src/codeblocks/schema";
	import { ICON_SIZE } from "src/const";
	import type { BreadcrumbsError } from "src/interfaces/graph";
	import { log } from "src/logger";
	import type BreadcrumbsPlugin from "src/main";
	import { Mermaid } from "src/utils/mermaid";
	import { onMount } from "svelte";
	import CopyToClipboardButton from "../button/CopyToClipboardButton.svelte";
	import RenderExternalCodeblock from "../obsidian/RenderExternalCodeblock.svelte";
	import CodeblockErrors from "./CodeblockErrors.svelte";
	import {
		MermaidGraphOptions,
		NodeData,
		NoteGraphError,
		TraversalOptions,
		create_edge_sorter,
	} from "wasm/pkg/breadcrumbs_graph_wasm";
	import { remove_nullish_keys } from "src/utils/objects";
	import { is_excluded } from "src/graph/builders/explicit/files";
	import { Paths } from "src/utils/paths";
	import { Links } from "src/utils/links";
	import { active_file_store } from "src/stores/active_file";

	interface Props {
		plugin: BreadcrumbsPlugin;
		options: ICodeblock["Options"];
		errors: BreadcrumbsError[];
		file_path: string;
	}

	let { plugin, options, errors, file_path }: Props = $props();

	const DEFAULT_MAX_DEPTH = 10;
	// Whole-vault graphs need a higher node ceiling than note-rooted mermaid.
	const DEFAULT_GRAPH_MAX_NODES = 1000;

	let code: string = $state("");
	let error: string | undefined = $state(undefined);

	let active_file = $derived($active_file_store);

	// `type: graph` renders the whole vault (or a `from:`-scoped subset) rather
	// than traversing out from the active note.
	const is_graph = $derived(options.type === "graph");

	export function update() {
		const max_depth =
			options.depth[1] === Infinity
				? DEFAULT_MAX_DEPTH
				: (options.depth[1] ?? DEFAULT_MAX_DEPTH);

		let entry_nodes: string[];
		// Restricts which nodes a traversal may include (None = unrestricted).
		let allowed_paths: string[] | undefined;

		if (is_graph) {
			let base: string[];
			if (options["from-paths"]?.length) {
				base = options["from-paths"];
			} else {
				base = [];
				plugin.graph.iterate_nodes((node: NodeData) =>
					base.push(node.path),
				);
			}

			// `exclude-folders` is additive to the global exclude_folders setting.
			const exclude = options["exclude-folders"] ?? [];
			entry_nodes = exclude.length
				? base.filter((p) => !is_excluded(p, exclude))
				: base;

			if (!entry_nodes.length) {
				code = "";
				error = "The graph is empty.";
				return;
			}

			// Restrict traversal targets to the allowed set so excluded notes
			// don't reappear as neighbours of included ones.
			allowed_paths = exclude.length ? entry_nodes : undefined;
		} else {
			const source_path =
				options["start-note"] || file_path || active_file?.path || "";

			if (!plugin.graph.has_node(source_path)) {
				code = "";
				error = "The file does not exist in the graph.";
				return;
			}

			entry_nodes = [file_path];
			allowed_paths = options["from-paths"];
		}

		const traversal_options = new TraversalOptions(
			entry_nodes,
			options.fields,
			max_depth,
			is_graph ? DEFAULT_GRAPH_MAX_NODES : 100, // max nodes to traverse
			!options["merge-fields"],
			allowed_paths,
		);

		const flowchart_init = remove_nullish_keys({
			curve: options["mermaid-curve"],
			defaultRenderer: options["mermaid-renderer"],
		});

		const sort = create_edge_sorter(
			options.sort.field,
			options.sort.order === -1,
		);

		const field_arrow_entries = plugin.settings.edge_fields
			.filter((f) => !!f.mermaid_arrow)
			.map((f) => [f.label, f.mermaid_arrow!] as const);
		const field_arrow_keys = field_arrow_entries.map(([k]) => k);
		const field_arrow_values = field_arrow_entries.map(([, v]) => v);

		const mermaid_options = new MermaidGraphOptions(
			is_graph ? null : file_path,
			`%%{ init: { "flowchart": ${JSON.stringify(flowchart_init)} } }%%`,
			"graph",
			options["mermaid-direction"] ?? "LR",
			true,
			options["show-attributes"] ?? [],
			sort,
			(node: NodeData) => {
				const node_path = node.path;
				const file = plugin.app.vault.getFileByPath(node_path);

				if (file) {
					return plugin.app.fileManager
						.generateMarkdownLink(file, file_path)
						.slice(2, -2);
				} else {
					return Paths.drop_ext(
						Links.resolve_to_absolute_path(
							plugin.app,
							node_path,
							file_path,
						),
					);
				}
			},
			true,
			options["mermaid-arrow"] ?? false,
			field_arrow_keys,
			field_arrow_values,
		);

		try {
			const mermaid_data = plugin.graph.generate_mermaid_graph(
				traversal_options,
				mermaid_options,
			);
			code = mermaid_data.mermaid;
			mermaid_data.free();
			error = undefined;
		} catch (e) {
			log.error("Error generating mermaid graph", e);

			code = "";
			if (e instanceof NoteGraphError) {
				error = e.message;
			} else {
				error =
					"An error occurred while updating the codeblock tree. Check the console for more information (Ctrl + Shift + I).";
			}
		}

		code = code;
	}

	onMount(() => {
		update();
	});
</script>

<div class="BC-codeblock-mermaid">
	<CodeblockErrors {plugin} {errors} />

	{#if options.title}
		<h3 class="BC-codeblock-mermaid-title">
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

				<button
					role="link"
					aria-label="View Image on mermaid.ink"
					class="clickable-icon nav-action-button"
					onclick={() => {
						window.open(Mermaid.to_image_link(code), "_blank");
					}}
				>
					<ImageIcon size={ICON_SIZE} />
				</button>

				<button
					role="link"
					aria-label="Live Edit on mermaid.live"
					class="clickable-icon nav-action-button"
					onclick={() => {
						window.open(Mermaid.to_live_edit_link(code), "_blank");
					}}
				>
					<PencilIcon size={ICON_SIZE} />
				</button>
			</div>

			<RenderExternalCodeblock
				{code}
				{plugin}
				source_path={file_path}
				type="mermaid"
			/>
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
