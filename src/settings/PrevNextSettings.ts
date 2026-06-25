import { Setting } from "obsidian";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";
import { mount } from "svelte";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_prev_next_view = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new Setting(containerEl)
		.setName("Enable previous/next view")
		.setDesc("Show the previous/next view at the top of the page")
		.addToggle((toggle) => {
			toggle
				.setValue(plugin.settings.views.page.prev_next.enabled)
				.onChange(async (value) => {
					plugin.settings.views.page.prev_next.enabled = value;

					await plugin.commitSettings("views");
				});
		});

	mount(FieldGroupLabelsSettingItem, {
		target: containerEl,
		props: {
			name: "Field groups for left",
			description:
				"Select the field groups to show in the left side of this view",
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				plugin.settings.views.page.prev_next.field_group_labels.prev,
			select_cb: async (value: string[]) => {
				plugin.settings.views.page.prev_next.field_group_labels.prev =
					value;

				await plugin.commitSettings("views");
			},
		},
	});

	mount(FieldGroupLabelsSettingItem, {
		target: containerEl,
		props: {
			name: "Field groups for right",
			description:
				"Select the field groups to show in the right side of this view",
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				plugin.settings.views.page.prev_next.field_group_labels.next,
			select_cb: async (value: string[]) => {
				plugin.settings.views.page.prev_next.field_group_labels.next =
					value;

				await plugin.commitSettings("views");
			},
		},
	});

	_add_settings_show_node_options(plugin, containerEl, {
		get: () => plugin.settings.views.page.prev_next.show_node_options,
		set: (value) =>
			(plugin.settings.views.page.prev_next.show_node_options = value),
	});

	new Setting(containerEl).setHeading().setName("Period rows");

	for (const kind of ["week", "month", "quarter", "year"] as const) {
		new_setting(containerEl, {
			name: kind.charAt(0).toUpperCase() + kind.slice(1),
			desc: `Show a ${kind} period row in the Previous/Next view`,
			toggle: {
				value: plugin.settings.views.page.prev_next.period_rows[kind],
				cb: async (value) => {
					plugin.settings.views.page.prev_next.period_rows[kind] =
						value;
					await plugin.commitSettings("views");
				},
			},
		});
	}
};
