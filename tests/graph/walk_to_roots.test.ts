import { walk_to_roots } from "src/graph/walk_to_roots";
import { beforeEach, describe, expect, test } from "vitest";
import init, {
	create_graph,
	GCEdgeData,
	GCNodeData,
	NoteGraph,
} from "wasm/pkg/breadcrumbs_graph_wasm";
import fs from "node:fs/promises";

beforeEach(async () => {
	const wasmSource = await fs.readFile(
		"wasm/pkg/breadcrumbs_graph_wasm_bg.wasm",
	);
	// @ts-ignore TS2345
	const wasmModule = await WebAssembly.compile(wasmSource);
	await init(wasmModule);
});

/** Build a graph from `[from, to, field?]` edge tuples (field defaults to "up"). */
function graph_of(edges: [string, string, string?][]): NoteGraph {
	const paths = new Set<string>();
	for (const [from, to] of edges) {
		paths.add(from);
		paths.add(to);
	}

	const nodes = [...paths].map(
		(p) => new GCNodeData(p, [], true, false, false),
	);
	const gc_edges = edges.map(
		([from, to, field]) => new GCEdgeData(from, to, field ?? "up", ""),
	);

	const graph = create_graph();
	graph.build_graph(nodes, gc_edges, []);
	return graph;
}

describe("walk_to_roots", () => {
	test("linear chain → the single root; a root is its own root", () => {
		const graph = graph_of([
			["a", "b"],
			["b", "c"],
		]);
		expect(walk_to_roots(graph, "a", ["up"])).toEqual(["c"]);
		// `c` has no up-edge — walking up from it returns itself.
		expect(walk_to_roots(graph, "c", ["up"])).toEqual(["c"]);
	});

	test("branching → every root reached", () => {
		const graph = graph_of([
			["a", "b"],
			["a", "c"],
		]);
		expect(walk_to_roots(graph, "a", ["up"]).sort()).toEqual(["b", "c"]);
	});

	test("cycle terminates and falls back to [start]", () => {
		const graph = graph_of([
			["a", "b"],
			["b", "a"],
		]);
		// Neither node is a true root (both have an up-edge), so the cycle
		// guard stops the walk and the fallback returns the start.
		expect(walk_to_roots(graph, "a", ["up"])).toEqual(["a"]);
	});

	test("ignores edges in other fields", () => {
		const graph = graph_of([
			["a", "b", "up"],
			["a", "c", "down"], // irrelevant when walking up
		]);
		expect(walk_to_roots(graph, "a", ["up"])).toEqual(["b"]);
	});

	test("depth cap stops the walk before a root beyond 50 levels", () => {
		// Chain n0 → n1 → … → n60. The true root (n60) sits past the 50-level
		// cap, so the walk never reaches it and falls back to [start].
		const edges: [string, string, string?][] = [];
		for (let i = 0; i < 60; i++) {
			edges.push([`n${i}`, `n${i + 1}`]);
		}
		const graph = graph_of(edges);

		const roots = walk_to_roots(graph, "n0", ["up"]);
		expect(roots).toEqual(["n0"]);
		expect(roots).not.toContain("n60");
	});
});
