import { META_ALIAS } from "src/const/metadata_fields";
import type { BreadcrumbsError } from "src/interfaces/graph";
import type { Result } from "src/interfaces/result";
import type BreadcrumbsPlugin from "src/main";
import { EDGE_FIELD_SLOTS } from "src/utils/edge_fields";
import { validate_edge_field } from "./validate_field";

/**
 * The explicit-edge sources that resolve a single edge-field from a note's
 * frontmatter: a per-note `BC-<source>-field` override with an optional builder
 * default. (Sibling/neighbour fields are resolved separately by their builders.)
 */
export type FieldSource =
	| "tag_note"
	| "dendron_note"
	| "johnny_decimal_note"
	| "regex_note"
	| "dataview_note"
	| "folder_note"
	| "list_note";

interface EdgeFieldSourceConfig {
	/** The `BC-…-field` key — both the frontmatter override and the error label. */
	alias_key: keyof typeof META_ALIAS;
}

// The builder default (when the per-note override is absent) comes from
// EDGE_FIELD_SLOTS[source].primary, shared with the rename/remove cascade.
// folder_note and list_note have no primary slot there → required, no default.
const EDGE_FIELD_SOURCES: Record<FieldSource, EdgeFieldSourceConfig> = {
	tag_note: { alias_key: "tag-note-field" },
	dendron_note: { alias_key: "dendron-note-field" },
	johnny_decimal_note: { alias_key: "johnny-decimal-note-field" },
	regex_note: { alias_key: "regex-note-field" },
	dataview_note: { alias_key: "dataview-note-field" },
	folder_note: { alias_key: "folder-note-field" },
	list_note: { alias_key: "list-note-field" },
};

/**
 * Resolve and validate an explicit builder's edge-field from a note's metadata.
 *
 * Reads the per-note `BC-<source>-field` override, falls back to the builder's
 * configured `default_field` when the source has one, then runs the shared
 * {@link validate_edge_field} checks. The `BC-…` key doubles as the label in
 * error messages.
 *
 * - `fail(undefined)` — the note doesn't opt in (no override, no/empty default)
 * - `graph_build_fail(...)` — present but not a string, or not a registered field
 * - `succ(label)` — the validated edge-field label
 */
export const read_edge_field = (
	plugin: BreadcrumbsPlugin,
	source: FieldSource,
	metadata: Record<string, unknown> | undefined,
	path: string,
): Result<string, BreadcrumbsError | undefined> => {
	const alias = META_ALIAS[EDGE_FIELD_SOURCES[source].alias_key];

	return validate_edge_field(
		plugin,
		metadata?.[alias] ??
			EDGE_FIELD_SLOTS[source]?.primary?.get(plugin.settings),
		path,
		alias,
	);
};
