import { Setting } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";

export const _add_settings_edge_audit = (
	plugin: BreadcrumbsPlugin,
	contentEl: HTMLElement,
) => {
	const { settings } = plugin;

	new_setting(contentEl, {
		name: "Report file path",
		desc: "Where the edge audit report is written, relative to the vault root. Re-running the command overwrites this file.",
		input: {
			value: settings.commands.edge_audit.report_path,
			placeholder: "Breadcrumbs Edge Audit.md",
			cb: async (value) => {
				settings.commands.edge_audit.report_path =
					value.trim() || "Breadcrumbs Edge Audit.md";

				await plugin.commitSettings("none");
			},
		},
	});

	new Setting(contentEl)
		.setName("Ignore paths")
		.setDesc(
			"Notes inside these paths are left out of the audit report (orphans, dangling edges, and field checks). One folder path per line. A note is ignored if its path equals, or is inside, a listed path. This is report-only — graph edges are unaffected.",
		)
		.addTextArea((text) => {
			text.setPlaceholder("Templates\narchive/old").setValue(
				settings.commands.edge_audit.ignore_paths.join("\n"),
			);

			text.inputEl.rows = 4;

			text.inputEl.onblur = async () => {
				settings.commands.edge_audit.ignore_paths = text
					.getValue()
					.split("\n")
					.map((line) => line.trim())
					.filter((line) => line.length > 0);

				await plugin.commitSettings("none");
			};
		});
};
