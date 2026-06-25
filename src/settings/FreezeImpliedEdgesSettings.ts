import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";
import { mount } from "svelte";

export const _add_settings_freeze_implied_edges = (
	plugin: BreadcrumbsPlugin,
	contentEl: HTMLElement,
) => {
	const { settings } = plugin;

	new_setting(contentEl, {
		name: "Destination",
		desc: "Where to write the frozen edges to",
		select: {
			options: ["frontmatter", "dataview-inline"],
			value: settings.commands.freeze_implied_edges.default_options
				.destination,
			cb: async (value) => {
				settings.commands.freeze_implied_edges.default_options.destination =
					value;

				await plugin.commitSettings("none");
			},
		},
	});

	mount(FieldGroupLabelsSettingItem, {
		target: contentEl,
		props: {
			name: "Included field groups",
			description: "Field groups to include when freezing edges.",
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				plugin.settings.commands.freeze_implied_edges.default_options
					.included_fields,
			select_cb: async (value: string[]) => {
				plugin.settings.commands.freeze_implied_edges.default_options.included_fields =
					value;

				await plugin.commitSettings("none");
			},
		},
	});

	new_setting(contentEl, {
		name: "Use alias",
		desc: "Freeze implied edges using the first alias of the target node.",
		toggle: {
			value: settings.commands.freeze_implied_edges.default_options
				.use_alias,
			cb: async (checked) => {
				settings.commands.freeze_implied_edges.default_options.use_alias =
					checked;

				await plugin.commitSettings("none");
			},
		},
	});
};
