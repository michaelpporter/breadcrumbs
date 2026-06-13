import type { CachedMetadata } from "obsidian";
import { META_ALIAS } from "src/const/metadata_fields";
import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { resolve_relative_target_path } from "src/utils/obsidian";
import { fail, graph_build_fail, succ } from "src/utils/result";
import { GCEdgeData, GCNodeData } from "wasm/pkg/breadcrumbs_graph_wasm";
import { validate_edge_field } from "./validate_field";

interface NativeListItem {
	position: { start: { line: number; col: number } };
	outlinks: Array<{ path: string }>;
	children: NativeListItem[];
	text: string;
}

/**
 * Resolve the [start, end) line interval of the section under the heading whose
 * text equals `section`. The section runs from the heading line to the next
 * heading of equal-or-higher level (or EOF). Returns `null` if no heading matches.
 */
function resolve_section_lines(
	cache: CachedMetadata,
	section: string,
): { start: number; end: number } | null {
	const headings = cache.headings ?? [];

	const matched_i = headings.findIndex((h) => h.heading === section);
	if (matched_i === -1) return null;

	const matched = headings[matched_i];

	let end = Infinity;
	for (let i = matched_i + 1; i < headings.length; i++) {
		if (headings[i].level <= matched.level) {
			end = headings[i].position.start.line;
			break;
		}
	}

	return { start: matched.position.start.line, end };
}

function build_native_list_items(
	cache: CachedMetadata,
	content: string,
	section?: string,
): NativeListItem[] {
	let list_item_caches = cache.listItems ?? [];
	const links = cache.links ?? [];
	const lines = content.split("\n");

	if (section) {
		const range = resolve_section_lines(cache, section);
		if (!range) return [];

		list_item_caches = list_item_caches.filter((li) => {
			const line = li.position.start.line;
			return line > range.start && line < range.end;
		});
	}

	const links_by_line = new Map<number, string[]>();
	for (const link of links) {
		const line = link.position.start.line;
		if (!links_by_line.has(line)) links_by_line.set(line, []);
		links_by_line.get(line)!.push(link.link);
	}

	const items_by_line = new Map<number, NativeListItem>();
	const flat: NativeListItem[] = [];

	for (const li of list_item_caches) {
		const line = li.position.start.line;
		const raw = lines[line] ?? "";
		// Strip leading whitespace, list marker (- * +), and optional task checkbox
		const text = raw.replace(/^\s*[-*+]\s*(?:\[.\]\s*)?/, "");

		const native: NativeListItem = {
			position: { start: { line, col: li.position.start.col } },
			outlinks: (links_by_line.get(line) ?? []).map((path) => ({ path })),
			children: [],
			text,
		};

		items_by_line.set(line, native);
		flat.push(native);
	}

	// Wire children: parent >= 0 means the item's parent is the list item at that line
	for (const li of list_item_caches) {
		if (li.parent >= 0) {
			const parent = items_by_line.get(li.parent);
			const child = items_by_line.get(li.position.start.line);
			if (parent && child) parent.children.push(child);
		}
	}

	return flat;
}

const get_list_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) => {
	if (!metadata) {
		return fail(undefined);
	}

	const field_res = validate_edge_field(
		plugin,
		metadata[META_ALIAS["list-note-field"]],
		path,
		"list-note-field",
	);
	if (!field_res.ok) return field_res;
	const field = field_res.data;

	const neighbour_field =
		metadata[META_ALIAS["list-note-neighbour-field"]] ??
		plugin.settings.explicit_edge_sources.list_note.default_neighbour_field;

	if (neighbour_field) {
		const neighbour_res = validate_edge_field(
			plugin,
			neighbour_field,
			path,
			"list-note-neighbour-field",
		);
		if (!neighbour_res.ok) return neighbour_res;
	}

	// list-note-exclude-index ignores out-edges, but _only for list-notes_
	const exclude_index = Boolean(
		metadata[META_ALIAS["list-note-exclude-index"]],
	);

	// list-note-section restricts the builder to list items under one heading
	const raw_section = metadata[META_ALIAS["list-note-section"]];
	const section = typeof raw_section === "string" ? raw_section : undefined;

	return succ({
		field,
		exclude_index,
		section,
		neighbour_field: (neighbour_field ?? undefined) as string | undefined,
	});
};

// Format: `field [[note]]` (no -+* prefix)
// NOTE: The char ranges in the capture group need to align with the allowed chars in a BC field
const FIELD_OVERRIDE_REGEX = /^\s*([-\w\s]+)\b/;

const resolve_field_override = (
	plugin: BreadcrumbsPlugin,
	list_item: NativeListItem,
	path: string,
) => {
	const field = FIELD_OVERRIDE_REGEX.exec(list_item.text)?.[1];

	if (!field) {
		return succ(undefined);
	} else if (!plugin.settings.edge_fields.find((f) => f.label === field)) {
		return graph_build_fail({
			path,
			code: "invalid_edge_field",
			message: `Field override is not a valid BC field: ${field}. Line: ${list_item.position.start.line}`,
		});
	} else {
		return succ({ field });
	}
};

