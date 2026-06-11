/* tslint:disable */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-misused-new */
export function create_edge_sorter(field: string, reverse: boolean): EdgeSorter;
export function sort_traversal_data(graph: NoteGraph, traversal_data: TraversalData[], sorter: EdgeSorter): TraversalData[];
export function sort_edges(graph: NoteGraph, edges: EdgeStruct[], sorter: EdgeSorter): EdgeStruct[];
export function create_graph(): NoteGraph;
export class AddEdgeGraphUpdate {
  free(): void;
  add_to_batch(batch: BatchGraphUpdate): void;
  constructor(data: GCEdgeData);
}
export class AddNoteGraphUpdate {
  free(): void;
  add_to_batch(batch: BatchGraphUpdate): void;
  constructor(data: GCNodeData);
}
export class BatchGraphUpdate {
  free(): void;
  constructor();
}
export class EdgeData {
  private constructor();
  free(): void;
  toString(): string;
  explicit: boolean;
  round: number;
  readonly edge_type: string;
  readonly edge_source: string;
}
export class EdgeList {
  private constructor();
  free(): void;
  group_by_type(): GroupedEdgeList;
  toString(): string;
  /**
   * Returns a sorted clone of the edges.
   */
  get_sorted_edges(graph: NoteGraph, sorter: EdgeSorter): EdgeStruct[];
  last(): EdgeStruct | undefined;
  first(): EdgeStruct | undefined;
  /**
   * Consumes the [EdgeList] and returns the edges as a Vec (or array for
   * JS).
   */
  to_array(): EdgeStruct[];
  /**
   * Returns a clone of the edges.
   */
  get_edges(): EdgeStruct[];
}
export class EdgeSorter {
  private constructor();
  free(): void;
}
export class EdgeStruct {
  private constructor();
  free(): void;
  edge_source(graph: NoteGraph): string;
  source_data(graph: NoteGraph): NodeData;
  source_path(graph: NoteGraph): string;
  target_data(graph: NoteGraph): NodeData;
  target_path(graph: NoteGraph): string;
  is_self_loop(): boolean;
  source_resolved(graph: NoteGraph): boolean;
  target_resolved(graph: NoteGraph): boolean;
  toString(): string;
  stringify_source(graph: NoteGraph, options: NodeStringifyOptions): string;
  stringify_target(graph: NoteGraph, options: NodeStringifyOptions): string;
  get_attribute_label(graph: NoteGraph, attributes: string[]): string;
  matches_edge_filter(graph: NoteGraph, edge_types?: string[] | null): boolean;
  round(graph: NoteGraph): number;
  explicit(graph: NoteGraph): boolean;
  edge_data(graph: NoteGraph): EdgeData;
  readonly edge_type: string;
}
export class FlatTraversalData {
  private constructor();
  free(): void;
  get_attribute_label(graph: NoteGraph, attributes: string[]): string;
  to_js_rendering_obj(graph: NoteGraph, str_opt: NodeStringifyOptions, attributes: string[]): any;
  /**
   * the edge struct that was traversed
   */
  edge: EdgeStruct;
  /**
   * the depth of the node in the traversal
   */
  depth: number;
  /**
   * the number of total children of the node, so also children of children
   */
  number_of_children: number;
  /**
   * the children of the node
   */
  children: Uint32Array;
  has_cut_of_children: boolean;
}
export class FlatTraversalResult {
  private constructor();
  free(): void;
  data_at_index(index: number): FlatTraversalData | undefined;
  toString(): string;
  children_at_index(index: number): Uint32Array | undefined;
  rendering_obj_at_index(index: number, graph: NoteGraph, str_opt: NodeStringifyOptions, attributes: string[]): any;
  /**
   * Sorts the flat traversal data with a given edge sorter.
   * This is not as efficient as sorting the traversal data before flattening
   * it, but it's still a lot better than sorting then re-flatten.
   */
  sort(graph: NoteGraph, sorter: EdgeSorter): void;
  is_empty(): boolean;
  data: FlatTraversalData[];
  node_count: number;
  max_depth: number;
  hit_depth_limit: boolean;
  traversal_time: bigint;
  entry_nodes: Uint32Array;
}
export class GCEdgeData {
  free(): void;
  toString(): string;
  constructor(source: string, target: string, edge_type: string, edge_source: string);
  readonly edge_source: string;
  readonly source: string;
  readonly target: string;
  readonly edge_type: string;
}
export class GCNodeData {
  free(): void;
  toString(): string;
  constructor(path: string, aliases: string[], resolved: boolean, ignore_in_edges: boolean, ignore_out_edges: boolean);
}
/**
 * A edge list that is grouped by edge type.
 */
