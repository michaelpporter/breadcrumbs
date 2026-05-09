import { LIST_INDEX_DEFAULT_OPTIONS } from "src/commands/list_index";
import { META_ALIAS } from "src/const/metadata_fields";
import { DEFAULT_SETTINGS } from "src/const/settings";
import type {
	BreadcrumbsSettings,
	BreadcrumbsSettingsWithDirection,
	OLD_BREADCRUMBS_SETTINGS,
	OLD_DIRECTION,
	OLD_HIERARCHY,
} from "src/interfaces/settings";
import { OLD_DIRECTIONS } from "src/interfaces/settings";
import { log } from "src/logger";
import { remove_duplicates, remove_duplicates_by } from "src/utils/arrays";
import { stringify_transitive_relation } from "src/utils/transitive_rules";

function get_opposite_direction(dir: OLD_DIRECTION): OLD_DIRECTION {
	switch (dir) {
		case "up":
			return "down";
		case "down":
			return "up";
		case "same":
			return "same";
		case "next":
			return "prev";
		case "prev":
			return "next";
	}
}

export function migrate_old_settings(settings: BreadcrumbsSettings) {
	const old = settings as BreadcrumbsSettings &
		Partial<BreadcrumbsSettingsWithDirection> &
		Partial<OLD_BREADCRUMBS_SETTINGS>;

	// SECTION: Hierarchies
	// NOTE: Keep the intermediate type, not just old. We convert this to the latest type next
	/// Hierarchies used to just be the Record<Direction, string[]>, but it's now wrapped in an object
	/// We can also handle the move of implied_relationships here
	if (old.userHiers && old.impliedRelations) {
		const implied_relationships: OLD_HIERARCHY["implied_relationships"] = {
			opposite_direction: {
				rounds: 1,
			},
			self_is_sibling: {
				rounds: Number(old.impliedRelations.siblingIdentity),
			},
			cousin_is_sibling: {
				rounds: Number(old.impliedRelations.cousinsIsSibling),
			},
			same_parent_is_sibling: {
				rounds: Number(old.impliedRelations.sameParentIsSibling),
			},
			same_sibling_is_sibling: {
				rounds: Number(old.impliedRelations.siblingsSiblingIsSibling),
			},
			siblings_parent_is_parent: {
				rounds: Number(old.impliedRelations.siblingsParentIsParent),
			},
			parents_sibling_is_parent: {
				rounds: Number(old.impliedRelations.parentsSiblingsIsParents),
			},
		};

		old.hierarchies = old.userHiers.map((hierarchy) => ({
			dirs: OLD_DIRECTIONS.reduce(
				(acc, dir) => ({
					...acc,
					[dir]: hierarchy[dir],
				}),
				{} as OLD_HIERARCHY["dirs"],
			),
			implied_relationships,
		}));

		delete old.userHiers;
		delete old.impliedRelations;
	}

	// Transform hierarchies into edge_fields
	if (old.hierarchies) {
		OLD_DIRECTIONS.forEach((dir) => {
			const fields = old
				.hierarchies!.flatMap((hier) => hier.dirs[dir])
				.filter(Boolean);

			const label = `${dir}s`;
			const existing = settings.edge_field_groups.find(
				(group) => group.label === label,
			);

			if (existing) {
				existing.fields.push(...fields);
				existing.fields = remove_duplicates(existing.fields);
			} else {
				settings.edge_field_groups.push({ label, fields });
			}
		});

		old.hierarchies.forEach((hier) => {
			Object.values(hier.dirs)
				.flatMap((fields) => fields)
				.filter(Boolean)
				.forEach((label) => {
					if (
						!settings.edge_fields.find(
							(field) => field.label === label,
						)
					) {
						settings.edge_fields.push({ label });
					}
				});

			Object.entries(hier.implied_relationships).forEach(
				([rel, { rounds }]) => {
					if (!rounds) return;

					const fields = {
						up: hier.dirs.up[0],
						same: hier.dirs.same[0],
						down: hier.dirs.down[0],
						next: hier.dirs.next[0],
						prev: hier.dirs.prev[0],
					};

					switch (rel) {
						case "opposite_direction": {
							OLD_DIRECTIONS.forEach((dir) => {
								const field = fields[dir];
								const close_field =
									fields[get_opposite_direction(dir)];
								if (!field || !close_field) return;

								settings.implied_relations.transitive.push({
									rounds,
									name: "",
									close_field,
									chain: [{ field }],
									close_reversed: true,
								});
							});

							break;
						}

						case "cousin_is_sibling": {
							if (!fields.up || !fields.same || !fields.down) {
								return;
							}

							settings.implied_relations.transitive.push({
								rounds,
								name: "",
								chain: [
									{ field: fields.up },
									{ field: fields.same },
									{ field: fields.down },
								],
								close_reversed: false,
								close_field: fields.same,
							});

							break;
						}

						case "same_parent_is_sibling": {
							if (!fields.up || !fields.same || !fields.down) {
								return;
							}

							settings.implied_relations.transitive.push({
								rounds,
								name: "",
								chain: [
									{ field: fields.up },
									{ field: fields.down },
								],
								close_reversed: false,
								close_field: fields.same,
							});

							break;
						}

						case "same_sibling_is_sibling": {
							if (!fields.same) return;

							settings.implied_relations.transitive.push({
								rounds,
								name: "",
								chain: [
									{ field: fields.same },
									{ field: fields.same },
								],
								close_reversed: false,
								close_field: fields.same,
							});

							break;
						}

						case "siblings_parent_is_parent": {
							if (!fields.up || !fields.same) return;

							settings.implied_relations.transitive.push({
								rounds,
								name: "",
								chain: [
									{ field: fields.same },
									{ field: fields.up },
								],
								close_reversed: false,
								close_field: fields.up,
							});

							break;
						}

						case "parents_sibling_is_parent": {
							if (!fields.up || !fields.same) return;

							settings.implied_relations.transitive.push({
								rounds,
								name: "",
								chain: [
									{ field: fields.up },
									{ field: fields.same },
								],
								close_reversed: false,
								close_field: fields.up,
							});

							break;
						}
					}
				},
			);
		});

		delete old.hierarchies;

		settings.edge_field_groups = remove_duplicates_by(
			settings.edge_field_groups,
			(group) => group.label,
		);
	}

	// !SECTION
	// SECTION: custom_implied_relations
	if (old.custom_implied_relations) {
		old.custom_implied_relations.transitive.forEach((rel) => {
			settings.implied_relations.transitive.push({
				...rel,
				name: "",
				close_reversed: false,
			});
		});

		delete old.custom_implied_relations;
	}

	settings.implied_relations.transitive = remove_duplicates_by(
		settings.implied_relations.transitive,
		stringify_transitive_relation,
	);
	// !SECTION
	// SECTION: Explicit edge sources
	/// Tag note
	if (old.tagNoteField !== undefined) {
		settings.explicit_edge_sources.tag_note.default_field =
			old.tagNoteField;

		delete old.tagNoteField;
	}

	/// List note
	if (
		old.hierarchyNotes !== undefined &&
		old.hierarchyNoteIsParent !== undefined &&
		old.HNUpField !== undefined
	) {
		if (old.hierarchyNotes.length > 0) {
			const msg = `DEPRECATED: The central Hierarchy Notes setting is deprecated in favour of the "${META_ALIAS["list-note-field"]}" field in each hierarchy note.`;
			log.warn(msg);
		}

		delete old.HNUpField;
		delete old.hierarchyNotes;
		delete old.hierarchyNoteIsParent;
	}

	/// Dendron
	if (
		old.addDendronNotes !== undefined &&
		old.dendronNoteField !== undefined &&
		old.trimDendronNotes !== undefined &&
		old.dendronNoteDelimiter !== undefined
	) {
		settings.explicit_edge_sources.dendron_note = {
			enabled: old.addDendronNotes,
			default_field: old.dendronNoteField,
			default_sibling_field: "",
			delimiter: old.dendronNoteDelimiter,
			display_trimmed: old.trimDendronNotes,
		};

		delete old.addDendronNotes;
		delete old.dendronNoteField;
		delete old.trimDendronNotes;
		delete old.dendronNoteDelimiter;
	}

	/// Date notes
	if (
		old.addDateNotes !== undefined &&
		old.dateNoteField !== undefined &&
		old.dateNoteFormat !== undefined
	) {
		settings.explicit_edge_sources.date_note = {
			...DEFAULT_SETTINGS.explicit_edge_sources.date_note,
			enabled: old.addDateNotes,
			default_field: old.dateNoteField,
			date_format: old.dateNoteFormat,
		};

		delete old.addDateNotes;
		delete old.dateNoteField;
		delete old.dateNoteFormat;
	}
	// !SECTION
	// SECTION: Views
	/// Page
	if (old.respectReadableLineLength !== undefined) {
		delete old.respectReadableLineLength;
	}

	//// Trail
	if (old.showBCs !== undefined) {
		settings.views.page.trail.enabled = old.showBCs;
		delete old.showBCs;
	}

	if (old.showGrid !== undefined) {
		settings.views.page.trail.format = old.showGrid ? "grid" : "path";

		delete old.showGrid;
	}

	if (old.gridDefaultDepth !== undefined) {
		settings.views.page.trail.default_depth = old.gridDefaultDepth;
		delete old.gridDefaultDepth;
	}

	if (old.noPathMessage !== undefined) {
		settings.views.page.trail.no_path_message = old.noPathMessage;
		delete old.noPathMessage;
	}

	//// Prev/Next
	if (old.showPrevNext !== undefined) {
		settings.views.page.prev_next.enabled = old.showPrevNext;

		delete old.showPrevNext;
	}

	//// Tree
	if (old.views.side.tree.default_dir !== undefined) {
		// @ts-ignore
		delete old.views.side.tree.default_dir;
	}

	//// Codeblocks
	// @ts-ignore: This previously wasn't "considered" a view
	if (settings.codeblocks !== undefined) {
		// @ts-ignore: This previously wasn't "considered" a view
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		settings.views.codeblocks = settings.codeblocks;

		// @ts-ignore: This previously wasn't "considered" a view
		delete settings.codeblocks;
	}
	// !SECTION
	// SECTION: Commands
	/// Rebuild Graph
	if (
		old.showRefreshNotice !== undefined &&
		old.refreshOnNoteSave !== undefined &&
		old.refreshOnNoteChange !== undefined
	) {
		settings.commands.rebuild_graph.notify = old.showRefreshNotice;

		settings.commands.rebuild_graph.trigger = {
			note_save: old.refreshOnNoteSave,
			layout_change: old.refreshOnNoteChange,
		};

		delete old.showRefreshNotice;
		delete old.refreshOnNoteSave;
		delete old.refreshOnNoteChange;
	}

	/// List Index
	if (
		old.wikilinkIndex !== undefined &&
		old.aliasesInIndex !== undefined &&
		old.createIndexIndent !== undefined
	) {
		settings.commands.list_index.default_options = {
			...settings.commands.list_index.default_options,

			indent: old.createIndexIndent,
			link_kind: old.wikilinkIndex ? "wiki" : "none",
			show_node_options: {
				...LIST_INDEX_DEFAULT_OPTIONS.show_node_options,
				alias: old.aliasesInIndex,
			},
		};

		// @ts-ignore
		delete settings.commands.list_index.default_options.dir;

		delete old.wikilinkIndex;
		delete old.aliasesInIndex;
		delete old.createIndexIndent;
	}

	/// Freeze implied edges
	if (old.writeBCsInline !== undefined) {
		settings.commands.freeze_implied_edges.default_options.destination =
			old.writeBCsInline ? "dataview-inline" : "frontmatter";

		delete old.writeBCsInline;
	}

	/// Thread
	if (old.threadingTemplate !== undefined) {
		settings.commands.thread.default_options.target_path_template =
			old.threadingTemplate;

		delete old.threadingTemplate;
	}

	if (old.threadUnderCursor !== undefined) {
		settings.commands.thread.default_options.destination =
			old.threadUnderCursor ? "dataview-inline" : "frontmatter";

		delete old.threadUnderCursor;
	}
	// !SECTION
	// SECTION: Suggestors
	/// Hierarchy Field
	if (old.enableRelationSuggestor !== undefined) {
		settings.suggestors.edge_field.enabled = old.enableRelationSuggestor;

		delete old.enableRelationSuggestor;
	}

	if (old.relSuggestorTrigger !== undefined) {
		settings.suggestors.edge_field.trigger = old.relSuggestorTrigger;

		delete old.relSuggestorTrigger;
	}

	if (old.suggestors.hierarchy_field !== undefined) {
		settings.suggestors.edge_field = old.suggestors.hierarchy_field;

		// @ts-ignore
		delete old.suggestors.hierarchy_field;
	}
	// !SECTION
	// SECTION: Misc
	if (old.alphaSortAsc !== undefined) {
		delete old.alphaSortAsc;
	}

	if (old.debugMode) {
		delete old.debugMode;
	}

	if (old.dvWaitTime !== undefined) {
		delete old.dvWaitTime;
	}

	if (old.fieldSuggestor !== undefined) {
		delete old.fieldSuggestor;
	}

	if (old.filterImpliedSiblingsOfDifferentTypes !== undefined) {
		delete old.filterImpliedSiblingsOfDifferentTypes;
	}

	if (old.jugglLayout !== undefined) {
		delete old.jugglLayout;
	}

	// !SECTION
	// Tree used to default to only `downs`, which hides Dendron parent edges (field `up` in `ups`).
	type WithInternalMigrations = BreadcrumbsSettings & {
		_bc_migrations?: {
			tree_ups_with_downs_default?: boolean;
			tree_find_root_default?: boolean;
		};
	};
	const settings_m = settings as WithInternalMigrations;
	const migrations = (settings_m._bc_migrations ??= {});
	if (!migrations.tree_ups_with_downs_default) {
		const tl = settings.views.side.tree.field_group_labels;
		if (
			Array.isArray(tl) &&
			tl.length === 1 &&
			tl[0] === "downs" &&
			settings.edge_field_groups.some((g) => g.label === "ups")
		) {
			settings.views.side.tree.field_group_labels = ["ups", "downs"];
		}
		migrations.tree_ups_with_downs_default = true;
	}

	// find_root was off by default; enable it so the tree always starts from the root,
	// preventing reversed/ancestor-only output when navigating to a leaf note.
	if (!migrations.tree_find_root_default) {
		settings.views.side.tree.find_root = true;
		migrations.tree_find_root_default = true;
	}

	return settings;
}
