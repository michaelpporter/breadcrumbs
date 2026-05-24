use std::{collections::HashSet, rc::Rc};

use petgraph::visit::EdgeRef;
use wasm_bindgen::prelude::*;
use web_time::Instant;

use crate::{
    data::{
        NGEdgeIndex, NGEdgeRef, NGNodeIndex,
        edge_struct::EdgeStruct,
        traversal::{FlatTraversalResult, TraversalData, TraversalResult},
    },
    graph::{NoteGraph, edge_matches_edge_filter},
    traversal::options::{TraversalOptions, TraversalPostprocessOptions},
    utils::{
        BreadthFirstTraversalDataStructure, DepthFirstTraversalDataStructure,
        GraphTraversalDataStructure, NoteGraphError, Result,
    },
};

pub mod options;
pub mod path;

const TRAVERSAL_COUNT_LIMIT: u32 = 10_000;

pub type NodeVec<T> = Vec<(NGNodeIndex, T)>;
pub type EdgeVec<T> = Vec<(NGEdgeIndex, T)>;
pub type NodeEdgeVec<N, E> = (NodeVec<N>, EdgeVec<E>);

#[wasm_bindgen]
impl NoteGraph {
    /// Runs a recursive traversal of the graph.
    pub fn rec_traverse(&self, options: TraversalOptions) -> Result<TraversalResult> {
        let now = Instant::now();

        let mut result = Vec::new();
        let mut traversal_count = 0;

        let edge_types = options.edge_types_as_rcs().unwrap_or(self.int_edge_types());
        let allowed_targets = options.dataview_from_indices(self);

        for entry_node in &options.entry_nodes {
            let start_node = self
                .int_get_node_index(entry_node)
                .ok_or(NoteGraphError::new(&format!(
                    "Node \"{entry_node}\" not found"
                )))?;

            let mut visited: HashSet<NGNodeIndex> = HashSet::new();
            visited.insert(start_node);

            for edge in self.graph.edges(start_node) {
                if !edge_matches_edge_filter(edge.weight(), Some(&edge_types)) {
                    continue;
                }

                let target = edge.target();

                if let Some(ref allowed) = allowed_targets
                    && !allowed.contains(&target)
                {
                    continue;
                }

                if visited.contains(&target) {
                    continue;
                }

                let edge_struct = EdgeStruct::new(
                    start_node,
                    target,
                    edge.id(),
                    edge.weight().edge_type.clone(),
                    self.get_revision(),
                );

                traversal_count += 1;

                visited.insert(target);

                if options.separate_edges {
                    result.push(self.int_rec_traverse(
                        target,
                        edge_struct.clone(),
                        Some(&vec![edge_struct.edge_type]),
                        1,
                        options.max_depth,
                        &mut traversal_count,
                        options.max_traversal_count,
                        &allowed_targets,
                        &mut visited,
                    )?);
                } else {
                    result.push(self.int_rec_traverse(
                        target,
                        edge_struct,
                        Some(&edge_types),
                        1,
                        options.max_depth,
                        &mut traversal_count,
                        options.max_traversal_count,
                        &allowed_targets,
                        &mut visited,
                    )?);
                }
            }
        }

        let total_elapsed = now.elapsed();

        Ok(TraversalResult::new(
            result,
            total_elapsed.as_millis() as u64,
        ))
    }

    /// Runs a recursive traversal of the graph and post-processes the result.
    /// The post-processed result is more efficient to work with from
    /// JavaScript.
    pub fn rec_traverse_and_process(
        &self,
        options: TraversalOptions,
        postprocess_options: TraversalPostprocessOptions,
    ) -> Result<FlatTraversalResult> {
        let mut result = self.rec_traverse(options)?;

        if postprocess_options.flatten {
            result.squash(self)?;
        }

        if let Some(sorter) = &postprocess_options.sorter {
            result.sort(self, sorter)?;
        }

        Ok(result.flatten())
    }
}

