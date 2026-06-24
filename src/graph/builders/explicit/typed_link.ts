import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { resolve_relative_target_path } from "src/utils/obsidian";
import { GCEdgeData, GCNodeData } from "wasm/pkg/breadcrumbs_graph_wasm";

// Matches Dataview-style inline fields at the start of a line:
//   [optional list marker] [optional ( or [ wrapper] field-name:: rest-of-line
// Supports: "same:: ...", "- same:: ...", "up :: ...",
// and Dataview's bracket/paren wrappers "(down:: ...)" / "[down:: ...]".
const INLINE_FIELD_REGEX =
	/^(?:\s*[-*+\d.]+\s+)?[([]?\s*([\w][\w\s-]*)\s*::\s*/;

/**
 * Parse the field name from a line that opens with a Dataview-style inline
 * field (`field:: ...`). Pure over a single line — returns the trimmed field
 * name, or `null` when the line does not open with an inline field.
 */
export const parse_inline_field = (line: string): string | null => {
	const match = INLINE_FIELD_REGEX.exec(line);
	return match ? match[1].trim() : null;
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

	// Pass 2: body inline fields — `field:: [[value]]` on any line
	await Promise.all(
		(all_files.obsidian ?? []).map(
			async ({ file, cache }) => {
				if (file.extension !== "md") return;
				if (!cache?.links?.length) return;

				const content = await plugin.app.vault.cachedRead(file);
				const lines = content.split("\n");

				for (const link_cache of cache.links) {
					const line_num = link_cache.position.start.line;
					const line_text = lines[line_num] ?? "";
					const field = parse_inline_field(line_text);
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
		),
	);

	return results;
};
