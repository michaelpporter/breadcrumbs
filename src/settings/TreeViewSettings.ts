import { Notice } from "obsidian";
import EdgeSortIdSettingItem from "src/components/settings/EdgeSortIdSettingItem.svelte";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import type { EdgeSortId } from "src/const/graph";
import type { EdgeAttribute } from "src/graph/utils";
import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";
import { mount } from "svelte";
import ShowAttributesSettingItem from "../components/settings/ShowAttributesSettingItem.svelte";
import { _add_settings_show_node_options } from "./ShowNodeOptions";

export const _add_settings_tree_view = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new_setting(containerEl, {
		name: "Collapse",
		desc: "Collapse the tree by default",
		toggle: {
			value: plugin.settings.views.side.tree.collapse,
			cb: async (checked) => {
				plugin.settings.views.side.tree.collapse = checked;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	new_setting(containerEl, {
		name: "Find root",
		desc: "Walk up the hierarchy to find the root note, then display the tree from there. When off, the tree starts from the current file.",
		toggle: {
			value: plugin.settings.views.side.tree.find_root,
			cb: async (checked) => {
				plugin.settings.views.side.tree.find_root = checked;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	mount(FieldGroupLabelsSettingItem, {
		target: containerEl,
		props: {
			name: "Find root field groups",
			description:
				"Which edge-type groups to follow when walking up to the root. Typically 'ups'.",
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				plugin.settings.views.side.tree.find_root_field_group_labels,
			select_cb: async (value: string[]) => {
				plugin.settings.views.side.tree.find_root_field_group_labels =
					value;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	new_setting(containerEl, {
		name: "Default depth",
		desc: "Default depth of the tree view",
		input: {
			value: plugin.settings.views.side.tree.default_depth.toString(),
			cb: async (value) => {
				const int = parseInt(value);
				if (isNaN(int)) {
					new Notice("Depth must be a number");
					return;
				} else if (int < 0) {
					new Notice("Depth must be a non-negative number");
					return;
				}

				plugin.settings.views.side.tree.default_depth = int;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	mount(EdgeSortIdSettingItem, {
		target: containerEl,
		props: {
			edge_sort_id: plugin.settings.views.side.tree.edge_sort_id,
			select_cb: async (value: EdgeSortId) => {
				plugin.settings.views.side.tree.edge_sort_id = value;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	mount(ShowAttributesSettingItem, {
		target: containerEl,
		props: {
			show_attributes: plugin.settings.views.side.tree.show_attributes,
			select_cb: async (value: EdgeAttribute[]) => {
				plugin.settings.views.side.tree.show_attributes = value;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	mount(FieldGroupLabelsSettingItem, {
		target: containerEl,
		props: {
			name: "Field groups",
			description:
				"Which edge-type groups this view follows. Include downs so the tree can traverse down (parent → child), including Dendron hubs to their children. With only ups, only up (child → parent) edges are used.",
			edge_field_groups: plugin.settings.edge_field_groups,
			field_group_labels:
				plugin.settings.views.side.tree.field_group_labels,
			select_cb: async (value: string[]) => {
				plugin.settings.views.side.tree.field_group_labels = value;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	new_setting(containerEl, {
		name: "Merge fields",
		desc: "Merge fields in the traversal, instead of keeping their paths separate",
		toggle: {
			value: plugin.settings.views.side.tree.merge_fields,
			cb: async (value) => {
				plugin.settings.views.side.tree.merge_fields = value;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	new_setting(containerEl, {
		name: "Lock view",
		desc: "Lock the tree view to the current file",
		toggle: {
			value: plugin.settings.views.side.tree.lock_view,
			cb: async (value) => {
				plugin.settings.views.side.tree.lock_view = value;

				plugin.refreshViews();
				await plugin.saveSettings();
			},
		},
	});

	new_setting(containerEl, {
		name: "Lock path",
		desc: "Path to lock the tree view to (overrides current file)",
		input: {
			value: plugin.settings.views.side.tree.lock_path,
			cb: async (value) => {
				if (!value) plugin.settings.views.side.tree.lock_path = value;
				else {
					plugin.settings.views.side.tree.lock_path = value;
					await Promise.all([
						plugin.rebuildGraph(),
						plugin.saveSettings(),
					]);
				}
			},
		},
	});

	_add_settings_show_node_options(plugin, containerEl, {
		get: () => plugin.settings.views.side.tree.show_node_options,
		set: (value) =>
			(plugin.settings.views.side.tree.show_node_options = value),
	});
};
