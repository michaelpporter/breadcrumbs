export const EXPLICIT_EDGE_SOURCES = [
	"typed_link",
	"tag_note",
	"list_note",
	"dendron_note",
	"johnny_decimal_note",
	"dataview_note",
	"date_note",
	"folder_note",
	"regex_note",
	"traverse_note",
	// TODO: "zetel_note", // Can date_notes do this already?
] as const;

export type ExplicitEdgeSource = (typeof EXPLICIT_EDGE_SOURCES)[number];

export const SIMPLE_EDGE_SORT_FIELDS = [
	// The order they were added to the graph
	// Hidden because I don't think anyone really cares about that order
	// "graph",
	"basename",
	"basename_natural",
	"path",
	"path_natural",
	"field",
	// Whether the edge is explicit or not
	// Uses source and implied_kind as tie-breakers for explicit == true and false, respectively
	"explicit",
] as const;
type SimpleEdgeSortField = (typeof SIMPLE_EDGE_SORT_FIELDS)[number];

export const COMPLEX_EDGE_SORT_FIELD_PREFIXES = ["neighbour-field"] as const;
export type ComplexEdgeSortFieldPrefix =
	(typeof COMPLEX_EDGE_SORT_FIELD_PREFIXES)[number];

export interface EdgeSortId {
	field: SimpleEdgeSortField | `${ComplexEdgeSortFieldPrefix}:${string}`;
	order: 1 | -1;
}
