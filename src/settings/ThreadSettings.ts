import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

export const _add_settings_thread = (
	plugin: BreadcrumbsPlugin,
	contentEl: HTMLElement,
) => {
	const { settings } = plugin;

	new_setting(contentEl, {
		name: "Destination",
		desc: "Where to write the new edge to",
		select: {
			options: ["frontmatter", "dataview-inline", "none"],
			value: settings.commands.thread.default_options.destination,
			cb: async (value) => {
				settings.commands.thread.default_options.destination = value;

				await plugin.commitSettings("none");
			},
		},
	});

	new_setting(contentEl, {
		name: "Target path template",
		desc: "The template to use for the target path. You don't need to add the .md extension.",
		input: {
			value: settings.commands.thread.default_options
				.target_path_template,
			cb: async (value) => {
				settings.commands.thread.default_options.target_path_template =
					value;

				await plugin.commitSettings("none");
			},
		},
	});
};
