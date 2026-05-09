import type {WorkspaceLeaf, Menu, TAbstractFile} from "obsidian";
import {    TFolder } from "obsidian";
import type { Debouncer } from "obsidian";
import { debounce, Events, Notice, Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS } from "src/const/settings";
import { VIEW_IDS } from "src/const/views";
import { rebuild_graph } from "src/graph/builders";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { BreadcrumbsSettingTab } from "src/settings/SettingsTab";
import { active_file_store } from "src/stores/active_file";
import { MatrixView } from "src/views/matrix";
import type { NoteGraph } from "../wasm/pkg/breadcrumbs_graph_wasm";
import init, {
	create_graph,
	BatchGraphUpdate,
	RemoveNoteGraphUpdate,
	RenameNoteGraphUpdate,
	AddNoteGraphUpdate,
	GCNodeData,
} from "../wasm/pkg/breadcrumbs_graph_wasm";
import wasmbin from "../wasm/pkg/breadcrumbs_graph_wasm_bg.wasm";
import { BCAPI } from "./api";
import { CodeblockMDRC } from "./codeblocks/MDRC";
import { freeze_edges_in_folder } from "./commands/freeze_edges/index";
import { init_all_commands } from "./commands/init";
import { METADATA_FIELDS_MAP } from "./const/metadata_fields";
import { dataview_plugin } from "./external/dataview";
import type { BreadcrumbsError } from "./interfaces/graph";
import { log } from "./logger";
import { migrate_old_settings } from "./settings/migration";
import { reactive_settings } from "./stores/reactive_settings.svelte";
import { EdgeFieldSuggestor } from "./suggestor/edge_fields";
import { deep_merge_objects } from "./utils/objects";
import { Timer } from "./utils/timer";
import { redraw_page_views } from "./views/page";
import { TreeView } from "./views/tree";

export enum BCEvent {
	GRAPH_UPDATE = "graph-update",
	REDRAW_CODEBLOCKS = "redraw-codeblocks",
	REDRAW_PAGE_VIEWS = "redraw-page-views",
	REDRAW_SIDE_VIEWS = "redraw-side-views",
}

export default class BreadcrumbsPlugin extends Plugin {
	settings!: BreadcrumbsSettings;
	graph!: NoteGraph;
	api!: BCAPI;
	events!: Events;

	private _save_debouncer: Debouncer<[], void> = debounce(
		() => {
			void this.saveSettings();
		},
		600,
		true,
	);

	private _rebuild_debouncer: Debouncer<[], void> = debounce(
		() => {
			void this.rebuildGraph();
		},
		1500,
		true,
	);

	saveSettingsDebounced() {
		this._save_debouncer();
	}

	rebuildGraphDebounced() {
		this._rebuild_debouncer();
	}

	async flushPendingSettings() {
		this._save_debouncer.cancel();
		this._rebuild_debouncer.cancel();
		await this.saveSettings();
		await this.rebuildGraph();
	}

