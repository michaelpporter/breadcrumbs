import type { BreadcrumbsSettings } from "src/interfaces/settings";
import type { NodeData } from "wasm/pkg/breadcrumbs_graph_wasm";
import {
	MermaidGraphOptions,
	TransitiveGraphRule,
	TraversalOptions,
} from "wasm/pkg/breadcrumbs_graph_wasm";

const MERMAID_DIRECTIONS = ["LR", "RL", "TB", "BT"] as const;
type MermaidDirection = (typeof MERMAID_DIRECTIONS)[number];

const MERMAID_RENDERER = ["dagre", "elk"] as const;
type MermaidRenderer = (typeof MERMAID_RENDERER)[number];

const MERMAID_CURVE_STYLES = [
	"basis",
	"bumpX",
	"bumpY",
	"cardinal",
	"catmullRom",
	"linear",
	"monotoneX",
	"monotoneY",
	"natural",
	"step",
	"stepAfter",
	"stepBefore",
] as const;
// type MermaidCurveStyle = (typeof MERMAID_CURVE_STYLES)[number];

function _encode(code: string) {
	const bytes = new TextEncoder().encode(code);
	return btoa(String.fromCharCode(...bytes));
}

function to_image_link(code: string) {
	return `https://mermaid.ink/img/${_encode(code)}`;
}

interface MermaidState {
	code: string;
	mermaid: {
		theme: string;
	};
	updateDiagram: boolean;
	autoSync: boolean;
	editorMode?: "code" | "config";
	panZoom?: boolean;
	pan?: { x: number; y: number };
	zoom?: number;
}

// SOURCE: https://mermaid.js.org/ecosystem/tutorials.html#jupyter-integration-with-mermaid-js
function to_live_edit_link(code: string) {
	const state: MermaidState = {
		code,
		// NOTE: For some reason, having both true doesn't trigger the initial render?
		autoSync: false,
		updateDiagram: true,
		mermaid: { theme: "default" },
	};

	const encoded = _encode(JSON.stringify(state, undefined, 2));

	return `https://mermaid.live/edit#base64:${encoded}`;
}

/**
 * Creates an example mermaid graph for a transitive rule.
 *
 * @param rule
 * @returns
 */
function from_transitive_rule(
	rule: Pick<
		BreadcrumbsSettings["implied_relations"]["transitive"][number],
		"chain" | "close_field" | "close_reversed" | "name"
	>,
) {
	const wasm_rule = new TransitiveGraphRule(
		"",
		rule.chain.map((attr) => attr.field!),
		rule.close_field,
		1,
		false,
		rule.close_reversed,
	);

	const graph = wasm_rule.create_example_graph();

	return graph.generate_mermaid_graph(
		new TraversalOptions(["1"], undefined, 100, 1000, false, undefined),
		new MermaidGraphOptions(
			undefined,
			"",
			"graph",
			"LR",
			false,
			["field"],
			undefined,
			(node: NodeData) => node.path,
			false,
			false,
			[],
			[],
		),
	);
}

export const Mermaid = {
	// from_edges,
	from_transitive_rule,

	to_image_link,
	to_live_edit_link,

	RENDERERS: MERMAID_RENDERER,
	DIRECTIONS: MERMAID_DIRECTIONS,
	CURVE_STYLES: MERMAID_CURVE_STYLES,
};

export interface Mermaid {
	Renderer: MermaidRenderer;
	Direction: MermaidDirection;
}