const handle_neighbour_list_item = ({
	plugin,
	results,
	source_id,
	list_note_path,
	list_note_info,
	flat_items,
	source_list_item_i,
	exclude_paths,
}: {
	source_id: string;
	plugin: BreadcrumbsPlugin;
	source_list_item_i: number;
	results: EdgeBuilderResults;
	list_note_path: string;
	list_note_info: Extract<
		ReturnType<typeof get_list_note_info>,
		{ ok: true }
	>;
	flat_items: NativeListItem[];
	exclude_paths: Set<string>;
}) => {
	if (!list_note_info.data.neighbour_field) return;

	const source_list_item = flat_items[source_list_item_i];

	let neighbour_list_item: NativeListItem | undefined;
	for (let i = source_list_item_i + 1; i < flat_items.length; i++) {
		const item = flat_items[i];

		if (item.position.start.col < source_list_item.position.start.col) {
			break;
		} else if (
			item.position.start.col === source_list_item.position.start.col
		) {
			neighbour_list_item = item;
			break;
		}
	}
	if (!neighbour_list_item) return;

	const neighbour_link = neighbour_list_item.outlinks.at(0);
	if (!neighbour_link) return;

	const resolved_neighbour = resolve_relative_target_path(
		plugin.app,
		neighbour_link.path,
		list_note_path,
	);
	if (!resolved_neighbour) return;
	const [target_id, file] = resolved_neighbour;

	if (exclude_paths.has(target_id)) return;

	if (!file) {
		results.nodes.push(new GCNodeData(target_id, [], false, false, false));
	}

	results.edges.push(
		new GCEdgeData(
			source_id,
			target_id,
			list_note_info.data.neighbour_field,
			"list_note",
		),
	);
};

/**
 * **list_note** — list-as-children edge builder.
 *
 * A note annotated with `BC-list-note-field: <field>` is treated as a parent
 * node. Each top-level list item in that note that resolves to a vault note
 * (wikilink) gets a `<field>` edge from the list note to the item note (i.e.
 * the list note is the parent, list items are children). Uses Obsidian's
 * metadata cache for list structure and link resolution — no Dataview required.
 */
export const _add_explicit_edges_list_note: ExplicitEdgeBuilder = async (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };

	await Promise.all(
		(all_files.obsidian ?? []).map(
			async ({ file: list_note_file, cache: list_note_cache }) => {
				if (!list_note_cache) return;

				const list_note_info = get_list_note_info(
					plugin,
					list_note_cache.frontmatter,
					list_note_file.path,
				);
				if (!list_note_info.ok) {
					if (list_note_info.error) {
						results.errors.push(list_note_info.error);
					}
					return;
				}

				const content = await plugin.app.vault.cachedRead(list_note_file);
				const flat_items = build_native_list_items(
					list_note_cache,
					content,
					list_note_info.data.section,
				);

				// BC-list-note-exclude: targets that should not become children.
				// Read from frontmatterLinks so wikilinks resolve like typed_link.
				const exclude_paths = new Set<string>();
				list_note_cache.frontmatterLinks?.forEach((fl) => {
					if (
						fl.key.split(".")[0] !==
						META_ALIAS["list-note-exclude"]
					) {
						return;
					}

					const resolved = resolve_relative_target_path(
						plugin.app,
						fl.link,
						list_note_file.path,
					);
					if (resolved) exclude_paths.add(resolved[0]);
				});

				flat_items.forEach((source_list_item, source_list_item_i) => {
					const source_link = source_list_item.outlinks.at(0);
					if (!source_link) return;

					const resolved_source = resolve_relative_target_path(
						plugin.app,
						source_link.path,
						list_note_file.path,
					);
					if (!resolved_source) return;
					const [source_path, source_file] = resolved_source;

					if (!source_file) {
						results.nodes.push(
							new GCNodeData(source_path, [], false, false, false),
						);
					}

					if (
						!list_note_info.data.exclude_index &&
						source_list_item.position.start.col === 0
					) {
						const source_override_field = resolve_field_override(
							plugin,
							source_list_item,
							list_note_file.path,
						);

						if (!source_override_field.ok) {
							if (source_override_field.error) {
								results.errors.push(source_override_field.error);
							}
							return;
						}

						if (!exclude_paths.has(source_path)) {
							results.edges.push(
								new GCEdgeData(
									list_note_file.path,
									source_path,
									source_override_field.data?.field ??
										list_note_info.data.field,
									"list_note",
								),
							);
						}
					}

					if (list_note_info.data.neighbour_field) {
						handle_neighbour_list_item({
							plugin,
							results,
							flat_items,
							list_note_path: list_note_file.path,
							list_note_info,
							source_list_item_i,
							source_id: source_path,
							exclude_paths,
						});
					}

					source_list_item.children.forEach((target_list_item) => {
						const target_link = target_list_item.outlinks.at(0);
						if (!target_link) return;

						const target_override_field = resolve_field_override(
							plugin,
							target_list_item,
							list_note_file.path,
						);

						if (!target_override_field.ok) {
							if (target_override_field.error) {
								results.errors.push(target_override_field.error);
							}
							return;
						}

						const resolved_target = resolve_relative_target_path(
							plugin.app,
							target_link.path,
							list_note_file.path,
						);
						if (!resolved_target) return;
						const [target_path, target_file] = resolved_target;

						if (exclude_paths.has(target_path)) return;

						if (!target_file) {
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

						results.edges.push(
							new GCEdgeData(
								source_path,
								target_path,
								target_override_field.data?.field ??
									list_note_info.data.field,
								"list_note",
							),
						);
					});
				});
			},
		),
	);

	return results;
};
