use std::collections::HashMap;

use indexmap::IndexMap;
use itertools::{EitherOrBoth, Itertools};
use petgraph::stable_graph::NodeIndex;
use wasm_bindgen::prelude::*;
use web_time::Instant;

use crate::{
    data::{edge::EdgeData, edge_struct::EdgeStruct},
    edge_sorting::EdgeSorter,
    graph::NoteGraph,
    traversal::options::TraversalOptions,
    utils::{NoteGraphError, Result},
};

type AccumulatedEdgeMap<'a> = IndexMap<
    (NodeIndex<u32>, NodeIndex<u32>),
    (
        NodeIndex<u32>,
        NodeIndex<u32>,
        Vec<&'a EdgeData>,
        Vec<&'a EdgeData>,
    ),
    hashbrown::DefaultHashBuilder,
>;

#[derive(Default)]
pub struct AccumulatedEdgeHashMap<'a> {
    map: AccumulatedEdgeMap<'a>,
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct MermaidGraphOptions {
    #[wasm_bindgen(skip)]
    pub active_node: Option<String>,
    #[wasm_bindgen(skip)]
    pub init_line: String,
    #[wasm_bindgen(skip)]
    pub chart_type: String,
    #[wasm_bindgen(skip)]
    pub direction: String,
    #[wasm_bindgen(skip)]
    pub collapse_opposing_edges: bool,
    #[wasm_bindgen(skip)]
    pub edge_label_attributes: Vec<String>,
    #[wasm_bindgen(skip)]
    pub edge_sorter: Option<EdgeSorter>,
    #[wasm_bindgen(skip)]
    pub node_label_fn: Option<js_sys::Function>,
    #[wasm_bindgen(skip)]
    pub link_nodes: bool,
    #[wasm_bindgen(skip)]
    pub show_arrow_points: bool,
    #[wasm_bindgen(skip)]
    pub field_arrows: HashMap<String, String>,
}

