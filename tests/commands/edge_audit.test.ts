import {
	build_edge_audit,
	find_dangling_edges,
	find_implied_only_fields,
	find_mergeable_fields,
	find_orphan_notes,
	find_unused_fields,
	prune_ignored,
	type EdgeFact,
	type GraphFacts,
	type NodeFact,
} from "src/commands/edge_audit/analyze";
import { describe, expect, test } from "vitest";

const node = (path: string, resolved = true): NodeFact => ({ path, resolved });

const edge = (
	field: string,
	source: string,
	target: string,
	opts: { explicit?: boolean; target_resolved?: boolean } = {},
): EdgeFact => ({
	field,
	source,
	target,
	explicit: opts.explicit ?? true,
	target_resolved: opts.target_resolved ?? true,
});

const facts = (nodes: NodeFact[], edges: EdgeFact[]): GraphFacts => ({
	nodes,
	edges,
});

describe("find_unused_fields", () => {
	test("flags defined fields with no edges, keeps used ones", () => {
		const f = facts(
			[node("a.md"), node("b.md")],
			[edge("up", "a.md", "b.md")],
		);

		expect(find_unused_fields(f, ["up", "down", "next"])).toStrictEqual([
			"down",
			"next",
		]);
	});

	test("a field used only by an implied edge still counts as used", () => {
		const f = facts(
			[node("a.md"), node("b.md")],
			[edge("down", "b.md", "a.md", { explicit: false })],
		);

		expect(find_unused_fields(f, ["down"])).toStrictEqual([]);
	});
});

describe("find_implied_only_fields", () => {
	test("fields with only implied edges, never explicit", () => {
		const f = facts(
			[node("a.md"), node("b.md")],
			[
				edge("up", "a.md", "b.md", { explicit: true }),
				edge("down", "b.md", "a.md", { explicit: false }),
			],
		);

		expect(find_implied_only_fields(f)).toStrictEqual(["down"]);
	});

	test("a field with at least one explicit edge is not implied-only", () => {
		const f = facts(
			[node("a.md"), node("b.md"), node("c.md")],
			[
				edge("up", "a.md", "b.md", { explicit: false }),
				edge("up", "b.md", "c.md", { explicit: true }),
			],
		);

		expect(find_implied_only_fields(f)).toStrictEqual([]);
	});
});

describe("find_mergeable_fields", () => {
	test("strict: identical explicit edge sets group together", () => {
		const f = facts(
			[node("a.md"), node("b.md")],
			[
				edge("up", "a.md", "b.md"),
				edge("parent", "a.md", "b.md"),
			],
		);

		expect(find_mergeable_fields(f)).toStrictEqual([
			{ fields: ["parent", "up"], edge_count: 1 },
		]);
	});

	test("strict: a single differing pair prevents a merge", () => {
		const f = facts(
			[node("a.md"), node("b.md"), node("c.md")],
			[
				edge("up", "a.md", "b.md"),
				edge("up", "a.md", "c.md"),
				edge("parent", "a.md", "b.md"),
			],
		);

		expect(find_mergeable_fields(f)).toStrictEqual([]);
	});

	test("implied edges are ignored when comparing", () => {
		const f = facts(
			[node("a.md"), node("b.md")],
			[
				edge("up", "a.md", "b.md", { explicit: true }),
				edge("parent", "a.md", "b.md", { explicit: true }),
				// extra implied edge on `up` must not break the match
				edge("up", "b.md", "a.md", { explicit: false }),
			],
		);

		expect(find_mergeable_fields(f)).toStrictEqual([
			{ fields: ["parent", "up"], edge_count: 1 },
		]);
	});

	test("direction matters — reversed pairs don't merge", () => {
		const f = facts(
			[node("a.md"), node("b.md")],
			[
				edge("up", "a.md", "b.md"),
				edge("down", "b.md", "a.md"),
			],
		);

		expect(find_mergeable_fields(f)).toStrictEqual([]);
	});
});

