import { Notice } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { active_file_store } from "src/stores/active_file";
import { reveal_in_notebook_navigator } from "src/utils/obsidian";
import { get } from "svelte/store";

/** Open a neighbour note and reveal it in the file navigator. */
export async function open_neighbour(
	plugin: BreadcrumbsPlugin,
	target_path: string,
	source_path: string,
) {
	await plugin.app.workspace.openLinkText(target_path, source_path);
	const file = plugin.app.vault.getFileByPath(target_path);
	if (file) await reveal_in_notebook_navigator(plugin.app, file);
}

export async function jump_to_neighbour(
	plugin: BreadcrumbsPlugin,
	options: { fields: string[] },
) {
	const active_file = get(active_file_store);
	if (!active_file) return;

	const matches = plugin.graph
		.get_filtered_outgoing_edges(active_file.path, options.fields)
		.get_edges()
		.filter((e) => e.target_path(plugin.graph) !== active_file.path);

	if (!matches.length) {
		new Notice(
			`No matches found with attributes: ${options.fields.join(", ")}`,
		);
		return;
	} else {
		const target_path = matches[0].target_path(plugin.graph);
		await open_neighbour(plugin, target_path, active_file.path);
	}
}
