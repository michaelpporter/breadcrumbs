use std::rc::Rc;

use hashbrown::HashMap;
use petgraph::{
    Directed,
    stable_graph::{Edges, StableGraph},
    visit::{EdgeRef, IntoEdgeReferences, IntoNodeReferences, NodeRef},
};
use vec_collections::{AbstractVecSet, VecSet};
use wasm_bindgen::prelude::*;

use crate::{
    data::{
        NGEdgeIndex, NGEdgeRef, NGNodeIndex,
        construction::{GCEdgeData, GCNodeData},
        edge::EdgeData,
        edge_list::{EdgeList, GroupedEdgeList},
        edge_struct::EdgeStruct,
        node::NodeData,
        rules::TransitiveGraphRule,
    },
    update::{AddEdgeGraphUpdate, AddNoteGraphUpdate, batch::BatchGraphUpdate},
    utils::{LOGGER, NoteGraphError, PerfLogger, Result},
};

pub fn edge_matches_edge_filter(edge: &EdgeData, edge_types: Option<&Vec<Rc<str>>>) -> bool {
    match edge_types {
        Some(types) => types.contains(&edge.edge_type),
        None => true,
    }
}

pub fn edge_matches_edge_filter_string(edge: &EdgeData, edge_types: Option<&Vec<String>>) -> bool {
    match edge_types {
        // sadly we can't use contains with Rc<str> and String
        Some(types) => types.iter().any(|t| t == edge.edge_type.as_ref()),
        None => true,
    }
}

/// A graph that stores notes and their relationships.
///
/// INVARIANT: The edge type tracker should contain exactly the edge types that
/// are present in the graph.
///
/// INVARIANT: The node hash should contain exactly the node paths that are
/// present in the graph.
#[wasm_bindgen]
#[derive(Clone)]
pub struct NoteGraph {
    #[wasm_bindgen(skip)]
    pub graph: StableGraph<NodeData, EdgeData, Directed, u32>,
    #[wasm_bindgen(skip)]
    pub transitive_rules: Vec<TransitiveGraphRule>,
    #[wasm_bindgen(skip)]
    pub edge_types: VecSet<[Rc<str>; 16]>,
    #[wasm_bindgen(skip)]
    pub node_hash: HashMap<String, NGNodeIndex>,
    /// A JS function that is called after every update to the graph, notifying
    /// the JS side that there were changes in the graph, but not which changes.
    update_callback: Option<js_sys::Function>,
    /// A revision number that is incremented after every update.
    /// This can be used to check if the graph has changed.
    revision: u32,
}

#[wasm_bindgen]
impl NoteGraph {
    pub fn new() -> NoteGraph {
        NoteGraph {
            graph: StableGraph::<NodeData, EdgeData, Directed, u32>::default(),
            transitive_rules: Vec::new(),
            edge_types: VecSet::empty(),
            node_hash: HashMap::new(),
            update_callback: None,
            revision: 0,
        }
    }

    /// Set the update callback.
    /// This will be called after every update to the graph.
    pub fn set_update_callback(&mut self, callback: js_sys::Function) {
        self.update_callback = Some(callback);
    }

    /// Notify the JS side that the graph has been updated.
    pub fn notify_update(&self) {
        if let Some(callback) = &self.update_callback {
            match callback.call0(&JsValue::NULL) {
                Ok(_) => {}
                Err(e) => LOGGER.with(|l| {
                    l.warn(&format!(
                        "Error calling update notification function: {e:?}"
                    ))
                }),
            }
        }
    }

    /// Builds the graph from a list of nodes, edges, and transitive rules.
    /// All existing data in the graph is removed.
    pub fn build_graph(
        &mut self,
        nodes: Vec<GCNodeData>,
        edges: Vec<GCEdgeData>,
        transitive_rules: Vec<TransitiveGraphRule>,
    ) -> Result<()> {
        LOGGER.with(|l| l.info("Building Graph"));

        self.graph = StableGraph::<NodeData, EdgeData, Directed, u32>::default();
        self.edge_types = VecSet::empty();
        self.node_hash = HashMap::new();
        self.transitive_rules = transitive_rules;

        let mut update = BatchGraphUpdate::new();
        for data in nodes {
            AddNoteGraphUpdate::new(data).add_to_batch(&mut update);
        }
        for data in edges {
            AddEdgeGraphUpdate::new(data).add_to_batch(&mut update);
        }

        self.apply_update(update)
    }

