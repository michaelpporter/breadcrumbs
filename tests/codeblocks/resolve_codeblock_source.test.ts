import {
	resolve_codeblock_source,
	validate_codeblock_entry,
} from "src/codeblocks/resolve_codeblock_source";
import { beforeEach, describe, expect, test } from "vitest";
import init, {
	create_graph,
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

function graph_of(paths: string[]): NoteGraph {
	const nodes = paths.map((p) => new GCNodeData(p, [], true, false, false));
	const graph = create_graph();
	graph.build_graph(nodes, [], []);
	return graph;
}

describe("resolve_codeblock_source", () => {
	test("start-note override wins over file_path and active_file", () => {
		expect(
			resolve_codeblock_source(
				{ "start-note": "a", depth: [0, 3] },
				"b",
				"c",
				5,
			).source_path,
		).toBe("a");
	});

	test("falls back to file_path when no start-note", () => {
		expect(
			resolve_codeblock_source({ depth: [0, 3] }, "b", "c", 5)
				.source_path,
		).toBe("b");
	});

	test("falls back to active_file when no start-note or file_path", () => {
		expect(
			resolve_codeblock_source({ depth: [0, 3] }, "", "c", 5)
				.source_path,
		).toBe("c");
	});

	test("depth[1] finite → used as max_depth", () => {
		expect(
			resolve_codeblock_source({ depth: [0, 3] }, "b", undefined, 5)
				.max_depth,
		).toBe(3);
	});

	test("depth[1] === Infinity → falls back to the caller's default", () => {
		expect(
			resolve_codeblock_source(
				{ depth: [0, Infinity] },
				"b",
				undefined,
				5,
			).max_depth,
		).toBe(5);
	});
});

describe("validate_codeblock_entry", () => {
	test("node in graph → no error", () => {
		const graph = graph_of(["a"]);
		expect(validate_codeblock_entry(graph, "a")).toBeUndefined();
	});

	test("node not in graph → error message", () => {
		const graph = graph_of(["a"]);
		expect(validate_codeblock_entry(graph, "missing")).toBe(
			"The file does not exist in the graph.",
		);
	});
});
