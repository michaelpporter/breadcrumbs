/**
 * Pure, read-only analysis for the edge audit report. Everything here operates
 * over plain {@link GraphFacts} (snapshotted from the WASM graph in `index.ts`),
 * so it carries no Obsidian or WASM dependency and is unit-testable with literals.
 *
 * The audit only ever *reports* — it never rewrites frontmatter. Breadcrumbs
 * reads edges, it doesn't own the notes' fields.
 */

/** A note in the graph. `resolved` is false for link targets with no backing file. */
export interface NodeFact {
	path: string;
	resolved: boolean;
}

/** A single directed, typed edge, snapshotted to plain data. */
export interface EdgeFact {
	field: string;
	source: string;
	target: string;
	explicit: boolean;
	/** Whether the target note actually exists in the vault. */
	target_resolved: boolean;
}

export interface GraphFacts {
	nodes: NodeFact[];
	edges: EdgeFact[];
}

/** Two or more fields whose explicit edges are identical (provably interchangeable). */
export interface MergeableGroup {
	fields: string[];
	edge_count: number;
}

export interface DanglingEdge {
	field: string;
	source: string;
	target: string;
}

export interface EdgeAuditReport {
	unused_fields: string[];
	implied_only_fields: string[];
	mergeable_groups: MergeableGroup[];
	orphan_notes: string[];
	dangling_edges: DanglingEdge[];
}

/** Stable key for a directed (source → target) edge pair. */
const pair_key = (e: EdgeFact) => `${e.source}\n${e.target}`;

/** Edge fields defined in settings that produce no edges at all (explicit or implied). */
export const find_unused_fields = (
	facts: GraphFacts,
	field_labels: string[],
): string[] => {
	const present = new Set(facts.edges.map((e) => e.field));
	return field_labels.filter((label) => !present.has(label));
};

/** Fields that exist in the graph but are *only* ever produced as implied edges. */
export const find_implied_only_fields = (facts: GraphFacts): string[] => {
	const all_fields = new Set<string>();
	const has_explicit = new Set<string>();

	for (const e of facts.edges) {
		all_fields.add(e.field);
		if (e.explicit) has_explicit.add(e.field);
	}

	return [...all_fields].filter((f) => !has_explicit.has(f)).sort();
};

/**
 * Fields whose *explicit* edge sets are strictly identical — same set of
 * directed (source → target) pairs. Zero false positives: such fields are
 * provably interchangeable, so the report suggests (never applies) a merge.
 */
export const find_mergeable_fields = (facts: GraphFacts): MergeableGroup[] => {
	const pairs_by_field = new Map<string, Set<string>>();

	for (const e of facts.edges) {
		if (!e.explicit) continue;

		let set = pairs_by_field.get(e.field);
		if (!set) {
			set = new Set();
			pairs_by_field.set(e.field, set);
		}
		set.add(pair_key(e));
	}

	// Group fields by the canonical signature of their pair set.
	const by_signature = new Map<string, { fields: string[]; count: number }>();

	for (const [field, set] of pairs_by_field) {
		if (set.size === 0) continue;

		const signature = [...set].sort().join("");

		const group = by_signature.get(signature);
		if (group) {
			group.fields.push(field);
		} else {
			by_signature.set(signature, { fields: [field], count: set.size });
		}
	}

	return [...by_signature.values()]
		.filter((g) => g.fields.length > 1)
		.map((g) => ({ fields: g.fields.sort(), edge_count: g.count }))
		.sort((a, b) => a.fields[0].localeCompare(b.fields[0]));
};

/**
 * Resolved notes with no edges in or out — outside the breadcrumb structure.
 * `exclude_paths` keeps the report file itself off the list.
 */
export const find_orphan_notes = (
	facts: GraphFacts,
	exclude_paths: string[] = [],
): string[] => {
	const connected = new Set<string>();
	for (const e of facts.edges) {
		connected.add(e.source);
		connected.add(e.target);
	}

	const excluded = new Set(exclude_paths);

	return facts.nodes
		.filter(
			(n) => n.resolved && !connected.has(n.path) && !excluded.has(n.path),
		)
		.map((n) => n.path)
		.sort();
};

/** Edges whose target note doesn't exist in the vault. */
export const find_dangling_edges = (facts: GraphFacts): DanglingEdge[] =>
	facts.edges
		.filter((e) => !e.target_resolved)
		.map((e) => ({ field: e.field, source: e.source, target: e.target }))
		.sort(
			(a, b) =>
				a.source.localeCompare(b.source) ||
				a.target.localeCompare(b.target) ||
				a.field.localeCompare(b.field),
		);

export const build_edge_audit = (
	facts: GraphFacts,
	opts: { field_labels: string[]; exclude_paths?: string[] },
): EdgeAuditReport => ({
	unused_fields: find_unused_fields(facts, opts.field_labels),
	implied_only_fields: find_implied_only_fields(facts),
	mergeable_groups: find_mergeable_fields(facts),
	orphan_notes: find_orphan_notes(facts, opts.exclude_paths),
	dangling_edges: find_dangling_edges(facts),
});
