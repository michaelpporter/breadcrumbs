import { Notice, normalizePath } from "obsidian";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import type {
	EdgeStruct,
	NodeData,
	NoteGraph,
} from "wasm/pkg/breadcrumbs_graph_wasm";
import {
	build_edge_audit,
	type EdgeAuditReport,
	type EdgeFact,
	type GraphFacts,
	type NodeFact,
} from "./analyze";

/**
 * Walk the live WASM graph and snapshot it to plain {@link GraphFacts}. Done
 * synchronously and up front so we never hold an {@link EdgeStruct} (which is
 * tied to the graph revision) across the later async file write.
 */
export const collect_graph_facts = (graph: NoteGraph): GraphFacts => {
	const nodes: NodeFact[] = [];
	const node_paths: string[] = [];

	graph.iterate_nodes((node: NodeData) => {
		nodes.push({ path: node.path, resolved: node.resolved });
		node_paths.push(node.path);
	});

	const edges: EdgeFact[] = [];

	for (const path of node_paths) {
		graph
			.get_outgoing_edges(path)
			.get_edges()
			.forEach((edge: EdgeStruct) => {
				edges.push({
					field: edge.edge_type,
					source: edge.source_path(graph),
					target: edge.target_path(graph),
					explicit: edge.explicit(graph),
					target_resolved: edge.target_resolved(graph),
				});
			});
	}

	return { nodes, edges };
};

/** `[[path]]`, dropping the `.md` extension for a clean wikilink. */
const link = (path: string) => `[[${path.replace(/\.md$/, "")}]]`;

const section = (heading: string, blurb: string, body: string[]) =>
	[`## ${heading}`, "", `*${blurb}*`, "", ...body].join("\n");

export const render_edge_audit_report = (
	report: EdgeAuditReport,
	generated_at: Date,
): string => {
	const {
		unused_fields,
		implied_only_fields,
		mergeable_groups,
		orphan_notes,
		dangling_edges,
	} = report;

	const p = (n: number) => String(n).padStart(2, "0");
	const stamp = `${generated_at.getFullYear()}-${p(generated_at.getMonth() + 1)}-${p(generated_at.getDate())} ${p(generated_at.getHours())}:${p(generated_at.getMinutes())}`;

	const lines: string[] = [
		"# Breadcrumbs edge audit",
		"",
		`> [!info] Generated ${stamp}. This is a read-only report — nothing in your vault was changed. Re-run **Breadcrumbs: Generate edge audit report** to refresh.`,
		"",
		"| Check | Count |",
		"| --- | --- |",
		`| Unused fields | ${unused_fields.length} |`,
		`| Implied-only fields | ${implied_only_fields.length} |`,
		`| Mergeable field groups | ${mergeable_groups.length} |`,
		`| Orphan notes | ${orphan_notes.length} |`,
		`| Dangling edges | ${dangling_edges.length} |`,
		"",
		section(
			"Unused fields",
			"Edge fields defined in settings that produce no edges in the graph.",
			unused_fields.length
				? unused_fields.map((f) => `- \`${f}\``)
				: ["None — every defined field is in use."],
		),
		"",
		section(
			"Implied-only fields",
			"Fields that only ever appear as implied edges — never produced explicitly.",
			implied_only_fields.length
				? implied_only_fields.map((f) => `- \`${f}\``)
				: ["None."],
		),
		"",
		section(
			"Mergeable fields",
			"Fields whose explicit edges are identical (same source → target). Consider merging them — applied manually.",
			mergeable_groups.length
				? mergeable_groups.map(
						(g) =>
							`- ${g.fields.map((f) => `\`${f}\``).join(", ")} — ${g.edge_count} identical edge${g.edge_count === 1 ? "" : "s"}`,
					)
				: ["None — no two fields share an identical edge set."],
		),
		"",
		section(
			"Orphan notes",
			"Notes with no breadcrumb edges in or out.",
			orphan_notes.length
				? orphan_notes.map((p) => `- ${link(p)}`)
				: ["None — every note is in the breadcrumb structure."],
		),
		"",
		section(
			"Dangling edges",
			"Edges pointing at notes that don't exist in the vault.",
			dangling_edges.length
				? dangling_edges.map(
						(e) =>
							`- ${link(e.source)} —\`${e.field}\`→ ${link(e.target)}`,
					)
				: ["None — every edge target exists."],
		),
		"",
	];

	return lines.join("\n");
};

export const generate_edge_audit_report = async (plugin: BreadcrumbsPlugin) => {
	const report_path = normalizePath(
		plugin.settings.commands.edge_audit.report_path ||
			"Breadcrumbs Edge Audit.md",
	);

	const facts = collect_graph_facts(plugin.graph);

	const report = build_edge_audit(facts, {
		field_labels: plugin.settings.edge_fields.map((f) => f.label),
		// Keep the report note itself off the orphan list.
		exclude_paths: [report_path],
	});

	const content = render_edge_audit_report(report, new Date());

	try {
		const existing = plugin.app.vault.getFileByPath(report_path);
		const file = existing
			? (await plugin.app.vault.modify(existing, content), existing)
			: await plugin.app.vault.create(report_path, content);

		await plugin.app.workspace.getLeaf(false).openFile(file);

		new Notice(`Edge audit written to "${report_path}"`);
	} catch (error) {
		log.error("generate-edge-audit-report >", error);
		new Notice(
			`Failed to write edge audit to "${report_path}". ${error instanceof Error ? error.message : error}`,
		);
	}
};
