import { traverse } from "src/graph/traversal";
import type { EdgeFieldGroup } from "src/interfaces/settings";
import { build_canvas, semantic_edge_sides } from "src/utils/canvas";
import { beforeEach, describe, expect, test } from "vitest";
import init, {
	create_graph,
	GCEdgeData,
	GCNodeData,
	NoteGraph,
} from "wasm/pkg/breadcrumbs_graph_wasm";
import fs from "node:fs/promises";

const GROUPS: EdgeFieldGroup[] = [
	{ label: "ups", fields: ["up", "Всплыть"] },
	{ label: "downs", fields: ["down", "Нырнуть"] },
	{ label: "sames", fields: ["same"] },
	{ label: "nexts", fields: ["next"] },
	{ label: "prevs", fields: ["prev"] },
	{ label: "custom", fields: ["related"] },
];

describe("semantic_edge_sides", () => {
	test.each([
		["up", "top", "bottom"],
		["down", "bottom", "top"],
		["next", "right", "left"],
		["prev", "left", "right"],
		["same", "left", "right"],
	])("%s → %s/%s", (field, fromSide, toSide) => {
		expect(semantic_edge_sides(field, GROUPS)).toEqual({
			fromSide,
			toSide,
		});
	});

	test("maps custom field names by their group, not their name", () => {
		expect(semantic_edge_sides("Всплыть", GROUPS)).toEqual({
			fromSide: "top",
			toSide: "bottom",
		});
		expect(semantic_edge_sides("Нырнуть", GROUPS)).toEqual({
			fromSide: "bottom",
			toSide: "top",
		});
	});

	test("fields outside the default groups have no semantic sides", () => {
		expect(semantic_edge_sides("related", GROUPS)).toBeUndefined();
		expect(semantic_edge_sides("unknown", GROUPS)).toBeUndefined();
	});
});

describe("build_canvas semantic sides", () => {
	beforeEach(async () => {
		const wasmSource = await fs.readFile(
			"wasm/pkg/breadcrumbs_graph_wasm_bg.wasm",
		);
		// @ts-ignore TS2345
		const wasmModule = await WebAssembly.compile(wasmSource);
		await init(wasmModule);
	});

	function graph_of(edges: [string, string, string][]): NoteGraph {
		const paths = new Set(edges.flatMap(([from, to]) => [from, to]));
		const graph = create_graph();
		graph.build_graph(
			[...paths].map((p) => new GCNodeData(p, [], true, false, false)),
			edges.map(
				([from, to, field]) => new GCEdgeData(from, to, field, ""),
			),
			[],
		);
		return graph;
	}

	/** `fromNode→toNode` mapped to `fromSide/toSide`. */
	function sides(groups?: EdgeFieldGroup[]) {
		const graph = graph_of([
			["a", "b", "down"],
			["a", "c", "related"],
		]);
		const result = traverse(graph, {
			entry: ["a"],
			depth: 5,
			separateEdges: false,
			flatten: true,
		});
		const canvas = build_canvas(graph, result, "a", "LR", groups);
		result.free();

		return Object.fromEntries(
			canvas.edges.map((e) => [
				`${e.fromNode}→${e.toNode}`,
				`${e.fromSide}/${e.toSide}`,
			]),
		);
	}

	test("off by default: every edge uses the layout direction", () => {
		expect(sides()).toEqual({
			"a→b": "right/left",
			"a→c": "right/left",
		});
	});

	test("on: grouped fields use semantic sides, others the layout", () => {
		expect(sides(GROUPS)).toEqual({
			"a→b": "bottom/top",
			"a→c": "right/left",
		});
	});
});
