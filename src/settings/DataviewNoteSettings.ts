import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

export const _add_settings_dataview_note = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Default field",
		desc: "Field to use when BC-dataview-note-field is not specified. A note becomes a Dataview note via BC-dataview-note-query (requires the Dataview plugin).",
		select: {
			value: plugin.settings.explicit_edge_sources.dataview_note
				.default_field,
			options: plugin.settings.edge_fields.map((f) => f.label),
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.dataview_note.default_field =
					value;
				await Promise.all([
					plugin.rebuildGraph(),
					plugin.saveSettings(),
				]);
			},
		},
	});
};
