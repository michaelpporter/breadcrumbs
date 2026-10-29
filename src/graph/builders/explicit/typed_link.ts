import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { resolve_relative_target_path } from "src/utils/obsidian";
import {
	for_each_with_concurrency,
	vault_read_concurrency,
} from "src/utils/promises";
import { GCEdgeData, GCNodeData } from "wasm/pkg/breadcrumbs_graph_wasm";

/** A Dataview inline field found on a line, with the span its value occupies. */
export interface InlineField {
	field: string;
	/** Column of the first character of the value (inclusive). */
	value_start: number;
	/** Column just past the last character of the value (exclusive). */
	value_end: number;
}

// A bare inline field opening a line, optionally behind blockquote and/or list
// markers: "same:: ...", "- same:: ...", "> same:: ...", "up :: ...".
// Its value runs to the end of the line.
const LINE_FIELD_REGEX =
	/^(?:\s*>+\s*)?(?:\s*[-*+\d.]+\s+)?([\w][\w\s-]*)\s*::\s*/;

// Dataview's bracket/paren wrappers, anywhere on the line: "(down:: ...)" /
// "[down:: ...]". The value ends at the matching close bracket.
const WRAPPED_FIELD_REGEX = /[([]\s*([\w][\w\s-]*)\s*::\s*/g;

/**
 * Index of the bracket closing the one at `open_index`, or `line.length` when
 * unclosed. Counts depth of that bracket type only, so nested wikilinks
 * (`[down:: [[X]]]`) and markdown links (`(down:: [X](y))`) close correctly.
 */
const find_close_bracket = (line: string, open_index: number): number => {
	const open = line[open_index];
	const close = open === "(" ? ")" : "]";

	let depth = 0;
	for (let i = open_index; i < line.length; i++) {
		if (line[i] === open) depth++;
		else if (line[i] === close && --depth === 0) return i;
	}

	return line.length;
};

/**
 * Parse every Dataview-style inline field on a line, along with the span of
 * text that forms each one's value. Pure over a single line.
 */
export const parse_inline_fields = (line: string): InlineField[] => {
	const fields: InlineField[] = [];

	const line_match = LINE_FIELD_REGEX.exec(line);
	if (line_match) {
		fields.push({
			field: line_match[1].trim(),
			value_start: line_match[0].length,
			value_end: line.length,
		});
	}

	WRAPPED_FIELD_REGEX.lastIndex = 0;
	let wrapped_match: RegExpExecArray | null;
	while ((wrapped_match = WRAPPED_FIELD_REGEX.exec(line))) {
		fields.push({
			field: wrapped_match[1].trim(),
			value_start: wrapped_match.index + wrapped_match[0].length,
			value_end: find_close_bracket(line, wrapped_match.index),
		});
	}

	return fields;
};

/**
 * The field whose value contains column `col`, or `null` when the column falls
 * outside every field. Ties go to the narrowest span, so a wrapped field wins
 * over a bare line-level field that happens to enclose it.
 */
const field_at_column = (
	fields: InlineField[],
	col: number,
): string | null => {
	let best: InlineField | null = null;

	for (const field of fields) {
		if (col < field.value_start || col >= field.value_end) continue;
		if (
			!best ||
			field.value_end - field.value_start < best.value_end - best.value_start
		) {
			best = field;
		}
	}

	return best?.field ?? null;
};

/**
 * **typed_link** — the primary edge builder.
 *
 * Two passes:
 * - **Obsidian** (`frontmatterLinks`): uses Obsidian's built-in link resolution
 *   for `[[wikilink]]` values in YAML frontmatter.
 * - **Inline fields** (`cache.links` + `vault.cachedRead`): reads body-level
 *   `field:: [[value]]` syntax (Dataview inline format) natively, without
 *   requiring the Dataview plugin.
 *
 * Unresolved link targets are added as unresolved nodes so they still appear
 * in the graph even without a corresponding vault file.
 */
export const _add_explicit_edges_typed_link: ExplicitEdgeBuilder = async (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };

	const field_labels = new Set(
		plugin.settings.edge_fields.map((f) => f.label),
	);

	// Pass 1: frontmatter wikilinks via Obsidian's metadata cache
	all_files.obsidian?.forEach(
		({ file: source_file, cache: source_cache }) => {
			source_cache?.frontmatterLinks?.forEach((target_link) => {
				// List-type properties return keys like "field.0" — take only the field name
				const field = target_link.key.split(".")[0];
				if (!field_labels.has(field)) return;

				const resolved = resolve_relative_target_path(
					plugin.app,
					target_link.link,
					source_file.path,
				);
				if (!resolved) return;
				const [target_id, target_file] = resolved;

				if (!target_file) {
					results.nodes.push(
						new GCNodeData(target_id, [], false, false, false),
					);
				}

				results.edges.push(
					new GCEdgeData(
						source_file.path,
						target_id,
						field,
						"typed_link",
					),
				);
			});
		},
	);

	// Pass 2: body inline fields — `field:: [[value]]` on any line. Reads are
	// capped on mobile so they do not queue the user's own reads (#799).
	await for_each_with_concurrency(
		all_files.obsidian ?? [],
		vault_read_concurrency(),
		async ({ file, cache }) => {
			if (file.extension !== "md") return;

			// `[[wikilink]]` and `![[embed]]` land in separate cache arrays, but
			// a Dataview field can hold either (e.g. `down:: ![[note]]`).
			const links = [...(cache?.links ?? []), ...(cache?.embeds ?? [])];
			if (!links.length) return;

			const content = await plugin.app.vault.cachedRead(file);
			const lines = content.split("\n");

			const fields_by_line = new Map<number, InlineField[]>();

			for (const link_cache of links) {
				const line_num = link_cache.position.start.line;

				let fields = fields_by_line.get(line_num);
				if (!fields) {
					fields = parse_inline_fields(lines[line_num] ?? "");
					fields_by_line.set(line_num, fields);
				}

				const field = field_at_column(
					fields,
					link_cache.position.start.col,
				);
				if (!field) continue;
				if (!field_labels.has(field)) continue;

				const resolved = resolve_relative_target_path(
					plugin.app,
					link_cache.link,
					file.path,
				);
				if (!resolved) continue;
				const [target_id, target_file] = resolved;

				if (!target_file) {
					results.nodes.push(
						new GCNodeData(target_id, [], false, false, false),
					);
				}

				results.edges.push(
					new GCEdgeData(file.path, target_id, field, "typed_link"),
				);
			}
		},
	);

	return results;
};
