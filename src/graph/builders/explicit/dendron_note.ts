import { normalizePath } from "obsidian";
import { META_ALIAS } from "src/const/metadata_fields";
// import type { BCGraph } from "src/graph/MyMultiGraph";
import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { implied_pair_close_field } from "src/utils/implied_pair_close_field";
import { Paths } from "src/utils/paths";
import { fail, graph_build_fail, succ } from "src/utils/result";
import { GCEdgeData, GCNodeData } from "wasm/pkg/breadcrumbs_graph_wasm";

function dendron_edge_key(source: string, target: string, field: string): string {
	return `${source}\0${target}\0${field}\0dendron_note`;
}

interface DendronPathMeta {
	path: string;
	metadata: Record<string, unknown> | undefined;
}

function get_dendron_note_info(
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) {
	// NOTE: Don't return early here. Dendron notes can be valid without any metadata in them
	//   We just have to iterate and check each note
	// if (!metadata) return fail(undefined);
	const field =
		metadata?.[META_ALIAS["dendron-note-field"]] ??
		//   Which is why we have a default_field on dendron_note
		plugin.settings.explicit_edge_sources.dendron_note.default_field;

	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		// eslint-disable @typescript-eslint/no-base-to-string
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `dendron-note-field is not a string: '${field}'`,
		});
	} else if (!plugin.settings.edge_fields.find((f) => f.label === field)) {
		return graph_build_fail({
			path,
			code: "invalid_edge_field",
			message: `dendron-note-field is not a valid field: '${field}'`,
		});
	}

	return succ({ field });
}

/** Take in the info of a _potential_ dendron note.
 * Check that it has the delimeter in it's basename
 * Get the field info from the note or default settings
 * Add the directed edge to the target
 */
function push_dendron_edge(
	results: EdgeBuilderResults,
	edge_sig: Set<string>,
	source: string,
	target: string,
	field: string,
) {
	const k = dendron_edge_key(source, target, field);
	if (edge_sig.has(k)) return;
	edge_sig.add(k);
	results.edges.push(new GCEdgeData(source, target, field, "dendron_note"));
}

function handle_dendron_note(
	plugin: BreadcrumbsPlugin,
	results: EdgeBuilderResults,
	source_id: string,
	source_metadata: Record<string, unknown> | undefined,
	edge_sig: Set<string>,
) {
	const { delimiter } = plugin.settings.explicit_edge_sources.dendron_note;

	// NOTE: There are easier ways to do alot of the below.
	//   But the `file` type between obsidian and dataview doesn't have the common fields needed.
	//   So we rebuild from `path`
	const source_basename_splits = Paths.basename(source_id).split(delimiter);
	if (source_basename_splits.length === 1) return;
	// Skip Johnny.Decimal-style names (first segment is all digits, e.g. "12.01 Title").
	// Those use the same delimiter but are handled by the johnny_decimal_note builder;
	// processing them here would create ghost parent nodes (e.g. "12.md").
	if (/^\d+$/.test(source_basename_splits[0])) return;

	const dendron_note_info = get_dendron_note_info(
		plugin,
		source_metadata,
		source_id,
	);
	if (!dendron_note_info.ok) {
		if (dendron_note_info.error) {
			results.errors.push(dendron_note_info.error);
		}
		return;
	}

	const target_id = Paths.build(
		Paths.dirname(source_id),
		// Go one note up
		source_basename_splits.slice(0, -1).join(delimiter),
		"md",
	);
	const { field } = dendron_note_info.data;

	// target_path is now a full path, so we can check for it directly, instead of getFirstLinkpathDest
	const target_file = plugin.app.vault.getFileByPath(normalizePath(target_id));

	if (!target_file) {
		results.nodes.push(new GCNodeData(target_id, [], false, false, false));

		// If !target_file, we can recursively call handle_dendron_note
		//   To add the unresolved edges along the way
		handle_dendron_note(
			plugin,
			results,
			target_id,
			// This is really quite elegant :)
			//   The unresolved note has no BC-dendron field, by definition
			//   Passing undefined would just use the settings.default field
			//   But we can propagate the field from the resolved source note
			{ [META_ALIAS["dendron-note-field"]]: field },
			edge_sig,
		);
	}

	push_dendron_edge(results, edge_sig, source_id, target_id, field);

	const return_field = implied_pair_close_field(plugin.settings, field);
	if (return_field) {
		push_dendron_edge(results, edge_sig, target_id, source_id, return_field);
	}
}

