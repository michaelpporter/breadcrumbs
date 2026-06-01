import type { ListIndexOptions } from "src/commands/list_index";
import type { EdgeSortId } from "src/const/graph";
import type { BCEdgeAttributes, EdgeAttribute } from "src/graph/utils";
import type { EdgeAttrFilters } from "src/graph/utils";
import type { LogLevels } from "src/logger";

export const MERMAID_ARROW_TYPES = [
	"-->",
	"---",
	"==>",
	"===",
	"-.->",
	"-.-",
	"--o",
	"--x",
] as const;

export type MermaidArrowType = (typeof MERMAID_ARROW_TYPES)[number];

export interface EdgeField {
	label: string;
	mermaid_arrow?: MermaidArrowType;
}
export interface EdgeFieldGroup {
	label: string;
	fields: EdgeField["label"][];
}

export interface ShowNodeOptions {
	ext: boolean;
	folder: boolean;
	alias: boolean;
}

export interface PeriodNoteConfig {
	enabled: boolean;
	/** Luxon token format matching the period note filename stem */
	date_format: string;
	/** Vault folder path; empty string means anywhere */
	folder: string;
	/** BC field for sequential next/prev edges between period notes */
	next_field: string;
	/** BC field for child-note → period-note "up" edges */
	up_field: string;
}

export type CrumbDestination = "frontmatter" | "dataview-inline";

export interface BreadcrumbsSettings {
	is_dirty: boolean;

	// Once I've reach settings parity with old BC, I can add this flag to skip over all the checks in migrate_old_settings
	// But for now, as I add new (old) settings, I don't want to skip migrating them
	// V4_MIGRATED: boolean;

	edge_fields: EdgeField[];
	edge_field_groups: EdgeFieldGroup[];

	implied_relations: {
		transitive: {
			name: string;
			rounds: number;
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			chain: EdgeAttrFilters[];
			/** The transitive closure field */
			close_field: string;
			/** If false, add the edge from start to end. Else from end to start */
			close_reversed: boolean;
		}[];
	};

	// NOTE: Anytime a new default_field prop is added, be sure to update it on rename in EdgeFieldSettings.svelte
	explicit_edge_sources: {
		// Just a regular `up: [[link]]` or `down:: [[link]]` in the content/frontmatter of a note
		// The two are not distinguished, because Dataview doesn't distinguish them
		typed_link: object;
		tag_note: {
			default_field: string;
			default_sibling_field: string;
		};
		list_note: {
			default_neighbour_field: string;
		};
		dendron_note: {
			enabled: boolean;
			// Should BC-dendron-note-delimiter be a thing too?
			// With the current setup, it would only apply to a single edge per note
			delimiter: string;
			default_field: string;
			default_sibling_field: string;
			display_trimmed: boolean;
		};

		johnny_decimal_note: {
			enabled: boolean;
			delimiter: string;
			default_field: string;
			default_sibling_field: string;
		};

		date_note: {
			enabled: boolean;
			date_format: string;
			default_field: string;
			// If there is a gap from one day to another, should the "next" note be the unresolved one in one day
			//  or the next resolved note?
			// e.g. 2024-03-30 -> 2024-03-31 (unresolved)
			// vs   2024-03-30 -> 2024-04-01 (resolved)
			stretch_to_existing: boolean;
			/** First day of the week. "sunday" shifts Sundays forward 1 day before computing the ISO week, so Sunday is treated as the start of the next week. */
			week_start: "monday" | "sunday";
			week: PeriodNoteConfig;
			month: PeriodNoteConfig;
			quarter: PeriodNoteConfig;
			year: PeriodNoteConfig;
		};

		regex_note: {
			default_field: string;
		};

		traverse_note: {
			default_field: string;
		};
	};

	views: {
		page: {
			all: {
				sticky: boolean;
			};

			trail: {
				enabled: boolean;
				default_depth: number;
				merge_fields: boolean;
				show_controls: boolean;
				format: "grid" | "path";
				no_path_message: string;
				field_group_labels: string[];
				show_node_options: ShowNodeOptions;
				selection: "all" | "shortest" | "longest";
			};

			prev_next: {
				enabled: boolean;
				show_node_options: ShowNodeOptions;

				field_group_labels: {
					prev: string[];
					next: string[];
				};

				period_rows: {
					week: boolean;
					month: boolean;
					quarter: boolean;
					year: boolean;
				};
			};
		};
		side: {
			matrix: {
				collapse: boolean;
				edge_sort_id: EdgeSortId;
				custom_sort_fields: boolean;
				custom_sort_field_labels: string[];
				field_group_labels: string[];
				show_attributes: EdgeAttribute[];
				show_node_options: ShowNodeOptions;
				lock_view: boolean;
				lock_path: string;
			};

			tree: {
				collapse: boolean;
				merge_fields: boolean;
				default_depth: number;
				edge_sort_id: EdgeSortId;
				field_group_labels: string[];
				show_attributes: EdgeAttribute[];
				show_node_options: ShowNodeOptions;
				lock_view: boolean;
				lock_path: string;
				find_root: boolean;
				find_root_field_group_labels: string[];
			};
		};

		codeblocks: {
			show_node_options: ShowNodeOptions;
		};
	};

