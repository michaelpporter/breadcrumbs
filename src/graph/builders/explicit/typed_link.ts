import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { ensure_is_array } from "src/utils/arrays";
import { resolve_relative_target_path } from "src/utils/obsidian";
import { GCEdgeData, GCNodeData } from "wasm/pkg/breadcrumbs_graph_wasm";

const MARKDOWN_LINK_REGEX = /\[(.+?)\]\((.+?)\)/;

/**
 * **typed_link** — the primary edge builder.
 *
 * Reads every frontmatter property whose key matches a registered edge-field
 * label. If the value is a wikilink or markdown link, an edge is created from
 * the current note to the target note with that field as the edge type.
 *
 * Two passes:
 * - **Obsidian** (`frontmatterLinks`): uses Obsidian's built-in link resolution;
 *   covers standard `[[wikilink]]` values in frontmatter.
 * - **Dataview** (`all_files.dataview`): supplements inline fields that
 *   `frontmatterLinks` misses (only runs when Dataview is present and the key
 *   isn't already covered by the Obsidian pass to avoid duplicate edges).
 *
 * Unresolved link targets are added as unresolved nodes so they still appear
 * in the graph even without a corresponding vault file.
 */
export const _add_explicit_edges_typed_link: ExplicitEdgeBuilder = (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };

	const field_labels = new Set(
		plugin.settings.edge_fields.map((f) => f.label),
	);

	all_files.obsidian?.forEach(
		({ file: source_file, cache: source_cache }) => {
			// On the Dataview branch, it's possible the field value is invalid.
			// But on the Obsidian route, we explictly check for links only
			source_cache?.frontmatterLinks?.forEach((target_link) => {
				// Using the List type of properties, the field is returned as <field>.<index>
				// We only want the field name, so we split on the dot and take the first element
				// This implies that we can't have a field name with a dot in it...
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
					// Unresolved nodes don't have aliases
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

	all_files.dataview?.forEach((page) => {
		const source_file = page.file;
		// When the Obsidian branch is also active, it already handled frontmatter
		// links via frontmatterLinks. Only process inline-only fields here to avoid
		// duplicate edges.
		const frontmatter_keys = all_files.obsidian
			? new Set(Object.keys(page.file.frontmatter ?? {}))
			: null;

		// NOTE: Instead of iterating all keys, I could use the edge_fields...
		// But I'm assuming there are probably more edge fields than page fields
		// So this is probably more efficient
		Object.keys(page).forEach((field) => {
			// NOTE: Implies that an edge-field can't be in this list,
			//   But Dataview probably enforces that anyway
			if (
				!field_labels.has(field) ||
				["file", "aliases"].includes(field) ||
				frontmatter_keys?.has(field)
			) {
				return;
			}

			// page[field]: Link | Link[] | Link[][]
			ensure_is_array(page[field])
				.flat()
				.forEach((target_link) => {
					let unsafe_target_path: string | undefined;

					// Quickly return for null or ''
					if (!target_link) return;
					else if (typeof target_link === "string") {
						// Try parse as a markdown link [](), grabbing the path out of the 2nd match
						unsafe_target_path =
							MARKDOWN_LINK_REGEX.exec(target_link)?.[2];
					} else if (
						typeof target_link === "object" &&
						target_link?.path
					) {
						unsafe_target_path = target_link.path;
					} else if (
						// @ts-expect-error: instanceof didn't work here?
						target_link?.isLuxonDateTime
					) {
						// eslint-disable @typescript-eslint/no-base-to-string
						results.errors.push({
							path: source_file.path,
							code: "invalid_field_value",
							message: `Invalid value for field '${field}': '${target_link}'. Dataview DateTime values are not supported, since they don't preserve the original date string.`,
						});
					} else {
						// It's a BC field, with a definitely invalid value, cause it's not a link
						results.errors.push({
							path: source_file.path,
							code: "invalid_field_value",
							message: `Invalid value for field '${field}': '${target_link}'. Expected wikilink or markdown link.`,
						});
					}

					if (!unsafe_target_path) return;

					const resolved = resolve_relative_target_path(
						plugin.app,
						unsafe_target_path,
						source_file.path,
					);
					if (!resolved) return;
					const [target_path, target_file] = resolved;

					if (!target_file) {
						// It's an unresolved link, so we add a node for it
						// But still do it safely, as a previous file may point to the same unresolved node
						results.nodes.push(
							new GCNodeData(
								target_path,
								[],
								false,
								false,
								false,
							),
						);
					}

					// If the file exists, we should have already added a node for it in the simple loop over all markdown files
					results.edges.push(
						new GCEdgeData(
							source_file.path,
							target_path,
							field,
							"typed_link",
						),
					);
				});
		});
	});

	return results;
};
