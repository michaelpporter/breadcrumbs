import type { TFile } from "obsidian";
import { Notice, Setting } from "obsidian";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { GenericModal } from "src/modals/GenericModal";
import { build_canvas, Canvas } from "src/utils/canvas";
import { Paths } from "src/utils/paths";
import { resolve_templates } from "src/utils/strings";
import {
	TraversalOptions,
	TraversalPostprocessOptions,
} from "wasm/pkg/breadcrumbs_graph_wasm";

export async function export_to_canvas(
	plugin: BreadcrumbsPlugin,
	source_file: TFile,
	options: BreadcrumbsSettings["commands"]["create_canvas"]["default_options"],
) {
	const source_path = source_file.path;

	if (!plugin.graph.has_node(source_path)) {
		return new Notice("The active file does not exist in the graph.");
	}

	// Follow only the selected edge fields; empty selection = all fields.
	const fields = options.fields.length ? options.fields : undefined;

	const traversal_options = new TraversalOptions(
		[source_path],
		fields,
		options.depth,
		100, // max nodes to traverse
		false,
		undefined,
	);

	const result = plugin.graph.rec_traverse_and_process(
		traversal_options,
		TraversalPostprocessOptions.without_sorter(true),
	);

	const canvas = build_canvas(
		plugin.graph,
		result,
		source_path,
		options.direction,
	);
	result.free();

	// Resolve the target path template (mirrors the thread command).
	const target_path = Paths.normalize(
		Canvas.ensure_ext(
			resolve_templates(options.target_path_template, {
				source: {
					path: source_path,
					basename: source_file.basename,
					folder: source_file.parent?.path ?? "",
				},
			}),
		),
	);

	const content = JSON.stringify(canvas, null, 2);

	const existing = plugin.app.vault.getFileByPath(target_path);
	if (!existing) {
		await create_and_open(plugin, target_path, content);
		return;
	}

	// Conflict: let the user choose how to resolve it.
	new GenericModal(plugin.app, (modal) => {
		modal.titleEl.setText("Canvas already exists");
		modal.contentEl.createEl("p", {
			text: `"${target_path}" already exists. Overwrite it, or create a new one?`,
		});

		new Setting(modal.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Overwrite")
					.setWarning()
					.onClick(async () => {
						modal.close();
						await plugin.app.vault.modify(existing, content);
						await plugin.app.workspace
							.getLeaf()
							.openFile(existing);
					}),
			)
			.addButton((btn) =>
				btn
					.setButtonText("Create new")
					.setCta()
					.onClick(async () => {
						modal.close();
						const unique = unique_path(plugin, target_path);
						await create_and_open(plugin, unique, content);
					}),
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => modal.close()),
			);
	}).open();
}

/** Append " 2", " 3", … before the extension until the path is free. */
function unique_path(plugin: BreadcrumbsPlugin, path: string): string {
	const ext = Paths.extname(path);
	const base = Paths.drop_ext(path);

	let n = 2;
	let candidate = `${base} ${n}.${ext}`;
	while (plugin.app.vault.getFileByPath(candidate)) {
		n += 1;
		candidate = `${base} ${n}.${ext}`;
	}
	return candidate;
}

async function create_and_open(
	plugin: BreadcrumbsPlugin,
	path: string,
	content: string,
) {
	let target_file: TFile;
	try {
		target_file = await plugin.app.vault.create(path, content);
	} catch (error) {
		const msg = `Error creating canvas "${path}". ${error instanceof Error ? error.message : error}`;
		log.error("export_to_canvas > create file error", msg);
		new Notice(msg);
		return;
	}

	await plugin.app.workspace.getLeaf().openFile(target_file);
}
