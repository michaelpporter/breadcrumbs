// import type { BCEdgeAttributes, BCNode } from "src/graph/MyMultiGraph";
import type { AllFiles } from "src/graph/builders/explicit/files";
import type BreadcrumbsPlugin from "src/main";
import type { GCEdgeData, GCNodeData } from "wasm/pkg/breadcrumbs_graph_wasm";
import type { MaybePromise } from ".";

export interface BreadcrumbsError {
	// `invalid_edge_field`: a value names a BC edge-field that isn't registered.
	// `invalid_field_value`: a metadata field holds a malformed/wrong-typed value.
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

/** The values passed into safe_add_edge */
// export type EdgeToAdd = {
// 	source_id: string;
// 	target_id: string;
// 	attr: BCEdgeAttributes;
// };

export interface EdgeBuilderResults {
	nodes: GCNodeData[];
	edges: GCEdgeData[];
	errors: BreadcrumbsError[];
}

// NOTE: A completely different approach is to do it on a single node level
//   This way, we could rebuild the edges for a particular node as needed
/** "Extension" system. Takes in current state of plugin & graph, and adds to the graph */
export type ExplicitEdgeBuilder = (
	plugin: BreadcrumbsPlugin,
	all_files: AllFiles,
) => MaybePromise<EdgeBuilderResults>;
