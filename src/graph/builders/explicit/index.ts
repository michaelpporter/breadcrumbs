import type { ExplicitEdgeSource } from "src/const/graph";
import type { ExplicitEdgeBuilder } from "src/interfaces/graph";
import { _add_explicit_edges_dataview_note } from "./dataview_note";
import { _add_explicit_edges_date_note } from "./date_note";
import { _add_explicit_edges_dendron_note } from "./dendron_note";
import { _add_explicit_edges_folder_note } from "./folder_note";
import { _add_explicit_edges_johnny_decimal_note } from "./johnny_decimal_note";
import { _add_explicit_edges_list_note } from "./list_note";
import { _add_explicit_edges_regex_note } from "./regex_note";
import { _add_explicit_edges_tag_note } from "./tag_note";
import { _add_explicit_edges_typed_link } from "./typed_link";

/**
 * Registry of all explicit edge builders, keyed by source name.
 *
 * `rebuild_graph` iterates `EXPLICIT_EDGE_SOURCES` and calls each builder in
 * parallel via `Promise.all`. To add a new builder, export its function from
 * its own file, add the key to `EXPLICIT_EDGE_SOURCES` in `src/const/graph.ts`,
 * and register it here.
 */
export const add_explicit_edges: Record<
	ExplicitEdgeSource,
	ExplicitEdgeBuilder
> = {
	tag_note: _add_explicit_edges_tag_note,
	list_note: _add_explicit_edges_list_note,
	date_note: _add_explicit_edges_date_note,
	typed_link: _add_explicit_edges_typed_link,
	regex_note: _add_explicit_edges_regex_note,
	folder_note: _add_explicit_edges_folder_note,
	dendron_note: _add_explicit_edges_dendron_note,
	dataview_note: _add_explicit_edges_dataview_note,
	johnny_decimal_note: _add_explicit_edges_johnny_decimal_note,
};
