import { normalizePath } from "obsidian";
import { META_ALIAS } from "src/const/metadata_fields";
import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { implied_pair_close_field } from "src/utils/implied_pair_close_field";
import { Paths } from "src/utils/paths";
import { succ } from "src/utils/result";
import { ensure_not_ends_with } from "src/utils/strings";
import { GCEdgeData, GCNodeData } from "wasm/pkg/breadcrumbs_graph_wasm";
import { validate_edge_field } from "./validate_field";

const get_johnny_decimal_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) => {
	// NOTE: Don't return early here. Johnny.Decimal notes can be valid without any metadata in them
	//   We just have to iterate and check each note
	// if (!metadata) return fail(undefined);

	const field_res = validate_edge_field(
		plugin,
		metadata?.[META_ALIAS["johnny-decimal-note-field"]] ??
			//   Which is why we have a default_field on johnny_decimal_note
			plugin.settings.explicit_edge_sources.johnny_decimal_note
				.default_field,
		path,
		"johnny-decimal-note-field",
	);
	if (!field_res.ok) return field_res;

	return succ({ field: field_res.data });
};

/** Take in the info of a johnny_decimal note.
 * Get the field info from the note or default settings
 * Add the directed edge to the target
 */
const handle_johnny_decimal_note = (
	plugin: BreadcrumbsPlugin,
	results: EdgeBuilderResults,
	source_note: JohnnyDecimalNote,
	notes: JohnnyDecimalNote[],
) => {
	const johnny_decimal_note_info = get_johnny_decimal_note_info(
		plugin,
		source_note.metadata,
		source_note.path,
	);
	if (!johnny_decimal_note_info.ok) {
		if (johnny_decimal_note_info.error) {
			results.errors.push(johnny_decimal_note_info.error);
		}
		return;
	}

	const { delimiter } =
		plugin.settings.explicit_edge_sources.johnny_decimal_note;

	// Go one note up
	let target_decimals: string;
	if (source_note.decimals.includes(delimiter)) {
		// Item/sub-item → parent via delimiter split (e.g. "11.01" → "11")
		target_decimals = source_note.decimals
			.split(delimiter)
			.slice(0, -1)
			.join(delimiter);
	} else {
		// Category → parent area via numeric floor (e.g. "11" → "10", "21" → "20")
		const num = parseInt(source_note.decimals, 10);
		if (isNaN(num)) return;
		const parent_num = Math.floor(num / 10) * 10;
		if (parent_num === num) return; // already an area (10, 20, …) — no parent
		target_decimals = String(parent_num).padStart(
			source_note.decimals.length,
			"0",
		);
	}
	if (target_decimals === "") return;

	const target_note = notes.find((n) => n.decimals === target_decimals);
	// I thought a while about building the unresolved path in this case.
	// But I don't know what the _rest_ of the basename would be. It's not just the decimals
	if (!target_note) return;

	// target_path is now a full path, so we can check for it directly, instead of getFirstLinkpathDest
	const target_file = plugin.app.vault.getFileByPath(
		normalizePath(target_note.path),
	);

	// NOTE: I don't think this can ever happen... if target_note, then target_file must exist
	if (!target_file) {
		results.nodes.push(
			new GCNodeData(target_note.path, [], false, false, false),
		);
	}

	const { field } = johnny_decimal_note_info.data;

	results.edges.push(
		new GCEdgeData(
			source_note.path,
			target_note.path,
			field,
			"johnny_decimal_note",
		),
	);

	const return_field = implied_pair_close_field(plugin.settings, field);
	if (return_field) {
		results.edges.push(
			new GCEdgeData(
				target_note.path,
				source_note.path,
				return_field,
				"johnny_decimal_note",
			),
		);
	}
};

interface JohnnyDecimalNote {
	path: string;
	basename: string;
	decimals: string;
	metadata?: Record<string, unknown>;
}

/**
 * **johnny_decimal_note** — numeric prefix hierarchy builder.
 *
 * Treats numeric-prefixed basenames as a Johnny.Decimal hierarchy:
 * `01.02 Title` is a child of the `01` area note. An `up` edge is added from
 * child → parent; if an implied transitive rule defines a close_field
 * (typically `down`), a reverse `down` edge is also added.
 *
 * Per-note override via `BC-johnny-decimal-note-field`; falls back to
 * `settings.explicit_edge_sources.johnny_decimal_note.default_field`.
 */
export const _add_explicit_edges_johnny_decimal_note: ExplicitEdgeBuilder = (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };

	if (!plugin.settings.explicit_edge_sources.johnny_decimal_note.enabled) {
		return results;
	}

	const { delimiter } =
		plugin.settings.explicit_edge_sources.johnny_decimal_note;

	// This regex is actually less strict than the real Johnny.Decimal system
	// Match a delimiter-separated list of chars and nums, followed by a space or the delimiter at the end
	const regex = new RegExp(`^([\\w\\d\\${delimiter}]+)(\\s|\\${delimiter}$)`);

	const johnny_decimal_notes: JohnnyDecimalNote[] = [];

	all_files.obsidian?.forEach(({ file, cache }) => {
		const basename = Paths.basename(file.path);

		const decimals = basename.match(regex)?.[1];
		if (!decimals) return;

		johnny_decimal_notes.push({
			basename,
			path: file.path,
			metadata: cache?.frontmatter,
			decimals: ensure_not_ends_with(decimals, delimiter),
		});
	});

	all_files.dataview?.forEach((page) => {
		const basename = Paths.basename(page.file.path);

		const decimals = basename.match(regex)?.[1];
		if (!decimals) return;

		johnny_decimal_notes.push({
			basename,
			metadata: page,
			path: page.file.path,
			decimals: ensure_not_ends_with(decimals, delimiter),
		});
	});

	johnny_decimal_notes.forEach((note) => {
		handle_johnny_decimal_note(plugin, results, note, johnny_decimal_notes);
	});

	const sibling_field =
		plugin.settings.explicit_edge_sources.johnny_decimal_note
			.default_sibling_field;
	if (sibling_field && johnny_decimal_notes.length > 1) {
		// Group notes by parent decimal prefix — notes sharing the same parent are siblings
		const by_parent = new Map<string, JohnnyDecimalNote[]>();
		for (const note of johnny_decimal_notes) {
			const parent_decimals = note.decimals
				.split(delimiter)
				.slice(0, -1)
				.join(delimiter);
			if (!parent_decimals) continue;
			const list = by_parent.get(parent_decimals) ?? [];
			list.push(note);
			by_parent.set(parent_decimals, list);
		}

		for (const siblings of by_parent.values()) {
			if (siblings.length < 2) continue;
			for (let i = 0; i < siblings.length; i++) {
				for (let j = i + 1; j < siblings.length; j++) {
					results.edges.push(
						new GCEdgeData(
							siblings[i].path,
							siblings[j].path,
							sibling_field,
							"johnny_decimal_note",
						),
					);
				}
			}
		}
	}

	return results;
};