export class GroupedEdgeList {
  private constructor();
  free(): void;
  toString(): string;
  get_sorted_edges(edge_type: string, graph: NoteGraph, sorter: EdgeSorter): EdgeStruct[] | undefined;
  get_edges(edge_type: string): EdgeStruct[] | undefined;
}
export class MermaidGraphData {
  private constructor();
  free(): void;
  toString(): string;
  mermaid: string;
  traversal_time: bigint;
  total_time: bigint;
}
export class MermaidGraphOptions {
  free(): void;
  toString(): string;
  constructor(active_node: string | null | undefined, init_line: string, chart_type: string, direction: string, collapse_opposing_edges: boolean, edge_label_attributes: string[], edge_sorter: EdgeSorter | null | undefined, node_label_fn: Function | null | undefined, link_nodes: boolean, show_arrow_points: boolean, field_arrow_keys: string[], field_arrow_values: string[]);
}
export class NodeData {
  free(): void;
  toString(): string;
  constructor(path: string, aliases: string[], resolved: boolean, ignore_in_edges: boolean, ignore_out_edges: boolean);
  path: string;
  aliases: string[];
  resolved: boolean;
  ignore_in_edges: boolean;
  ignore_out_edges: boolean;
}
export class NodeStringifyOptions {
  free(): void;
  constructor(extension: boolean, folder: boolean, alias: boolean, trim_basename_delimiter?: string | null);
  stringify_node(node: NodeData): string;
}
/**
 * A graph that stores notes and their relationships.
 *
 * INVARIANT: The edge type tracker should contain exactly the edge types that
 * are present in the graph.
 *
 * INVARIANT: The node hash should contain exactly the node paths that are
 * present in the graph.
 */
