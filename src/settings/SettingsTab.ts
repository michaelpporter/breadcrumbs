import type { App, SettingDefinitionItem } from "obsidian";
import { PluginSettingTab, Setting, SettingPage } from "obsidian";
import { LOG_LEVELS, log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { mount, unmount } from "svelte";
import EdgeFieldSettings from "../components/settings/EdgeFieldSettings.svelte";
import TransitiveImpliedRelations from "../components/settings/TransitiveImpliedRelations.svelte";
import { _add_settings_codeblocks } from "./CodeblockSettings";
import { _add_settings_date_note } from "./DateNoteSettings";
import { _add_settings_dendron_note } from "./DendronNoteSettings";
import { _add_settings_edge_field_suggestor } from "./EdgeFieldSuggestorSettings";
import { _add_settings_exclude_folders } from "./ExcludeFoldersSettings";
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
import { _add_settings_traverse_note } from "./TraverseNoteSettings";
import { _add_settings_tree_view } from "./TreeViewSettings";

/** Sub-page that mounts a Svelte component into the framework-owned page container. */
class SvelteSettingPage extends SettingPage {
	private comp: ReturnType<typeof mount> | undefined;

	constructor(
		private plugin: BreadcrumbsPlugin,
		title: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		private Component: any,
	) {
		super();
		this.title = title;
	}

	display() {
		this.containerEl.empty();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		this.comp = mount(this.Component, {
			props: { plugin: this.plugin },
			target: this.containerEl,
		});
	}

	hide() {
		if (this.comp) {
			void unmount(this.comp);
			this.comp = undefined;
		}
	}
}

/** Sub-page that renders an imperative settings builder into the page container. */
class ImperativeSettingPage extends SettingPage {
	constructor(
		private plugin: BreadcrumbsPlugin,
		title: string,
		private build: (plugin: BreadcrumbsPlugin, el: HTMLElement) => void,
	) {
		super();
		this.title = title;
	}

	display() {
		this.containerEl.empty();
		this.build(this.plugin, this.containerEl);
	}
}

export class BreadcrumbsSettingTab extends PluginSettingTab {
	plugin: BreadcrumbsPlugin;

	constructor(app: App, plugin: BreadcrumbsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.icon = "waypoints";
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const { plugin } = this;

		// Sub-page content is mounted into the framework-owned page container via
		// the page() factory. (An earlier items[]+render() approach rendered blank
		// on Obsidian 1.13.1 — see SvelteSettingPage / ImperativeSettingPage.)
		const svelte_page =
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(name: string, Component: any) => () =>
				new SvelteSettingPage(plugin, name, Component);

		const imp_page =
			(
				name: string,
				addFn: (plugin: BreadcrumbsPlugin, el: HTMLElement) => void,
			) =>
			() =>
				new ImperativeSettingPage(plugin, name, addFn);

		return [
			{
				type: "page",
				name: "Edge fields",
				desc: "Define the named relationships edges can use, like up and down",
				page: svelte_page("Edge fields", EdgeFieldSettings),
			},
			{
				type: "page",
				name: "Excluded folders",
				desc: "Skip notes in chosen folders when generating edges",
				page: imp_page(
					"Excluded folders",
					_add_settings_exclude_folders,
				),
			},
			{
				type: "group",
				heading: "Implied relations",
				items: [
					{
						type: "page",
						name: "Transitive",
						desc: "Derive new edges from chains of existing ones (e.g. the up of an up is an up)",
						page: svelte_page(
							"Transitive",
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
						desc: "Treat notes that share a tag as children of a parent note",
						page: imp_page("Tag notes", _add_settings_tag_note),
					},
					{
						type: "page",
						name: "List notes",
						desc: "Turn markdown list items in a note into child edges",
						page: imp_page("List notes", _add_settings_list_note),
					},
					{
						type: "page",
						name: "Dendron notes",
						desc: "Build hierarchy from dot-separated note names (e.g. parent.child)",
						page: imp_page(
							"Dendron notes",
							_add_settings_dendron_note,
						),
					},
					{
						type: "page",
						name: "Johnny.Decimal notes",
						desc: "Build hierarchy from numeric name prefixes (e.g. 01.02 title)",
						page: imp_page(
							"Johnny.Decimal notes",
							_add_settings_johnny_decimal_note,
						),
					},
					{
						type: "page",
						name: "Date notes",
						desc: "Link sequential daily and periodic notes by date",
						page: imp_page("Date notes", _add_settings_date_note),
					},
					{
						type: "page",
						name: "Regex notes",
						desc: "Build edges from a regex match on note names",
						page: imp_page("Regex notes", _add_settings_regex_note),
					},
					{
						type: "page",
						name: "Traverse notes",
						desc: "Build edges by following links outward from a note",
						page: imp_page(
							"Traverse notes",
							_add_settings_traverse_note,
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
						name: "Page",
						desc: "Trail and previous/next bars shown inside the note",
						page: imp_page("Page", (plugin, el) => {
							new Setting(el).setHeading().setName("General");
							_add_settings_page_views(plugin, el);
							new Setting(el).setHeading().setName("Trail");
							_add_settings_trail_view(plugin, el);
							new Setting(el)
								.setHeading()
								.setName("Previous/next");
							_add_settings_prev_next_view(plugin, el);
						}),
					},
					{
						type: "page",
						name: "Matrix",
						desc: "Side panel grouping a note's edges by field",
						page: imp_page("Matrix", _add_settings_matrix),
					},
					{
						type: "page",
						name: "Tree",
						desc: "Side panel showing a recursive tree from the active note",
						page: imp_page("Tree", _add_settings_tree_view),
					},
					{
						type: "page",
						name: "Codeblocks",
						desc: "Defaults for breadcrumbs codeblocks rendered in notes",
						page: imp_page("Codeblocks", _add_settings_codeblocks),
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
						desc: "When and how the graph is rebuilt",
						page: imp_page("Rebuild graph", _add_settings_rebuild_graph),
					},
					{
						type: "page",
						name: "List index",
						desc: "Generate a nested list of the hierarchy from a note",
						page: imp_page("List index", _add_settings_list_index),
					},
					{
						type: "page",
						name: "Freeze implied edges",
						desc: "Write implied edges into notes as explicit links",
						page: imp_page(
							"Freeze implied edges",
							_add_settings_freeze_implied_edges,
						),
					},
					{
						type: "page",
						name: "Thread",
						desc: "Create a new note along an edge field",
						page: imp_page("Thread", _add_settings_thread),
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
						desc: "Suggest edge fields as you type in the editor",
						page: imp_page(
							"Edge field suggestor",
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
										log.set_level(
											value as (typeof LOG_LEVELS)[number],
										);
										plugin.settings.debug.level =
											value as (typeof LOG_LEVELS)[number];
										await plugin.saveSettings();
									});
							});
						},
					},
				],
			},
		];
	}

	hide() {
		void this.plugin.flushPendingSettings();
	}
}