    /// Applies a batch update to the graph.
    /// Throws an error if the update fails, and leave the graph in an
    /// inconsistent state.
    ///
    /// TODO: some security against errors leaving the graph in an inconsistent
    /// state. Maybe safely clear the entire graph.
    pub fn apply_update(&mut self, update: BatchGraphUpdate) -> Result<()> {
        let mut perf_logger = PerfLogger::new("Applying Update".to_owned());
        perf_logger.start_split("Removing implied edges".to_owned());

        self.int_remove_implied_edges();

        perf_logger.start_split("Applying updates".to_owned());

        // self.log();
        update.apply(self)?;
        // self.log();

        perf_logger.start_split("Rebuilding edge type tracker".to_owned());

        self.int_remove_orphan_unresolved_nodes();
        self.int_rebuild_edge_type_tracker();
        self.int_build_implied_edges(&mut perf_logger);
        self.revision += 1;

        perf_logger.start_split("Update notification callback".to_owned());

        self.notify_update();

        perf_logger.log();

        Ok(())
    }

    /// Iterate all nodes in the graph and call the provided function with each
    /// [NodeData].
    pub fn iterate_nodes(&self, f: &js_sys::Function) {
        let this = JsValue::NULL;

        self.graph.node_references().for_each(|node| {
            match f.call1(&this, &node.weight().clone().into()) {
                Ok(_) => {}
                Err(e) => LOGGER
                    .with(|l| l.warn(&format!("Error calling node iteration callback: {e:?}"))),
            }
        });
    }

    /// Iterate all edges in the graph and call the provided function with each
    /// [EdgeData].
    pub fn iterate_edges(&self, f: &js_sys::Function) {
        let this = JsValue::NULL;

        self.graph.edge_references().for_each(|edge| {
            match f.call1(&this, &edge.weight().clone().into()) {
                Ok(_) => {}
                Err(e) => LOGGER
                    .with(|l| l.warn(&format!("Error calling edge iteration callback: {e:?}",))),
            }
        });
    }

    /// Get all outgoing edges from a node.
    pub fn get_outgoing_edges(&self, node: String) -> EdgeList {
        let node_index = self.int_get_node_index(&node);

        EdgeList::from_vec(match node_index {
            Some(node_index) => self
                .int_iter_outgoing_edges(node_index)
                .map(|edge| EdgeStruct::from_edge_ref(edge, self))
                .collect(),
            None => Vec::new(),
        })
    }

    /// Get all outgoing edges from a node, filtered by edge type.
    pub fn get_filtered_outgoing_edges(
        &self,
        node: String,
        edge_types: Option<Vec<String>>,
    ) -> EdgeList {
        let node_index = self.int_get_node_index(&node);

        EdgeList::from_vec(match node_index {
            Some(node_index) => self
                .int_iter_outgoing_edges(node_index)
                .filter(|edge_ref| {
                    edge_matches_edge_filter_string(edge_ref.weight(), edge_types.as_ref())
                })
                .map(|edge| EdgeStruct::from_edge_ref(edge, self))
                .collect(),
            None => Vec::new(),
        })
    }

    /// Get all outgoing edges from a node, filtered and grouped by edge type.
    pub fn get_filtered_grouped_outgoing_edges(
        &self,
        node: String,
        edge_types: Option<Vec<String>>,
    ) -> GroupedEdgeList {
        GroupedEdgeList::from_edge_list(self.get_filtered_outgoing_edges(node, edge_types))
    }

    /// Get all incoming edges to a node.
    pub fn get_incoming_edges(&self, node: String) -> EdgeList {
        let node_index = self.int_get_node_index(&node);

        EdgeList::from_vec(match node_index {
            Some(node_index) => self
                .int_iter_incoming_edges(node_index)
                .map(|edge| EdgeStruct::from_edge_ref(edge, self))
                .collect(),
            None => Vec::new(),
        })
    }

