use std::rc::Rc;

use petgraph::prelude::EdgeRef;
use wasm_bindgen::prelude::wasm_bindgen;

use crate::{
    data::{
        NGEdgeIndex, NGEdgeRef, NGNodeIndex, NodeStringifyOptions, edge::EdgeData, node::NodeData,
    },
    graph::{NoteGraph, edge_matches_edge_filter_string},
    utils::{self, NoteGraphError},
};

#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub struct EdgeStruct {
    #[wasm_bindgen(skip)]
    pub source_index: NGNodeIndex,
    #[wasm_bindgen(skip)]
    pub target_index: NGNodeIndex,
    #[wasm_bindgen(skip)]
    pub edge_index: NGEdgeIndex,
    #[wasm_bindgen(skip)]
    pub edge_type: Rc<str>,
    /// refers to the revision of the graph when this edge was created
    revision: u32,
}

#[wasm_bindgen]
impl EdgeStruct {
    pub fn source_data(&self, graph: &NoteGraph) -> utils::Result<NodeData> {
        Ok(self.source_data_ref(graph)?.clone())
    }

    pub fn target_data(&self, graph: &NoteGraph) -> utils::Result<NodeData> {
        Ok(self.target_data_ref(graph)?.clone())
    }

    pub fn source_path(&self, graph: &NoteGraph) -> utils::Result<String> {
        Ok(self.source_data_ref(graph)?.path.clone())
    }

    pub fn target_path(&self, graph: &NoteGraph) -> utils::Result<String> {
        Ok(self.target_data_ref(graph)?.path.clone())
    }

    pub fn source_resolved(&self, graph: &NoteGraph) -> utils::Result<bool> {
        Ok(self.source_data_ref(graph)?.resolved)
    }

    pub fn target_resolved(&self, graph: &NoteGraph) -> utils::Result<bool> {
        Ok(self.target_data_ref(graph)?.resolved)
    }

    pub fn stringify_target(
        &self,
        graph: &NoteGraph,
        options: &NodeStringifyOptions,
    ) -> utils::Result<String> {
        Ok(options.stringify_node(self.target_data_ref(graph)?))
    }

    pub fn stringify_source(
        &self,
        graph: &NoteGraph,
        options: &NodeStringifyOptions,
    ) -> utils::Result<String> {
        Ok(options.stringify_node(self.source_data_ref(graph)?))
    }

    pub fn edge_data(&self, graph: &NoteGraph) -> utils::Result<EdgeData> {
        Ok(self.edge_data_ref(graph)?.clone())
    }

    #[wasm_bindgen(getter)]
    pub fn edge_type(&self) -> String {
        self.edge_type.to_string()
    }

    pub fn edge_source(&self, graph: &NoteGraph) -> utils::Result<String> {
        Ok(self.edge_data_ref(graph)?.get_edge_source())
    }

    pub fn explicit(&self, graph: &NoteGraph) -> utils::Result<bool> {
        Ok(self.edge_data_ref(graph)?.explicit)
    }

    pub fn round(&self, graph: &NoteGraph) -> utils::Result<u8> {
        Ok(self.edge_data_ref(graph)?.round)
    }

    pub fn get_attribute_label(
        &self,
        graph: &NoteGraph,
        attributes: Vec<String>,
    ) -> utils::Result<String> {
        Ok(self.edge_data_ref(graph)?.attribute_label(&attributes))
    }

    pub fn matches_edge_filter(
        &self,
        graph: &NoteGraph,
        edge_types: Option<Vec<String>>,
    ) -> utils::Result<bool> {
        Ok(edge_matches_edge_filter_string(
            self.edge_data_ref(graph)?,
            edge_types.as_ref(),
        ))
    }

    pub fn is_self_loop(&self) -> bool {
        self.source_index == self.target_index
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{self:#?}",)
    }
}

impl EdgeStruct {
    pub fn new(
        source_index: NGNodeIndex,
        target_index: NGNodeIndex,
        edge_index: NGEdgeIndex,
        edge_type: Rc<str>,
        revision: u32,
    ) -> EdgeStruct {
        EdgeStruct {
            source_index,
            target_index,
            edge_index,
            edge_type,
            revision,
        }
    }

    pub fn from_edge_ref(edge_ref: NGEdgeRef, graph: &NoteGraph) -> EdgeStruct {
        let source_index = edge_ref.source();
        let target_index = edge_ref.target();

        EdgeStruct::new(
            source_index,
            target_index,
            edge_ref.id(),
            Rc::clone(&edge_ref.weight().edge_type),
            graph.get_revision(),
        )
    }

    pub fn from_edge_data(
        edge_index: NGEdgeIndex,
        edge_data: &EdgeData,
        graph: &NoteGraph,
    ) -> Option<EdgeStruct> {
        let (source_index, target_index) = graph.graph.edge_endpoints(edge_index)?;

        Some(EdgeStruct::new(
            source_index,
            target_index,
            edge_index,
            Rc::clone(&edge_data.edge_type),
            graph.get_revision(),
        ))
    }

    pub fn edge_data_ref<'a>(&self, graph: &'a NoteGraph) -> utils::Result<&'a EdgeData> {
        self.check_revision(graph)?;
        graph
            .graph
            .edge_weight(self.edge_index)
            .ok_or(NoteGraphError::new("Edge not found"))
    }

    pub fn source_data_ref<'a>(&self, graph: &'a NoteGraph) -> utils::Result<&'a NodeData> {
        self.check_revision(graph)?;
        graph
            .graph
            .node_weight(self.source_index)
            .ok_or(NoteGraphError::new("Source node not found"))
    }

    pub fn target_data_ref<'a>(&self, graph: &'a NoteGraph) -> utils::Result<&'a NodeData> {
        self.check_revision(graph)?;
        graph
            .graph
            .node_weight(self.target_index)
            .ok_or(NoteGraphError::new("Source node not found"))
    }

    pub fn target_path_ref<'a>(&self, graph: &'a NoteGraph) -> utils::Result<&'a str> {
        Ok(&self.target_data_ref(graph)?.path)
    }

    pub fn source_path_ref<'a>(&self, graph: &'a NoteGraph) -> utils::Result<&'a str> {
        Ok(&self.source_data_ref(graph)?.path)
    }

    pub fn check_revision(&self, graph: &NoteGraph) -> utils::Result<()> {
        match graph.get_revision() == self.revision {
            true => Ok(()),
            false => Err(NoteGraphError::new(&format!(
                "Revision mismatch. Edge was created in revision {}, but current revision is {}",
                self.revision,
                graph.get_revision()
            ))),
        }
    }

    /// Non-throwing variant of [`Self::check_revision`]. Render paths (which
    /// can race with `apply_update`) should prefer this and skip stale
    /// edges instead of bubbling a `NoteGraphError`.
    pub fn is_current_revision(&self, graph: &NoteGraph) -> bool {
        graph.get_revision() == self.revision
    }
}
