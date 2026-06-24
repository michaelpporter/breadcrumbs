import { META_ALIAS } from "src/const/metadata_fields";
import type { BreadcrumbsError } from "src/interfaces/graph";
import type { Result } from "src/interfaces/result";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
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
	/**
	 * Builder default used when the per-note override is absent. Omitted for
	 * sources whose field is required (`folder_note`, `list_note`).
	 *
	 * NOTE: these getters mirror the `default_field` references that
	 * `src/utils/edge_fields.ts` also enumerates for the rename/remove cascade.
	 * They are kept separate because that registry needs setters too.
	 */
	default_field?: (settings: BreadcrumbsSettings) => string;
}

const EDGE_FIELD_SOURCES: Record<FieldSource, EdgeFieldSourceConfig> = {
	tag_note: {
		alias_key: "tag-note-field",
		default_field: (s) => s.explicit_edge_sources.tag_note.default_field,
	},
	dendron_note: {
		alias_key: "dendron-note-field",
		default_field: (s) => s.explicit_edge_sources.dendron_note.default_field,
	},
	johnny_decimal_note: {
		alias_key: "johnny-decimal-note-field",
		default_field: (s) =>
			s.explicit_edge_sources.johnny_decimal_note.default_field,
	},
	regex_note: {
		alias_key: "regex-note-field",
		default_field: (s) => s.explicit_edge_sources.regex_note.default_field,
	},
	dataview_note: {
		alias_key: "dataview-note-field",
		default_field: (s) =>
			s.explicit_edge_sources.dataview_note.default_field,
	},
	// folder_note and list_note require an explicit per-note field — no default.
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
	const config = EDGE_FIELD_SOURCES[source];
	const alias = META_ALIAS[config.alias_key];

	return validate_edge_field(
		plugin,
		metadata?.[alias] ?? config.default_field?.(plugin.settings),
		path,
		alias,
	);
};
