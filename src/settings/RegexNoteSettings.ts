import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

export const _add_settings_regex_note = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Default field",
		desc: "Field to use if the BC-regex-note-field is not specified",
		select: {
			value: plugin.settings.explicit_edge_sources.regex_note
				.default_field,
			options: plugin.settings.edge_fields.map((f) => f.label),
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.regex_note.default_field =
					value;
				await plugin.commitSettings("graph");
			},
		},
	});
};
