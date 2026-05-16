import type { App } from "obsidian";
import { Notice, PluginSettingTab } from "obsidian";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { perf_start, perf_end, perf_sync } from "src/utils/perf";
import { mount, unmount } from "svelte";
import EdgeFieldSettings from "../components/settings/EdgeFieldSettings.svelte";
import TransitiveImpliedRelations from "../components/settings/TransitiveImpliedRelations.svelte";
import { _add_settings_codeblocks } from "./CodeblockSettings";
import { _add_settings_date_note } from "./DateNoteSettings";
import { _add_settings_debug } from "./DebugSettings";
import { _add_settings_dendron_note } from "./DendronNoteSettings";
import { _add_settings_edge_field_suggestor } from "./EdgeFieldSuggestorSettings";
import { _add_settings_freeze_implied_edges } from "./FreezeImpliedEdgesSettings";
import { _add_settings_trail_view } from "./GridSettings";
import { _add_settings_johnny_decimal_note } from "./JohnnyDecimalSettings";
import { _add_settings_list_index } from "./ListIndexSettings";
import { _add_settings_list_note } from "./ListNoteSettings";
import { _add_settings_matrix } from "./MatrixSettings";
import { _add_settings_page_views } from "./PageViewSettings";
import { _add_settings_prev_next_view } from "./PrevNextSettings";
import { _add_settings_rebuild_graph } from "./RebuildGraphSettings";
import { _add_settings_regex_note } from "./RegexNoteSettings";
import { _add_settings_tag_note } from "./TagNoteSettings";
import { _add_settings_thread } from "./ThreadSettings";
import { _add_settings_tree_view } from "./TreeViewSettings";

function make_details_el(
	parent: HTMLElement,
	o?: { d?: DomElementInfo; s?: DomElementInfo },
) {
	const details: HTMLDetailsElement = parent.createEl("details", {
		cls: "tree-item",
		...o?.d,
	});

	const summary: HTMLElement = details.createEl("summary", {
		cls: "text-xl p-1 tree-item-self is-clickable",
		...o?.s,
	});

	const children: HTMLDivElement = details.createEl("div", {
		cls: "tree-item-children pl-4",
	});

	return {
		details,
		summary,
		children,
	};
}

export class BreadcrumbsSettingTab extends PluginSettingTab {
	plugin: BreadcrumbsPlugin;
	components: ReturnType<typeof EdgeFieldSettings>[] = [];

	constructor(app: App, plugin: BreadcrumbsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		perf_start("SettingsTab.display");
		const { containerEl, plugin } = this;

		const old_components = this.components;
		this.components = [];

		void Promise.all(old_components.map((c) => unmount(c))).catch(
			(error) => {
				log.error("BreadcrumbsSettingTab.unmount threw >", error);
			},
		);

		containerEl.empty();
		containerEl.addClass("BC-settings-tab");

		try {
			perf_sync("SettingsTab._build", () =>
				this._build(containerEl, plugin),
			);
		} catch (error) {
			log.error("BreadcrumbsSettingTab.display threw >", error);
			new Notice(
				"Breadcrumbs: failed to render settings tab. See developer console and report at https://github.com/SkepticMystic/breadcrumbs/issues",
			);

			containerEl.empty();
			containerEl.addClass("BC-settings-tab");

			const fallback = containerEl.createDiv({ cls: "p-4" });
			fallback.createEl("h3", {
				text: "Breadcrumbs settings failed to load",
			});
			fallback.createEl("p", {
				text: String(
					(error as Error)?.stack ??
						(error as Error)?.message ??
						error,
				),
				cls: "text-muted",
			});

			const retry = fallback.createEl("button", {
				text: "Reload settings",
			});
			retry.onclick = () => this.display();
		}
		perf_end("SettingsTab.display");
	}

