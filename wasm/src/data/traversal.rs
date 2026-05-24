use itertools::Itertools;
use wasm_bindgen::{JsValue, prelude::wasm_bindgen};

use super::NodeStringifyOptions;
use crate::{
    data::edge_struct::EdgeStruct,
    edge_sorting::EdgeSorter,
    graph::NoteGraph,
    traversal::path::{Path, PathList},
    utils::Result,
};

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct TraversalData {
    /// the edge struct that was traversed
    #[wasm_bindgen(getter_with_clone)]
    pub edge: EdgeStruct,
    /// the depth of the node in the traversal
    pub depth: u32,
    /// the number of total children of the node, so also children of children
    pub number_of_children: u32,
    /// the children of the node
    #[wasm_bindgen(getter_with_clone)]
    pub children: Vec<TraversalData>,
    /// whether the node has a cut of children due to being at the depth limit
    /// of a traversal, or similar
    pub has_cut_of_children: bool,
}

#[wasm_bindgen]
impl TraversalData {
    #[wasm_bindgen(constructor)]
    pub fn new(
        edge: EdgeStruct,
        depth: u32,
        number_of_children: u32,
        children: Vec<TraversalData>,
        has_cut_of_children: bool,
    ) -> TraversalData {
        TraversalData {
            edge,
            depth,
            number_of_children,
            children,
            has_cut_of_children,
        }
    }