	async onload() {
		// Settings
		await this.loadSettings();

		await this.backup_old_settings();

		/// Migrations
		const migrated = migrate_old_settings(this.settings);
		reactive_settings.init(migrated);
		this.settings = reactive_settings.current;
		await this.saveSettings();

		// Logger
		log.set_level(this.settings.debug.level);

		log.info(
			`loading plugin "${this.manifest.name}" plugin v${this.manifest.version}`,
		);
		log.debug("settings >", this.settings);

		// Init event bus
		this.events = new Events();
		// A graph update triggers a redraw of all views
		this.events.on(BCEvent.GRAPH_UPDATE, () => {
			this.refreshViews();
		});
		this.events.on(BCEvent.REDRAW_PAGE_VIEWS, () => {
			redraw_page_views(this);
		});

		// Init wasm
		await init({ module_or_path: wasmbin });
		this.graph = create_graph();
		this.graph.set_update_callback(() => {
			// funny micro task so that the rust update function finishes before we access the graph again for the visualization
			// this is needed because otherwise we get an "recursive use of an object detected which would lead to unsafe aliasing in rust" error
			// see https://github.com/rustwasm/wasm-bindgen/issues/1578
			queueMicrotask(() => this.events.trigger(BCEvent.GRAPH_UPDATE));
		});

		this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));
		this.registerEvent(this.app.workspace.on('file-menu', this.handleFileMenu.bind(this)));

		// API
		// NOTE: I think this should be done quite early
		// Especially before dataview, since the api would get used alot in dv codeblocks
		this.api = new BCAPI(this);

		// @ts-ignore: I can extend window, but this is the only place
		window.BCAPI = this.api;
		this.register(
			// @ts-ignore: Don't want to make it optional, but still delete on unload
			() => delete window.BCAPI,
		);

		this.registerHoverLinkSource("breadcrumbs", {
			defaultMod: true,
			display: "Breadcrumbs",
		});

		// Suggestors
		if (this.settings.suggestors.edge_field.enabled) {
			this.registerEditorSuggest(new EdgeFieldSuggestor(this));
		}

		this.app.workspace.onLayoutReady(async () => {
			log.debug("on:layout-ready");

			// Set the edge_fields & BC-meta-fields to the right Properties type
			try {
				for (const field of this.settings.edge_fields) {
					const current_type = this.getMetdataPropertyType(field.label);
					if (
						current_type === "multitext" ||
						current_type === "text"
					) continue;
					await this.app.metadataTypeManager.setType(
						field.label,
						"multitext",
					);
				}

				for (const [field, { property_type }] of Object.entries(
					METADATA_FIELDS_MAP,
				)) {
					if (this.getMetdataPropertyType(field) === property_type) continue;
					await this.app.metadataTypeManager.setType(
						field,
						property_type,
					);
				}
			} catch (error) {
				log.error("metadataTypeManager.setType error >", error);
			}

			// Wait for DV and metadataCache before refreshing
			await dataview_plugin.await_if_enabled(this);

			if (this.app.metadataCache.initialized) {
				log.debug("metadataCache:initialized");

				await this.rebuildGraph();
			} else {
				const metadatacache_init_event = this.app.metadataCache.on(
					"initialized",
					() => {
						log.debug("on:metadatacache-initialized");

						void this.rebuildGraph();

						this.app.metadataCache.offref(metadatacache_init_event);
					},
				);
			}

			// Events
			/// Workspace
			this.registerEvent(
				this.app.workspace.on("layout-change", () => {
					log.debug("on:layout-change");

					if (
						this.settings.commands.rebuild_graph.trigger
							.layout_change
					) {
						void this.rebuildGraph();
					} else {
						this.events.trigger(BCEvent.REDRAW_PAGE_VIEWS);
					}
				}),
			);

			this.registerEvent(
				this.app.workspace.on("active-leaf-change", (leaf) => {
					log.debug("on:active-leaf-change");

					// NOTE: We only want to refresh the store when changing to another md note
					if (leaf?.getViewState().type !== "markdown") {
						return;
					}

					active_file_store.refresh(this.app);
					this.events.trigger(BCEvent.REDRAW_SIDE_VIEWS);
				}),
			);

			/// Vault
			this.registerEvent(
				this.app.vault.on("create", (file) => {
					log.debug("on:create >", file.path);

					if (file instanceof TFile && file.extension === "md") {
						const batch = new BatchGraphUpdate();
						new AddNoteGraphUpdate(
							new GCNodeData(file.path, [], true, false, false),
						).add_to_batch(batch);
						this.graph.apply_update(batch);
					}
				}),
			);

			this.registerEvent(
				this.app.vault.on("rename", (file, old_path) => {
					log.debug("on:rename >", old_path, "->", file.path);

					if (file instanceof TFile && file.extension === "md") {
						const batch = new BatchGraphUpdate();
						new RenameNoteGraphUpdate(
							old_path,
							file.path,
						).add_to_batch(batch);
						this.graph.apply_update(batch);
					}
				}),
			);

			this.registerEvent(
				this.app.vault.on("delete", (file) => {
					log.debug("on:delete >", file.path);

					if (file instanceof TFile && file.extension === "md") {
						const batch = new BatchGraphUpdate();
						new RemoveNoteGraphUpdate(file.path).add_to_batch(
							batch,
						);
						this.graph.apply_update(batch);
					}
				}),
			);

			// Views
			this.registerView(
				VIEW_IDS.matrix,
				(leaf) => new MatrixView(leaf, this),
			);
			this.registerView(
				VIEW_IDS.tree,
				(leaf) => new TreeView(leaf, this),
			);
		});

		// Codeblocks
		this.registerMarkdownCodeBlockProcessor(
			"breadcrumbs",
			(source, el, ctx) => {
				const mdrc = new CodeblockMDRC(
					this,
					el,
					source,
					ctx.sourcePath,
				);
				ctx.addChild(mdrc);
			},
		);

		// Commands
		init_all_commands(this);

		log.debug("loaded Breadcrumbs plugin");
	}

	onunload() {}

	async loadSettings() {
		const loaded = deep_merge_objects<BreadcrumbsSettings>(
			((await this.loadData()) ?? {}) as BreadcrumbsSettings,
			DEFAULT_SETTINGS,
		);

		reactive_settings.init(loaded);
		this.settings = reactive_settings.current;
	}

	private handleFileMenu(menu: Menu, file: TAbstractFile): void {
		if (!(file instanceof TFolder)) return;

		menu.addItem((item) => {
		item.setTitle('Freeze implied edges in folder')
			.setIcon('pin')
			.onClick(() => freeze_edges_in_folder(this, file));
		});
	}

	async saveSettings() {
		this.settings.is_dirty = false;

		await this.saveData(this.settings);
	}

	async backup_old_settings(): Promise<void> {
		const backup_path = `${this.app.vault.configDir}/plugins/${this.manifest.id}/data-backup__no-directions-migration.json`;
		if (!(await this.app.vault.adapter.exists(backup_path))) {
			await this.app.vault.adapter.write(
				backup_path,
				JSON.stringify(this.settings, null, "\t"),
			);
			log.info(`old settings backed up to ${backup_path}`);
		}
	}

	/**
	 * Rebuilds the graph.
	 * When done, Rust will emit a `graph-update` event.
	 */
	async rebuildGraph() {
		const timer = new Timer();

		const notice = this.settings.commands.rebuild_graph.notify
			? new Notice("Rebuilding graph")
			: null;

		const rebuild_results = await rebuild_graph(this);

		const explicit_edge_errors = rebuild_results.explicit_edge_results
			.filter(({ results }) => results.errors.length)
			.reduce(
				(acc, { source, results }) => {
					acc[source] = results.errors;
					return acc;
				},
				{} as Record<string, BreadcrumbsError[]>,
			);

		if (Object.keys(explicit_edge_errors).length) {
			log.warn("explicit_edge_errors >", explicit_edge_errors);
		}

		notice?.setMessage(
			[
				`Rebuilt graph in ${timer.elapsed_str()}ms`,

				Object.keys(explicit_edge_errors).length
					? "\nExplicit edge errors (see console for details):"
					: null,

				...Object.entries(explicit_edge_errors).map(
					([source, errors]) =>
						`- ${source}: ${errors.length} errors`,
				),
			]
				.filter(Boolean)
				.join("\n"),
		);
	}

	refreshViews() {
		this.events.trigger(BCEvent.REDRAW_PAGE_VIEWS);
		this.events.trigger(BCEvent.REDRAW_CODEBLOCKS);
		this.events.trigger(BCEvent.REDRAW_SIDE_VIEWS);
	}

	// SOURCE: https://docs.obsidian.md/Plugins/User+interface/Views
	async activateView(view_id: string, options?: { side?: "left" | "right" }) {
		const { workspace } = this.app;

		// eslint-disable-next-line no-useless-assignment
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(view_id);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf in the right sidebar for it.
			// Default is to open on the right
			leaf =
				options?.side === "left"
					? workspace.getLeftLeaf(false)
					: workspace.getRightLeaf(false);

			if (!leaf) {
				log.warn("activate_view > no leaf found");
				return;
			}

			await leaf.setViewState({ type: view_id, active: true });
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		await workspace.revealLeaf(leaf);
	}

	private getMetdataPropertyType(field: string): string | null {
		if ("getAssignedWidget" in this.app.metadataTypeManager) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
			return (this.app.metadataTypeManager as any).getAssignedWidget(field) as string;
		} else {
			return this.app.metadataTypeManager.getAssignedType(field);
		}
	}
}