    /// Checks if a node exists in the graph.
    pub fn has_node(&self, node: String) -> bool {
        self.node_hash.contains_key(&node)
    }

    /// Checks if a node is resolved.
    /// Returns false if the node is not found.
    pub fn is_node_resolved(&self, node: String) -> bool {
        self.int_get_node_index(&node)
            .and_then(|node_index| self.graph.node_weight(node_index))
            .map(|node| node.resolved)
            .unwrap_or(false)
    }

    pub fn get_node(&self, node: String) -> Option<NodeData> {
        self.int_get_node_index(&node)
            .and_then(|node_index| self.graph.node_weight(node_index).cloned())
    }

    /// Returns all edge types that are present in the graph.
    pub fn edge_types(&self) -> Vec<String> {
        self.edge_types.iter().map(|x| x.to_string()).collect()
    }

    pub fn log(&self) {
        LOGGER.with(|l| l.info(&format!("{:#?}", self.graph)));
    }
}

impl Default for NoteGraph {
    fn default() -> Self {
        Self::new()
    }
}

/// Internal methods, not exposed to the wasm interface.
impl NoteGraph {
    /// Get the current revision number of the graph, useful to check if
    /// [EdgeStruct]s have changed.
    pub fn get_revision(&self) -> u32 {
        self.revision
    }

    /// Builds the implied edges based on the transitive rules.
    pub fn int_build_implied_edges(&mut self, perf_logger: &mut PerfLogger) {
        let perf_split = perf_logger.start_split("Building Implied Edges".to_owned());

        let max_rounds = self
            .transitive_rules
            .iter()
            .map(|rule| rule.rounds())
            .max()
            .unwrap_or(0);

        // rules look like
        // [A, B, C] -> D

        // We can keep track of edge types that were added in the last round and only
        // check a rule that has any of those edge types on the left side.
        // A rule like [A, B] -> C would do nothing if applied
        // multiple times, since the edges on the left side were not modified.

        let mut edge_type_tracker = self.edge_types.clone();
        let mut edges_to_add: Vec<(NGNodeIndex, NGNodeIndex, &TransitiveGraphRule)> = Vec::new();
        // we reuse these two vectors to avoid allocations
        let mut node_vec_1: Vec<NGNodeIndex> = Vec::new();
        let mut node_vec_2: Vec<NGNodeIndex> = Vec::new();

        for i in 1..=max_rounds {
            let round_perf_split = perf_split.start_split(format!("Round {i}",));

            // if the edge type tracker is empty, we didn't add any edges last round, so we
            // can stop
            if edge_type_tracker.is_empty() {
                break;
            }

            round_perf_split.start_split("Applying Rules".to_string());

            for rule in self.transitive_rules.iter() {
                // if there is any edge type that the graph doesn't have, we can skip the rule
                if rule
                    .iter_path()
                    .any(|edge_type| !self.edge_types.contains(edge_type))
                {
                    continue;
                }

                // if all edge types of a rule didn't see any changes in the last round, we can
                // skip the rule
                if rule
                    .iter_path()
                    .all(|edge_type| !edge_type_tracker.contains(edge_type))
                {
                    continue;
                }

                // For every rule (outer loop) we iterate over all nodes in the graph (this
                // loop) and check for all possible applications of that rule
                // for that node.
                for start_node in self.graph.node_indices() {
                    node_vec_1.clear();
                    node_vec_2.clear();

                    // We start with the start node.
                    node_vec_1.push(start_node);

                    // Now we iterate the path of the rule and each step, for all current nodes,
                    // we check for outgoing edges that match the edge type of the current element
                    // of the rule path.
                    for edge_type in rule.iter_path() {
                        for current_node in &node_vec_1 {
                            for edge in self.graph.edges(*current_node) {
                                if edge.weight().edge_type == *edge_type {
                                    node_vec_2.push(edge.target());
                                }
                            }
                        }

                        std::mem::swap(&mut node_vec_1, &mut node_vec_2);
                        node_vec_2.clear();
                    }

                    // Now we are left with end nodes. For each end node, there exists a path from
                    // the start node to the end node that matches the rule.
                    for end_node in &node_vec_1 {
                        // If the rule can't loop, that means the start and end nodes can't be the
                        // same.
                        if !rule.can_loop() && start_node == *end_node {
                            continue;
                        }

                        if rule.close_reversed() {
                            edges_to_add.push((*end_node, start_node, rule));
                        } else {
                            edges_to_add.push((start_node, *end_node, rule));
                        }
                    }
                }
            }

            // if there are no edges to add, we can stop
            if edges_to_add.is_empty() {
                break;
            }

            edge_type_tracker.retain(|_| false);

            round_perf_split.start_split(format!("Adding {} Edges", edges_to_add.len()));

            for (from, to, rule) in edges_to_add.drain(..) {
                if self.int_has_edge(from, to, rule.edge_type_ref()) {
                    continue;
                }

                self.edge_types.insert(rule.edge_type());
                edge_type_tracker.insert(rule.edge_type());

                self.graph.add_edge(
                    from,
                    to,
                    EdgeData::new(rule.edge_type(), rule.name(), false, i),
                );
            }

            round_perf_split.stop();
        }

        perf_split.stop();
    }