export class NoteGraph {
  private constructor();
  free(): void;
  /**
   * Runs a recursive traversal of the graph.
   */
  rec_traverse(options: TraversalOptions): TraversalResult;
  /**
   * Runs a recursive traversal of the graph and post-processes the result.
   * The post-processed result is more efficient to work with from
   * JavaScript.
   */
  rec_traverse_and_process(options: TraversalOptions, postprocess_options: TraversalPostprocessOptions): FlatTraversalResult;
  generate_mermaid_graph(traversal_options: TraversalOptions, diagram_options: MermaidGraphOptions): MermaidGraphData;
  /**
   * Returns all edge types that are present in the graph.
   */
  edge_types(): string[];
  /**
   * Builds the graph from a list of nodes, edges, and transitive rules.
   * All existing data in the graph is removed.
   */
  build_graph(nodes: GCNodeData[], edges: GCEdgeData[], transitive_rules: TransitiveGraphRule[]): void;
  /**
   * Applies a batch update to the graph.
   * Throws an error if the update fails, and leave the graph in an
   * inconsistent state.
   *
   * TODO: some security against errors leaving the graph in an inconsistent
   * state. Maybe safely clear the entire graph.
   */
  apply_update(update: BatchGraphUpdate): void;
  /**
   * Iterate all edges in the graph and call the provided function with each
   * [EdgeData].
   */
  iterate_edges(f: Function): void;
  /**
   * Iterate all nodes in the graph and call the provided function with each
   * [NodeData].
   */
  iterate_nodes(f: Function): void;
  /**
   * Notify the JS side that the graph has been updated.
   */
  notify_update(): void;
  /**
   * Checks if a node is resolved.
   * Returns false if the node is not found.
   */
  is_node_resolved(node: string): boolean;
  /**
   * Get all incoming edges to a node.
   */
  get_incoming_edges(node: string): EdgeList;
  /**
   * Get all outgoing edges from a node.
   */
  get_outgoing_edges(node: string): EdgeList;
  /**
   * Set the update callback.
   * This will be called after every update to the graph.
   */
  set_update_callback(callback: Function): void;
  /**
   * Get all outgoing edges from a node, filtered by edge type.
   */
  get_filtered_outgoing_edges(node: string, edge_types?: string[] | null): EdgeList;
  /**
   * Get all outgoing edges from a node, filtered and grouped by edge type.
   */
  get_filtered_grouped_outgoing_edges(node: string, edge_types?: string[] | null): GroupedEdgeList;
  log(): void;
  static new(): NoteGraph;
  get_node(node: string): NodeData | undefined;
  /**
   * Checks if a node exists in the graph.
   */
  has_node(node: string): boolean;
}
export class NoteGraphError {
  free(): void;
  toString(): string;
  constructor(message: string);
  readonly message: string;
}
export class Path {
  private constructor();
  free(): void;
  toString(): string;
  get_first_target(graph: NoteGraph): string | undefined;
  equals(other: Path): boolean;
  length(): number;
  truncate(limit: number): Path;
  edges: EdgeStruct[];
  readonly reverse_edges: EdgeStruct[];
}
export class PathList {
  private constructor();
  free(): void;
  toString(): string;
  select(selection: string): PathList;
  /**
   * Cuts off all paths at a given depth, then sorts and deduplicates them.
   */
  process(graph: NoteGraph, depth: number): Path[];
  to_paths(): Path[];
  max_depth(): number;
}
export class RemoveEdgeGraphUpdate {
  free(): void;
  add_to_batch(batch: BatchGraphUpdate): void;
  constructor(from: string, to: string, edge_type: string);
}
export class RemoveNoteGraphUpdate {
  free(): void;
  add_to_batch(batch: BatchGraphUpdate): void;
  constructor(data: string);
}
export class RenameNoteGraphUpdate {
  free(): void;
  add_to_batch(batch: BatchGraphUpdate): void;
  constructor(old_name: string, new_name: string);
}
export class TransitiveGraphRule {
  free(): void;
  toString(): string;
  create_example_graph(): NoteGraph;
  constructor(name: string, path: string[], edge_type: string, rounds: number, can_loop: boolean, close_reversed: boolean);
}
export class TransitiveRulesGraphUpdate {
  free(): void;
  add_to_batch(batch: BatchGraphUpdate): void;
  constructor(new_rules: TransitiveGraphRule[]);
}
export class TraversalData {
  free(): void;
  toString(): string;
  rec_sort_children(graph: NoteGraph, sorter: EdgeSorter): void;
  constructor(edge: EdgeStruct, depth: number, number_of_children: number, children: TraversalData[], has_cut_of_children: boolean);
  /**
   * the edge struct that was traversed
   */
  edge: EdgeStruct;
  /**
   * the depth of the node in the traversal
   */
  depth: number;
  /**
   * the number of total children of the node, so also children of children
   */
  number_of_children: number;
  /**
   * the children of the node
   */
  children: TraversalData[];
  /**
   * whether the node has a cut of children due to being at the depth limit
   * of a traversal, or similar
   */
  has_cut_of_children: boolean;
}
export class TraversalOptions {
  free(): void;
  toString(): string;
  constructor(entry_nodes: string[], edge_types: string[] | null | undefined, max_depth: number, max_traversal_count: number, separate_edges: boolean, dataview_from_paths?: string[] | null);
  entry_nodes: string[];
  /**
   * if this is None, all edge types will be traversed
   */
  get edge_types(): string[] | undefined;
  /**
   * if this is None, all edge types will be traversed
   */
  set edge_types(value: string[] | null | undefined);
  max_depth: number;
  max_traversal_count: number;
  /**
   * if true, multiple traversals - one for each edge type - will be
   * performed and the results will be combined. if false, one traversal
   * over all edge types will be performed
   */
  separate_edges: boolean;
  /**
   * When set, only edges whose target node path is in this set will be
   * traversed. Used for the `dataview-from` codeblock filter.
   */
  get dataview_from_paths(): string[] | undefined;
  /**
   * When set, only edges whose target node path is in this set will be
   * traversed. Used for the `dataview-from` codeblock filter.
   */
  set dataview_from_paths(value: string[] | null | undefined);
}
export class TraversalPostprocessOptions {
  free(): void;
  static without_sorter(flatten: boolean): TraversalPostprocessOptions;
  toString(): string;
  constructor(sorter: EdgeSorter, flatten: boolean);
  get sorter(): EdgeSorter | undefined;
  set sorter(value: EdgeSorter | null | undefined);
  flatten: boolean;
}
export class TraversalResult {
  free(): void;
  toString(): string;
  constructor(data: TraversalData[], traversal_time: bigint);
  is_empty(): boolean;
  to_paths(): PathList;
  data: TraversalData[];
  node_count: number;
  max_depth: number;
  hit_depth_limit: boolean;
  traversal_time: bigint;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_edgesorter_free: (a: number, b: number) => void;
  readonly create_edge_sorter: (a: number, b: number, c: number) => [number, number, number];
  readonly sort_edges: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly sort_traversal_data: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly __wbg_transitivegraphrule_free: (a: number, b: number) => void;
  readonly transitivegraphrule_create_example_graph: (a: number) => [number, number, number];
  readonly transitivegraphrule_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
  readonly transitivegraphrule_toString: (a: number) => [number, number];
  readonly __wbg_gcedgedata_free: (a: number, b: number) => void;
  readonly __wbg_gcnodedata_free: (a: number, b: number) => void;
  readonly gcedgedata_edge_source: (a: number) => [number, number];
  readonly gcedgedata_edge_type: (a: number) => [number, number];
  readonly gcedgedata_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
  readonly gcedgedata_source: (a: number) => [number, number];
  readonly gcedgedata_target: (a: number) => [number, number];
  readonly gcedgedata_toString: (a: number) => [number, number];
  readonly gcnodedata_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
  readonly gcnodedata_toString: (a: number) => [number, number];
  readonly __wbg_get_path_edges: (a: number) => [number, number];
  readonly __wbg_path_free: (a: number, b: number) => void;
  readonly __wbg_pathlist_free: (a: number, b: number) => void;
  readonly __wbg_set_path_edges: (a: number, b: number, c: number) => void;
  readonly path_equals: (a: number, b: number) => number;
  readonly path_get_first_target: (a: number, b: number) => [number, number, number, number];
  readonly path_length: (a: number) => number;
  readonly path_reverse_edges: (a: number) => [number, number];
  readonly path_toString: (a: number) => [number, number];
  readonly path_truncate: (a: number, b: number) => number;
  readonly pathlist_max_depth: (a: number) => number;
  readonly pathlist_process: (a: number, b: number, c: number) => [number, number, number, number];
  readonly pathlist_select: (a: number, b: number, c: number) => number;
  readonly pathlist_toString: (a: number) => [number, number];
  readonly pathlist_to_paths: (a: number) => [number, number];
  readonly notegraph_rec_traverse: (a: number, b: number) => [number, number, number];
  readonly notegraph_rec_traverse_and_process: (a: number, b: number, c: number) => [number, number, number];
  readonly __wbg_get_traversaloptions_dataview_from_paths: (a: number) => [number, number];
  readonly __wbg_get_traversaloptions_edge_types: (a: number) => [number, number];
  readonly __wbg_get_traversaloptions_entry_nodes: (a: number) => [number, number];
  readonly __wbg_get_traversaloptions_max_depth: (a: number) => number;
  readonly __wbg_get_traversaloptions_max_traversal_count: (a: number) => number;
  readonly __wbg_get_traversaloptions_separate_edges: (a: number) => number;
  readonly __wbg_get_traversalpostprocessoptions_flatten: (a: number) => number;
  readonly __wbg_get_traversalpostprocessoptions_sorter: (a: number) => number;
  readonly __wbg_set_traversaloptions_dataview_from_paths: (a: number, b: number, c: number) => void;
  readonly __wbg_set_traversaloptions_edge_types: (a: number, b: number, c: number) => void;
  readonly __wbg_set_traversaloptions_entry_nodes: (a: number, b: number, c: number) => void;
  readonly __wbg_set_traversaloptions_max_depth: (a: number, b: number) => void;
  readonly __wbg_set_traversaloptions_max_traversal_count: (a: number, b: number) => void;
  readonly __wbg_set_traversaloptions_separate_edges: (a: number, b: number) => void;
  readonly __wbg_set_traversalpostprocessoptions_flatten: (a: number, b: number) => void;
  readonly __wbg_set_traversalpostprocessoptions_sorter: (a: number, b: number) => void;
  readonly __wbg_traversaloptions_free: (a: number, b: number) => void;
  readonly __wbg_traversalpostprocessoptions_free: (a: number, b: number) => void;
  readonly traversaloptions_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
  readonly traversaloptions_toString: (a: number) => [number, number];
  readonly traversalpostprocessoptions_new: (a: number, b: number) => number;
  readonly traversalpostprocessoptions_toString: (a: number) => [number, number];
  readonly traversalpostprocessoptions_without_sorter: (a: number) => number;
  readonly __wbg_edgestruct_free: (a: number, b: number) => void;
  readonly edgestruct_edge_data: (a: number, b: number) => [number, number, number];
  readonly edgestruct_edge_source: (a: number, b: number) => [number, number, number, number];
  readonly edgestruct_edge_type: (a: number) => [number, number];
  readonly edgestruct_explicit: (a: number, b: number) => [number, number, number];
  readonly edgestruct_get_attribute_label: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly edgestruct_is_self_loop: (a: number) => number;
  readonly edgestruct_matches_edge_filter: (a: number, b: number, c: number, d: number) => [number, number, number];
  readonly edgestruct_round: (a: number, b: number) => [number, number, number];
  readonly edgestruct_source_data: (a: number, b: number) => [number, number, number];
  readonly edgestruct_source_path: (a: number, b: number) => [number, number, number, number];
  readonly edgestruct_source_resolved: (a: number, b: number) => [number, number, number];
  readonly edgestruct_stringify_source: (a: number, b: number, c: number) => [number, number, number, number];
  readonly edgestruct_stringify_target: (a: number, b: number, c: number) => [number, number, number, number];
  readonly edgestruct_target_data: (a: number, b: number) => [number, number, number];
  readonly edgestruct_target_path: (a: number, b: number) => [number, number, number, number];
  readonly edgestruct_target_resolved: (a: number, b: number) => [number, number, number];
  readonly edgestruct_toString: (a: number) => [number, number];
  readonly __wbg_notegrapherror_free: (a: number, b: number) => void;
  readonly notegrapherror_message: (a: number) => [number, number];
  readonly notegrapherror_new: (a: number, b: number) => number;
  readonly notegrapherror_toString: (a: number) => [number, number];
  readonly __wbg_get_mermaidgraphdata_mermaid: (a: number) => [number, number];
  readonly __wbg_get_mermaidgraphdata_total_time: (a: number) => bigint;
  readonly __wbg_get_mermaidgraphdata_traversal_time: (a: number) => bigint;
  readonly __wbg_mermaidgraphdata_free: (a: number, b: number) => void;
  readonly __wbg_mermaidgraphoptions_free: (a: number, b: number) => void;
  readonly __wbg_set_mermaidgraphdata_mermaid: (a: number, b: number, c: number) => void;
  readonly __wbg_set_mermaidgraphdata_total_time: (a: number, b: bigint) => void;
  readonly __wbg_set_mermaidgraphdata_traversal_time: (a: number, b: bigint) => void;
  readonly mermaidgraphdata_toString: (a: number) => [number, number];
  readonly mermaidgraphoptions_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number, s: number) => number;
  readonly mermaidgraphoptions_toString: (a: number) => [number, number];
  readonly notegraph_generate_mermaid_graph: (a: number, b: number, c: number) => [number, number, number];
  readonly __wbg_edgelist_free: (a: number, b: number) => void;
  readonly __wbg_groupededgelist_free: (a: number, b: number) => void;
  readonly edgelist_first: (a: number) => number;
  readonly edgelist_get_edges: (a: number) => [number, number];
  readonly edgelist_get_sorted_edges: (a: number, b: number, c: number) => [number, number, number, number];
  readonly edgelist_group_by_type: (a: number) => number;
  readonly edgelist_last: (a: number) => number;
  readonly edgelist_toString: (a: number) => [number, number];
  readonly edgelist_to_array: (a: number) => [number, number];
  readonly groupededgelist_get_edges: (a: number, b: number, c: number) => [number, number];
  readonly groupededgelist_get_sorted_edges: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
  readonly groupededgelist_toString: (a: number) => [number, number];
  readonly __wbg_notegraph_free: (a: number, b: number) => void;
  readonly notegraph_apply_update: (a: number, b: number) => [number, number];
  readonly notegraph_build_graph: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
  readonly notegraph_edge_types: (a: number) => [number, number];
  readonly notegraph_get_filtered_grouped_outgoing_edges: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly notegraph_get_filtered_outgoing_edges: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly notegraph_get_incoming_edges: (a: number, b: number, c: number) => number;
  readonly notegraph_get_node: (a: number, b: number, c: number) => number;
  readonly notegraph_get_outgoing_edges: (a: number, b: number, c: number) => number;
  readonly notegraph_has_node: (a: number, b: number, c: number) => number;
  readonly notegraph_is_node_resolved: (a: number, b: number, c: number) => number;
  readonly notegraph_iterate_edges: (a: number, b: any) => void;
  readonly notegraph_iterate_nodes: (a: number, b: any) => void;
  readonly notegraph_log: (a: number) => void;
  readonly notegraph_new: () => number;
  readonly notegraph_notify_update: (a: number) => void;
  readonly notegraph_set_update_callback: (a: number, b: any) => void;
  readonly __wbg_batchgraphupdate_free: (a: number, b: number) => void;
  readonly batchgraphupdate_new: () => number;
  readonly __wbg_addedgegraphupdate_free: (a: number, b: number) => void;
  readonly __wbg_addnotegraphupdate_free: (a: number, b: number) => void;
  readonly __wbg_removeedgegraphupdate_free: (a: number, b: number) => void;
  readonly __wbg_removenotegraphupdate_free: (a: number, b: number) => void;
  readonly __wbg_renamenotegraphupdate_free: (a: number, b: number) => void;
  readonly __wbg_transitiverulesgraphupdate_free: (a: number, b: number) => void;
  readonly addedgegraphupdate_add_to_batch: (a: number, b: number) => void;
  readonly addedgegraphupdate_new: (a: number) => number;
  readonly addnotegraphupdate_add_to_batch: (a: number, b: number) => void;
  readonly addnotegraphupdate_new: (a: number) => number;
  readonly removeedgegraphupdate_add_to_batch: (a: number, b: number) => void;
  readonly removeedgegraphupdate_new: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly removenotegraphupdate_add_to_batch: (a: number, b: number) => void;
  readonly removenotegraphupdate_new: (a: number, b: number) => number;
  readonly renamenotegraphupdate_add_to_batch: (a: number, b: number) => void;
  readonly renamenotegraphupdate_new: (a: number, b: number, c: number, d: number) => number;
  readonly transitiverulesgraphupdate_add_to_batch: (a: number, b: number) => void;
  readonly transitiverulesgraphupdate_new: (a: number, b: number) => number;
  readonly __wbg_get_nodedata_aliases: (a: number) => [number, number];
  readonly __wbg_get_nodedata_ignore_in_edges: (a: number) => number;
  readonly __wbg_get_nodedata_ignore_out_edges: (a: number) => number;
  readonly __wbg_get_nodedata_path: (a: number) => [number, number];
  readonly __wbg_get_nodedata_resolved: (a: number) => number;
  readonly __wbg_nodedata_free: (a: number, b: number) => void;
  readonly __wbg_set_nodedata_aliases: (a: number, b: number, c: number) => void;
  readonly __wbg_set_nodedata_ignore_in_edges: (a: number, b: number) => void;
  readonly __wbg_set_nodedata_ignore_out_edges: (a: number, b: number) => void;
  readonly __wbg_set_nodedata_path: (a: number, b: number, c: number) => void;
  readonly __wbg_set_nodedata_resolved: (a: number, b: number) => void;
  readonly nodedata_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
  readonly nodedata_toString: (a: number) => [number, number];
  readonly __wbg_edgedata_free: (a: number, b: number) => void;
  readonly __wbg_get_edgedata_explicit: (a: number) => number;
  readonly __wbg_get_edgedata_round: (a: number) => number;
  readonly __wbg_set_edgedata_explicit: (a: number, b: number) => void;
  readonly __wbg_set_edgedata_round: (a: number, b: number) => void;
  readonly edgedata_edge_source: (a: number) => [number, number];
  readonly edgedata_edge_type: (a: number) => [number, number];
  readonly edgedata_toString: (a: number) => [number, number];
  readonly __wbg_nodestringifyoptions_free: (a: number, b: number) => void;
  readonly nodestringifyoptions_new: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly nodestringifyoptions_stringify_node: (a: number, b: number) => [number, number];
  readonly __wbg_flattraversaldata_free: (a: number, b: number) => void;
  readonly __wbg_flattraversalresult_free: (a: number, b: number) => void;
  readonly __wbg_get_flattraversaldata_children: (a: number) => [number, number];
  readonly __wbg_get_flattraversaldata_depth: (a: number) => number;
  readonly __wbg_get_flattraversaldata_edge: (a: number) => number;
  readonly __wbg_get_flattraversaldata_has_cut_of_children: (a: number) => number;
  readonly __wbg_get_flattraversaldata_number_of_children: (a: number) => number;
  readonly __wbg_get_flattraversalresult_data: (a: number) => [number, number];
  readonly __wbg_get_flattraversalresult_entry_nodes: (a: number) => [number, number];
  readonly __wbg_get_flattraversalresult_hit_depth_limit: (a: number) => number;
  readonly __wbg_get_flattraversalresult_node_count: (a: number) => number;
  readonly __wbg_get_flattraversalresult_traversal_time: (a: number) => bigint;
  readonly __wbg_get_traversaldata_children: (a: number) => [number, number];
  readonly __wbg_get_traversalresult_data: (a: number) => [number, number];
  readonly __wbg_get_traversalresult_hit_depth_limit: (a: number) => number;
  readonly __wbg_get_traversalresult_max_depth: (a: number) => number;
  readonly __wbg_get_traversalresult_node_count: (a: number) => number;
  readonly __wbg_set_flattraversaldata_children: (a: number, b: number, c: number) => void;
  readonly __wbg_set_flattraversaldata_depth: (a: number, b: number) => void;
  readonly __wbg_set_flattraversaldata_edge: (a: number, b: number) => void;
  readonly __wbg_set_flattraversaldata_has_cut_of_children: (a: number, b: number) => void;
  readonly __wbg_set_flattraversaldata_number_of_children: (a: number, b: number) => void;
  readonly __wbg_set_flattraversalresult_data: (a: number, b: number, c: number) => void;
  readonly __wbg_set_flattraversalresult_entry_nodes: (a: number, b: number, c: number) => void;
  readonly __wbg_set_flattraversalresult_hit_depth_limit: (a: number, b: number) => void;
  readonly __wbg_set_flattraversalresult_node_count: (a: number, b: number) => void;
  readonly __wbg_set_flattraversalresult_traversal_time: (a: number, b: bigint) => void;
  readonly __wbg_set_traversaldata_children: (a: number, b: number, c: number) => void;
  readonly __wbg_set_traversalresult_data: (a: number, b: number, c: number) => void;
  readonly __wbg_set_traversalresult_hit_depth_limit: (a: number, b: number) => void;
  readonly __wbg_set_traversalresult_max_depth: (a: number, b: number) => void;
  readonly __wbg_set_traversalresult_node_count: (a: number, b: number) => void;
  readonly __wbg_traversaldata_free: (a: number, b: number) => void;
  readonly __wbg_traversalresult_free: (a: number, b: number) => void;
  readonly flattraversaldata_get_attribute_label: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly flattraversaldata_to_js_rendering_obj: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
  readonly flattraversalresult_children_at_index: (a: number, b: number) => [number, number];
  readonly flattraversalresult_data_at_index: (a: number, b: number) => number;
  readonly flattraversalresult_is_empty: (a: number) => number;
  readonly flattraversalresult_rendering_obj_at_index: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
  readonly flattraversalresult_sort: (a: number, b: number, c: number) => [number, number];
  readonly flattraversalresult_toString: (a: number) => [number, number];
  readonly traversaldata_new: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly traversaldata_rec_sort_children: (a: number, b: number, c: number) => [number, number];
  readonly traversaldata_toString: (a: number) => [number, number];
  readonly traversalresult_new: (a: number, b: number, c: bigint) => number;
  readonly traversalresult_toString: (a: number) => [number, number];
  readonly traversalresult_to_paths: (a: number) => number;
  readonly __wbg_set_traversaldata_has_cut_of_children: (a: number, b: number) => void;
  readonly __wbg_set_flattraversalresult_max_depth: (a: number, b: number) => void;
  readonly __wbg_set_traversaldata_depth: (a: number, b: number) => void;
  readonly __wbg_set_traversaldata_number_of_children: (a: number, b: number) => void;
  readonly __wbg_set_traversalresult_traversal_time: (a: number, b: bigint) => void;
  readonly __wbg_get_traversaldata_edge: (a: number) => number;
  readonly traversalresult_is_empty: (a: number) => number;
  readonly __wbg_set_traversaldata_edge: (a: number, b: number) => void;
  readonly __wbg_get_traversaldata_has_cut_of_children: (a: number) => number;
  readonly __wbg_get_flattraversalresult_max_depth: (a: number) => number;
  readonly __wbg_get_traversaldata_depth: (a: number) => number;
  readonly __wbg_get_traversaldata_number_of_children: (a: number) => number;
  readonly __wbg_get_traversalresult_traversal_time: (a: number) => bigint;
  readonly create_graph: () => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __externref_drop_slice: (a: number, b: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
