import { Setting } from "obsidian";
import type { ShowNodeOptions } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";

export const _add_settings_show_node_options = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
	cb: {
		get: () => ShowNodeOptions;
		set: (value: ShowNodeOptions) => void;
	},
	options?: {
		save_and_refresh?: boolean;
	},
) => {
	const show_node_options = cb.get();

	const setting = new Setting(containerEl)
		.setName("Note display options")
		.setDesc("How to display note links");

	setting.controlEl.addClasses(["flex", "flex-wrap", "gap-2"]);

	setting.addToggle((toggle) => {
		toggle.toggleEl.before("Folder");
		toggle
			.setTooltip("Folder path")
			.setValue(show_node_options.folder)
			.onChange(async (value) => {
				show_node_options.folder = value;

				cb.set(show_node_options);

				if (options?.save_and_refresh !== false) {
					await plugin.commitSettings("views");
				}
			});
	});

	setting.addToggle((toggle) => {
		toggle.toggleEl.before("Extension");
		toggle
			.setTooltip("File extension")
			.setValue(show_node_options.ext)
			.onChange(async (value) => {
				show_node_options.ext = value;

				cb.set(show_node_options);

				if (options?.save_and_refresh !== false) {
					await plugin.commitSettings("views");
				}
			});
	});

	setting.addToggle((toggle) => {
		toggle.toggleEl.before("Alias");
		toggle
			.setTooltip("Alias (first alias, if available)")
			.setValue(show_node_options.alias)
			.onChange(async (value) => {
				show_node_options.alias = value;

				cb.set(show_node_options);

				if (options?.save_and_refresh !== false) {
					await plugin.commitSettings("views");
				}
			});
	});

	return setting;
};
