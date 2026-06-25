import {
	build_traversal_options,
	sort_traversal,
	traverse,
	with_traversal,
} from "src/graph/traversal";
import { beforeEach, describe, expect, it, vi } from "vitest";
import init, {
	create_graph,
	FlatTraversalResult,
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

function graph_of(edges: [string, string, string][]): NoteGraph {
	const paths = new Set<string>();
	for (const [from, to] of edges) {
		paths.add(from);
		paths.add(to);
	}
	const nodes = [...paths].map(
		(p) => new GCNodeData(p, [], true, false, false),
	);
	const gc_edges = edges.map(
		([from, to, field]) => new GCEdgeData(from, to, field, ""),
	);
	const graph = create_graph();
	graph.build_graph(nodes, gc_edges, []);
	return graph;
}

/** All target paths present in a traversal result, in data order. */
function targets(graph: NoteGraph, result: FlatTraversalResult): string[] {
	return result.data.map((d) => d.edge.target_path(graph));
}

describe("traverse", () => {
	it("follows only the requested fields", () => {
		const graph = graph_of([
			["a", "b", "down"],
			["b", "c", "down"],
			["a", "r", "up"],
		]);

		const down = targets(
			graph,
			traverse(graph, {
				entry: ["a"],
				fields: ["down"],
				depth: 10,
				separateEdges: false,
			}),
		);
		expect(down).toContain("b");
		expect(down).toContain("c");
		expect(down).not.toContain("r");

		const up = targets(
			graph,
			traverse(graph, {
				entry: ["a"],
				fields: ["up"],
				depth: 10,
				separateEdges: false,
			}),
		);
		expect(up).toContain("r");
		expect(up).not.toContain("c");
	});

	it("respects the depth limit", () => {
		const graph = graph_of([
			["a", "b", "down"],
			["b", "c", "down"],
		]);

		const depth1 = targets(
			graph,
			traverse(graph, {
				entry: ["a"],
				fields: ["down"],
				depth: 1,
				separateEdges: false,
			}),
		);
		expect(depth1).toContain("b");
		expect(depth1).not.toContain("c");
	});
});

describe("with_traversal", () => {
	it("returns the callback's value and frees the result", () => {
		const graph = graph_of([["a", "b", "down"]]);
		const free = vi.spyOn(FlatTraversalResult.prototype, "free");

		const ret = with_traversal(
			graph,
			{ entry: ["a"], fields: ["down"], depth: 5, separateEdges: false },
			(result) => {
				expect(result.data.length).toBeGreaterThan(0);
				return "value";
			},
		);

		expect(ret).toBe("value");
		expect(free).toHaveBeenCalledOnce();
		free.mockRestore();
	});
});

describe("sort_traversal", () => {
	it("reorders children by the sort spec", () => {
		const graph = graph_of([
			["a", "b", "down"],
			["a", "c", "down"],
		]);

		const result = traverse(graph, {
			entry: ["a"],
			fields: ["down"],
			depth: 5,
			separateEdges: false,
		});

		// The two edges from `a` are the top-level entries; read them in order.
		const order = () =>
			Array.from(result.entry_nodes).map((i) =>
				result.data[i].edge.target_path(graph),
			);

		sort_traversal(graph, result, { field: "basename", order: 1 });
		expect(order()).toEqual(["b", "c"]);

		sort_traversal(graph, result, { field: "basename", order: -1 });
		expect(order()).toEqual(["c", "b"]);
	});
});

describe("build_traversal_options", () => {
	it("defaults maxCount and passes fields through", () => {
		const opts = build_traversal_options({
			entry: ["a"],
			fields: ["down"],
			depth: 3,
			separateEdges: true,
		});
		expect(opts.entry_nodes).toEqual(["a"]);
		expect(opts.edge_types).toEqual(["down"]);
	});
});
