import { META_ALIAS } from "src/const/metadata_fields";
import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { fail, graph_build_fail, succ } from "src/utils/result";
import { GCEdgeData } from "wasm/pkg/breadcrumbs_graph_wasm";

function get_regex_note_info(
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) {
	if (!metadata) return fail(undefined);

	// NOTE: Check for a regex first, then the field, since there may be a default and we would do more work than necessary before failing if there is no regex
	const regex_str = metadata[META_ALIAS["regex-note-regex"]];
	if (!regex_str) {
		return fail(undefined);
	} else if (typeof regex_str !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `${META_ALIAS["regex-note-regex"]} is not a string: '${regex_str}'`,
		});
	}

	const flags = metadata[META_ALIAS["regex-note-flags"]];
	if (flags && typeof flags !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `${META_ALIAS["regex-note-flags"]} is not a string: '${flags}'`,
		});
	}

	let regex: RegExp;
	try {
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		regex = new RegExp(regex_str, (flags || "") as string);
		log.debug(`get_regex_note_info > regex:`, regex);
	} catch (_) {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `${META_ALIAS["regex-note-regex"]} is not a valid regex: '${regex_str}'`,
		});
	}

	const field =
		metadata[META_ALIAS["regex-note-field"]] ??
		plugin.settings.explicit_edge_sources.regex_note.default_field;

	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `${META_ALIAS["regex-note-field"]} is not a string: '${field}'`,
		});
	} else if (!plugin.settings.edge_fields.find((f) => f.label === field)) {
		return graph_build_fail({
			path,
			code: "invalid_edge_field",
			message: `${META_ALIAS["regex-note-field"]} is not a valid field: '${field}'`,
		});
	}

	return succ({
		field,
		regex,
	});
}

/**
 * **regex_note** — basename regex match edge builder.
 *
 * A note annotated with `BC-regex-note-regex: <pattern>` becomes a parent hub.
 * Every vault note whose basename matches the regex gets a `<field>` edge
 * pointing to the regex note. The field comes from `BC-regex-note-field` or
 * `default_field`. Optional `BC-regex-note-flags` sets regex flags (e.g. `i`).
 *
 * The regex is compiled once per note at build time; invalid patterns produce
 * an `invalid_field_value` error without aborting the rest of the build.
 */
export const _add_explicit_edges_regex_note: ExplicitEdgeBuilder = (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };

	const regex_note_files: {
		path: string;
		info: Extract<
			ReturnType<typeof get_regex_note_info>,
			{ ok: true }
		>["data"];
	}[] = [];

	// Basically just converting the two all_files into a common format of their basic fields...
	// Maybe generalise this?
	all_files.obsidian?.forEach(({ file, cache }) => {
		const info = get_regex_note_info(plugin, cache?.frontmatter, file.path);
		if (!info.ok) {
			if (info.error) results.errors.push(info.error);
			return;
		}

		regex_note_files.push({ info: info.data, path: file.path });
	});

	all_files.dataview?.forEach((page) => {
		const { file } = page;
		const info = get_regex_note_info(plugin, page, file.path);
		if (!info.ok) {
			if (info.error) results.errors.push(info.error);
			return;
		}

		regex_note_files.push({ info: info.data, path: file.path });
	});

	// Return early before bringing all nodes into memory
	if (!regex_note_files) return results;

	const nodes =
		all_files.obsidian?.map((note) => note.file.path) ??
		all_files.dataview?.map((note) => note.file.path) ??
		[]; // Won't happen, but makes TS happy

	regex_note_files.forEach((regex_note) => {
		nodes
			.filter((node) => regex_note.info.regex.test(node))
			.forEach((target_id) => {
				results.edges.push(
					new GCEdgeData(
						regex_note.path,
						target_id,
						regex_note.info.field,
						"regex_note",
					),
				);
			});
	});

	return results;
};
