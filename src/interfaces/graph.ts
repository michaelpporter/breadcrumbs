// import type { BCEdgeAttributes, BCNode } from "src/graph/MyMultiGraph";
import type { AllFiles } from "src/graph/builders/explicit/files";
import type BreadcrumbsPlugin from "src/main";
import type { GCEdgeData, GCNodeData } from "wasm/pkg/breadcrumbs_graph_wasm";
import type { MaybePromise } from ".";

/**
 * A non-fatal problem found while building the graph.
 * Errors are collected per builder and surfaced in the Breadcrumbs UI;
 * they do not abort the build — partial results are still used.
 *
 * `code` values:
 * - `deprecated_field`      — frontmatter key is an old BC field name.
 * - `invalid_edge_field`    — value names a BC edge-field that isn't registered.
 * - `invalid_field_value`   — a metadata field holds a malformed/wrong-typed value.
 * - `invalid_setting_value` — a plugin setting has an illegal value.
 * - `invalid_yaml`          — YAML frontmatter could not be parsed.
 * - `missing_other_plugin`  — builder requires Dataview (or similar) which isn't loaded.
 */
export interface BreadcrumbsError {
	code:
		| "deprecated_field"
		| "invalid_edge_field"
		| "invalid_field_value"
		| "invalid_setting_value"
		| "invalid_yaml"
		| "missing_other_plugin";
	message: string;
	path: string;
}

/**
 * What an explicit edge builder must return.
 *
 * - `nodes` — any graph nodes the builder discovered that `get_initial_nodes`
 *   didn't create (e.g. unresolved link targets, virtual hierarchy nodes).
 *   Already-known nodes are safe to include; duplicates are deduplicated by
 *   the WASM engine.
 * - `edges` — the directed edges (source → target with field + source label).
 * - `errors` — non-fatal problems; surfaced in the Breadcrumbs UI without
 *   stopping the build.
 */
export interface EdgeBuilderResults {
	nodes: GCNodeData[];
	edges: GCEdgeData[];
	errors: BreadcrumbsError[];
}

/**
 * Contract every explicit edge builder must satisfy.
 *
 * A builder receives the current plugin state and the full vault file list,
 * and returns the nodes + edges + errors it found. Builders run in parallel
 * inside `rebuild_graph`; they must not mutate the graph directly.
 *
 * To add a new builder:
 * 1. Create `src/graph/builders/explicit/<name>.ts` exporting
 *    `_add_explicit_edges_<name>: ExplicitEdgeBuilder`.
 * 2. Add the source key to `EXPLICIT_EDGE_SOURCES` in `src/const/graph.ts`.
 * 3. Register the function in `src/graph/builders/explicit/index.ts`.
 * 4. Add settings shape + defaults as needed.
 */
export type ExplicitEdgeBuilder = (
	plugin: BreadcrumbsPlugin,
	all_files: AllFiles,
) => MaybePromise<EdgeBuilderResults>;
