import type { ExplicitEdgeSource } from "src/const/graph";
import type {
	BreadcrumbsSettings,
	ShowNodeOptions,
} from "src/interfaces/settings";
import { NodeStringifyOptions } from "wasm/pkg/breadcrumbs_graph_wasm";

export function to_node_stringify_options(
	settings: BreadcrumbsSettings | undefined,
	options: ShowNodeOptions,
): NodeStringifyOptions {
	const dendron_note = settings?.explicit_edge_sources?.dendron_note ?? {
		enabled: false,
	};

	return new NodeStringifyOptions(
		options.ext,
		options.folder,
		options.alias,
		dendron_note.enabled && dendron_note.display_trimmed
			? dendron_note.delimiter
			: undefined,
	);
}

/**
 * Legacy type
 *
 * @deprecated
 */
export type EdgeAttrFilters = Partial<
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	Pick<BCEdgeAttributes, "explicit" | "field">
> &
	Partial<{
		$or_fields: string[];
		$or_target_ids: string[];
	}>;

export const EDGE_ATTRIBUTES = [
	"field",
	"explicit",
	"source",
	"implied_kind",
	"round",
] as const;

export type EdgeAttribute = (typeof EDGE_ATTRIBUTES)[number];

/**
 * Legacy type
 *
 * @deprecated
 */
export type BCEdgeAttributes = {
	field: string;
} & (
	| {
			explicit: true;
			source: ExplicitEdgeSource;
	  }
	| {
			explicit: false;
			implied_kind: `transitive:${string}`;
			/** Which round of implied_building this edge got added in.
			 * Starts at 1 - you can think of real edges as being added in round 0.
			 * The way {@link BCGraph.safe_add_directed_edge} works, currently only the first instance of an edge will be added.
			 *   If the same edge tries again in a future round, _that_ one will be blocked.
			 */
			round: number;
	  }
);
