import { Notice } from "obsidian";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";
import { mount } from "svelte";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_trail_view = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Enable trail view",
		desc: "Show the trail view at the top of the page",
		toggle: {
			value: plugin.settings.views.page.trail.enabled,
			cb: async (value) => {
				plugin.settings.views.page.trail.enabled = value;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	new_setting(containerEl, {
		name: "Format",
		desc: "Format of the trail view",
		select: {
			value: plugin.settings.views.page.trail.format,
			options: ["grid", "path"],
			cb: async (value) => {
				plugin.settings.views.page.trail.format = value;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	new_setting(containerEl, {
		name: "Path selection",
		desc: "How to select the path(s) to display in the trail view",
		select: {
			value: plugin.settings.views.page.trail.selection,
			options: ["all", "shortest", "longest"],
			cb: async (value) => {
				plugin.settings.views.page.trail.selection = value;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	new_setting(containerEl, {
		name: "Default depth",
		desc: "Default depth of the trail view",
		input: {
			value: plugin.settings.views.page.trail.default_depth.toString(),
			cb: async (value) => {
				const int = parseInt(value);
				if (isNaN(int)) {
					new Notice("Depth must be a number");
					return;
				} else if (int < 0) {
					new Notice("Depth must be a non-negative number");
					return;
				}

				plugin.settings.views.page.trail.default_depth = int;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	mount(FieldGroupLabelsSettingItem, {
		target: containerEl,
		props: {
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				plugin.settings.views.page.trail.field_group_labels,
			select_cb: async (value: string[]) => {
				plugin.settings.views.page.trail.field_group_labels = value;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	new_setting(containerEl, {
		name: "Merge fields",
		desc: "Merge fields in the traversal, instead of keeping their paths separate",
		toggle: {
			value: plugin.settings.views.page.trail.merge_fields,
			cb: async (value) => {
				plugin.settings.views.page.trail.merge_fields = value;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	new_setting(containerEl, {
		name: "Show controls",
		desc: "Show controls to change the depth/format/path-selection of the trail view",
		toggle: {
			value: plugin.settings.views.page.trail.show_controls,
			cb: async (value) => {
				plugin.settings.views.page.trail.show_controls = value;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	new_setting(containerEl, {
		name: "No path message",
		desc: "Message to display when there is no path to display. Leave blank to hide the trail view when there is no path.",
		input: {
			value: plugin.settings.views.page.trail.no_path_message,
			cb: async (value) => {
				plugin.settings.views.page.trail.no_path_message = value;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	_add_settings_show_node_options(plugin, containerEl, {
		get: () => plugin.settings.views.page.trail.show_node_options,
		set: (value) =>
			(plugin.settings.views.page.trail.show_node_options = value),
	});
};
