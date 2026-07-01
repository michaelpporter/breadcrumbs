import { resolve_tree_entry_paths } from "src/graph/resolve_tree_entry_paths";
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

const no_lock_no_find_root = {
	lock_view: false,
	lock_path: "",
	find_root: false,
	find_root_field_labels: [],
};

describe("resolve_tree_entry_paths", () => {
	test("no active file → undefined", () => {
		const graph = graph_of([["a", "b"]]);
		expect(
			resolve_tree_entry_paths(graph, undefined, no_lock_no_find_root),
		).toBeUndefined();
	});

	test("active file not in graph → undefined", () => {
		const graph = graph_of([["a", "b"]]);
		expect(
			resolve_tree_entry_paths(graph, "missing", no_lock_no_find_root),
		).toBeUndefined();
	});

	test("no lock, no find_root → the active file itself", () => {
		const graph = graph_of([["a", "b"]]);
		expect(
			resolve_tree_entry_paths(graph, "a", no_lock_no_find_root),
		).toEqual(["a"]);
	});

	test("lock_view with a valid lock_path → the locked path, ignoring active file", () => {
		const graph = graph_of([["a", "b"]]);
		expect(
			resolve_tree_entry_paths(graph, "a", {
				...no_lock_no_find_root,
				lock_view: true,
				lock_path: "b",
			}),
		).toEqual(["b"]);
	});

	test("lock_view with an invalid lock_path → falls through to find_root", () => {
		const graph = graph_of([["a", "b"]]);
		expect(
			resolve_tree_entry_paths(graph, "a", {
				lock_view: true,
				lock_path: "missing",
				find_root: true,
				find_root_field_labels: ["up"],
			}),
		).toEqual(["b"]);
	});

	test("lock_view with an invalid lock_path and find_root off → falls through to the active file", () => {
		const graph = graph_of([["a", "b"]]);
		expect(
			resolve_tree_entry_paths(graph, "a", {
				lock_view: true,
				lock_path: "missing",
				find_root: false,
				find_root_field_labels: [],
			}),
		).toEqual(["a"]);
	});

	test("find_root with labels → walks up to roots", () => {
		const graph = graph_of([
			["a", "b"],
			["b", "c"],
		]);
		expect(
			resolve_tree_entry_paths(graph, "a", {
				lock_view: false,
				lock_path: "",
				find_root: true,
				find_root_field_labels: ["up"],
			}),
		).toEqual(["c"]);
	});

	test("find_root true but no field labels → falls through to the active file", () => {
		const graph = graph_of([["a", "b"]]);
		expect(
			resolve_tree_entry_paths(graph, "a", {
				lock_view: false,
				lock_path: "",
				find_root: true,
				find_root_field_labels: [],
			}),
		).toEqual(["a"]);
	});

	test("lock_view and find_root both configured and valid → lock wins", () => {
		const graph = graph_of([
			["a", "b"],
			["b", "c"],
		]);
		expect(
			resolve_tree_entry_paths(graph, "a", {
				lock_view: true,
				lock_path: "b",
				find_root: true,
				find_root_field_labels: ["up"],
			}),
		).toEqual(["b"]);
	});
});
