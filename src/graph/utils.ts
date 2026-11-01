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
 * The filter shape stored in `implied_relations.transitive[].chain`.
 */
export type EdgeAttrFilters = Partial<{
	field: string;
	explicit: boolean;
}> &
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
