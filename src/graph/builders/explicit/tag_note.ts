import { META_ALIAS } from "src/const/metadata_fields";
import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { fail, graph_build_fail, succ } from "src/utils/result";
import { ensure_starts_with } from "src/utils/strings";
import { GCEdgeData } from "wasm/pkg/breadcrumbs_graph_wasm";
import { validate_edge_field } from "./validate_field";

const parse_frontmatter_tags = (
	frontmatter: Record<string, unknown> | undefined,
): string[] => {
	const raw = frontmatter?.tags;
	if (typeof raw === "string") return [raw];
	if (Array.isArray(raw)) {
		return raw.filter((tag): tag is string => typeof tag === "string");
	}
	return [];
};

const get_tag_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) => {
	if (!metadata) return fail(undefined);

	let raw_tag = metadata[META_ALIAS["tag-note-tag"]];
	if (!raw_tag) {
		raw_tag = metadata["BC-tag-note"];

		if (raw_tag) {
			log.warn(
				`'BC-tag-note' is deprecated in favor of ${META_ALIAS["tag-note-tag"]}`,
			);
		}
	}

	if (!raw_tag) {
		return fail(undefined);
	} else if (typeof raw_tag !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `tag-note-tag is not a string: '${raw_tag}'`,
		});
	}
	const tag = ensure_starts_with(raw_tag, "#");

	const field_res = validate_edge_field(
		plugin,
		metadata[META_ALIAS["tag-note-field"]] ??
			plugin.settings.explicit_edge_sources.tag_note.default_field,
		path,
		"tag-note-field",
	);
	if (!field_res.ok) return field_res;
	const field = field_res.data;

	const exact = Boolean(metadata[META_ALIAS["tag-note-exact"]]);

	const raw_sibling_field =
		metadata[META_ALIAS["tag-note-sibling-field"]] ??
		plugin.settings.explicit_edge_sources.tag_note.default_sibling_field;

	let sibling_field: string | undefined;
	if (raw_sibling_field) {
		const sibling_res = validate_edge_field(
			plugin,
			raw_sibling_field,
			path,
			"tag-note-sibling-field",
		);
		if (!sibling_res.ok) return sibling_res;
		sibling_field = sibling_res.data;
	}

	return succ({ tag, field, exact, sibling_field });
};

/**
 * **tag_note** — tag-hub edge builder.
 *
 * A note annotated with `BC-tag-note-tag: #some-tag` becomes a "tag hub".
 * Every other vault note that carries `#some-tag` in its frontmatter gets an
 * edge pointing to the hub using the field from `BC-tag-note-field` (or the
 * builder's `default_field` setting). Useful for collecting all notes about a
 * topic under a single hub note.
 */
export const _add_explicit_edges_tag_note: ExplicitEdgeBuilder = (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };

	// More efficient than quadratic looping over all_files,
	// We gather the tag_notes, and the tags the each note has in one go
	const tag_notes: {
		tag: string;
		field: string;
		exact: boolean;
		source_path: string;
		sibling_field: string | undefined;
	}[] = [];

	// From tag, to paths with that tag
	const tag_paths_map = new Map<string, string[]>();

	all_files.obsidian?.forEach(
		({ file: tag_note_file, cache: tag_note_cache }) => {
			if (!tag_note_cache) return;

			const process_tag = (tag: string) => {
				// Ensure consistent tag formatting, since some have the # and some don't
				const formatted_tag = ensure_starts_with(tag, "#");
				// Quite happy with this trick :)
				// Try get the existing_paths, and mutate it if it exists
				// Push returns the new length (guarenteed to be atleast 1 - truthy)
				// So it will only be false if the key doesn't exist
				if (
					!tag_paths_map.get(formatted_tag)?.push(tag_note_file.path)
				) {
					tag_paths_map.set(formatted_tag, [tag_note_file.path]);
				}
			};

			// Check if the tag_note itself has any tags for other tags notes
			// We must iterate over both the frontmatter and body tags independently
			parse_frontmatter_tags(tag_note_cache?.frontmatter).forEach(
				process_tag,
			);
			tag_note_cache?.tags?.map((item) => item.tag)?.forEach(process_tag);

			const tag_note_info = get_tag_note_info(
				plugin,
				tag_note_cache?.frontmatter,
				tag_note_file.path,
			);
			if (!tag_note_info.ok) {
				if (tag_note_info.error)
					results.errors.push(tag_note_info.error);
				return;
			}

			const { tag, field, exact, sibling_field } = tag_note_info.data;

			tag_notes.push({
				tag,
				exact,
				field,
				source_path: tag_note_file.path,
				sibling_field,
			});
		},
	);

	all_files.dataview?.forEach((page) => {
		const tag_note_file = page.file;

		// NOTE: We make sure to use etags, not tags (which are unwound)
		tag_note_file.etags.values.forEach((tag) => {
			if (!tag_paths_map.get(tag)?.push(tag_note_file.path)) {
				tag_paths_map.set(tag, [tag_note_file.path]);
			}
		});

		const tag_note_info = get_tag_note_info(
			plugin,
			page,
			tag_note_file.path,
		);
		if (!tag_note_info.ok) {
			if (tag_note_info.error) results.errors.push(tag_note_info.error);
			return;
		}
		const { tag, field, exact, sibling_field } = tag_note_info.data;

		tag_notes.push({
			tag,
			exact,
			field,
			source_path: tag_note_file.path,
			sibling_field,
		});
	});

	const all_tags = [...tag_paths_map.keys()];

	tag_notes.forEach((tag_note) => {
		// Here we implement optional "sub-tag" support
		// If the tag-note-tag is #foo, and a target note has the tag #foo/bar, then we add an edge
		const target_paths = tag_note.exact
			? tag_paths_map.get(tag_note.tag)
			: all_tags
					.filter((tag) => tag.startsWith(tag_note.tag))
					// We know that the tag_note.tag is in the tag_paths_map, so this is safe
					.flatMap((tag) => tag_paths_map.get(tag)!);

		// Adding these edges is comparatively simple.
		//   We know the target_path is resolved, since it only gets added to the map
		//   if it's a resolved note with a tag in it
		target_paths?.forEach((target_path) => {
			results.edges.push(
				new GCEdgeData(
					tag_note.source_path,
					target_path,
					tag_note.field,
					"tag_note",
				),
			);
		});

		if (tag_note.sibling_field && target_paths && target_paths.length > 1) {
			for (let i = 0; i < target_paths.length; i++) {
				for (let j = i + 1; j < target_paths.length; j++) {
					results.edges.push(
						new GCEdgeData(
							target_paths[i],
							target_paths[j],
							tag_note.sibling_field,
							"tag_note",
						),
					);
				}
			}
		}
	});

	return results;
};
