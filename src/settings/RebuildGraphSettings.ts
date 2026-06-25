import type { BreadcrumbsSettings } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

export const _add_settings_rebuild_graph = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Notify on refresh",
		desc: "Show a notification when the graph is rebuilt",
		toggle: {
			value: plugin.settings.commands.rebuild_graph.notify,
			cb: async (value) => {
				plugin.settings.commands.rebuild_graph.notify = value;

				await plugin.commitSettings("graph");
			},
		},
	});

	new_setting(containerEl, {
		name: "Triggers",
		desc: "When to rebuild the graph",
		checklist: {
			options: {
				note_save:
					plugin.settings.commands.rebuild_graph.trigger.note_save,
				layout_change:
					plugin.settings.commands.rebuild_graph.trigger
						.layout_change,
			} satisfies BreadcrumbsSettings["commands"]["rebuild_graph"]["trigger"],

			cb: async (value) => {
				plugin.settings.commands.rebuild_graph.trigger = value;

				await plugin.commitSettings("graph");
			},
		},
	});
};