impl NoteGraph {
    /// Recursively traverses the graph using DFS and builds a tree structure.
    ///
    /// Will return an error if the node weight for any node along the traversal
    /// is not found.
    fn int_rec_traverse(
        &self,
        node: NGNodeIndex,
        edge: EdgeStruct,
        edge_types: Option<&Vec<Rc<str>>>,
        depth: u32,
        max_depth: u32,
        traversal_count: &mut u32,
        max_traversal_count: u32,
        allowed_targets: &Option<HashSet<NGNodeIndex>>,
        visited: &mut HashSet<NGNodeIndex>,
    ) -> Result<TraversalData> {
        let mut new_children = Vec::new();
        let stop_traversal = depth >= max_depth || *traversal_count >= max_traversal_count;

        if !stop_traversal {
            for outgoing_edge in self.graph.edges(node) {
                let edge_data = outgoing_edge.weight();

                if edge_matches_edge_filter(edge_data, edge_types) {
                    let target = outgoing_edge.target();

                    if let Some(allowed) = allowed_targets
                        && !allowed.contains(&target)
                    {
                        continue;
                    }

                    if visited.contains(&target) {
                        continue;
                    }

                    let edge_struct = EdgeStruct::new(
                        edge.target_index,
                        target,
                        outgoing_edge.id(),
                        edge_data.edge_type.clone(),
                        self.get_revision(),
                    );

                    *traversal_count += 1;

                    if *traversal_count > TRAVERSAL_COUNT_LIMIT {
                        return Err(NoteGraphError::new(
                            "Traversal exceeded limit of 10,000 nodes. Try decreasing the max depth.",
                        ));
                    }

                    visited.insert(target);

                    new_children.push(self.int_rec_traverse(
                        target,
                        edge_struct,
                        edge_types,
                        depth + 1,
                        max_depth,
                        traversal_count,
                        max_traversal_count,
                        allowed_targets,
                        visited,
                    )?)
                }
            }
        }

        Ok(TraversalData::new(
            edge,
            depth,
            0,
            new_children,
            stop_traversal,
        ))
    }

    pub fn int_traverse_basic(
        &self,
        options: &TraversalOptions,
    ) -> Result<NodeEdgeVec<u32, NGEdgeRef<'_>>> {
        let entry_nodes = options.indices_of_entry_nodes(self)?;
        let opt_edge_types = options.edge_types_as_rcs();
        let allowed_targets = options.dataview_from_indices(self);

