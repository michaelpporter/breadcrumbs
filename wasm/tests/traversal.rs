#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;

use std::collections::HashSet;

use breadcrumbs_graph_wasm::{
    data::construction::{GCEdgeData, GCNodeData},
    graph::NoteGraph,
    traversal::options::TraversalOptions,
};
use wasm_bindgen_test::*;

mod common;

// ---- helpers ----

fn node(path: &str) -> GCNodeData {
    GCNodeData::new(path.to_owned(), vec![], true, false, false)
}

fn edge(src: &str, tgt: &str, typ: &str) -> GCEdgeData {
    GCEdgeData::new(
        src.to_owned(),
        tgt.to_owned(),
        typ.to_owned(),
        "explicit".to_owned(),
    )
}

fn opts(
    entry: &str,
    max_depth: u32,
    edge_types: Option<Vec<String>>,
    separate: bool,
) -> TraversalOptions {
    TraversalOptions::new(
        vec![entry.to_owned()],
        edge_types,
        max_depth,
        1000,
        separate,
        None,
    )
}

/// A → B → C (all "up" edges)
fn linear_chain() -> NoteGraph {
    let mut g = NoteGraph::new();
    g.build_graph(
        vec![node("A"), node("B"), node("C")],
        vec![edge("A", "B", "up"), edge("B", "C", "up")],
        vec![],
    )
    .unwrap();
    g
}

/// A -up→ B -down→ C
fn mixed_edge_graph() -> NoteGraph {
    let mut g = NoteGraph::new();
    g.build_graph(
        vec![node("A"), node("B"), node("C")],
        vec![edge("A", "B", "up"), edge("B", "C", "down")],
        vec![],
    )
    .unwrap();
    g
}

// ---- basic traversal ----

#[wasm_bindgen_test]
fn test_traversal_linear_chain_full() {
    let g = linear_chain();
    let result = g.rec_traverse(opts("A", 10, None, false)).unwrap();

    // A → B → C: two descendants
    assert_eq!(result.node_count, 2);
    assert_eq!(result.max_depth, 2);
    assert!(!result.hit_depth_limit);
    // top-level data has one entry: edge A→B
    assert_eq!(result.data.len(), 1);
    // B has one child: edge B→C
    assert_eq!(result.data[0].children.len(), 1);
    assert_eq!(result.data[0].depth, 1);
    assert_eq!(result.data[0].children[0].depth, 2);
}

#[wasm_bindgen_test]
fn test_traversal_from_leaf_is_empty() {
    let g = linear_chain();
    let result = g.rec_traverse(opts("C", 10, None, false)).unwrap();

    assert_eq!(result.node_count, 0);
    assert!(result.is_empty());
    assert!(!result.hit_depth_limit);
}

#[wasm_bindgen_test]
fn test_traversal_from_middle() {
    let g = linear_chain();
    let result = g.rec_traverse(opts("B", 10, None, false)).unwrap();

    // B → C: one descendant
    assert_eq!(result.node_count, 1);
    assert_eq!(result.data.len(), 1);
    assert_eq!(result.data[0].depth, 1);
}

// ---- max depth ----

#[wasm_bindgen_test]
fn test_traversal_max_depth_1() {
    let g = linear_chain();
    let result = g.rec_traverse(opts("A", 1, None, false)).unwrap();

    // stops after B; C not reached
    assert_eq!(result.node_count, 1);
    assert_eq!(result.max_depth, 1);
    assert!(result.hit_depth_limit);
    assert_eq!(result.data[0].children.len(), 0);
    assert!(result.data[0].has_cut_of_children);
}

#[wasm_bindgen_test]
fn test_traversal_max_depth_0() {
    let g = linear_chain();
    let result = g.rec_traverse(opts("A", 0, None, false)).unwrap();

    // The outer rec_traverse loop always fires for the entry node's direct edges,
    // so B is added at depth=1. max_depth=0 means int_rec_traverse immediately
    // stops (1 >= 0), cutting B's children — B has no children in result.
    assert_eq!(result.node_count, 1);
    assert!(result.hit_depth_limit);
    assert_eq!(result.data.len(), 1);
    assert_eq!(result.data[0].children.len(), 0);
    assert!(result.data[0].has_cut_of_children);
}

// ---- entry node errors ----

#[wasm_bindgen_test]
fn test_traversal_missing_entry_node_is_error() {
    let g = linear_chain();
    let result = g.rec_traverse(opts("MISSING", 10, None, false));
    assert!(result.is_err());
}

// ---- edge type filter ----

