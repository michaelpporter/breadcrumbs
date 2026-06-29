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
};