        if options.separate_edges {
            let mut node_list = Vec::new();
            let mut edge_list = Vec::new();

            let all_edge_types = self.int_edge_types();
            let edge_types = opt_edge_types.unwrap_or(all_edge_types);

            for edge_type in edge_types {
                let (nodes, edges) = self.int_traverse_breadth_first(
                    entry_nodes.clone(),
                    Some(&vec![edge_type]),
                    options.max_depth,
                    &allowed_targets,
                    |_, depth| depth,
                    |edge| edge,
                );

                node_list.extend(nodes);
                edge_list.extend(edges);
            }

            Ok((node_list, edge_list))
        } else {
            Ok(self.int_traverse_breadth_first(
                entry_nodes,
                opt_edge_types.as_ref(),
                options.max_depth,
                &allowed_targets,
                |_, depth| depth,
                |edge| edge,
            ))
        }
    }

    /// Traverses the tree in a depth first manner and calls the provided
    /// callbacks for each node and edge. The depth metric **might not**
    /// accurately represent the intuitive understanding of depth on a graph.
    /// A list of tuples of node indices and the result of the node callback and
    /// a list of tuples of edge indices and the result of the edge callback are
    /// returned. These lists are ordered by the order in which the nodes
    /// and edges were visited. Each node and edge is only visited once.
    /// At the depth limit, edges are only visited if they point to already
    /// visited nodes.
    pub fn int_traverse_depth_first<'a, N, E>(
        &'a self,
        entry_nodes: Vec<NGNodeIndex>,
        edge_types: Option<&Vec<Rc<str>>>,
        max_depth: u32,
        allowed_targets: &Option<HashSet<NGNodeIndex>>,
        node_callback: fn(NGNodeIndex, u32) -> N,
        edge_callback: fn(NGEdgeRef<'a>) -> E,
    ) -> NodeEdgeVec<N, E> {
        let mut data_structure = DepthFirstTraversalDataStructure::new();

        self.int_traverse_generic(
            &mut data_structure,
            entry_nodes,
            edge_types,
            max_depth,
            allowed_targets,
            node_callback,
            edge_callback,
        )
    }

    /// Traverses the tree in a breadth first manner and calls the provided
    /// callbacks for each node and edge. The depth metric accurately
    /// represent the intuitive understanding of depth on a graph. A list of
    /// tuples of node indices and the result of the node callback and a list of
    /// tuples of edge indices and the result of the edge callback are returned.
    /// These lists are ordered by the order in which the nodes and edges were
    /// visited. Each node and edge is only visited once.
    /// At the depth limit, edges are only visited if they point to already
    /// visited nodes.
    pub fn int_traverse_breadth_first<'a, N, E>(
        &'a self,
        entry_nodes: Vec<NGNodeIndex>,
        edge_types: Option<&Vec<Rc<str>>>,
        max_depth: u32,
        allowed_targets: &Option<HashSet<NGNodeIndex>>,
        node_callback: fn(NGNodeIndex, u32) -> N,
        edge_callback: fn(NGEdgeRef<'a>) -> E,
    ) -> NodeEdgeVec<N, E> {
        let mut data_structure = BreadthFirstTraversalDataStructure::new();

        self.int_traverse_generic(
            &mut data_structure,
            entry_nodes,
            edge_types,
            max_depth,
            allowed_targets,
            node_callback,
            edge_callback,
        )
    }

    fn int_traverse_generic<'a, N, E>(
        &'a self,
        traversal_data_structure: &mut impl GraphTraversalDataStructure<(NGNodeIndex, u32)>,
        entry_nodes: Vec<NGNodeIndex>,
        edge_types: Option<&Vec<Rc<str>>>,
        max_depth: u32,
        allowed_targets: &Option<HashSet<NGNodeIndex>>,
        node_callback: fn(NGNodeIndex, u32) -> N,
        edge_callback: fn(NGEdgeRef<'a>) -> E,
    ) -> NodeEdgeVec<N, E> {
        let mut node_list: NodeVec<N> = Vec::new();
        let mut edge_list: EdgeVec<E> = Vec::new();
        let mut visited_nodes: HashSet<NGNodeIndex> = HashSet::new();

        for node in entry_nodes {
            node_list.push((node, node_callback(node, 0)));
            visited_nodes.insert(node);
            traversal_data_structure.push((node, 0));
        }

        while !traversal_data_structure.is_empty() {
            let (current_node, current_depth) = traversal_data_structure.pop().unwrap();
            let at_depth_limit = current_depth >= max_depth;

            for edge in self.graph.edges(current_node) {
                let target = edge.target();
                let edge_data = edge.weight();

                if edge_matches_edge_filter(edge_data, edge_types) {
                    if let Some(allowed) = allowed_targets {
                        if !allowed.contains(&target) {
                            continue;
                        }
                    }

                    let already_visited = visited_nodes.contains(&target);

                    // we only add the edge if we are not at the depth limit or if we are at the
                    // depth limit and the target node is already in the depth map
                    // this captures all the outgoing edges from the nodes at the depth limit to
                    // nodes already present in the depth map
                    if !at_depth_limit || already_visited {
                        edge_list.push((edge.id(), edge_callback(edge)));
                    }

                    // we only insert the new node when we are not at the depth limit and the node
                    // is not already in the depth map
                    if !at_depth_limit && !already_visited {
                        node_list.push((target, node_callback(target, current_depth + 1)));
                        visited_nodes.insert(target);
                        traversal_data_structure.push((target, current_depth + 1));
                    }
                }
            }
        }

        (node_list, edge_list)
    }
}