/**
 * Hub notes like `git.md` never run the multi-segment branch, so they get no
 * outgoing `down` from child passes alone if children fail earlier. Scan each
 * folder for `stem` + delimiter + … basenames and add parent → child `down`
 * (same idea as JD: parent path is known from children).
 */
function add_dendron_hub_parent_down_edges(
	plugin: BreadcrumbsPlugin,
	results: EdgeBuilderResults,
	edge_sig: Set<string>,
	paths: DendronPathMeta[],
) {
	const { delimiter } = plugin.settings.explicit_edge_sources.dendron_note;
	const by_dir = new Map<string, DendronPathMeta[]>();
	for (const row of paths) {
		const dir = Paths.dirname(row.path);
		const list = by_dir.get(dir) ?? [];
		list.push(row);
		by_dir.set(dir, list);
	}

	for (const entries of by_dir.values()) {
		for (const parent of entries) {
			const stem_parts = Paths.basename(parent.path).split(delimiter);
			if (stem_parts.length !== 1) continue;

			const stem = stem_parts[0];
			const info = get_dendron_note_info(
				plugin,
				parent.metadata,
				parent.path,
			);
			if (!info.ok) continue;

			const return_field = implied_pair_close_field(
				plugin.settings,
				info.data.field,
			);
			if (!return_field) continue;

			for (const child of entries) {
				if (child.path === parent.path) continue;
				const child_parts = Paths.basename(child.path).split(delimiter);
				if (child_parts.length < 2) continue;
				const child_parent_stem = child_parts.slice(0, -1).join(delimiter);
				if (child_parent_stem !== stem) continue;

				push_dendron_edge(
					results,
					edge_sig,
					parent.path,
					child.path,
					return_field,
				);
			}
		}
	}
}

function add_dendron_sibling_edges(
	plugin: BreadcrumbsPlugin,
	results: EdgeBuilderResults,
	edge_sig: Set<string>,
	paths: DendronPathMeta[],
) {
	const sibling_field =
		plugin.settings.explicit_edge_sources.dendron_note.default_sibling_field;
	if (!sibling_field) return;

	const { delimiter } = plugin.settings.explicit_edge_sources.dendron_note;

	// Group notes by (dir, parent_stem) — notes sharing the same parent are siblings
	const by_parent = new Map<string, string[]>();
	for (const { path } of paths) {
		const stem_parts = Paths.basename(path).split(delimiter);
		if (stem_parts.length < 2) continue;
		const parent_key =
			Paths.dirname(path) +
			"\0" +
			stem_parts.slice(0, -1).join(delimiter);
		const list = by_parent.get(parent_key) ?? [];
		list.push(path);
		by_parent.set(parent_key, list);
	}

	for (const siblings of by_parent.values()) {
		if (siblings.length < 2) continue;
		for (let i = 0; i < siblings.length; i++) {
			for (let j = i + 1; j < siblings.length; j++) {
				const k = dendron_edge_key(siblings[i], siblings[j], sibling_field);
				if (edge_sig.has(k)) continue;
				edge_sig.add(k);
				results.edges.push(
					new GCEdgeData(
						siblings[i],
						siblings[j],
						sibling_field,
						"dendron_note",
					),
				);
			}
		}
	}
}

export const _add_explicit_edges_dendron_note: ExplicitEdgeBuilder = (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };

	if (!plugin.settings.explicit_edge_sources.dendron_note.enabled) {
		return results;
	}

	const edge_sig = new Set<string>();
	const paths: DendronPathMeta[] = [];

	all_files.obsidian?.forEach(({ file, cache }) => {
		paths.push({
			path: file.path,
			metadata: cache?.frontmatter,
		});
		handle_dendron_note(
			plugin,
			results,
			file.path,
			cache?.frontmatter,
			edge_sig,
		);
	});

	all_files.dataview?.forEach((page) => {
		paths.push({
			path: page.file.path,
			metadata: page,
		});
		handle_dendron_note(
			plugin,
			results,
			page.file.path,
			page,
			edge_sig,
		);
	});

	add_dendron_hub_parent_down_edges(plugin, results, edge_sig, paths);
	add_dendron_sibling_edges(plugin, results, edge_sig, paths);

	return results;
};
