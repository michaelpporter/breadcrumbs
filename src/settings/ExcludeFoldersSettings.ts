import { Setting } from "obsidian";
import type BreadcrumbsPlugin from "src/main";

export const _add_settings_exclude_folders = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new Setting(containerEl)
		.setName("Excluded folders")
		.setDesc(
			"Notes inside these folders are skipped when generating edges. One folder path per line. A note is excluded if its path equals, or is inside, a listed folder.",
		)
		.addTextArea((text) => {
			text.setPlaceholder("Templates\narchive/old")
				.setValue(plugin.settings.exclude_folders.join("\n"));

			text.inputEl.rows = 4;

			text.inputEl.onblur = async () => {
				plugin.settings.exclude_folders = text
					.getValue()
					.split("\n")
					.map((line) => line.trim())
					.filter((line) => line.length > 0);

				await plugin.commitSettings("graph");
			};
		});
};