#[wasm_bindgen]
impl MermaidGraphOptions {
    #[wasm_bindgen(constructor)]
    pub fn new(
        active_node: Option<String>,
        init_line: String,
        chart_type: String,
        direction: String,
        collapse_opposing_edges: bool,
        edge_label_attributes: Vec<String>,
        edge_sorter: Option<EdgeSorter>,
        node_label_fn: Option<js_sys::Function>,
        link_nodes: bool,
        show_arrow_points: bool,
        field_arrow_keys: Vec<String>,
        field_arrow_values: Vec<String>,
    ) -> MermaidGraphOptions {
        let field_arrows = field_arrow_keys
            .into_iter()
            .zip(field_arrow_values)
            .collect::<HashMap<String, String>>();

        MermaidGraphOptions {
            active_node,
            init_line,
            chart_type,
            direction,
            collapse_opposing_edges,
            edge_label_attributes,
            edge_sorter,
            node_label_fn,
            link_nodes,
            show_arrow_points,
            field_arrows,
        }
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{self:#?}")
    }
}

impl Default for MermaidGraphOptions {
    fn default() -> Self {
        MermaidGraphOptions {
            active_node: None,
            init_line: "%%{ init: { \"flowchart\": {} } }%%".to_string(),
            chart_type: "graph".to_string(),
            direction: "LR".to_string(),
            collapse_opposing_edges: true,
            edge_label_attributes: vec!["field".to_string()],
            edge_sorter: Some(EdgeSorter::default()),
            node_label_fn: None,
            link_nodes: false,
            show_arrow_points: false,
            field_arrows: HashMap::new(),
        }
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct MermaidGraphData {
    #[wasm_bindgen(getter_with_clone)]
    pub mermaid: String,
    pub traversal_time: u64,
    pub total_time: u64,
}

#[wasm_bindgen]
impl MermaidGraphData {
    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{self:#?}",)
    }
}

impl MermaidGraphData {
    pub fn new(mermaid: String, traversal_time: u64, total_time: u64) -> MermaidGraphData {
        MermaidGraphData {
            mermaid,
            traversal_time,
            total_time,
        }
    }
}

#[wasm_bindgen]
impl NoteGraph {
    pub fn generate_mermaid_graph(
        &self,
        traversal_options: TraversalOptions,
        diagram_options: MermaidGraphOptions,
    ) -> Result<MermaidGraphData> {
        let now = Instant::now();

        let (nodes, edges) = self.int_traverse_basic(&traversal_options)?;
        let mut edge_structs = edges
            .iter()
            .map(|edge| EdgeStruct::from_edge_ref(edge.1, self))
            .collect::<Vec<EdgeStruct>>();

        if let Some(edge_sorter) = &diagram_options.edge_sorter {
            edge_sorter.sort_edges(self, &mut edge_structs)?;
        }

        let traversal_elapsed = now.elapsed();

        let mut result = String::new();

        result.push_str(&diagram_options.init_line);
        result.push('\n');
        result.push_str(
            format!(
                "{} {}\n",
                diagram_options.chart_type, diagram_options.direction
            )
            .as_str(),
        );

        // accumulate edges by direction, so that we can collapse them in the next step
        let accumulated_edges = NoteGraph::int_accumulate_edges(
            self,
            edge_structs,
            diagram_options.collapse_opposing_edges,
            &diagram_options.field_arrows,
        )?;

        let mut unresolved_nodes = Vec::new();

        // add nodes to the graph
        for element in nodes.iter() {
            let weight = self.int_get_node_weight(element.0)?;

            let node_label = match diagram_options.node_label_fn {
                Some(ref function) => {
                    match function.call1(&JsValue::NULL, &weight.clone().into()) {
                        Ok(value) => value.as_string().unwrap_or(weight.path.clone()),
                        Err(e) => {
                            return Err(NoteGraphError::new(
                                format!("Error calling function: {e:?}").as_str(),
                            ));
                        }
                    }
                }
                None => weight.path.clone(),
            };

            result.push_str(&format!("    {}(\"{}\")\n", element.0.index(), node_label));
            if !weight.resolved {
                unresolved_nodes.push(element.0.index());
            }
        }

        // collapse edge data and add them to the graph
        for (from, to, forward, backward) in accumulated_edges.map.values() {
            if diagram_options.collapse_opposing_edges || backward.is_empty() {
                result.push_str(&self.generate_mermaid_edge(
                    from,
                    to,
                    forward,
                    backward,
                    &diagram_options,
                ));
            } else {
                result.push_str(&self.generate_mermaid_edge(
                    from,
                    to,
                    forward,
                    &Vec::new(),
                    &diagram_options,
                ));
                result.push_str(&self.generate_mermaid_edge(
                    to,
                    from,
                    backward,
                    &Vec::new(),
                    &diagram_options,
                ));
            }
        }

        let active_node_index = diagram_options
            .active_node
            .and_then(|node| self.int_get_node_index(&node));
        if let Some(index) = active_node_index {
            result.push_str(&format!("class {} BC-active-node\n", index.index()));
        }

        if !nodes.is_empty() && diagram_options.link_nodes {
            result.push_str(&format!(
                "class {} internal-link\n",
                nodes.iter().map(|(index, _)| index.index()).join(",")
            ));
        }

        if !unresolved_nodes.is_empty() {
            result.push_str(&format!(
                "class {} is-unresolved",
                unresolved_nodes.iter().map(usize::to_string).join(",")
            ));
        }

        let total_elapsed = now.elapsed();

        Ok(MermaidGraphData::new(
            result,
            traversal_elapsed.as_micros() as u64,
            total_elapsed.as_micros() as u64,
        ))
    }
}

impl NoteGraph {
    fn generate_mermaid_edge(
        &self,
        source: &NodeIndex<u32>,
        target: &NodeIndex<u32>,
        forward: &[&EdgeData],
        backward: &[&EdgeData],
        diagram_options: &MermaidGraphOptions,
    ) -> String {
        let mut label = String::new();

        let same_elements = forward
            .iter()
            .zip(backward.iter())
            .all(|(a, b)| a.edge_type == b.edge_type);
        let all_implied = !forward
            .iter()
            .zip_longest(backward.iter())
            .any(|pair| match pair {
                EitherOrBoth::Both(a, b) => a.explicit || b.explicit,
                EitherOrBoth::Left(a) => a.explicit,
                EitherOrBoth::Right(b) => b.explicit,
            });

        let arrow_type = match (backward.is_empty(), all_implied, diagram_options.show_arrow_points) {
            (true, true, _) => "-.->",
            (true, false, _) => "-->",
            (false, true, true) => "<-.->",
            (false, false, true) => "<--->",
            (false, true, false) => "-.-",
            (false, false, false) => "---",
        };

        label.push_str(
            forward
                .iter()
                .map(|edge| edge.attribute_label(&diagram_options.edge_label_attributes))
                .collect::<Vec<String>>()
                .join(", ")
                .as_str(),
        );

        if !same_elements && !backward.is_empty() {
            label.push_str(" | ");
            label.push_str(
                backward
                    .iter()
                    .map(|edge| edge.attribute_label(&diagram_options.edge_label_attributes))
                    .collect::<Vec<String>>()
                    .join(", ")
                    .as_str(),
            );
        }

        if label.is_empty() {
            format!("    {} {} {}\n", source.index(), arrow_type, target.index())
        } else {
            format!(
                "    {} {}|\"{}\"| {}\n",
                source.index(),
                arrow_type,
                label,
                target.index()
            )
        }
    }

    pub fn int_accumulate_edges<'a>(
        graph: &'a NoteGraph,
        edges: Vec<EdgeStruct>,
        collapse_opposing_edges: bool,
        field_arrows: &HashMap<String, String>,
    ) -> Result<AccumulatedEdgeHashMap<'a>> {
        let mut accumulated_edges = AccumulatedEdgeHashMap::default();

        // sorting the two node indices in the edge tuple could be a speedup, since then
        // only one lookup is needed

        for edge_struct in edges {
            edge_struct.check_revision(graph)?;

            let edge_data = edge_struct.edge_data_ref(graph).unwrap();
            let has_custom_arrow = field_arrows.contains_key(edge_data.edge_type.as_ref());

            // Edges with custom arrows must never merge into another entry.
            // Insert each under a synthetic key that is guaranteed unique so
            // it never collides with another entry, real or synthetic.
            if has_custom_arrow {
                let unique_key_target =
                    NodeIndex::new(usize::MAX - accumulated_edges.map.len());
                accumulated_edges.map.insert(
                    (edge_struct.source_index, unique_key_target),
                    (
                        edge_struct.source_index,
                        edge_struct.target_index,
                        vec![edge_data],
                        Vec::new(),
                    ),
                );
                continue;
            }

            let forward_dir = (edge_struct.source_index, edge_struct.target_index);

            let entry1 = accumulated_edges.map.get_mut(&forward_dir);
            if let Some((_, _, forward, _)) = entry1 {
                forward.push(edge_data);
                continue;
            }

            if collapse_opposing_edges {
                let backward_dir = (edge_struct.target_index, edge_struct.source_index);

                if let Some((_, _, _, backward)) = accumulated_edges.map.get_mut(&backward_dir) {
                    backward.push(edge_data);
                    continue;
                }
            }

            accumulated_edges.map.insert(
                forward_dir,
                (
                    edge_struct.source_index,
                    edge_struct.target_index,
                    vec![edge_data],
                    Vec::new(),
                ),
            );
        }

        Ok(accumulated_edges)
    }
}
