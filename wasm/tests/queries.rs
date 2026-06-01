#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;

use std::rc::Rc;

use breadcrumbs_graph_wasm::{
    data::{
        construction::{GCEdgeData, GCNodeData},
        edge::EdgeData,
    },
    graph::{NoteGraph, edge_matches_edge_filter, edge_matches_edge_filter_string},
};
use wasm_bindgen_test::*;

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

/// A -up→ B  (both resolved)
fn two_node_graph() -> NoteGraph {
    let mut g = NoteGraph::new();
    g.build_graph(
        vec![node("A"), node("B")],
        vec![edge("A", "B", "up")],
        vec![],
    )
    .unwrap();
    g
}

// ---- has_node ----

#[wasm_bindgen_test]
fn test_has_node_existing() {
    let g = two_node_graph();
    assert!(g.has_node("A".to_owned()));
    assert!(g.has_node("B".to_owned()));
}

#[wasm_bindgen_test]
fn test_has_node_missing() {
    let g = two_node_graph();
    assert!(!g.has_node("Z".to_owned()));
}

#[wasm_bindgen_test]
fn test_has_node_unresolved_target_exists() {
    // C is not in node list — created as unresolved by the edge
    let mut g = NoteGraph::new();
    g.build_graph(vec![node("A")], vec![edge("A", "C", "up")], vec![])
        .unwrap();
    assert!(g.has_node("C".to_owned()));
}

// ---- is_node_resolved ----

#[wasm_bindgen_test]
fn test_is_node_resolved_resolved_node() {
    let g = two_node_graph();
    assert!(g.is_node_resolved("A".to_owned()));
    assert!(g.is_node_resolved("B".to_owned()));
}

#[wasm_bindgen_test]
fn test_is_node_resolved_unresolved_target() {
    let mut g = NoteGraph::new();
    g.build_graph(vec![node("A")], vec![edge("A", "B", "up")], vec![])
        .unwrap();
    assert!(g.is_node_resolved("A".to_owned()));
    assert!(!g.is_node_resolved("B".to_owned()));
}

#[wasm_bindgen_test]
fn test_is_node_resolved_missing_returns_false() {
    let g = two_node_graph();
    assert!(!g.is_node_resolved("MISSING".to_owned()));
}

// ---- get_node ----

#[wasm_bindgen_test]
fn test_get_node_returns_data() {
    let g = two_node_graph();
    let n = g.get_node("A".to_owned()).unwrap();
    assert_eq!(n.path, "A");
    assert!(n.resolved);
}

#[wasm_bindgen_test]
fn test_get_node_missing_returns_none() {
    let g = two_node_graph();
    assert!(g.get_node("MISSING".to_owned()).is_none());
}

#[wasm_bindgen_test]
fn test_get_node_unresolved_has_correct_flag() {
    let mut g = NoteGraph::new();
    g.build_graph(vec![node("A")], vec![edge("A", "B", "up")], vec![])
        .unwrap();
    let b = g.get_node("B".to_owned()).unwrap();
    assert_eq!(b.path, "B");
    assert!(!b.resolved);
}

// ---- edge_types ----

#[wasm_bindgen_test]
fn test_edge_types_single() {
    let g = two_node_graph();
    let types = g.edge_types();
    assert_eq!(types.len(), 1);
    assert!(types.contains(&"up".to_owned()));
}

#[wasm_bindgen_test]
fn test_edge_types_multiple() {
    let mut g = NoteGraph::new();
    g.build_graph(
        vec![node("A"), node("B"), node("C")],
        vec![edge("A", "B", "up"), edge("B", "C", "down")],
        vec![],
    )
    .unwrap();
    let mut types = g.edge_types();
    types.sort();
    assert_eq!(types, vec!["down".to_owned(), "up".to_owned()]);
}

#[wasm_bindgen_test]
fn test_edge_types_empty_graph() {
    let g = NoteGraph::new();
    assert!(g.edge_types().is_empty());
}

#[wasm_bindgen_test]
fn test_edge_types_deduped() {
    // Multiple edges of the same type — tracker should only list it once
    let mut g = NoteGraph::new();
    g.build_graph(
        vec![node("A"), node("B"), node("C")],
        vec![edge("A", "B", "up"), edge("A", "C", "up")],
        vec![],
    )
    .unwrap();
    assert_eq!(g.edge_types().len(), 1);
}

// ---- get_outgoing_edges ----

#[wasm_bindgen_test]
fn test_get_outgoing_edges_source_has_one() {
    let g = two_node_graph();
    assert_eq!(g.get_outgoing_edges("A".to_owned()).edges.len(), 1);
}

#[wasm_bindgen_test]
fn test_get_outgoing_edges_target_has_none() {
    let g = two_node_graph();
    assert_eq!(g.get_outgoing_edges("B".to_owned()).edges.len(), 0);
}

#[wasm_bindgen_test]
fn test_get_outgoing_edges_missing_node_empty() {
    let g = two_node_graph();
    assert_eq!(g.get_outgoing_edges("MISSING".to_owned()).edges.len(), 0);
}

#[wasm_bindgen_test]
fn test_get_outgoing_edges_multiple() {
    let mut g = NoteGraph::new();
    g.build_graph(
        vec![node("A"), node("B"), node("C")],
        vec![edge("A", "B", "up"), edge("A", "C", "down")],
        vec![],
    )
    .unwrap();
    assert_eq!(g.get_outgoing_edges("A".to_owned()).edges.len(), 2);
}

// ---- get_incoming_edges ----

#[wasm_bindgen_test]
fn test_get_incoming_edges_source_has_none() {
    let g = two_node_graph();
    assert_eq!(g.get_incoming_edges("A".to_owned()).edges.len(), 0);
}