    pub fn int_rebuild_edge_type_tracker(&mut self) {
        self.edge_types = VecSet::empty();

        for edge in self.graph.edge_references() {
            self.edge_types.insert(Rc::clone(&edge.weight().edge_type));
        }
    }

    /// Removes all implied edges from the graph.
    ///
    /// INVARIANTS: This does not update the edge type tracker.
    pub fn int_remove_implied_edges(&mut self) {
        let edge_count = self.graph.edge_count();

        self.graph.retain_edges(|frozen_graph, edge| {
            let weight = frozen_graph.edge_weight(edge).unwrap();

            weight.explicit
        });

        LOGGER.with(|l| {
            l.debug(&format!(
                "Removed {} implied edges, {} explicit edges remain",
                edge_count - self.graph.edge_count(),
                self.graph.edge_count()
            ))
        });
    }

    /// Removes all unresolved notes with no incoming or outgoing edges.
    ///
    /// INVARIANT: This updates the node hash.
    /// INVARIANT: This keeps the edge type tracker up to date, as only nodes
    /// with no connecting edges are removed.
    pub fn int_remove_orphan_unresolved_nodes(&mut self) {
        let mut nodes_to_remove: Vec<(NGNodeIndex, String)> = Vec::new();

        for node in self.graph.node_indices() {
            let node_weight = self.graph.node_weight(node).unwrap();

            if !node_weight.resolved
                && !self.int_has_incoming_edges(node)
                && !self.int_has_outgoing_edges(node)
            {
                nodes_to_remove.push((node, node_weight.path.clone()));
            }
        }

        for (node_index, name) in nodes_to_remove {
            self.node_hash.remove(&name);
            self.graph.remove_node(node_index);
        }
    }

    // ---------------------
    // Node Methods
    // ---------------------

    pub fn int_node_count(&self) -> usize {
        self.graph.node_count()
    }

    /// Get the node index for a given node path.
    /// Returns `None` if there is no node with that path.
    pub fn int_get_node_index(&self, node: &str) -> Option<NGNodeIndex> {
        self.node_hash.get(node).copied()
    }

    /// Returns the [NodeData] for a specific node index.
    ///
    /// Will return an error if the node is not found.
    pub fn int_get_node_weight(&self, node: NGNodeIndex) -> Result<&NodeData> {
        self.graph.node_weight(node).ok_or(NoteGraphError::new(
            "failed to get node weight, node not found",
        ))
    }

    pub fn int_get_node_weight_mut(&mut self, node: NGNodeIndex) -> Result<&mut NodeData> {
        self.graph.node_weight_mut(node).ok_or(NoteGraphError::new(
            "failed to get node weight, node not found",
        ))
    }

    pub fn int_has_incoming_edges(&self, node: NGNodeIndex) -> bool {
        self.graph
            .edges_directed(node, petgraph::Direction::Incoming)
            .next()
            .is_some()
    }

