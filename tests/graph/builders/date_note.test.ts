import { DEFAULT_SETTINGS } from "src/const/settings";
import { _add_explicit_edges_date_note } from "src/graph/builders/explicit/date_note";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { describe, test } from "vitest";
import { make_all_files, make_plugin, mock_file } from "./helpers";

type DateNoteSettings =
	BreadcrumbsSettings["explicit_edge_sources"]["date_note"];

/**
 * Build a plugin stub with a fully-populated date_note config. We deep-clone the
 * default so every period kind is present, then apply `overrides` on top.
 */
function date_note_plugin(
	overrides: Partial<DateNoteSettings> = {},
	known_paths: string[] = [],
) {
	const date_note = structuredClone(
		DEFAULT_SETTINGS.explicit_edge_sources.date_note,
	) as DateNoteSettings;

	const { week, month, quarter, year, ...rest } = overrides;
	Object.assign(date_note, rest);
	if (week) Object.assign(date_note.week, week);
	if (month) Object.assign(date_note.month, month);
	if (quarter) Object.assign(date_note.quarter, quarter);
	if (year) Object.assign(date_note.year, year);

	return make_plugin(
		{
			edge_fields: [
				{ label: "up" },
				{ label: "next" },
				{ label: "down" },
			],
			explicit_edge_sources: { date_note } as never,
		},
		known_paths,
	);
}

describe("date_note builder", () => {
	// ---- disabled ----

	test("date_note disabled, no periods enabled → empty", async (t) => {
		const files = [mock_file("2024-01-01.md"), mock_file("2024-W01.md")];
		const r = await _add_explicit_edges_date_note(
			date_note_plugin({ enabled: false }),
			make_all_files(files),
		);
		t.expect(r.edges).toHaveLength(0);
		t.expect(r.errors).toHaveLength(0);
	});

	// ---- period sequential "next" + finer→coarser "up" (date_note.enabled = false) ----

	test("sequential next edges between consecutive week notes", async (t) => {
		const files = [mock_file("2024-W01.md"), mock_file("2024-W02.md")];
		const r = await _add_explicit_edges_date_note(
			date_note_plugin({ enabled: false, week: { enabled: true } }),
			make_all_files(files),
		);
		const next_edges = r.edges.filter((e) => e.edge_type === "next");
		t.expect(next_edges).toHaveLength(1);
		t.expect(next_edges[0]!.source).toBe("2024-W01.md");
		t.expect(next_edges[0]!.target).toBe("2024-W02.md");
	});

	test("finer→coarser up edge: week note → its month note", async (t) => {
		// 2024-W01 starts Mon 2024-01-01 → month 2024-01
		const files = [mock_file("2024-W01.md"), mock_file("2024-01.md")];
		const r = await _add_explicit_edges_date_note(
			date_note_plugin({
				enabled: false,
				week: { enabled: true },
				month: { enabled: true },
			}),
			make_all_files(files),
		);
		const up_edges = r.edges.filter((e) => e.edge_type === "up");
		t.expect(
			up_edges.some(
				(e) => e.source === "2024-W01.md" && e.target === "2024-01.md",
			),
		).toBe(true);
	});

	test("multi-level containment: month note → quarter note", async (t) => {
		// 2024-02 → quarter 2024-Q1
		const files = [mock_file("2024-02.md"), mock_file("2024-Q1.md")];
		const r = await _add_explicit_edges_date_note(
			date_note_plugin({
				enabled: false,
				month: { enabled: true },
				quarter: { enabled: true },
			}),
			make_all_files(files),
		);
		const up_edges = r.edges.filter((e) => e.edge_type === "up");
		t.expect(
			up_edges.some(
				(e) => e.source === "2024-02.md" && e.target === "2024-Q1.md",
			),
		).toBe(true);
	});

	test("no up edge when the containing period note is absent", async (t) => {
		const files = [mock_file("2024-W01.md")]; // no month note
		const r = await _add_explicit_edges_date_note(
			date_note_plugin({
				enabled: false,
				week: { enabled: true },
				month: { enabled: true },
			}),
			make_all_files(files),
		);
		t.expect(r.edges.filter((e) => e.edge_type === "up")).toHaveLength(0);
	});

	// ---- daily → period up edges + week_start (date_note.enabled = true) ----

	test("week_start=monday: Sunday 2024-01-07 maps to 2024-W01", async (t) => {
		const files = [mock_file("2024-01-07.md"), mock_file("2024-W01.md")];
		const r = await _add_explicit_edges_date_note(
			date_note_plugin({
				enabled: true,
				week_start: "monday",
				week: { enabled: true },
			}),
			make_all_files(files),
		);
		const up_edges = r.edges.filter((e) => e.edge_type === "up");
		t.expect(
			up_edges.some(
				(e) => e.source === "2024-01-07.md" && e.target === "2024-W01.md",
			),
		).toBe(true);
	});

	test("week_start=sunday: Sunday 2024-01-07 maps to next week 2024-W02", async (t) => {
		const files = [
			mock_file("2024-01-07.md"),
			mock_file("2024-W01.md"),
			mock_file("2024-W02.md"),
		];
		const r = await _add_explicit_edges_date_note(
			date_note_plugin({
				enabled: true,
				week_start: "sunday",
				week: { enabled: true },
			}),
			make_all_files(files),
		);
		const up_edges = r.edges.filter((e) => e.edge_type === "up");
		t.expect(
			up_edges.some(
				(e) => e.source === "2024-01-07.md" && e.target === "2024-W02.md",
			),
		).toBe(true);
		// must NOT also map to the current ISO week
		t.expect(
			up_edges.some(
				(e) => e.source === "2024-01-07.md" && e.target === "2024-W01.md",
			),
		).toBe(false);
	});

	// ---- errors ----

	test("enabled with invalid default_field → invalid_setting_value", async (t) => {
		const r = await _add_explicit_edges_date_note(
			date_note_plugin({ enabled: true, default_field: "nonexistent" }),
			make_all_files([mock_file("2024-01-01.md")]),
		);
		t.expect(r.errors).toHaveLength(1);
		t.expect(r.errors[0]!.code).toBe("invalid_setting_value");
	});

	// ---- edge_source ----

	test("edges carry edge_source = date_note", async (t) => {
		const files = [mock_file("2024-W01.md"), mock_file("2024-W02.md")];
		const r = await _add_explicit_edges_date_note(
			date_note_plugin({ enabled: false, week: { enabled: true } }),
			make_all_files(files),
		);
		t.expect(r.edges[0]!.edge_source).toBe("date_note");
	});
});
