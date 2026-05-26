import { Notice } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

export const _add_settings_dendron_note = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Enabled",
		desc: "Look for dendron notes to use as edge sources",
		toggle: {
			value: plugin.settings.explicit_edge_sources.dendron_note.enabled,
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.dendron_note.enabled =
					value;
				await Promise.all([
					plugin.rebuildGraph(),
					plugin.saveSettings(),
				]);
			},
		},
	});

	new_setting(containerEl, {
		name: "Delimiter",
		desc: "Character that splits the note basename into a Dendron-style hierarchy (for example - in git-pull vs . in git.pull). It must match what you actually use in filenames; the wrong delimiter means no Dendron edges are built.",
		input: {
			value: plugin.settings.explicit_edge_sources.dendron_note.delimiter,
			cb: async (value) => {
				if (!value) new Notice("Delimiter cannot be empty");
				else {
					plugin.settings.explicit_edge_sources.dendron_note.delimiter =
						value;
					await Promise.all([
						plugin.rebuildGraph(),
						plugin.saveSettings(),
					]);
				}
			},
		},
	});

	new_setting(containerEl, {
		name: "Default field",
		desc: "Field to use if the BC-dendron-note-field is not specified",
		select: {
			value: plugin.settings.explicit_edge_sources.dendron_note
				.default_field,
			options: plugin.settings.edge_fields.map((f) => f.label),
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.dendron_note.default_field =
					value;
				await Promise.all([
					plugin.rebuildGraph(),
					plugin.saveSettings(),
				]);
			},
		},
	});

	new_setting(containerEl, {
		name: "Default sibling field",
		desc: "Field to use for sibling edges between notes at the same level in the hierarchy. Leave empty to disable.",
		select: {
			value: plugin.settings.explicit_edge_sources.dendron_note
				.default_sibling_field,
			options: ["", ...plugin.settings.edge_fields.map((f) => f.label)],
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.dendron_note.default_sibling_field =
					value;
				await Promise.all([
					plugin.rebuildGraph(),
					plugin.saveSettings(),
				]);
			},
		},
	});

	new_setting(containerEl, {
		name: "Display trimmed",
		desc: "Display Dendron note names as the right-most split of the delimiter. e.g. `a.b.c` -> `c`",
		toggle: {
			value: plugin.settings.explicit_edge_sources.dendron_note
				.display_trimmed,
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.dendron_note.display_trimmed =
					value;
				await Promise.all([
					plugin.rebuildGraph(),
					plugin.saveSettings(),
				]);
			},
		},
	});
};
