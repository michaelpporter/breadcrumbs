import { Notice } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

export const _add_settings_johnny_decimal_note = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Enabled",
		desc: "Look for Johnny.Decimal notes to use as edge sources",
		toggle: {
			value: plugin.settings.explicit_edge_sources.johnny_decimal_note
				.enabled,
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.johnny_decimal_note.enabled =
					value;
				await plugin.commitSettings("graph");
			},
		},
	});

	new_setting(containerEl, {
		name: "Delimiter",
		desc: "Delimiter to use to split the note name",
		input: {
			value: plugin.settings.explicit_edge_sources.johnny_decimal_note
				.delimiter,
			cb: async (value) => {
				if (!value) new Notice("Delimiter cannot be empty");
				else {
					plugin.settings.explicit_edge_sources.johnny_decimal_note.delimiter =
						value;
					await plugin.commitSettings("graph");
				}
			},
		},
	});

	new_setting(containerEl, {
		name: "Default field",
		desc: "Field to use to point to next note in the Johnny.Decimal system",
		select: {
			value: plugin.settings.explicit_edge_sources.johnny_decimal_note
				.default_field,
			options: plugin.settings.edge_fields.map((f) => f.label),
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.johnny_decimal_note.default_field =
					value;
				await plugin.commitSettings("graph");
			},
		},
	});

	new_setting(containerEl, {
		name: "Default sibling field",
		desc: "Field to use for sibling edges between notes at the same level in the hierarchy. Leave empty to disable.",
		select: {
			value: plugin.settings.explicit_edge_sources.johnny_decimal_note
				.default_sibling_field,
			options: ["", ...plugin.settings.edge_fields.map((f) => f.label)],
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.johnny_decimal_note.default_sibling_field =
					value;
				await plugin.commitSettings("graph");
			},
		},
	});
};