	commands: {
		rebuild_graph: {
			notify: boolean;

			trigger: {
				note_save: boolean;
				layout_change: boolean;
			};
		};

		list_index: {
			default_options: ListIndexOptions;
		};

		freeze_implied_edges: {
			default_options: {
				destination: CrumbDestination;
				included_fields: string[];
				use_alias: boolean;
			};
		};

		thread: {
			default_options: {
				target_path_template: string;
				destination: CrumbDestination | "none";
			};
		};
	};

	suggestors: {
		edge_field: {
			enabled: boolean;
			trigger: string;
		};
	};

	// SECTION: Debugging
	debug: {
		level: LogLevels;
	};
}

export const OLD_DIRECTIONS = ["up", "down", "same", "prev", "next"] as const;
export type OLD_DIRECTION = (typeof OLD_DIRECTIONS)[number];

export interface OLD_HIERARCHY {
	dirs: Record<OLD_DIRECTION, string[]>;
	implied_relationships: Record<
		| "self_is_sibling"
		| "opposite_direction"
		| "cousin_is_sibling"
		| "same_parent_is_sibling"
		| "same_sibling_is_sibling"
		| "siblings_parent_is_parent"
		| "parents_sibling_is_parent",
		{ rounds: number }
	>;
}

export interface BreadcrumbsSettingsWithDirection {
	// Once I've reach settings parity with old BC, I can add this flag to skip over all the checks in migrate_old_settings
	// But for now, as I add new (old) settings, I don't want to skip migrating them
	// V4_MIGRATED: boolean;

	hierarchies: OLD_HIERARCHY[];

	custom_implied_relations: {
		transitive: {
			rounds: number;
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			chain: Partial<BCEdgeAttributes>[];
			/** The transitive closure field */
			close_field: string;
		}[];
	};

	explicit_edge_sources: {
		// Just a regular `up: [[link]]` or `down:: [[link]]` in the content/frontmatter of a note
		// The two are not distinguished, because Dataview doesn't distinguish them
		typed_link: object;
		tag_note: {
			default_field: string;
		};
		list_note: {
			default_neighbour_field: string;
		};
		dendron_note: {
			enabled: boolean;
			// Should BC-dendron-note-delimiter be a thing too?
			// With the current setup, it would only apply to a single edge per note
			delimiter: string;
			default_field: string;
			display_trimmed: boolean;
		};
		johnny_decimal_note: {
			enabled: boolean;
			delimiter: string;
			default_field: string;
		};
		date_note: {
			enabled: boolean;
			date_format: string;
			default_field: string;
			// If there is a gap from one day to another, should the "next" note be the unresolved one in one day
			//  or the next resolved note?
			// e.g. 2024-03-30 -> 2024-03-31 (unresolved)
			// vs   2024-03-30 -> 2024-04-01 (resolved)
			stretch_to_existing: boolean;
		};
		regex_note: {
			default_field: string;
		};
	};
	views: {
		page: {
			all: {
				sticky: boolean;
			};
			trail: {
				enabled: boolean;
				show_controls: boolean;
				default_depth: number;
				format: "grid" | "path";
				selection: "all" | "shortest" | "longest";
				no_path_message: string;
				show_node_options: ShowNodeOptions;
			};
			prev_next: {
				enabled: boolean;
				show_node_options: ShowNodeOptions;
			};
		};
		side: {
			matrix: {
				show_node_options: ShowNodeOptions;
			};

			tree: {
				collapse: boolean;
				default_dir: OLD_DIRECTION;
				edge_sort_id: EdgeSortId;
				show_attributes: EdgeAttribute[];
				show_node_options: ShowNodeOptions;
			};
		};
		codeblocks: {
			show_node_options: ShowNodeOptions;
		};
	};
	commands: {
		rebuild_graph: {
			notify: boolean;
			trigger: {
				note_save: boolean;
				layout_change: boolean;
			};
		};
		list_index: {
			default_options: ListIndexOptions;
		};
		freeze_implied_edges: {
			default_options: {
				destination: CrumbDestination;
			};
		};
		thread: {
			default_options: {
				target_path_template: string;
				destination: CrumbDestination | "none";
			};
		};
	};

	suggestors: {
		hierarchy_field: {
			enabled: boolean;
			trigger: string;
		};
	};
	// SECTION: Debugging
	debug: {
		level: LogLevels;
	};
}

