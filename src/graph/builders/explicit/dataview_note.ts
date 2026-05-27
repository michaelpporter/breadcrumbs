import { META_ALIAS } from "src/const/metadata_fields";
import { dataview_plugin } from "src/external/dataview/index";
import type { IDataview } from "src/external/dataview/interfaces";
import { dataview_pages_to_plain_array } from "src/external/dataview/pages_to_array";
import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { fail, graph_build_fail, succ } from "src/utils/result";
import { GCEdgeData } from "wasm/pkg/breadcrumbs_graph_wasm";

function get_dataview_note_info(
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
) {
	if (!metadata) {
		return fail(undefined);
	}

	const query = metadata[META_ALIAS["dataview-note-query"]];
	if (!query) {
		return fail(undefined);
	} else if (typeof query !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: "dataview-note-query is not a string",
		});
	}
	// NOTE: We check that the query is actually valid later
	const field = metadata[META_ALIAS["dataview-note-field"]];
	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: "dataview-note-field is not a string",
		});
	} else if (!plugin.settings.edge_fields.find((f) => f.label === field)) {
		return graph_build_fail({
			path,
			code: "invalid_edge_field",
			message: `dataview-note-field is not a valid field: '${field}'`,
		});
	}

	return succ({
		field,
		query,
	});
}

/**
 * **dataview_note** — Dataview query result edge builder.
 *
 * A note annotated with `BC-dataview-note-query: <DQL query>` becomes a parent.
 * The query is executed via the Dataview API; each result page gets an edge
 * pointing to this note using `BC-dataview-note-field` (or `default_field`).
 *
 * Requires the Dataview plugin to be installed and enabled. Returns a
 * `missing_other_plugin` error if Dataview is absent.
 */
export const _add_explicit_edges_dataview_note: ExplicitEdgeBuilder = (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };
	const dataview_api = dataview_plugin.get_api(plugin.app);

	all_files.obsidian?.forEach(
		({ file: dataview_note_file, cache: dataview_note_cache }) => {
			if (!dataview_note_cache) return;

			const dataview_note_info = get_dataview_note_info(
				plugin,
				dataview_note_cache?.frontmatter,
				dataview_note_file.path,
			);
			if (!dataview_note_info.ok) {
				if (dataview_note_info.error) {
					results.errors.push(dataview_note_info.error);
				}
				return;
			}

			if (!dataview_api) {
				results.errors.push({
					code: "missing_other_plugin",
					path: dataview_note_file.path,
					message:
						"dataview-notes are not implemented without Dataview enabled",
				});

				return;
			}

			const { field, query } = dataview_note_info.data;
		// eslint-disable-next-line no-useless-assignment
		let pages: IDataview.Page[] = [];
		try {
			pages = dataview_pages_to_plain_array(
				dataview_api.pages(query, dataview_note_file.path),
			) as IDataview.Page[];
		} catch (error) {
			log.warn(
				"dataview-note > DV API error:",
				error instanceof Error ? error.message : error,
			);

			return results.errors.push({
				code: "invalid_field_value",
					path: dataview_note_file.path,
				message: `dataview-note-query is not a valid dataview query: '${query}'`,
			});
		}

		pages.forEach((page) => {
			// NOTE: I _believe_ we don't need to even safe_add_node, since dv will only return resolved notes
			results.edges.push(
				new GCEdgeData(
						dataview_note_file.path,
					page.file.path,
					field,
					"dataview_note",
				),
			);
		});
		},
	);

	return results;
};
