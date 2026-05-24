#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;

use breadcrumbs_graph_wasm::{
    data::{
        construction::{GCEdgeData, GCNodeData},
        rules::TransitiveGraphRule,
    },
    graph::NoteGraph,
    update::{
        AddEdgeGraphUpdate, AddNoteGraphUpdate, RemoveNoteGraphUpdate, batch::BatchGraphUpdate,
    },
    utils::graph_eq,
};
use wasm_bindgen_test::*;

mod common;

#[wasm_bindgen_test]
fn test_empty_update_does_nothing() {
    let data = common::tdata_generate_tree(2, 2);
    let mut graph_1 = common::tdata_to_graph(data.clone());
    let graph_2 = common::tdata_to_graph(data);

    let batch = BatchGraphUpdate::new();
    graph_1.apply_update(batch).unwrap();

    assert!(graph_eq(&graph_1.graph, &graph_2.graph));
    graph_1.assert_correct_trackers();
}

#[wasm_bindgen_test]
fn test_remove_update() {
    let data = common::tdata_generate_tree(2, 2);
    let mut graph = common::tdata_to_graph(data);

    let mut batch = BatchGraphUpdate::new();
    RemoveNoteGraphUpdate::new("0".to_string()).add_to_batch(&mut batch);
    graph.apply_update(batch).unwrap();

    let node_0 = graph.int_get_node_index(&"0".to_string()).unwrap();
    let node_0_weight = graph.int_get_node_weight(node_0).unwrap();

    assert_eq!(node_0_weight.resolved, false);
    assert_eq!(graph.int_has_outgoing_edges(node_0), false);
    assert!(graph.int_has_edge_by_name(&"root".to_string(), &"0".to_string(), &"down".to_string()));

    graph.assert_correct_trackers();
}

#[wasm_bindgen_test]
fn test_remove_add_as_one_update() {
    let data = common::tdata_generate_tree(2, 2);
    let mut graph_1 = common::tdata_to_graph(data.clone());
    let graph_2 = common::tdata_to_graph(data);

    let mut batch = BatchGraphUpdate::new();
    RemoveNoteGraphUpdate::new("0".to_string()).add_to_batch(&mut batch);
    AddNoteGraphUpdate::new(GCNodeData::new("0".to_string(), vec![], true, false, false))
        .add_to_batch(&mut batch);
    AddEdgeGraphUpdate::new(GCEdgeData::new(
        "0".to_string(),
        "00".to_string(),
        "down".to_string(),
        "typed-link".to_string(),
    ))
    .add_to_batch(&mut batch);
    AddEdgeGraphUpdate::new(GCEdgeData::new(
        "0".to_string(),
        "01".to_string(),
        "down".to_string(),
        "typed-link".to_string(),
    ))
    .add_to_batch(&mut batch);

    graph_1.apply_update(batch).unwrap();

    assert!(graph_eq(&graph_1.graph, &graph_2.graph));

    graph_1.assert_correct_trackers();
}

#[wasm_bindgen_test]
fn test_remove_add_as_separate_updates() {
    let data = common::tdata_generate_tree(2, 2);
    let mut graph_1 = common::tdata_to_graph(data.clone());
    let graph_2 = common::tdata_to_graph(data);

    let mut batch_1 = BatchGraphUpdate::new();
    RemoveNoteGraphUpdate::new("0".to_string()).add_to_batch(&mut batch_1);

    graph_1.apply_update(batch_1).unwrap();

    let mut batch_2 = BatchGraphUpdate::new();
    AddNoteGraphUpdate::new(GCNodeData::new("0".to_string(), vec![], true, false, false))
        .add_to_batch(&mut batch_2);
    AddEdgeGraphUpdate::new(GCEdgeData::new(
        "0".to_string(),
        "00".to_string(),
        "down".to_string(),
        "typed-link".to_string(),
    ))
    .add_to_batch(&mut batch_2);
    AddEdgeGraphUpdate::new(GCEdgeData::new(
        "0".to_string(),
        "01".to_string(),
        "down".to_string(),
        "typed-link".to_string(),
    ))
    .add_to_batch(&mut batch_2);
    graph_1.apply_update(batch_2).unwrap();

    assert!(graph_eq(&graph_1.graph, &graph_2.graph));

    graph_1.assert_correct_trackers();
}