export type OLD_BREADCRUMBS_SETTINGS = Partial<{
	// SECTION: Hierarchies
	userHiers: Record<OLD_DIRECTION, string>[]; // MIGRATED

	// SECTION: explicit_edge_sources
	addDateNotes: boolean; // MIGRATED

	CSVPaths: string;

	dataviewNoteField: string;
	dvWaitTime: number; // MIGRATED

	addDendronNotes: boolean; // MIGRATED
	dendronNoteDelimiter: string; // MIGRATED
	dendronNoteField: string; // MIGRATED
	trimDendronNotes: boolean; // MIGRATED

	dateNoteFormat: string; // MIGRATED
	dateNoteField: string; // MIGRATED
	dateNoteAddMonth: string;
	dateNoteAddYear: string;

	hierarchyNotes: string[]; // NOT NEEDED - BC-list-note-field
	hierarchyNoteIsParent: boolean; // NOT NEEDED - BC-list-note-exact
	HNUpField: string; // NOT NEEDED - BC-list-note-field

	namingSystemField: string;
	namingSystemRegex: string;
	namingSystemSplit: string;
	namingSystemEndsWithDelimiter: boolean;

	regexNoteField: string;

	tagNoteField: string; // MIGRATED

	// SECTION: Implied relations
	/** WARNING: The defaults for this feature are all `false`! */
	impliedRelations: {
		/** Has it's own toggle already */
		siblingIdentity: boolean;
		/** TypeII implied (currently) */
		sameParentIsSibling: boolean;
		/** Traverse siblings horizontally to make all siblings siblings of each other */
		siblingsSiblingIsSibling: boolean;
		/** Your siblings' parents are your parents */
		siblingsParentIsParent: boolean;
		/** Aunt and Uncle */
		parentsSiblingsIsParents: boolean;
		/** Grandparents */
		parentsParentsIsParent: boolean;
		/** If two separate parents are siblings, their children are cousins */
		cousinsIsSibling: boolean;
	}; // MIGRATED

	// treatCurrNodeAsImpliedSibling: boolean; // NOT NEEDED, impliedRelations.siblingIdentity covers it

	// SECTION: Views
	// These two should be one setting, deciding sort_order and sort_by
	alphaSortAsc: boolean;
	enableAlphaSort: boolean;

	/** An array of fields going _up_ which **will** be shown in the trail view */
	limitTrailCheckboxes: string[];

	// Default layout to use for Juggl view
	jugglLayout: string;
	parseJugglLinksWithoutJuggl: boolean;
	showUpInJuggl: boolean;
	showJuggl: boolean;

	gridDefaultDepth: number; // MIGRATED

	noPathMessage: string; // MIGRATED

	// Dunno if I'll add these... Obsidian remembers if they were open,
	//   and the side they were opened on
	rlLeaf: boolean; // NOT NEEDED
	openMatrixOnLoad: boolean; // NOT NEEDED
	// openStatsOnLoad: boolean; // NOT NEEDED
	openDuckOnLoad: boolean; // NOT NEEDED
	openDownOnLoad: boolean; // NOT NEEDED

	respectReadableLineLength: boolean; // MIGRATED
	showAllPathsIfNoneToIndexNote: boolean;

	showAllAliases: boolean; // ?
	showNameOrType: boolean; // ?
	showRelationType: boolean;

	sortByNameShowAlias: boolean;

	showTrail: boolean; // NOT NEEDED
	showBCs: boolean; // MIGRATED
	showBCsInEditLPMode: boolean;

	// showAll: string; // NOT NEEDED, we infer from the enabled field on each page view
	showGrid: boolean; // MIGRATED
	// showImpliedRelations: boolean; // NOT NEEDED, can just disable all implied relations

	showPrevNext: boolean; // MIGRATED

	squareDirectionsOrder: (0 | 1 | 2 | 3 | 4)[];

	// trailSeperator: string; // NOT NEEDED, no path view

	// visGraph: VisType;
	// visRelation: Relations;
	// visClosed: string;
	// visAll: string;

	// SECTION: Commands
	aliasesInIndex: boolean; // MIGRATED
	createIndexIndent: string; // MIGRATED
	wikilinkIndex: boolean; // MIGRATED

	refreshOnNoteSave: boolean; // MIGRATED
	refreshOnNoteChange: boolean; // MIGRATED
	showRefreshNotice: boolean; // MIGRATED

	showWriteAllBCsCmd: boolean;
	writeBCsInline: boolean; // MIGRATED

	/** An array of fields in all directions which **will** get written when running `Write implied BCs to file` */
	limitWriteBCCheckboxes: string[];
	limitJumpToFirstFields: string[];

	threadIntoNewPane: boolean;
	threadingTemplate: string;
	// threadingDirTemplates: { [dir in Direction]: string };
	threadUnderCursor: boolean;

	// SECTION: Not sure?
	altLinkFields: string[]; // ?

	dateFormat: string; // ?

	filterImpliedSiblingsOfDifferentTypes: boolean; // ? I think this was a plaster on a bug

	indexNotes: string[]; // NOT NEEDED - not going to implement

	// SECTION: Suggestors
	enableRelationSuggestor: boolean;
	fieldSuggestor: boolean;
	relSuggestorTrigger: string;

	// SECTION: Misc

	useAllMetadata: boolean;

	// dvWaitTime: number; // NOT NEEDED

	debugMode: 0 | 1 | 2;

	// CHECKBOX_STATES_OVERWRITTEN: boolean; // NOT NEEDED
}>;
