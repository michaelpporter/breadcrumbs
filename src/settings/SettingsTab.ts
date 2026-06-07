import type { App, SettingDefinitionItem } from "obsidian";
import { Notice, PluginSettingTab, Setting } from "obsidian";
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
import { _add_settings_traverse_note } from "./TraverseNoteSettings";
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
		this.icon = "waypoints";
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const { plugin } = this;

		// Sentinel row: invisible, mounts a Svelte component into the page container,
		// returns cleanup. Using items[] instead of page() factory ensures Obsidian's
		// search navigation calls display correctly.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const svelte_items = (Component: any): SettingDefinitionItem[] => [
			{
				name: "",
				searchable: false,
				render: (setting, group) => {
					setting.settingEl.detach();
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					const comp = mount(Component, {
						props: { plugin },
						target: group.listEl,
					});
					return () => {
						void unmount(comp);
					};
				},
			},
		];

		const imp_items = (
			addFn: (plugin: BreadcrumbsPlugin, el: HTMLElement) => void,
		): SettingDefinitionItem[] => [
			{
				name: "",
				searchable: false,
				render: (setting, group) => {
					setting.settingEl.detach();
					addFn(plugin, group.listEl);
				},
			},
		];

		return [
			{
				type: "page",
				name: "Edge fields",
				desc: "Define the named relationships edges can use, like up and down",
				items: svelte_items(EdgeFieldSettings),
			},
			{
				type: "group",
				heading: "Implied relations",
				items: [
					{
						type: "page",
						name: "Transitive",
						desc: "Derive new edges from chains of existing ones (e.g. the up of an up is an up)",
						items: svelte_items(TransitiveImpliedRelations),
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
						items: imp_items(_add_settings_tag_note),
					},
					{
						type: "page",
						name: "List notes",
						desc: "Turn markdown list items in a note into child edges",
						items: imp_items(_add_settings_list_note),
					},
					{
						type: "page",
						name: "Dendron notes",
						desc: "Build hierarchy from dot-separated note names (e.g. parent.child)",
						items: imp_items(_add_settings_dendron_note),
					},
					{
						type: "page",
						name: "Johnny.Decimal notes",
						desc: "Build hierarchy from numeric name prefixes (e.g. 01.02 title)",
						items: imp_items(_add_settings_johnny_decimal_note),
					},
					{
						type: "page",
						name: "Date notes",
						desc: "Link sequential daily and periodic notes by date",
						items: imp_items(_add_settings_date_note),
					},
					{
						type: "page",
						name: "Regex notes",
						desc: "Build edges from a regex match on note names",
						items: imp_items(_add_settings_regex_note),
					},
					{
						type: "page",
						name: "Traverse notes",
						desc: "Build edges by following links outward from a note",
						items: imp_items(_add_settings_traverse_note),
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
						items: [
							{
								name: "",
								searchable: false,
								render: (setting, group) => {
									setting.settingEl.detach();
									const el = group.listEl;
									new Setting(el)
										.setHeading()
										.setName("General");
									_add_settings_page_views(plugin, el);
									new Setting(el)
										.setHeading()
										.setName("Trail");
									_add_settings_trail_view(plugin, el);
									new Setting(el)
										.setHeading()
										.setName("Previous/next");
									_add_settings_prev_next_view(plugin, el);
								},
							},
						],
					},
					{
						type: "page",
						name: "Matrix",
						desc: "Side panel grouping a note's edges by field",
						items: imp_items(_add_settings_matrix),
					},
					{
						type: "page",
						name: "Tree",
						desc: "Side panel showing a recursive tree from the active note",
						items: imp_items(_add_settings_tree_view),
					},
					{
						type: "page",
						name: "Codeblocks",
						desc: "Defaults for breadcrumbs codeblocks rendered in notes",
						items: imp_items(_add_settings_codeblocks),
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
						items: imp_items(_add_settings_rebuild_graph),
					},
					{
						type: "page",
						name: "List index",
						desc: "Generate a nested list of the hierarchy from a note",
						items: imp_items(_add_settings_list_index),
					},
					{
						type: "page",
						name: "Freeze implied edges",
						desc: "Write implied edges into notes as explicit links",
						items: imp_items(_add_settings_freeze_implied_edges),
					},
					{
						type: "page",
						name: "Thread",
						desc: "Create a new note along an edge field",
						items: imp_items(_add_settings_thread),
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
						items: imp_items(_add_settings_edge_field_suggestor),
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
			new Setting(fallback)
				.setHeading()
				.setName("Breadcrumbs settings failed to load");
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
			// eslint-disable-next-line @typescript-eslint/no-deprecated
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

		perf_sync("section:traverse_note", () =>
			_add_settings_traverse_note(
				plugin,
				make_details_el(containerEl, {
					s: { text: "> Traverse Notes" },
				}).children,
			),
		);

		// Views
		containerEl.createEl("hr");
		new Setting(containerEl).setHeading().setName("Views");

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

		perf_sync("section:matrix", () =>
			_add_settings_matrix(
				plugin,
				make_details_el(containerEl, { s: { text: "> Matrix" } })
					.children,
			),
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
