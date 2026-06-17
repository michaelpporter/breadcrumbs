import { readFile } from "fs/promises";
import { DEFAULT_SETTINGS } from "src/const/settings";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { migrate_old_settings } from "src/settings/migration";
import { deep_merge_objects } from "src/utils/objects";
import { describe, expect, test } from "vitest";

describe("migration", () => {
	test("v4-with-directions", async () => {
		const old = deep_merge_objects(
			JSON.parse(
				await readFile(
					"tests/__mocks__/settings/v4-with-directions.json",
					"utf-8",
				),
			),
			DEFAULT_SETTINGS,
		);

		const migrated = migrate_old_settings(old);

		expect(migrated, JSON.stringify(old, null, 2)).toStrictEqual({
			is_dirty: false,
			_bc_migrations: { tree_ups_with_downs_default: true, tree_find_root_default: true },
			edge_fields: [
				{ label: "up" },
				{ label: "down" },
				{ label: "same" },
				{ label: "next" },
				{ label: "prev" },
				{ label: "parent" },
				{ label: "sibling" },
				{ label: "child" },
				{ label: "right" },
				{ label: "left" },
			],
			edge_field_groups: [
				{
					label: "ups",
					fields: ["up", "parent"],
				},
				{
					label: "downs",
					fields: ["down", "child"],
				},
				{
					label: "sames",
					fields: ["same", "sibling"],
				},
				{
					label: "nexts",
					fields: ["next", "right"],
				},
				{
					label: "prevs",
					fields: ["prev", "left"],
				},
			],
			implied_relations: {
				transitive: [
					{
						rounds: 1,
						name: "",
						close_field: "down",
						chain: [{ field: "up" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "up",
						chain: [{ field: "down" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "same",
						chain: [{ field: "same" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "prev",
						chain: [{ field: "next" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "next",
						chain: [{ field: "prev" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "child",
						chain: [{ field: "parent" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "parent",
						chain: [{ field: "child" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "sibling",
						chain: [{ field: "sibling" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "right",
						chain: [{ field: "left" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "left",
						chain: [{ field: "right" }],
						close_reversed: true,
					},
					// custom_implied_relations.transitive
					{
						chain: [{ field: "up" }, { field: "same" }],
						close_field: "up",
						close_reversed: false,
						name: "",
						rounds: 1,
					},
				],
			},
			self_is_sibling: ["same"],

			exclude_folders: [],

			explicit_edge_sources: {
				list_note: {
					default_neighbour_field: "",
				},
				typed_link: {},
				tag_note: {
					default_field: "up",
					default_sibling_field: "",
				},
				dataview_note: {
					default_field: "up",
				},
				regex_note: {
					default_field: "up",
				},
				dendron_note: {
					enabled: true,
					delimiter: ".",
					default_field: "up",
					default_sibling_field: "",
					display_trimmed: true,
				},
				date_note: {
					enabled: true,
					date_format: "yyyy-MM-dd 'DN'",
					default_field: "next",
					stretch_to_existing: false,
					week_start: "monday",
					week: {
						enabled: false,
						date_format: "kkkk-'W'WW",
						folder: "",
						next_field: "next",
						up_field: "up",
					},
					month: {
						enabled: false,
						date_format: "yyyy-MM",
						folder: "",
						next_field: "next",
						up_field: "up",
					},
					quarter: {
						enabled: false,
						date_format: "yyyy-'Q'q",
						folder: "",
						next_field: "next",
						up_field: "up",
					},
					year: {
						enabled: false,
						date_format: "yyyy",
						folder: "",
						next_field: "next",
						up_field: "up",
					},
				},
				johnny_decimal_note: {
					enabled: false,
					delimiter: ".",
					default_field: "up",
					default_sibling_field: "",
				},
				traverse_note: {},
			},
			views: {
				page: {
					all: {
						sticky: false,
					},
					trail: {
						enabled: true,
						format: "grid",
						selection: "all",
						default_depth: 999,
						no_path_message: "",
						merge_fields: false,
						show_controls: false,
						field_group_labels: ["ups"],
						show_node_options: {
							ext: false,
							folder: false,
							alias: false,
						},
					},
					prev_next: {
						enabled: true,
						show_node_options: {
							ext: false,
							folder: false,
							alias: false,
						},
						field_group_labels: {
							prev: ["prevs"],
							next: ["nexts"],
						},
						period_rows: {
							week: false,
							month: false,
							quarter: false,
							year: false,
						},
					},
				},
				side: {
					matrix: {
						collapse: false,
						custom_sort_fields: false,
						custom_sort_field_labels: [],
						lock_view: false,
						lock_path: "",
						edge_sort_id: {
							field: "basename",
							order: 1,
						},
						show_attributes: ["source", "implied_kind", "round"],
						field_group_labels: [
							"ups",
							"downs",
							"sames",
							"nexts",
							"prevs",
						],
						show_node_options: {
							ext: true,
							folder: false,
							alias: false,
						},
					},
					tree: {
						collapse: true,
						merge_fields: false,
						default_depth: 5,
						lock_view: false,
						lock_path: "",
						show_attributes: [],
						field_group_labels: ["ups", "downs"],
						edge_sort_id: {
							field: "basename",
							order: 1,
						},
						show_node_options: {
							ext: false,
							folder: false,
							alias: false,
						},
						find_root: true,
						find_root_field_group_labels: ["ups"],
					},
				},
				codeblocks: {
					show_node_options: {
						ext: false,
						folder: false,
						alias: false,
					},
				},
			},
			commands: {
				rebuild_graph: {
					notify: true,
					trigger: {
						note_save: false,
						layout_change: false,
					},
				},
				list_index: {
					default_options: {
						fields: [],
						// TODO: Not sure why this dir field isn't getting deleted...
						// @ts-ignore
						dir: "down",
						indent: "\\t",
						hierarchy_i: -1,
						link_kind: "wiki",
						show_attributes: [],
						edge_sort_id: {
							order: 1,
							field: "basename",
						},
						show_node_options: {
							ext: false,
							alias: true,
							folder: false,
						},
						field_group_labels: [],
					},
				},
				freeze_implied_edges: {
					default_options: {
						destination: "frontmatter",
						included_fields: [],
						use_alias: true,
					},
				},
				thread: {
					default_options: {
						destination: "frontmatter",
						target_path_template:
							"{{source.folder}}/{{attr.field}} {{source.basename}}",
					},
				},
			},
			suggestors: {
				edge_field: {
					enabled: true,
					trigger: ".",
				},
			},
			debug: {
				level: "DEBUG",
			},
		} satisfies BreadcrumbsSettings);
	});

	test("lemons-settings", async () => {
		const old = deep_merge_objects(
			JSON.parse(
				await readFile(
					"tests/__mocks__/settings/lemons-settings.json",
					"utf-8",
				),
			),
			DEFAULT_SETTINGS,
		);

		const migrated = migrate_old_settings(old);

		expect(migrated, JSON.stringify(old, null, 2)).toStrictEqual({
			is_dirty: false,
			_bc_migrations: { tree_ups_with_downs_default: true, tree_find_root_default: true },
			explicit_edge_sources: {
				list_note: {
					default_neighbour_field: "",
				},
				typed_link: {},
				tag_note: {
					default_field: "up",
					default_sibling_field: "",
				},
				dataview_note: {
					default_field: "up",
				},
				regex_note: {
					default_field: "up",
				},
				dendron_note: {
					enabled: false,
					delimiter: ".",
					default_field: "up",
					default_sibling_field: "",
					display_trimmed: false,
				},
				date_note: {
					enabled: false,
					date_format: "yyyy-MM-dd",
					default_field: "next",
					stretch_to_existing: false,
					week_start: "monday",
					week: {
						enabled: false,
						date_format: "kkkk-'W'WW",
						folder: "",
						next_field: "next",
						up_field: "up",
					},
					month: {
						enabled: false,
						date_format: "yyyy-MM",
						folder: "",
						next_field: "next",
						up_field: "up",
					},
					quarter: {
						enabled: false,
						date_format: "yyyy-'Q'q",
						folder: "",
						next_field: "next",
						up_field: "up",
					},
					year: {
						enabled: false,
						date_format: "yyyy",
						folder: "",
						next_field: "next",
						up_field: "up",
					},
				},
				johnny_decimal_note: {
					enabled: false,
					delimiter: ".",
					default_field: "up",
					default_sibling_field: "",
				},
				traverse_note: {},
			},
			views: {
				page: {
					all: {
						sticky: false,
					},
					trail: {
						enabled: true,
						format: "path",
						default_depth: 999,
						selection: "all",
						no_path_message: "",
						show_node_options: {
							ext: false,
							folder: false,
							alias: false,
						},
						show_controls: true,
						merge_fields: false,
						field_group_labels: ["ups"],
					},
					prev_next: {
						enabled: true,
						show_node_options: {
							ext: false,
							folder: false,
							alias: false,
						},
						field_group_labels: {
							prev: ["prevs"],
							next: ["nexts"],
						},
						period_rows: {
							week: false,
							month: false,
							quarter: false,
							year: false,
						},
					},
				},
				side: {
					matrix: {
						collapse: false,
						custom_sort_fields: false,
						custom_sort_field_labels: [],
						lock_view: false,
						lock_path: "",
						show_node_options: {
							ext: false,
							folder: false,
							alias: false,
						},
						show_attributes: ["source", "implied_kind", "round"],
						edge_sort_id: {
							field: "basename",
							order: 1,
						},
						field_group_labels: [
							"ups",
							"downs",
							"sames",
							"nexts",
							"prevs",
						],
					},
					tree: {
						show_node_options: {
							ext: false,
							folder: false,
							alias: false,
						},
						collapse: false,
						show_attributes: [],
						edge_sort_id: {
							field: "basename",
							order: 1,
						},
						merge_fields: false,
						default_depth: 5,
						lock_view: false,
						lock_path: "",
						field_group_labels: ["ups", "downs"],
						find_root: true,
						find_root_field_group_labels: ["ups"],
					},
				},
				codeblocks: {
					show_node_options: {
						ext: false,
						folder: false,
						alias: false,
					},
				},
			},
			commands: {
				rebuild_graph: {
					notify: true,
					trigger: {
						note_save: false,
						layout_change: false,
					},
				},
				list_index: {
					default_options: {
						fields: [],
						// @ts-expect-error
						dir: "down",
						indent: "\\t",
						hierarchy_i: -1,
						link_kind: "wiki",
						show_attributes: [],
						edge_sort_id: {
							order: 1,
							field: "basename",
						},
						show_node_options: {
							ext: false,
							alias: true,
							folder: false,
						},
						field_group_labels: [],
					},
				},
				freeze_implied_edges: {
					default_options: {
						destination: "frontmatter",
						included_fields: [],
						use_alias: true,
					},
				},
				thread: {
					default_options: {
						destination: "frontmatter",
						target_path_template:
							"{{source.folder}}/{{attr.field}} {{source.basename}}",
					},
				},
			},
			debug: {
				level: "DEBUG",
			},
			suggestors: {
				edge_field: {
					enabled: false,
					trigger: ".",
				},
			},
			edge_fields: [
				{ label: "up" },
				{ label: "down" },
				{ label: "same" },
				{ label: "next" },
				{ label: "prev" },
				{ label: "parent" },
				{ label: "sibling" },
				{ label: "child" },
				{ label: "right" },
				{ label: "left" },
				{ label: "r-member" },
				{ label: "r-sibling" },
				{ label: "relation" },
				{ label: "r-parent" },
				{ label: "half-sibling" },
				{ label: "r-child" },
			],
			edge_field_groups: [
				{
					label: "ups",
					fields: ["up", "parent", "r-member", "r-parent"],
				},
				{
					label: "downs",
					fields: ["down", "child", "relation", "r-child"],
				},
				{
					label: "sames",
					fields: ["same", "sibling", "r-sibling", "half-sibling"],
				},
				{
					label: "nexts",
					fields: ["next", "right"],
				},
				{
					label: "prevs",
					fields: ["prev", "left"],
				},
			],
			implied_relations: {
				transitive: [
					{
						name: "",
						rounds: 1,
						chain: [{ field: "up" }],
						close_field: "down",
						close_reversed: true,
					},
					{
						name: "",
						rounds: 1,
						chain: [{ field: "down" }],
						close_field: "up",
						close_reversed: true,
					},
					{
						name: "",
						rounds: 1,
						chain: [{ field: "same" }],
						close_field: "same",
						close_reversed: true,
					},
					{
						name: "",
						rounds: 1,
						chain: [{ field: "next" }],
						close_field: "prev",
						close_reversed: true,
					},
					{
						name: "",
						rounds: 1,
						chain: [{ field: "prev" }],
						close_field: "next",
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "child",
						chain: [{ field: "parent" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "parent",
						chain: [{ field: "child" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "sibling",
						chain: [{ field: "sibling" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "right",
						chain: [{ field: "left" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "left",
						chain: [{ field: "right" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						chain: [{ field: "up" }, { field: "same" }],
						close_field: "up",
						close_reversed: false,
						name: "",
					},
					{
						rounds: 1,
						name: "",
						close_field: "relation",
						chain: [{ field: "r-member" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "r-member",
						chain: [{ field: "relation" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "r-sibling",
						chain: [{ field: "r-sibling" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "r-child",
						chain: [{ field: "r-parent" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "r-parent",
						chain: [{ field: "r-child" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "",
						close_field: "half-sibling",
						chain: [{ field: "half-sibling" }],
						close_reversed: true,
					},
					{
						chain: [{ field: "r-parent" }, { field: "r-child" }],
						rounds: 5,
						close_field: "sibling",
						close_reversed: false,
						name: "",
					},
					{
						chain: [{ field: "relation" }, { field: "r-child" }],
						rounds: 5,
						close_field: "child",
						close_reversed: false,
						name: "",
					},
					{
						chain: [
							{ field: "r-parent" },
							{ field: "r-sibling" },
							{ field: "r-child" },
						],
						rounds: 5,
						close_field: "half-sibling",
						close_reversed: false,
						name: "",
					},
					{
						chain: [{ field: "r-member" }, { field: "relation" }],
						rounds: 5,
						close_field: "r-sibling",
						close_reversed: false,
						name: "",
					},
					{
						chain: [{ field: "r-parent" }, { field: "r-member" }],
						rounds: 5,
						close_field: "parent",
						close_reversed: false,
						name: "",
					},
				],
			},
			self_is_sibling: ["same"],

			exclude_folders: [],
		} satisfies BreadcrumbsSettings);
	});
});
