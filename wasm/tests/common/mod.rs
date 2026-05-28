#![allow(dead_code)]

use breadcrumbs_graph_wasm::{
    data::construction::{GCEdgeData, GCNodeData},
    graph::NoteGraph,
};

/// Generate a tree of nodes with explicit down edges for testing purposes.
pub fn tdata_generate_tree(depth: u32, branches: u32) -> (Vec<GCNodeData>, Vec<GCEdgeData>) {
    let root = GCNodeData::new("root".to_string(), vec![], true, false, false);
    let mut edges = vec![];

    let mut stack = vec![];

    for i in 0..branches {
        stack.push(i.to_string());
        edges.push(GCEdgeData::new(
            "root".to_string(),
            i.to_string(),
            "down".to_string(),
            "typed-link".to_string(),
        ));
    }

    let mut nodes = vec![root];

    while !stack.is_empty() {
        let current = stack.pop().unwrap();

        if current.len() < depth as usize {
            for i in 0..branches {
                let next = format!("{}{}", current, i);
                edges.push(GCEdgeData::new(
                    current.clone(),
                    next.clone(),
                    "down".to_string(),
                    "typed-link".to_string(),
                ));
                stack.push(next);
            }
        }

        nodes.push(GCNodeData::new(current, vec![], true, false, false));
    }

    (nodes, edges)
}

pub fn tdata_to_graph(data: (Vec<GCNodeData>, Vec<GCEdgeData>)) -> NoteGraph {
    let mut graph = NoteGraph::new();

    graph.build_graph(data.0, data.1, vec![]).unwrap();

    graph
}
