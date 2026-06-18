import type { App, TFile } from "obsidian";
import { Modal, Setting } from "obsidian";
import { export_to_canvas } from "src/commands/canvas";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { active_file_store } from "src/stores/active_file";
import { resolve_field_group_labels } from "src/utils/edge_fields";
import { new_setting } from "src/utils/settings";
import { mount } from "svelte";
import { get } from "svelte/store";

export class CreateCanvasModal extends Modal {
	plugin: BreadcrumbsPlugin;
	options: BreadcrumbsSettings["commands"]["create_canvas"]["default_options"];
	active_file: TFile | null = get(active_file_store);

	constructor(app: App, plugin: BreadcrumbsPlugin) {
		super(app);

		this.plugin = plugin;
		// Copy so edits in the modal don't mutate the saved defaults.
		const defaults = plugin.settings.commands.create_canvas.default_options;
		this.options = {
			...defaults,
			fields: [...defaults.fields],
			field_group_labels: [...defaults.field_group_labels],
		};
	}

	onOpen() {
		if (!this.active_file) {
			this.close();
			return;
		}

		const { contentEl, plugin } = this;

		contentEl.createEl("h2", { text: "Export to canvas" });

		mount(FieldGroupLabelsSettingItem, {
			target: contentEl,
			props: {
				field_group_labels: this.options.field_group_labels,
				edge_field_groups: plugin.settings.edge_field_groups,
				select_cb: (value: string[]) => {
					this.options.field_group_labels = value;
					this.options.fields = resolve_field_group_labels(
						plugin.settings.edge_field_groups,
						this.options.field_group_labels,
					);
				},
			},
		});

		new_setting(contentEl, {
			name: "Depth",
			desc: "How many edges to follow out from the active note",
			input: {
				value: String(this.options.depth),
				cb: (value) => {
					const n = parseInt(value, 10);
					if (!isNaN(n) && n >= 0) this.options.depth = n;
				},
			},
		});

		new_setting(contentEl, {
			name: "Direction",
			desc: "How depth is laid out on the canvas",
			select: {
				options: { LR: "Left → right", TB: "Top → bottom" },
				value: this.options.direction,
				cb: (value) => {
					this.options.direction = value as "LR" | "TB";
				},
			},
		});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Create canvas")
				.setCta()
				.onClick(async () => {
					await export_to_canvas(
						plugin,
						this.active_file!,
						this.options,
					);
					this.close();
				}),
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
