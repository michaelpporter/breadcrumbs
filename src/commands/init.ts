import { Notice } from "obsidian";
import SimpleInput from "src/components/input/SimpleInput.svelte";
import { VIEW_IDS } from "src/const/views";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { CreateListIndexModal } from "src/modals/CreateListIndexModal";
import { GenericModal } from "src/modals/GenericModal";
import { active_file_store } from "src/stores/active_file";
import { Timer } from "src/utils/timer";
import { redraw_page_views } from "src/views/page";
import { mount } from "svelte";
import { get } from "svelte/store";
import { freeze_implied_edges_to_note } from "./freeze_edges";
import { jump_to_neighbour } from "./jump";
import { get_graph_stats } from "./stats";
import { thread } from "./thread";

export function init_all_commands(plugin: BreadcrumbsPlugin) {
	plugin.addCommand({
		id: "rebuild-graph",
		name: "Rebuild graph",
		callback: async () => await plugin.rebuildGraph(),
	});

	Object.keys(VIEW_IDS).forEach((view_id) => {
		plugin.addCommand({
			id: `open-${view_id}-view`,
			name: `Open ${view_id} view`,
			callback: () =>
				plugin.activateView(VIEW_IDS[view_id as keyof typeof VIEW_IDS]),
		});
	});

	plugin.addCommand({
		id: "create-list-index",
		name: "Create list index",
		checkCallback: (checking) => {
			if (!get(active_file_store)) return false;
			if (!checking) new CreateListIndexModal(plugin.app, plugin).open();
			return true;
		},
	});

	plugin.addCommand({
		id: "graph-stats",
		name: "Show/copy graph stats",
		callback: async () => {
			const stats = get_graph_stats(plugin.graph, {
				groups: plugin.settings.edge_field_groups,
			});
			log.feat("Graph stats >", stats);

			await navigator.clipboard.writeText(JSON.stringify(stats, null, 2));

			new Notice(
				"Graph stats printed to console and copied to clipboard",
			);
		},
	});

	plugin.addCommand({
		id: "freeze-implied-edges-to-note",
		name: "Freeze implied edges to note",
		callback: async () => {
			// TODO: Probably add an intermediate modal to specify options
			// The whole point is to make implied edges explicit
			// So once you freeze them, they'll be duplicated
			// So, in the options modal, you could temporarily enabled/disable certain implied_relations on the hierarchy
			// preventing duplicates for implied_relations that weren't properly enabled
			const active_file = get(active_file_store);
			if (!active_file) return;

			await freeze_implied_edges_to_note(
				plugin,
				active_file,
				plugin.settings.commands.freeze_implied_edges.default_options,
			);

			new Notice("Implied edges frozen to note");
		},
	});

	plugin.addCommand({
		id: "freeze-implied-edges-to-vault",
		name: "Freeze implied edges to all notes in vault",
		callback: async () => {
			const PROMPT_TARGET = "FREEZE TO VAULT";

			new GenericModal(plugin.app, (modal) => {
				mount(SimpleInput, {
					target: modal.contentEl,
					props: {
						label: `Type '${PROMPT_TARGET}' to confirm`,
						disabled_cb: (value: string) => value !== PROMPT_TARGET,
						submit_cb: async (value: string) => {
							if (value !== PROMPT_TARGET) {
								new Notice("Command cancelled");
							} else {
								const timer = new Timer();

								const notice = new Notice(
									"Freezing implied edges to all notes in vault...",
								);

								await Promise.all(
									plugin.app.vault
										.getMarkdownFiles()
										.map((file) =>
											freeze_implied_edges_to_note(
												plugin,
												file,
												plugin.settings.commands
													.freeze_implied_edges
													.default_options,
											),
										),
								);

								log.debug(
									`freeze-implied-edges-to-vault > took ${timer.elapsed_str()}ms`,
								);

								notice.setMessage(
									`Implied edges frozen to all notes in ${timer.elapsed_str()}ms`,
								);
							}

							modal.close();
						},
					},
				});
			}).open();
		},
	});

	/// Jump to first neighbour
	plugin.settings.edge_field_groups.forEach((group) => {
		plugin.addCommand({
			id: `jump-to-first-neighbour-group:${group.label}`,
			name: `Jump to first neighbour by group:${group.label}`,
			callback: () => jump_to_neighbour(plugin, { fields: group.fields }),
		});
	});

	// Thread
	plugin.settings.edge_fields.forEach(({ label }) => {
		plugin.addCommand({
			id: `thread-field:${label}`,
			name: `Thread by field:${label}`,
			callback: () =>
				thread(
					plugin,
					label,
					plugin.settings.commands.thread.default_options,
				),
		});
	});

	plugin.addCommand({
		id: "toggle-sticky-page-views",
		name: "Toggle sticky page views",
		callback: async () => {
			plugin.settings.views.page.all.sticky =
				!plugin.settings.views.page.all.sticky;
			await plugin.saveSettings();
			redraw_page_views(plugin);
			new Notice(
				`Page views sticky: ${plugin.settings.views.page.all.sticky ? "on" : "off"}`,
			);
		},
	});
}
