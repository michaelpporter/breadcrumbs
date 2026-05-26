import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

export const _add_settings_list_note = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Default neighbour field",
		desc: "Field to use to join neighbouring list items.",
		select: {
			value: plugin.settings.explicit_edge_sources.list_note
				.default_neighbour_field,
			options: [""].concat(
				plugin.settings.edge_fields.map((f) => f.label),
			),
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.list_note.default_neighbour_field =
					value;
				await Promise.all([
					plugin.rebuildGraph(),
					plugin.saveSettings(),
				]);
			},
		},
	});
};
