import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

export const _add_settings_tag_note = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Default field",
		desc: "Field to use if the BC-tag-note-field is not specified",
		select: {
			value: plugin.settings.explicit_edge_sources.tag_note.default_field,
			options: plugin.settings.edge_fields.map((f) => f.label),
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.tag_note.default_field =
					value;
				await plugin.commitSettings("graph");
			},
		},
	});

	new_setting(containerEl, {
		name: "Default sibling field",
		desc: "Field to use for sibling edges between notes sharing the same tag. Leave empty to disable. Can be overridden per note with BC-tag-note-sibling-field.",
		select: {
			value: plugin.settings.explicit_edge_sources.tag_note
				.default_sibling_field,
			options: ["", ...plugin.settings.edge_fields.map((f) => f.label)],
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.tag_note.default_sibling_field =
					value;
				await plugin.commitSettings("graph");
			},
		},
	});
};