#[wasm_bindgen_test]
fn test_traversal_filter_matching_type() {
    let g = mixed_edge_graph(); // A -up→ B -down→ C
    // filter to "up": A→B reachable, B→C not (it's "down")
    let result = g
        .rec_traverse(opts("A", 10, Some(vec!["up".to_string()]), false))
        .unwrap();
    assert_eq!(result.node_count, 1); // only B
}

#[wasm_bindgen_test]
fn test_traversal_filter_no_matching_edges() {
    let g = mixed_edge_graph();
    // filter to "down" from A: A has no "down" edges
    let result = g
        .rec_traverse(opts("A", 10, Some(vec!["down".to_string()]), false))
        .unwrap();
    assert_eq!(result.node_count, 0);
}

#[wasm_bindgen_test]
fn test_traversal_filter_from_mid_node() {
    let g = mixed_edge_graph();
    // B -down→ C; filter to "down" from B
    let result = g
        .rec_traverse(opts("B", 10, Some(vec!["down".to_string()]), false))
        .unwrap();
    assert_eq!(result.node_count, 1);
}

#[wasm_bindgen_test]
fn test_traversal_filter_none_follows_all_types() {
    let g = mixed_edge_graph();
    let result = g.rec_traverse(opts("A", 10, None, false)).unwrap();
    // A→B→C both reachable with no filter
    assert_eq!(result.node_count, 2);
}

// ---- separate_edges ----

#[wasm_bindgen_test]
fn test_traversal_separate_edges_fan_out() {
    // A -up→ B, A -down→ C
    let mut g = NoteGraph::new();
    g.build_graph(
        vec![node("A"), node("B"), node("C")],
        vec![edge("A", "B", "up"), edge("A", "C", "down")],
        vec![],
    )
    .unwrap();

    // combined: both B and C
    let combined = g.rec_traverse(opts("A", 10, None, false)).unwrap();
    assert_eq!(combined.node_count, 2);

    // separate: still 2 total, but top-level has 2 entries — one per type
    let sep = g.rec_traverse(opts("A", 10, None, true)).unwrap();
    assert_eq!(sep.node_count, 2);
    assert_eq!(sep.data.len(), 2);

    let types: HashSet<String> = sep.data.iter().map(|d| d.edge.edge_type()).collect();
    assert!(types.contains("up"));
    assert!(types.contains("down"));
}

#[wasm_bindgen_test]
fn test_traversal_separate_edges_restricts_subtree() {
    // A -up→ B -down→ C (mixed chain)
    // With separate_edges=true, traversal from "up" subtree stays on "up" edges.
    // B has no "up" outgoing edge, so C is NOT reached via the "up" subtree.
    let g = mixed_edge_graph();
    let sep = g.rec_traverse(opts("A", 10, None, true)).unwrap();

    // Only one edge from A (A-up→B); separate_edges restricts B's subtree to "up"
    // only
    assert_eq!(sep.data.len(), 1);
    assert_eq!(sep.data[0].edge.edge_type(), "up");
    // B has no "up" children
    assert_eq!(sep.data[0].children.len(), 0);
}

// ---- cycle / diamond deduplication ----

#[wasm_bindgen_test]
fn test_traversal_diamond_visits_each_node_once() {
    // A → B, A → C, B → D, C → D  (diamond)
    let mut g = NoteGraph::new();
    g.build_graph(
        vec![node("A"), node("B"), node("C"), node("D")],
        vec![
            edge("A", "B", "up"),
            edge("A", "C", "up"),
            edge("B", "D", "up"),
            edge("C", "D", "up"),
        ],
        vec![],
    )
    .unwrap();

    let result = g.rec_traverse(opts("A", 10, None, false)).unwrap();
    // B, C, D — D reached from B first; C→D skipped (already visited)
    assert_eq!(result.node_count, 3);
}

// ---- rec_traverse_and_process (flat) ----

#[wasm_bindgen_test]
fn test_rec_traverse_and_process_flat() {
    use breadcrumbs_graph_wasm::traversal::options::TraversalPostprocessOptions;

    let g = linear_chain();
    let options = opts("A", 10, None, false);
    let post = TraversalPostprocessOptions::without_sorter(true);

    let flat = g.rec_traverse_and_process(options, post).unwrap();

    // A→B→C: 2 nodes in flat result
    assert_eq!(flat.node_count, 2);
    assert!(!flat.is_empty());
    // flat.data should have 2 entries (one per edge traversed)
    assert_eq!(flat.data.len(), 2);
}
