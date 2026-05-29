import type { App, SettingDefinitionItem } from "obsidian";
import { Notice, PluginSettingTab, Setting, SettingPage } from "obsidian";
import { LOG_LEVELS, log } from "src/logger";
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

class ImpSettingPage extends SettingPage {
	constructor(
		private plugin: BreadcrumbsPlugin,
		private addFn: (plugin: BreadcrumbsPlugin, el: HTMLElement) => void,
	) {
		super();
	}

	display(): void {
		this.containerEl.empty();
		this.addFn(this.plugin, this.containerEl);
	}
}

class SvelteSettingPage extends SettingPage {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private comp: any;

	constructor(
		private plugin: BreadcrumbsPlugin,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		private SvelteComponent: any,
	) {
		super();
	}

	display(): void {
		this.containerEl.empty();
		this.comp = mount(this.SvelteComponent, {
			props: { plugin: this.plugin },
			target: this.containerEl,
		});
	}

	hide(): void {
		if (this.comp) {
			void unmount(this.comp);
			this.comp = undefined;
		}
	}
}

class PageViewsSettingPage extends SettingPage {
	constructor(private plugin: BreadcrumbsPlugin) {
		super();
	}

	display(): void {
		const el = this.containerEl;
		el.empty();

		new Setting(el).setHeading().setName("General");
		_add_settings_page_views(this.plugin, el);

		new Setting(el).setHeading().setName("Trail");
		_add_settings_trail_view(this.plugin, el);

		new Setting(el).setHeading().setName("Previous/next");
		_add_settings_prev_next_view(this.plugin, el);
	}
}

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

	getSettingDefinitions(): SettingDefinitionItem[] {
		const { plugin } = this;

		return [
			{
				type: "page",
				name: "Edge fields",
				page: () => new SvelteSettingPage(plugin, EdgeFieldSettings),
			},
			{
				type: "group",
				heading: "Implied relations",
				items: [
					{
						type: "page",
						name: "Transitive",
						page: () =>
							new SvelteSettingPage(
								plugin,
								TransitiveImpliedRelations,
							),
					},
				],
			},
			{
				type: "group",
				heading: "Edge sources",
				items: [
					{
						type: "page",
						name: "Tag notes",
						page: () =>
							new ImpSettingPage(plugin, _add_settings_tag_note),
					},
					{
						type: "page",
						name: "List notes",
						page: () =>
							new ImpSettingPage(plugin, _add_settings_list_note),
					},
					{
						type: "page",
						name: "Date notes",
						page: () =>
							new ImpSettingPage(plugin, _add_settings_date_note),
					},
					{
						type: "page",
						name: "Regex notes",
						page: () =>
							new ImpSettingPage(
								plugin,
								_add_settings_regex_note,
							),
					},
					{
						type: "page",
						name: "Dendron notes",
						page: () =>
							new ImpSettingPage(
								plugin,
								_add_settings_dendron_note,
							),
					},
					{
						type: "page",
						name: "Johnny.Decimal notes",
						page: () =>
							new ImpSettingPage(
								plugin,
								_add_settings_johnny_decimal_note,
							),
					},
				],
			},
			{
				type: "group",
				heading: "Views",
				items: [
					{
						type: "page",
						name: "Matrix",
						page: () =>
							new ImpSettingPage(plugin, _add_settings_matrix),
					},
					{
						type: "page",
						name: "Page",
						page: () => new PageViewsSettingPage(plugin),
					},
					{
						type: "page",
						name: "Tree",
						page: () =>
							new ImpSettingPage(
								plugin,
								_add_settings_tree_view,
							),
					},
					{
						type: "page",
						name: "Codeblocks",
						page: () =>
							new ImpSettingPage(
								plugin,
								_add_settings_codeblocks,
							),
					},
				],
			},
			{
				type: "group",
				heading: "Commands",
				items: [
					{
						type: "page",
						name: "Rebuild graph",
						page: () =>
							new ImpSettingPage(
								plugin,
								_add_settings_rebuild_graph,
							),
					},
					{
						type: "page",
						name: "List index",
						page: () =>
							new ImpSettingPage(
								plugin,
								_add_settings_list_index,
							),
					},
					{
						type: "page",
						name: "Freeze implied edges",
						page: () =>
							new ImpSettingPage(
								plugin,
								_add_settings_freeze_implied_edges,
							),
					},
					{
						type: "page",
						name: "Thread",
						page: () =>
							new ImpSettingPage(plugin, _add_settings_thread),
					},
				],
			},
			{
				type: "group",
				heading: "Suggestors",
				items: [
					{
						type: "page",
						name: "Edge field suggestor",
						page: () =>
							new ImpSettingPage(
								plugin,
								_add_settings_edge_field_suggestor,
							),
					},
				],
			},
			{
				type: "group",
				heading: "Debug",
				items: [
					{
						name: "Debug level",
						desc: "Set the level of debug logging",
						render: (setting) => {
							setting.addDropdown((d) => {
								const opts = Object.fromEntries(
									LOG_LEVELS.map((l) => [l, l]),
								);
								d.addOptions(opts)
									.setValue(plugin.settings.debug.level)
									.onChange(async (value) => {
										log.set_level(value as (typeof LOG_LEVELS)[number]);
										plugin.settings.debug.level = value as (typeof LOG_LEVELS)[number];
										await plugin.saveSettings();
									});
							});
						},
					},
				],
			},
		];
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
				// eslint-disable-next-line obsidianmd/ui/sentence-case -- URL embedded in string; capitalising breaks the link
				"Breadcrumbs: failed to render settings tab. See developer console and report at https://github.com/michaelpporter/breadcrumbs/issues",
			);

			containerEl.empty();
			containerEl.addClass("BC-settings-tab");

			const fallback = containerEl.createDiv({ cls: "p-4" });
			new Setting(fallback).setHeading().setName("Breadcrumbs settings failed to load");
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
		new Setting(containerEl).setHeading().setName("Implied relations");

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
		new Setting(containerEl).setHeading().setName("Edge sources");

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
		new Setting(containerEl).setHeading().setName("Views");

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

		new Setting(page_details).setHeading().setName("General");
		perf_sync("section:page_views", () =>
			_add_settings_page_views(plugin, page_details),
		);

		new Setting(page_details).setHeading().setName("Trail");
		perf_sync("section:trail_view", () =>
			_add_settings_trail_view(plugin, page_details),
		);

		new Setting(page_details).setHeading().setName("Previous/next");
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
		new Setting(containerEl).setHeading().setName("Commands");

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
		new Setting(containerEl).setHeading().setName("Suggestors");

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