#[wasm_bindgen_test]
fn test_get_incoming_edges_target_has_one() {
    let g = two_node_graph();
    assert_eq!(g.get_incoming_edges("B".to_owned()).edges.len(), 1);
}

#[wasm_bindgen_test]
fn test_get_incoming_edges_missing_node_empty() {
    let g = two_node_graph();
    assert_eq!(g.get_incoming_edges("MISSING".to_owned()).edges.len(), 0);
}

#[wasm_bindgen_test]
fn test_get_incoming_edges_multiple_sources() {
    let mut g = NoteGraph::new();
    g.build_graph(
        vec![node("A"), node("B"), node("C")],
        vec![edge("A", "C", "up"), edge("B", "C", "up")],
        vec![],
    )
    .unwrap();
    assert_eq!(g.get_incoming_edges("C".to_owned()).edges.len(), 2);
}

// ---- get_filtered_outgoing_edges ----

#[wasm_bindgen_test]
fn test_get_filtered_outgoing_edges_matching_type() {
    let g = two_node_graph();
    let edges = g.get_filtered_outgoing_edges("A".to_owned(), Some(vec!["up".to_owned()]));
    assert_eq!(edges.edges.len(), 1);
}

#[wasm_bindgen_test]
fn test_get_filtered_outgoing_edges_non_matching_type() {
    let g = two_node_graph();
    let edges = g.get_filtered_outgoing_edges("A".to_owned(), Some(vec!["down".to_owned()]));
    assert_eq!(edges.edges.len(), 0);
}

#[wasm_bindgen_test]
fn test_get_filtered_outgoing_edges_none_returns_all() {
    let mut g = NoteGraph::new();
    g.build_graph(
        vec![node("A"), node("B"), node("C")],
        vec![edge("A", "B", "up"), edge("A", "C", "down")],
        vec![],
    )
    .unwrap();
    assert_eq!(
        g.get_filtered_outgoing_edges("A".to_owned(), None)
            .edges
            .len(),
        2
    );
}

#[wasm_bindgen_test]
fn test_get_filtered_outgoing_edges_selects_one_of_two_types() {
    let mut g = NoteGraph::new();
    g.build_graph(
        vec![node("A"), node("B"), node("C")],
        vec![edge("A", "B", "up"), edge("A", "C", "down")],
        vec![],
    )
    .unwrap();
    let up_edges = g.get_filtered_outgoing_edges("A".to_owned(), Some(vec!["up".to_owned()]));
    assert_eq!(up_edges.edges.len(), 1);

    let down_edges = g.get_filtered_outgoing_edges("A".to_owned(), Some(vec!["down".to_owned()]));
    assert_eq!(down_edges.edges.len(), 1);
}

// ---- edge_matches_edge_filter (Rc<str> variant) ----

#[wasm_bindgen_test]
fn test_edge_filter_rc_none_always_matches() {
    let e = EdgeData::new(Rc::from("up"), Rc::from("explicit"), true, 0);
    assert!(edge_matches_edge_filter(&e, None));
}

#[wasm_bindgen_test]
fn test_edge_filter_rc_matching_type() {
    let e = EdgeData::new(Rc::from("up"), Rc::from("explicit"), true, 0);
    let types = vec![Rc::from("up")];
    assert!(edge_matches_edge_filter(&e, Some(&types)));
}

#[wasm_bindgen_test]
fn test_edge_filter_rc_non_matching_type() {
    let e = EdgeData::new(Rc::from("up"), Rc::from("explicit"), true, 0);
    let types = vec![Rc::from("down")];
    assert!(!edge_matches_edge_filter(&e, Some(&types)));
}

#[wasm_bindgen_test]
fn test_edge_filter_rc_empty_list_never_matches() {
    let e = EdgeData::new(Rc::from("up"), Rc::from("explicit"), true, 0);
    let types: Vec<Rc<str>> = vec![];
    assert!(!edge_matches_edge_filter(&e, Some(&types)));
}

#[wasm_bindgen_test]
fn test_edge_filter_rc_matches_one_of_multiple() {
    let e = EdgeData::new(Rc::from("up"), Rc::from("explicit"), true, 0);
    let types = vec![Rc::from("down"), Rc::from("up"), Rc::from("same")];
    assert!(edge_matches_edge_filter(&e, Some(&types)));
}

// ---- edge_matches_edge_filter_string (String variant) ----

#[wasm_bindgen_test]
fn test_edge_filter_string_none_always_matches() {
    let e = EdgeData::new(Rc::from("up"), Rc::from("explicit"), true, 0);
    assert!(edge_matches_edge_filter_string(&e, None));
}

#[wasm_bindgen_test]
fn test_edge_filter_string_matching_type() {
    let e = EdgeData::new(Rc::from("up"), Rc::from("explicit"), true, 0);
    let types = vec!["up".to_owned()];
    assert!(edge_matches_edge_filter_string(&e, Some(&types)));
}

#[wasm_bindgen_test]
fn test_edge_filter_string_non_matching_type() {
    let e = EdgeData::new(Rc::from("up"), Rc::from("explicit"), true, 0);
    let types = vec!["down".to_owned()];
    assert!(!edge_matches_edge_filter_string(&e, Some(&types)));
}

#[wasm_bindgen_test]
fn test_edge_filter_string_empty_list_never_matches() {
    let e = EdgeData::new(Rc::from("up"), Rc::from("explicit"), true, 0);
    let types: Vec<String> = vec![];
    assert!(!edge_matches_edge_filter_string(&e, Some(&types)));
}