    pub fn int_has_outgoing_edges(&self, node: NGNodeIndex) -> bool {
        self.graph
            .edges_directed(node, petgraph::Direction::Outgoing)
            .next()
            .is_some()
    }

    pub fn int_iter_incoming_edges(&self, node: NGNodeIndex) -> Edges<'_, EdgeData, Directed, u32> {
        self.graph
            .edges_directed(node, petgraph::Direction::Incoming)
    }

    pub fn int_iter_outgoing_edges(&self, node: NGNodeIndex) -> Edges<'_, EdgeData, Directed, u32> {
        self.graph
            .edges_directed(node, petgraph::Direction::Outgoing)
    }

    // ---------------------
    // Edge Methods
    // ---------------------

    pub fn int_edge_count(&self) -> usize {
        self.graph.edge_count()
    }

    /// Gets an edge between two nodes based on a specific edge type.
    /// Returns None if the edge does not exist.
    pub fn int_get_edge(
        &self,
        from: NGNodeIndex,
        to: NGNodeIndex,
        edge_type: &str,
    ) -> Option<NGEdgeRef<'_>> {
        self.graph
            .edges(from)
            .find(|e| e.target() == to && *e.weight().edge_type == *edge_type)
    }

    /// Gets an edge between two nodes based on a specific edge type.
    /// Returns None if the edge does not exist.
    pub fn int_get_edge_by_name(
        &self,
        from: &str,
        to: &str,
        edge_type: &str,
    ) -> Option<NGEdgeRef<'_>> {
        let from_index = self.int_get_node_index(from)?;
        let to_index = self.int_get_node_index(to)?;

        self.int_get_edge(from_index, to_index, edge_type)
    }

    /// Checks if an edge exists between two nodes with a specific edge type.
    pub fn int_has_edge(&self, from: NGNodeIndex, to: NGNodeIndex, edge_type: &str) -> bool {
        self.graph
            .edges(from)
            .any(|e| e.target() == to && *e.weight().edge_type == *edge_type)
    }

    /// Checks if an edge exists between two nodes with a specific edge type.
    pub fn int_has_edge_by_name(&self, from: &str, to: &str, edge_type: &str) -> bool {
        let from_index = self.int_get_node_index(from);
        let to_index = self.int_get_node_index(to);

        match (from_index, to_index) {
            (Some(from_index), Some(to_index)) => {
                self.int_has_edge(from_index, to_index, edge_type)
            }
            _ => false,
        }
    }

    /// Get a reference to the edge weight for a specific edge index.
    ///
    /// Will return an error if the edge is not found.
    pub fn int_get_edge_weight(&self, edge: NGEdgeIndex) -> Result<&EdgeData> {
        self.graph.edge_weight(edge).ok_or(NoteGraphError::new(
            "failed to get edge weight, edge not found",
        ))
    }

    /// Get a mutable reference to the edge weight for a specific edge index.
    ///
    /// Will return an error if the edge is not found.
    pub fn int_get_edge_weight_mut(&mut self, edge: NGEdgeIndex) -> Result<&mut EdgeData> {
        self.graph.edge_weight_mut(edge).ok_or(NoteGraphError::new(
            "failed to get edge weight, edge not found",
        ))
    }

    pub fn int_edge_types(&self) -> Vec<Rc<str>> {
        self.edge_types.iter().cloned().collect()
    }

    // ----------------
    // Debugging
    // ----------------

    pub fn assert_correct_trackers(&self) {
        let mut edge_types: VecSet<[Rc<str>; 16]> = VecSet::empty();

        for edge in self.graph.edge_references() {
            edge_types.insert(edge.weight().edge_type.clone());
        }

        assert_eq!(edge_types, self.edge_types);

        let mut node_hash: HashMap<String, NGNodeIndex> = HashMap::new();

        for node_ref in self.graph.node_references() {
            node_hash.insert(node_ref.weight().path.clone(), node_ref.id());
        }

        assert_eq!(node_hash, self.node_hash);
    }
}
