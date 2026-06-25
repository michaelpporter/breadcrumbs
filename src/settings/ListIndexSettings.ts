import EdgeSortIdSettingItem from "src/components/settings/EdgeSortIdSettingItem.svelte";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import ShowAttributesSettingItem from "src/components/settings/ShowAttributesSettingItem.svelte";
import type { EdgeSortId } from "src/const/graph";
import { LINK_KINDS } from "src/const/links";
import type { EdgeAttribute } from "src/graph/utils";
import type BreadcrumbsPlugin from "src/main";
import { resolve_field_group_labels } from "src/utils/edge_fields";
import { new_setting } from "src/utils/settings";
import { mount } from "svelte";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_list_index = (
	plugin: BreadcrumbsPlugin,
	contentEl: HTMLElement,
) => {
	const { settings } = plugin;

	mount(FieldGroupLabelsSettingItem, {
		target: contentEl,
		props: {
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				settings.commands.list_index.default_options.field_group_labels,
			select_cb: async (value: string[]) => {
				// Tracking groups for the UI
				settings.commands.list_index.default_options.field_group_labels =
					value;

				// Settings fields for the build call
				settings.commands.list_index.default_options.fields =
					resolve_field_group_labels(
						plugin.settings.edge_field_groups,
						settings.commands.list_index.default_options
							.field_group_labels,
					);

				await plugin.commitSettings("none");
			},
		},
	});

	new_setting(contentEl, {
		name: "Link kind",
		desc: "Format to use for links",
		select: {
			options: LINK_KINDS,
			value: settings.commands.list_index.default_options.link_kind,
			cb: async (value) => {
				settings.commands.list_index.default_options.link_kind = value;

				await plugin.commitSettings("none");
			},
		},
	});

	new_setting(contentEl, {
		name: "Indent",
		desc: "Indentation to use for each level",
		input: {
			value: settings.commands.list_index.default_options.indent,
			cb: async (value) => {
				settings.commands.list_index.default_options.indent = value;

				await plugin.commitSettings("none");
			},
		},
	});

	mount(EdgeSortIdSettingItem, {
		target: contentEl,
		props: {
			edge_sort_id:
				settings.commands.list_index.default_options.edge_sort_id,
			select_cb: async (value: EdgeSortId) => {
				settings.commands.list_index.default_options.edge_sort_id =
					value;

				await plugin.commitSettings("none");
			},
		},
	});

	mount(ShowAttributesSettingItem, {
		target: contentEl,
		props: {
			show_attributes:
				settings.commands.list_index.default_options.show_attributes,
			select_cb: async (value: EdgeAttribute[]) => {
				settings.commands.list_index.default_options.show_attributes =
					value;

				await plugin.commitSettings("none");
			},
		},
	});

	_add_settings_show_node_options(plugin, contentEl, {
		get: () =>
			settings.commands.list_index.default_options.show_node_options,
		set: (value) =>
			(settings.commands.list_index.default_options.show_node_options =
				value),
	});
};