    pub fn rec_sort_children(&mut self, graph: &NoteGraph, sorter: &EdgeSorter) -> Result<()> {
        for child in &mut self.children {
            child.rec_sort_children(graph, sorter)?;
        }

        sorter.sort_traversal_data(graph, &mut self.children)
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{self:#?}")
    }
}

impl TraversalData {
    fn to_paths(&self) -> Vec<Path> {
        let mut paths = Vec::new();

        for child in &self.children {
            let mut child_paths = child.to_paths();

            for path in &mut child_paths {
                path.edges.insert(0, self.edge.clone());
            }

            paths.extend(child_paths);
        }

        if paths.is_empty() {
            paths.push(Path::new_start(self.edge.clone()));
        }

        paths
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct TraversalResult {
    #[wasm_bindgen(getter_with_clone)]
    pub data: Vec<TraversalData>,
    pub node_count: u32,
    pub max_depth: u32,
    pub hit_depth_limit: bool,
    pub traversal_time: u64,
}

#[wasm_bindgen]
impl TraversalResult {
    #[wasm_bindgen(constructor)]
    pub fn new(mut data: Vec<TraversalData>, traversal_time: u64) -> TraversalResult {
        let node_count = rec_count_children(&mut data);
        let max_depth = rec_find_max_depth(&data);
        let hit_depth_limit = data.iter().any(|datum| datum.has_cut_of_children);

        TraversalResult {
            data,
            node_count,
            max_depth,
            hit_depth_limit,
            traversal_time,
        }
    }

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{self:#?}")
    }

    pub fn to_paths(&self) -> PathList {
        let mut paths = Vec::new();

        for datum in &self.data {
            paths.extend(datum.to_paths());
        }

        paths.sort_by(|a, b| {
            let a_len = a.edges.len();
            let b_len = b.edges.len();

            a_len.cmp(&b_len)
        });

        PathList::new(paths)
    }
}

impl TraversalResult {
    /// Squashes the traversal data by removing the tree structure and
    /// deduplicating the edges by their target_path Essentially, this will
    /// result in some kind of reachability set.
    pub fn squash(&mut self, graph: &NoteGraph) -> Result<()> {
        let mut data = Vec::new();

        for datum in self.data.drain(..) {
            rec_squash_traversal_data(datum, &mut data);
        }

        for datum in &data {
            datum.edge.check_revision(graph)?;
        }

        data.dedup_by(|a, b| {
            a.edge.target_path(graph).unwrap() == b.edge.target_path(graph).unwrap()
        });

        self.data = data;

        Ok(())
    }

    pub fn sort(&mut self, graph: &NoteGraph, sorter: &EdgeSorter) -> Result<()> {
        for datum in &mut self.data {
            datum.rec_sort_children(graph, sorter)?;
        }

        sorter.sort_traversal_data(graph, &mut self.data)
    }

    pub fn flatten(self) -> FlatTraversalResult {
        FlatTraversalResult::from_traversal_result(self)
    }
}

/// Recursively counts the number of children of the given traversal data.
/// This also updates the number_of_children field of each traversal data.
fn rec_count_children(data: &mut [TraversalData]) -> u32 {
    let mut total_children = 0;

    for datum in data.iter_mut() {
        datum.number_of_children = rec_count_children(&mut datum.children);
        total_children += 1 + datum.number_of_children;
    }

    total_children
}

/// Recursively finds the maximum depth of the given traversal data.
fn rec_find_max_depth(data: &[TraversalData]) -> u32 {
    data.iter()
        .map(|datum| u32::max(rec_find_max_depth(&datum.children), datum.depth))
        .max()
        .unwrap_or(0)
}

fn rec_squash_traversal_data(mut data: TraversalData, result: &mut Vec<TraversalData>) {
    for child in data.children.drain(..) {
        rec_squash_traversal_data(child, result);
    }

    result.push(data);
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct FlatTraversalData {
    /// the edge struct that was traversed
    #[wasm_bindgen(getter_with_clone)]
    pub edge: EdgeStruct,
    /// the depth of the node in the traversal
    pub depth: u32,
    /// the number of total children of the node, so also children of children
    pub number_of_children: u32,
    /// the children of the node
    #[wasm_bindgen(getter_with_clone)]
    pub children: Vec<usize>,
    pub has_cut_of_children: bool,
}

impl FlatTraversalData {
    pub fn new(
        edge: EdgeStruct,
        depth: u32,
        number_of_children: u32,
        children: Vec<usize>,
        has_cut_of_children: bool,
    ) -> FlatTraversalData {
        FlatTraversalData {
            edge,
            depth,
            number_of_children,
            children,
            has_cut_of_children,
        }
    }
}

#[wasm_bindgen]
impl FlatTraversalData {
    pub fn get_attribute_label(
        &self,
        graph: &NoteGraph,
        attributes: Vec<String>,
    ) -> Result<String> {
        self.edge.get_attribute_label(graph, attributes)
    }

    pub fn to_js_rendering_obj(
        &self,
        graph: &NoteGraph,
        str_opt: &NodeStringifyOptions,
        attributes: Vec<String>,
    ) -> Result<JsValue> {
        let target_data = self.edge.target_data_ref(graph)?;
        let edge_data = self.edge.edge_data_ref(graph)?;

        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(
            &obj,
            &JsValue::from_str("link_display"),
            &JsValue::from_str(&str_opt.stringify_node(target_data)),
        );
        let _ = js_sys::Reflect::set(
            &obj,
            &JsValue::from_str("link_path"),
            &JsValue::from_str(&target_data.path),
        );
        let _ = js_sys::Reflect::set(
            &obj,
            &JsValue::from_str("target_resolved"),
            &JsValue::from_bool(target_data.resolved),
        );
        let _ = js_sys::Reflect::set(
            &obj,
            &JsValue::from_str("explicit"),
            &JsValue::from_bool(edge_data.explicit),
        );
        let _ = js_sys::Reflect::set(
            &obj,
            &JsValue::from_str("edge_source"),
            &JsValue::from_str(edge_data.edge_source.as_ref()),
        );
        let _ = js_sys::Reflect::set(
            &obj,
            &JsValue::from_str("attribute_label"),
            &JsValue::from_str(&self.get_attribute_label(graph, attributes)?),
        );
        let _ = js_sys::Reflect::set(
            &obj,
            &JsValue::from_str("has_cut_of_children"),
            &JsValue::from_bool(self.has_cut_of_children),
        );

        Ok(obj.into())
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct FlatTraversalResult {
    #[wasm_bindgen(getter_with_clone)]
    pub data: Vec<FlatTraversalData>,
    pub node_count: u32,
    pub max_depth: u32,
    pub hit_depth_limit: bool,
    pub traversal_time: u64,
    #[wasm_bindgen(getter_with_clone)]
    pub entry_nodes: Vec<usize>,
}

impl FlatTraversalResult {
    pub fn new(
        data: Vec<FlatTraversalData>,
        node_count: u32,
        max_depth: u32,
        hit_depth_limit: bool,
        traversal_time: u64,
        entry_nodes: Vec<usize>,
    ) -> FlatTraversalResult {
        FlatTraversalResult {
            data,
            node_count,
            max_depth,
            hit_depth_limit,
            traversal_time,
            entry_nodes,
        }
    }

    pub fn from_traversal_result(result: TraversalResult) -> FlatTraversalResult {
        let mut flat_data = Vec::new();
        let mut entry_nodes = Vec::new();

        for datum in result.data {
            entry_nodes.push(rec_flatten_traversal_data(datum, &mut flat_data));
        }

        FlatTraversalResult::new(
            flat_data,
            result.node_count,
            result.max_depth,
            result.hit_depth_limit,
            result.traversal_time,
            entry_nodes,
        )
    }
}

#[wasm_bindgen]
impl FlatTraversalResult {
    #[wasm_bindgen(js_name = toString)]
    pub fn to_fancy_string(&self) -> String {
        format!("{self:#?}")
    }

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    pub fn data_at_index(&self, index: usize) -> Option<FlatTraversalData> {
        self.data.get(index).cloned()
    }

    pub fn children_at_index(&self, index: usize) -> Option<Vec<usize>> {
        self.data.get(index).map(|datum| datum.children.clone())
    }

    pub fn rendering_obj_at_index(
        &self,
        index: usize,
        graph: &NoteGraph,
        str_opt: &NodeStringifyOptions,
        attributes: Vec<String>,
    ) -> Result<JsValue> {
        let Some(datum) = self.data.get(index) else {
            return Ok(JsValue::UNDEFINED);
        };
        // Render paths can race with `apply_update`. If the edge predates the
        // current graph revision, return undefined so the Svelte template
        // skips this row instead of throwing a revision-mismatch error.
        if !datum.edge.is_current_revision(graph) {
            return Ok(JsValue::UNDEFINED);
        }
        datum.to_js_rendering_obj(graph, str_opt, attributes)
    }

    /// Sorts the flat traversal data with a given edge sorter.
    /// This is not as efficient as sorting the traversal data before flattening
    /// it, but it's still a lot better than sorting then re-flatten.
    pub fn sort(&mut self, graph: &NoteGraph, sorter: &EdgeSorter) -> Result<()> {
        let cloned_edges = self
            .data
            .iter()
            .map(|datum| datum.edge.clone())
            .collect_vec();

        for datum in &mut self.data {
            sorter.sort_flat_traversal_data(graph, &cloned_edges, &mut datum.children)?;
        }
        sorter.sort_flat_traversal_data(graph, &cloned_edges, &mut self.entry_nodes)?;

        Ok(())
    }
}

fn rec_flatten_traversal_data(
    mut data: TraversalData,
    result: &mut Vec<FlatTraversalData>,
) -> usize {
    let children = data
        .children
        .drain(..)
        .map(|datum| rec_flatten_traversal_data(datum, result))
        .collect();

    result.push(FlatTraversalData::new(
        data.edge,
        data.depth,
        data.number_of_children,
        children,
        data.has_cut_of_children,
    ));
    result.len() - 1
}