#[wasm_bindgen_test]
fn test_add_edge_to_unresolved() {
    let data = common::tdata_generate_tree(2, 2);
    let mut graph = common::tdata_to_graph(data.clone());

    let mut batch = BatchGraphUpdate::new();
    AddEdgeGraphUpdate::new(GCEdgeData::new(
        "00".to_string(),
        "000".to_string(),
        "down".to_string(),
        "typed-link".to_string(),
    ))
    .add_to_batch(&mut batch);

    graph.apply_update(batch).unwrap();

    let node_000 = graph.int_get_node_index(&"000".to_string()).unwrap();

    assert_eq!(graph.int_has_incoming_edges(node_000), true);
    assert_eq!(graph.int_has_outgoing_edges(node_000), false);
    assert_eq!(graph.get_node("000".to_string()).unwrap().resolved, false);
}

#[wasm_bindgen_test]
fn test_unresolved_node_can_have_outgoing_edges() {
    let nodes = vec![
        GCNodeData::new("a".to_string(), vec![], true, false, false),
        GCNodeData::new("b".to_string(), vec![], true, false, false),
    ];
    let edges = vec![
        GCEdgeData::new(
            "a".to_string(),
            "c".to_string(),
            "1".to_string(),
            "typed-link".to_string(),
        ),
        GCEdgeData::new(
            "a".to_string(),
            "b".to_string(),
            "2".to_string(),
            "typed-link".to_string(),
        ),
        GCEdgeData::new(
            "b".to_string(),
            "d".to_string(),
            "3".to_string(),
            "typed-link".to_string(),
        ),
    ];

    // This is how the graph looks like. The uppercase letters are the resolved
    // nodes.
    //
    // A ---2--> B
    // |         |
    // |         |
    // 1         3
    // |         |
    // v         v
    // c         d

    let rules = vec![
        TransitiveGraphRule::new(
            "r1".to_string(),
            vec!["1".to_string()],
            "inv1".to_string(),
            5,
            false,
            true,
        ),
        TransitiveGraphRule::new(
            "r2".to_string(),
            vec!["inv1".to_string(), "2".to_string(), "3".to_string()],
            "4".to_string(),
            5,
            false,
            false,
        ),
        TransitiveGraphRule::new(
            "r3".to_string(),
            vec!["4".to_string()],
            "inv4".to_string(),
            5,
            false,
            true,
        ),
    ];

    // Rule1 inverts edge 1 between a and c
    // Rule2 creates an new edge 4 between c and d
    // Rule3 inverts edge 4 between c and d
    //
    // A ---2--> B
    // ^         |
    // |         |
    // 1         3
    // |         |
    // v         v
    // c <--4--> d

    let mut graph = NoteGraph::new();
    graph.build_graph(nodes, edges, rules).unwrap();

    let node_c = graph.int_get_node_index(&"c".to_string()).unwrap();
    assert_eq!(graph.int_has_incoming_edges(node_c), true);
    assert_eq!(graph.int_has_outgoing_edges(node_c), true);

    let node_d = graph.int_get_node_index(&"d".to_string()).unwrap();
    assert_eq!(graph.int_has_incoming_edges(node_d), true);
    assert_eq!(graph.int_has_outgoing_edges(node_d), true);

    assert_eq!(graph.graph.node_count(), 4);

    let _ = graph
        .int_get_edge_by_name(&"c".to_string(), &"d".to_string(), &"4".to_string())
        .unwrap();
    let _ = graph
        .int_get_edge_by_name(&"d".to_string(), &"c".to_string(), &"inv4".to_string())
        .unwrap();

    let mut batch = BatchGraphUpdate::new();
    RemoveNoteGraphUpdate::new("b".to_string()).add_to_batch(&mut batch);
    graph.apply_update(batch).unwrap();

    // The graph should now look like this:
    //
    // A ---2--> b
    // ^
    // |
    // 1
    // |
    // v
    // c

    assert_eq!(graph.get_node("b".to_string()).unwrap().resolved, false);

    let node_c = graph.int_get_node_index(&"c".to_string()).unwrap();
    assert_eq!(graph.int_has_incoming_edges(node_c), true);
    assert_eq!(graph.int_has_outgoing_edges(node_c), true);

    assert_eq!(graph.int_get_node_index(&"d".to_string()), None);

    assert_eq!(graph.graph.node_count(), 3);

    let mut batch = BatchGraphUpdate::new();
    RemoveNoteGraphUpdate::new("a".to_string()).add_to_batch(&mut batch);
    graph.apply_update(batch).unwrap();

    // The graph should now be empty, otherwise we leaked unresolved nodes.

    assert_eq!(graph.graph.node_count(), 0);
    assert_eq!(graph.graph.edge_count(), 0);
}
