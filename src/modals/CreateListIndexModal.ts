import type { App, TFile } from "obsidian";
import { Modal, Notice, Setting } from "obsidian";
import type { ListIndexOptions } from "src/commands/list_index";
import { build_list_index } from "src/commands/list_index";
import EdgeSortIdSettingItem from "src/components/settings/EdgeSortIdSettingItem.svelte";
import FieldGroupLabelsSettingItem from "src/components/settings/FieldGroupLabelsSettingItem.svelte";
import ShowAttributesSettingItem from "src/components/settings/ShowAttributesSettingItem.svelte";
import type { EdgeSortId } from "src/const/graph";
import { LINK_KINDS } from "src/const/links";
import type { EdgeAttribute } from "src/graph/utils";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { _add_settings_show_node_options } from "src/settings/ShowNodeOptions";
import { active_file_store } from "src/stores/active_file";
import { resolve_field_group_labels } from "src/utils/edge_fields";
import { new_setting } from "src/utils/settings";
import { mount } from "svelte";
import { get } from "svelte/store";

export class CreateListIndexModal extends Modal {
	plugin: BreadcrumbsPlugin;
	options: ListIndexOptions;
	active_file: TFile | null = get(active_file_store);

	constructor(app: App, plugin: BreadcrumbsPlugin) {
		super(app);

		this.plugin = plugin;
		this.options = plugin.settings.commands.list_index.default_options;
	}

	onOpen() {
		// TODO: Rather don't show the command at all
		if (!this.active_file) {
			new Notice("No active file");
			this.close();
			return;
		}

		const { contentEl, plugin } = this;

		contentEl.createEl("h2", {
			text: "Create list index",
		});

		mount(FieldGroupLabelsSettingItem, {
			target: contentEl,
			props: {
				field_group_labels: this.options.field_group_labels,
				edge_field_groups: plugin.settings.edge_field_groups,
				select_cb: (value: string[]) => {
					// Tracking groups for the UI
					this.options.field_group_labels = value;

					// Settings fields for the build call
					this.options.fields = resolve_field_group_labels(
						plugin.settings.edge_field_groups,
						this.options.field_group_labels,
					);
				},
			},
		});

		new_setting(contentEl, {
			name: "Link Kind",
			desc: "Format to use for links",
			select: {
				options: LINK_KINDS,
				value: this.options.link_kind,
				cb: (value) => void (this.options.link_kind = value),
			},
		});

		new_setting(contentEl, {
			name: "Indent",
			desc: "Indentation to use for each level",
			input: {
				value: this.options.indent,
				cb: (value) => void (this.options.indent = value),
			},
		});

		mount(EdgeSortIdSettingItem, {
			target: contentEl,
			props: {
				edge_sort_id: this.options.edge_sort_id,
				select_cb: (value: EdgeSortId) => {
					this.options.edge_sort_id = value;
				},
			},
		});

		mount(ShowAttributesSettingItem, {
			target: contentEl,
			props: {
				show_attributes: this.options.show_attributes,
				select_cb: (value: EdgeAttribute[]) => {
					this.options.show_attributes = value;
				},
			},
		});

		_add_settings_show_node_options(
			plugin,
			contentEl,
			{
				get: () => this.options.show_node_options,
				set: (value) => (this.options.show_node_options = value),
			},
			{ save_and_refresh: false },
		);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Build & copy to clipboard")
				.setCta()
				.onClick(async () => {
					log.debug("build_list_index options", this.options);

					const list_index = build_list_index(
						plugin.graph,
						this.active_file!.path,
						plugin.settings,
						this.options,
					);

					if (list_index) {
						await navigator.clipboard.writeText(list_index);

						new Notice("List index copied to clipboard");
					} else {
						new Notice("No list items to copy");
					}

					this.close();
				}),
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
