import type {
	FlatTraversalResult} from "wasm/pkg/breadcrumbs_graph_wasm";
import type {NoteGraph} from "wasm/pkg/breadcrumbs_graph_wasm";
import {
	create_edge_sorter,
	
	TraversalOptions,
	TraversalPostprocessOptions
} from "wasm/pkg/breadcrumbs_graph_wasm";

/**
 * A sort spec the facade turns into an `EdgeSorter` — structural so it accepts
 * both `EdgeSortId` (settings) and the codeblock schema's looser `field: string`.
 * `order === -1` sorts descending; anything else ascending.
 */
export interface TraversalSort {
	field: string;
	order: number;
}

/**
 * Named form of the positional `TraversalOptions` constructor — hides the
 * arg order and the magic `max_traversal_count` default.
 *
 * NOTE: `separateEdges` is the engine's `separate_edges` flag (when `true`,
 * each first-hop edge's subtree is restricted to that edge type). Most call
 * sites derive it from the `merge_fields` setting as `!merge_fields` — but
 * not all do; pass through each site's current value, don't "normalise" it.
 */
export interface TraverseOptions {
	entry: string[];
	/** Edge field labels to follow; omit to traverse all edge types. */
	fields?: string[];
	depth: number;
	separateEdges: boolean;
	/** Max nodes to visit. Defaults to 100 (the constant most call sites use). */
	maxCount?: number;
	/** `dataview-from` path allow-list, when scoping to a query result. */
	dataviewFrom?: string[];
}

/** Build a `TraversalOptions` from the named shape. Caller passes it on to the engine. */
export function build_traversal_options(opts: TraverseOptions): TraversalOptions {
	return new TraversalOptions(
		opts.entry,
		opts.fields,
		opts.depth,
		opts.maxCount ?? 100,
		opts.separateEdges,
		opts.dataviewFrom,
	);
}

function build_postprocess(
	sort: TraversalSort | undefined,
	flatten: boolean,
): TraversalPostprocessOptions {
	return sort
		? new TraversalPostprocessOptions(
				create_edge_sorter(sort.field, sort.order === -1),
				flatten,
			)
		: TraversalPostprocessOptions.without_sorter(flatten);
}

/**
 * Run a `rec_traverse_and_process` traversal and return the (live) result.
 * The caller owns `.free()` — use {@link with_traversal} for one-shot consumers.
 */
export function traverse(
	graph: NoteGraph,
	opts: TraverseOptions & { sort?: TraversalSort; flatten?: boolean },
): FlatTraversalResult {
	return graph.rec_traverse_and_process(
		build_traversal_options(opts),
		build_postprocess(opts.sort, opts.flatten ?? false),
	);
}

/**
 * Run a traversal, hand the live result to `fn`, then free it — for one-shot
 * consumers (commands) that don't hold the result across renders. The result
 * must not escape `fn`; it is freed before this returns.
 */
export function with_traversal<T>(
	graph: NoteGraph,
	opts: TraverseOptions & { sort?: TraversalSort; flatten?: boolean },
	fn: (result: FlatTraversalResult) => T,
): T {
	const result = traverse(graph, opts);
	try {
		return fn(result);
	} finally {
		result.free();
	}
}

/** Re-sort an existing traversal result in place by a sort spec. */
export function sort_traversal(
	graph: NoteGraph,
	result: FlatTraversalResult,
	sort: TraversalSort,
): void {
	result.sort(graph, create_edge_sorter(sort.field, sort.order === -1));
}