	private _build(containerEl: HTMLElement, plugin: BreadcrumbsPlugin): void {
		perf_sync("mount:EdgeFieldSettings", () => {
			this.components.push(
				mount(EdgeFieldSettings, {
					props: { plugin },
					target: make_details_el(containerEl, {
						s: { text: "> Edge Fields" },
					}).children,
				}),
			);
		});

		// Implied Relations
		containerEl.createEl("hr");
		containerEl.createEl("h3", { text: "Implied Relations" });

		perf_sync("mount:TransitiveImpliedRelations", () => {
			this.components.push(
				mount(TransitiveImpliedRelations, {
					props: { plugin },
					target: make_details_el(containerEl, {
						s: { text: "> Transitive" },
					}).children,
				}),
			);
		});

		// Edge Sources
		containerEl.createEl("hr");
		containerEl.createEl("h3", { text: "Edge Sources" });

		perf_sync("section:tag_note", () =>
			_add_settings_tag_note(
				plugin,
				make_details_el(containerEl, { s: { text: "> Tag Notes" } })
					.children,
			),
		);

		perf_sync("section:list_note", () =>
			_add_settings_list_note(
				plugin,
				make_details_el(containerEl, { s: { text: "> List Notes" } })
					.children,
			),
		);

		perf_sync("section:date_note", () =>
			_add_settings_date_note(
				plugin,
				make_details_el(containerEl, { s: { text: "> Date Notes" } })
					.children,
			),
		);

		perf_sync("section:regex_note", () =>
			_add_settings_regex_note(
				plugin,
				make_details_el(containerEl, { s: { text: "> Regex Notes" } })
					.children,
			),
		);

		perf_sync("section:dendron_note", () =>
			_add_settings_dendron_note(
				plugin,
				make_details_el(containerEl, {
					s: { text: "> Dendron Notes" },
				}).children,
			),
		);

		perf_sync("section:johnny_decimal", () =>
			_add_settings_johnny_decimal_note(
				plugin,
				make_details_el(containerEl, {
					s: { text: "> Johnny.Decimal Notes" },
				}).children,
			),
		);

		// Views
		containerEl.createEl("hr");
		containerEl.createEl("h3", { text: "Views" });

		perf_sync("section:matrix", () =>
			_add_settings_matrix(
				plugin,
				make_details_el(containerEl, { s: { text: "> Matrix" } })
					.children,
			),
		);

		/// Page
		const page_details = make_details_el(containerEl, {
			s: { text: "> Page" },
		}).children;

		page_details.createEl("h5", { text: "General" });
		perf_sync("section:page_views", () =>
			_add_settings_page_views(plugin, page_details),
		);

		page_details.createEl("h5", { text: "Trail" });
		perf_sync("section:trail_view", () =>
			_add_settings_trail_view(plugin, page_details),
		);

		page_details.createEl("h5", { text: "Previous/Next" });
		perf_sync("section:prev_next_view", () =>
			_add_settings_prev_next_view(plugin, page_details),
		);

		perf_sync("section:tree_view", () =>
			_add_settings_tree_view(
				plugin,
				make_details_el(containerEl, { s: { text: "> Tree" } })
					.children,
			),
		);

		perf_sync("section:codeblocks", () =>
			_add_settings_codeblocks(
				plugin,
				make_details_el(containerEl, { s: { text: "> Codeblocks" } })
					.children,
			),
		);

		// Commands
		containerEl.createEl("hr");
		containerEl.createEl("h3", { text: "Commands" });

		perf_sync("section:rebuild_graph", () =>
			_add_settings_rebuild_graph(
				plugin,
				make_details_el(containerEl, {
					s: { text: "> Rebuild Graph" },
				}).children,
			),
		);

		perf_sync("section:list_index", () =>
			_add_settings_list_index(
				plugin,
				make_details_el(containerEl, { s: { text: "> List Index" } })
					.children,
			),
		);

		perf_sync("section:freeze_implied", () =>
			_add_settings_freeze_implied_edges(
				plugin,
				make_details_el(containerEl, {
					s: { text: "> Freeze Implied Edges" },
				}).children,
			),
		);

		perf_sync("section:thread", () =>
			_add_settings_thread(
				plugin,
				make_details_el(containerEl, { s: { text: "> Thread" } })
					.children,
			),
		);

		// Suggestors
		containerEl.createEl("hr");
		containerEl.createEl("h3", { text: "Suggestors" });

		perf_sync("section:edge_field_suggestor", () =>
			_add_settings_edge_field_suggestor(
				plugin,
				make_details_el(containerEl, {
					s: { text: "> Edge Field Suggestor" },
				}).children,
			),
		);

		// Debugging
		containerEl.createEl("hr");

		perf_sync("section:debug", () =>
			_add_settings_debug(
				plugin,
				make_details_el(containerEl, { s: { text: "> Debug" } })
					.children,
			),
		);
	}

	hide() {
		void this.plugin.flushPendingSettings();

		const old_components = this.components;
		this.components = [];

		void Promise.all(old_components.map((c) => unmount(c))).catch(
			(error) => {
				log.error("BreadcrumbsSettingTab.unmount threw >", error);
			},
		);
	}
}