describe("find_orphan_notes", () => {
	test("resolved notes with no edges; unresolved notes are not orphans", () => {
		const f = facts(
			[
				node("a.md"),
				node("b.md"),
				node("lonely.md"),
				node("ghost.md", false),
			],
			[edge("up", "a.md", "b.md")],
		);

		expect(find_orphan_notes(f)).toStrictEqual(["lonely.md"]);
	});

	test("a note that is only an edge target is not an orphan", () => {
		const f = facts(
			[node("a.md"), node("b.md")],
			[edge("up", "a.md", "b.md")],
		);

		expect(find_orphan_notes(f)).toStrictEqual([]);
	});
});

describe("find_dangling_edges", () => {
	test("edges whose target doesn't exist", () => {
		const f = facts(
			[node("a.md")],
			[
				edge("up", "a.md", "real.md", { target_resolved: true }),
				edge("up", "a.md", "missing.md", { target_resolved: false }),
			],
		);

		expect(find_dangling_edges(f)).toStrictEqual([
			{ field: "up", source: "a.md", target: "missing.md" },
		]);
	});
});

describe("prune_ignored", () => {
	test("drops ignored notes and every edge touching one", () => {
		const f = facts(
			[node("a.md"), node("Templates/t.md"), node("b.md")],
			[
				edge("up", "a.md", "b.md"),
				edge("up", "a.md", "Templates/t.md"),
				edge("up", "Templates/t.md", "b.md"),
			],
		);

		expect(prune_ignored(f, ["Templates"])).toStrictEqual(
			facts([node("a.md"), node("b.md")], [edge("up", "a.md", "b.md")]),
		);
	});

	test("matches folder prefixes, not bare string prefixes", () => {
		const f = facts(
			[node("Templates/t.md"), node("TemplatesArchive/x.md")],
			[],
		);

		// "TemplatesArchive" must not be caught by the "Templates" entry.
		expect(prune_ignored(f, ["Templates"])).toStrictEqual(
			facts([node("TemplatesArchive/x.md")], []),
		);
	});

	test("an exact path entry ignores just that note", () => {
		const f = facts([node("a.md"), node("report.md")], []);

		expect(prune_ignored(f, ["report.md"])).toStrictEqual(
			facts([node("a.md")], []),
		);
	});

	test("blank and empty entries are no-ops", () => {
		const f = facts([node("a.md")], []);

		expect(prune_ignored(f, [])).toStrictEqual(f);
		expect(prune_ignored(f, ["", "   "])).toStrictEqual(f);
	});
});

describe("build_edge_audit", () => {
	test("assembles every section", () => {
		const f = facts(
			[node("a.md"), node("b.md"), node("lonely.md")],
			[
				edge("up", "a.md", "b.md"),
				edge("parent", "a.md", "b.md"),
				edge("up", "a.md", "missing.md", { target_resolved: false }),
			],
		);

		const report = build_edge_audit(f, {
			field_labels: ["up", "parent", "unused"],
		});

		expect(report).toStrictEqual({
			unused_fields: ["unused"],
			implied_only_fields: [],
			mergeable_groups: [],
			orphan_notes: ["lonely.md"],
			dangling_edges: [
				{ field: "up", source: "a.md", target: "missing.md" },
			],
		});
	});

	test("ignore_paths removes notes from every check", () => {
		const f = facts(
			[node("a.md"), node("b.md"), node("Templates/lonely.md")],
			[
				edge("up", "a.md", "b.md"),
				// a dangling edge from an ignored note must not be reported
				edge("up", "Templates/lonely.md", "missing.md", {
					target_resolved: false,
				}),
			],
		);

		const report = build_edge_audit(f, {
			field_labels: ["up"],
			ignore_paths: ["Templates"],
		});

		expect(report.orphan_notes).toStrictEqual([]);
		expect(report.dangling_edges).toStrictEqual([]);
	});
});
