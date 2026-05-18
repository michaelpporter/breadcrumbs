#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;

use breadcrumbs_graph_wasm::{
    data::{
        construction::{GCEdgeData, GCNodeData},
        rules::TransitiveGraphRule,
    },
    graph::NoteGraph,
    mermaid::MermaidGraphOptions,
    traversal::options::TraversalOptions,
};
use indoc::indoc;
use wasm_bindgen_test::*;

fn get_test_graph() -> NoteGraph {
    // a --up--> b --down--> c
    //  ^_______same________^

    let nodes = vec![
        GCNodeData::new("a.md".to_string(), vec![], true, false, false),
        GCNodeData::new("b.md".to_string(), vec![], true, false, false),
        GCNodeData::new("c.md".to_string(), vec![], true, false, false),
    ];

    let edges = vec![
        GCEdgeData::new(
            "a.md".to_string(),
            "b.md".to_string(),
            "up".to_string(),
            "".to_string(),
        ),
        GCEdgeData::new(
            "b.md".to_string(),
            "c.md".to_string(),
            "down".to_string(),
            "".to_string(),
        ),
    ];

    let rules = vec![
        TransitiveGraphRule::new(
            "".to_string(),
            vec!["up".to_string(), "down".to_string()],
            "same".to_string(),
            5,
            false,
            false,
        ),
        TransitiveGraphRule::new(
            "".to_string(),
            vec!["same".to_string()],
            "same".to_string(),
            5,
            false,
            true,
        ),
    ];

    let mut graph = NoteGraph::new();
    graph.build_graph(nodes, edges, rules).unwrap();
    graph
}

fn get_traversal_options() -> TraversalOptions {
    TraversalOptions::new(vec!["a.md".to_string()], None, 5, 100, false, None)
}

#[wasm_bindgen_test]
fn test_default_config() {
    let graph = get_test_graph();

    let mermaid = graph
        .generate_mermaid_graph(get_traversal_options(), MermaidGraphOptions::default())
        .unwrap();

    assert_eq!(
        mermaid.mermaid.trim(),
        indoc! {
            r#"
            %%{ init: { "flowchart": {} } }%%
            graph LR
                0("a.md")
                2("c.md")
                1("b.md")
                2 -.-|"same"| 0
                0 -->|"up"| 1
                1 -->|"down"| 2
            "#
        }
        .trim()
    );
}

#[wasm_bindgen_test]
fn test_active_node() {
    let graph = get_test_graph();

    let mut options = MermaidGraphOptions::default();

    options.active_node = Some("a.md".to_string());

    let mermaid = graph
        .generate_mermaid_graph(get_traversal_options(), options)
        .unwrap();

    assert_eq!(
        mermaid.mermaid.trim(),
        indoc! {
            r#"
            %%{ init: { "flowchart": {} } }%%
            graph LR
                0("a.md")
                2("c.md")
                1("b.md")
                2 -.-|"same"| 0
                0 -->|"up"| 1
                1 -->|"down"| 2
            class 0 BC-active-node
            "#
        }
        .trim()
    );
}

#[wasm_bindgen_test]
fn test_collapse_edges() {
    let graph = get_test_graph();

    let mut options = MermaidGraphOptions::default();

    options.collapse_opposing_edges = false;

    let mermaid = graph
        .generate_mermaid_graph(get_traversal_options(), options)
        .unwrap();

    assert_eq!(
        mermaid.mermaid.trim(),
        indoc! {
            r#"
            %%{ init: { "flowchart": {} } }%%
            graph LR
                0("a.md")
                2("c.md")
                1("b.md")
                2 -.->|"same"| 0
                0 -->|"up"| 1
                0 -.->|"same"| 2
                1 -->|"down"| 2
            "#
        }
        .trim()
    );
}

#[wasm_bindgen_test]
fn test_field_arrows_disable_collapse() {
    let graph = get_test_graph();

    let mut options = MermaidGraphOptions::default();
    options.field_arrows = std::collections::HashMap::from([
        ("same".to_string(), "==>".to_string()),
    ]);

    let mermaid = graph
        .generate_mermaid_graph(get_traversal_options(), options)
        .unwrap();

    let body = mermaid.mermaid.trim();
    // forward + backward 'same' edges share the same custom arrow ==> they
    // collapse into one bidirectional <==> edge.
    let bidir_count = body
        .lines()
        .filter(|l| l.contains("<==>") && l.contains(r#""same""#))
        .count();
    assert_eq!(
        bidir_count, 1,
        "expected exactly one bidirectional <==> 'same' line, got {bidir_count}:\n{body}"
    );
    let one_way_same = body
        .lines()
        .filter(|l| l.contains(r#""same""#) && !l.contains("<==>"))
        .count();
    assert_eq!(
        one_way_same, 0,
        "expected zero one-way 'same' lines when both sides share the arrow, got {one_way_same}:\n{body}"
    );
    assert!(
        body.contains(r#"0 -->|"up"| 1"#),
        "expected unchanged 'up' edge, got:\n{body}"
    );
    assert!(
        body.contains(r#"1 -->|"down"| 2"#),
        "expected unchanged 'down' edge, got:\n{body}"
    );
}

#[wasm_bindgen_test]
fn test_field_arrows_empty_is_default() {
    let graph = get_test_graph();

    let mut options = MermaidGraphOptions::default();
    options.field_arrows = std::collections::HashMap::new();

    let mermaid = graph
        .generate_mermaid_graph(get_traversal_options(), options)
        .unwrap();

    assert_eq!(
        mermaid.mermaid.trim(),
        indoc! {
            r#"
            %%{ init: { "flowchart": {} } }%%
            graph LR
                0("a.md")
                2("c.md")
                1("b.md")
                2 -.-|"same"| 0
                0 -->|"up"| 1
                1 -->|"down"| 2
            "#
        }
        .trim()
    );
}
