import { LOG_LEVELS, log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

export const _add_settings_debug = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Debug level",
		desc: "Set the level of debug logging",
		select: {
			options: LOG_LEVELS,
			value: plugin.settings.debug.level,
			cb: async (value) => {
				log.set_level(value);
				plugin.settings.debug.level = value;

				await plugin.saveSettings();
			},
		},
	});
};
