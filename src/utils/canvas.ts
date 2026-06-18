import type {
	FlatTraversalResult,
	NoteGraph,
} from "wasm/pkg/breadcrumbs_graph_wasm";
import { Paths } from "./paths";

/** A node in the JSON Canvas format (jsoncanvas.org). */
interface CanvasNode {
	id: string;
	type: "file";
	file: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

type CanvasSide = "top" | "right" | "bottom" | "left";

/** An edge in the JSON Canvas format. */
interface CanvasEdge {
	id: string;
	fromNode: string;
	toNode: string;
	fromSide: CanvasSide;
	toSide: CanvasSide;
	label: string;
}

export interface JSONCanvas {
	nodes: CanvasNode[];
	edges: CanvasEdge[];
}

/** Layout direction: left-to-right (depth = columns) or top-to-bottom (depth = rows). */
export type CanvasDirection = "LR" | "TB";

const NODE_W = 260;
const NODE_H = 80;

// Spacing along each axis. The "depth" axis advances one level per hop; the
// "cross" axis separates siblings. TB needs more cross room (nodes are wide)
// and LR needs more depth room, so the steps differ per direction.
const STEP = {
	LR: { depth: 400, cross: 120 },
	TB: { depth: 200, cross: 320 },
} as const;

/** depth + cross-axis slot for one node, resolved into x/y per direction. */
interface Placement {
	depth: number;
	cross: number;
}

/**
 * Lays out a traversal result as a JSON Canvas. Nodes are placed as a tidy
 * tree: depth sets the level, and each parent is centred over the span of its
 * children (leaves get sequential cross-axis slots). Each traversed edge
 * becomes a labelled canvas edge.
 */
export function build_canvas(
	graph: NoteGraph,
	result: FlatTraversalResult,
	source_path: string,
	direction: CanvasDirection = "LR",
): JSONCanvas {
	// LR: depth runs along x; TB: depth runs along y.
	const lr = direction === "LR";
	const from_side: CanvasSide = lr ? "right" : "bottom";
	const to_side: CanvasSide = lr ? "left" : "top";
	const step = STEP[direction];

	const data = result.data;

	// Forest roots = data entries that are nobody's child (the first hops).
	const is_child = new Set<number>();
	for (const datum of data) {
		for (const c of datum.children) is_child.add(c);
	}

	// Recursively assign a cross-axis slot per path. Leaves take the next free
	// slot; parents take the midpoint of their children. A path is laid out
	// once (DAG nodes with multiple parents keep their first position).
	const placements = new Map<string, Placement>();
	let next_slot = 0;

	const layout = (index: number): number => {
		const datum = data[index];
		const path = datum.edge.target_path(graph);

		const existing = placements.get(path);
		if (existing) return existing.cross;

		const kids = Array.from(datum.children);
		let cross: number;
		if (kids.length === 0) {
			cross = next_slot++;
		} else {
			const child_crosses = kids.map(layout);
			cross =
				(Math.min(...child_crosses) + Math.max(...child_crosses)) / 2;
		}

		placements.set(path, { depth: datum.depth, cross });
		return cross;
	};

	const root_crosses = data
		.map((_, i) => i)
		.filter((i) => !is_child.has(i))
		.map(layout);

	// The source note sits at depth 0, centred over its roots.
	placements.set(source_path, {
		depth: 0,
		cross: root_crosses.length
			? (Math.min(...root_crosses) + Math.max(...root_crosses)) / 2
			: 0,
	});

	const nodes: CanvasNode[] = [];
	for (const [path, { depth, cross }] of placements) {
		nodes.push({
			id: path,
			type: "file",
			file: path,
			x: (lr ? depth : cross) * (lr ? step.depth : step.cross),
			y: (lr ? cross : depth) * (lr ? step.cross : step.depth),
			width: NODE_W,
			height: NODE_H,
		});
	}

	const edges: CanvasEdge[] = [];
	const edge_ids = new Set<string>();

	for (const datum of data) {
		const from = datum.edge.source_path(graph);
		const to = datum.edge.target_path(graph);

		const edge_id = `${from}|${to}|${datum.edge.edge_type}`;
		if (edge_ids.has(edge_id)) continue;
		edge_ids.add(edge_id);

		edges.push({
			id: edge_id,
			fromNode: from,
			toNode: to,
			fromSide: from_side,
			toSide: to_side,
			label: datum.edge.edge_type,
		});
	}

	return { nodes, edges };
}

export const Canvas = {
	build_canvas,
	ensure_ext: (path: string) => Paths.ensure_ext(path, "canvas"),
};
