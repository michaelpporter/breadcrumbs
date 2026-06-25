import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import type BreadcrumbsPlugin from "src/main";
import { resolve_field_group_labels } from "src/utils/edge_fields";
import { new_setting } from "src/utils/settings";
import { mount } from "svelte";

export const _add_settings_create_canvas = (
	plugin: BreadcrumbsPlugin,
	contentEl: HTMLElement,
) => {
	const { settings } = plugin;
	const options = settings.commands.create_canvas.default_options;

	mount(FieldGroupLabelsSettingItem, {
		target: contentEl,
		props: {
			edge_field_groups: settings.edge_field_groups,
			field_group_labels: options.field_group_labels,
			select_cb: async (value: string[]) => {
				// Tracking groups for the UI
				options.field_group_labels = value;

				// Resolved fields the traversal actually follows
				options.fields = resolve_field_group_labels(
					settings.edge_field_groups,
					options.field_group_labels,
				);

				await plugin.commitSettings("none");
			},
		},
	});

	new_setting(contentEl, {
		name: "Depth",
		desc: "How many edges to follow out from the active note",
		input: {
			value: String(options.depth),
			cb: async (value) => {
				const n = parseInt(value, 10);
				if (isNaN(n) || n < 0) return;

				options.depth = n;
				await plugin.commitSettings("none");
			},
		},
	});

	new_setting(contentEl, {
		name: "Direction",
		desc: "How depth is laid out on the canvas",
		select: {
			options: { LR: "Left → right", TB: "Top → bottom" },
			value: options.direction,
			cb: async (value) => {
				options.direction = value as "LR" | "TB";
				await plugin.commitSettings("none");
			},
		},
	});

	new_setting(contentEl, {
		name: "Target path template",
		desc: "Where to write the canvas. You don't need to add the .canvas extension.",
		input: {
			value: options.target_path_template,
			cb: async (value) => {
				options.target_path_template = value;
				await plugin.commitSettings("none");
			},
		},
	});
};
