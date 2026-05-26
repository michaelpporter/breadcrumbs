import type { TFile } from "obsidian";
import { MarkdownView, Notice } from "obsidian";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { drop_crumbs } from "src/utils/drop_crumb";
import { Paths } from "src/utils/paths";
import { resolve_templates } from "src/utils/strings";
import {
	AddEdgeGraphUpdate,
	BatchGraphUpdate,
	GCEdgeData,
} from "wasm/pkg/breadcrumbs_graph_wasm";

export async function thread(
	plugin: BreadcrumbsPlugin,
	field: string,
	options: BreadcrumbsSettings["commands"]["thread"]["default_options"],
) {
	const active_view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!active_view) return new Notice("No active Markdown view");
	const source_file = active_view.file;
	if (!source_file) return new Notice("No active file");

	// Resolve the target path template
	const template_data = {
		attr: { field },
		source: {
			path: source_file.path,
			basename: source_file.basename,
			folder: source_file.parent?.path ?? "",
		},
	};
	log.info("thread > template_data", template_data);

	const target_path = Paths.normalize(
		Paths.ensure_ext(
			resolve_templates(options.target_path_template, template_data),
			"md",
		),
	);
	log.debug("thread > target_path", target_path);

	// Create the target file
	let target_file: TFile | null = null;

	try {
		target_file = await plugin.app.vault.create(target_path, "");
	} catch (error) {
		const msg = `Error creating file "${target_path}". ${error instanceof Error ? error.message : error}`;

		new Notice(msg);
		log.error("thread > create file error", msg);

		return;
	}

	// vault.create() fires on:create synchronously before resolving,
	// so the target node is already in the graph — only add the edge.
	const batch_update = new BatchGraphUpdate();

	new AddEdgeGraphUpdate(
		new GCEdgeData(source_file.path, target_file.path, field, "typed-link"),
	).add_to_batch(batch_update);

	plugin.graph.apply_update(batch_update);

	const edge = plugin.graph
		.get_outgoing_edges(source_file.path)
		.get_edges()
		.find(
			(e) =>
				e.edge_type === field &&
				e.target_path(plugin.graph) === target_file.path,
		);
	if (!edge) return;

	await Promise.all([
		drop_crumbs(plugin, source_file, [edge], options),
		active_view.leaf.openFile(target_file),
	]);
}
