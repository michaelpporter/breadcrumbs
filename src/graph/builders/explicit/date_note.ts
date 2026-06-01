import { DateTime } from "luxon";
import type { AllFiles } from "src/graph/builders/explicit/files";
import type {
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type { PeriodNoteConfig } from "src/interfaces/settings";
import { log } from "src/logger";
import { Paths } from "src/utils/paths";
import { GCEdgeData, GCNodeData } from "wasm/pkg/breadcrumbs_graph_wasm";

type PeriodKind = "week" | "month" | "quarter" | "year";

const PERIOD_KINDS: PeriodKind[] = ["week", "month", "quarter", "year"];

const CONTAINMENT: Record<PeriodKind, PeriodKind[]> = {
	week: ["month", "quarter", "year"],
	month: ["quarter", "year"],
	quarter: ["year"],
	year: [],
};

interface PeriodNote {
	path: string;
	basename: string;
	ext: string;
	folder: string;
	date: DateTime<true>;
}

function collect_period_notes(cfg: PeriodNoteConfig, all_files: AllFiles): PeriodNote[] {
	const notes: PeriodNote[] = [];

	all_files.obsidian?.forEach(({ file }) => {
		if (cfg.folder && file.parent?.path !== cfg.folder) return;
		const date = DateTime.fromFormat(file.basename, cfg.date_format);
		if (!date.isValid) return;
		notes.push({ date, path: file.path, basename: file.basename, ext: file.extension, folder: file.parent?.path ?? "" });
	});

	all_files.dataview?.forEach(({ file }) => {
		if (cfg.folder && file.folder !== cfg.folder) return;
		const date = DateTime.fromFormat(file.name, cfg.date_format);
		if (!date.isValid) return;
		notes.push({ date, path: file.path, basename: file.name, ext: file.ext, folder: file.folder });
	});

	const seen = new Set<string>();
	return notes
		.filter((n) => {
			if (seen.has(n.path)) return false;
			seen.add(n.path);
			return true;
		})
		.sort((a, b) => a.date.toMillis() - b.date.toMillis());
}

function add_period_edges(
	plugin: Parameters<ExplicitEdgeBuilder>[0],
	all_files: AllFiles,
	results: EdgeBuilderResults,
): void {
	const cfg = plugin.settings.explicit_edge_sources.date_note;
	const edge_fields = plugin.settings.edge_fields;

	for (const kind of PERIOD_KINDS) {
		const period_cfg = cfg[kind];
		if (!period_cfg.enabled) continue;

		if (!edge_fields.find((f) => f.label === period_cfg.next_field)) {
			results.errors.push({
				code: "invalid_setting_value",
				path: `explicit_edge_sources.date_note.${kind}.next_field`,
				message: `Period note (${kind}) next_field "${period_cfg.next_field}" is not a valid Breadcrumbs Edge field`,
			});
		}
		if (!edge_fields.find((f) => f.label === period_cfg.up_field)) {
			results.errors.push({
				code: "invalid_setting_value",
				path: `explicit_edge_sources.date_note.${kind}.up_field`,
				message: `Period note (${kind}) up_field "${period_cfg.up_field}" is not a valid Breadcrumbs Edge field`,
			});
		}
	}
	if (results.errors.length > 0) return;

	const period_notes: Partial<Record<PeriodKind, PeriodNote[]>> = {};
	for (const kind of PERIOD_KINDS) {
		if (!cfg[kind].enabled) continue;
		period_notes[kind] = collect_period_notes(cfg[kind], all_files);
	}

	// Sequential next edges between period notes of the same kind
	for (const kind of PERIOD_KINDS) {
		const notes = period_notes[kind];
		if (!notes) continue;
		const period_cfg = cfg[kind];
		for (let i = 0; i < notes.length - 1; i++) {
			results.edges.push(new GCEdgeData(notes[i].path, notes[i + 1].path, period_cfg.next_field, "date_note"));
		}
	}

	// Daily note → period note up edges
	if (cfg.enabled) {
		const daily_notes: PeriodNote[] = [];
		all_files.obsidian?.forEach(({ file }) => {
			const date = DateTime.fromFormat(file.basename, cfg.date_format);
			if (!date.isValid) return;
			daily_notes.push({ date, path: file.path, basename: file.basename, ext: file.extension, folder: file.parent?.path ?? "" });
		});
		all_files.dataview?.forEach(({ file }) => {
			const date = DateTime.fromFormat(file.name, cfg.date_format);
			if (!date.isValid) return;
			daily_notes.push({ date, path: file.path, basename: file.name, ext: file.ext, folder: file.folder });
		});

		// When week starts Sunday, a Sunday should map to the *next* ISO week
		const week_date = (date: DateTime) =>
			cfg.week_start === "sunday" && date.weekday === 7
				? date.plus({ days: 1 })
				: date;

		for (const daily of daily_notes) {
			for (const kind of PERIOD_KINDS) {
				const notes = period_notes[kind];
				if (!notes) continue;
				const period_cfg = cfg[kind];
				const lookup_date = kind === "week" ? week_date(daily.date) : daily.date;
				const target_basename = lookup_date.toFormat(period_cfg.date_format);
				const target = notes.find((n) => n.basename === target_basename);
				if (target) {
					results.edges.push(new GCEdgeData(daily.path, target.path, period_cfg.up_field, "date_note"));
				}
			}
		}
	}

	// Finer period → coarser period up edges (week→month, week→quarter, etc.)
	for (const finer of PERIOD_KINDS) {
		const finer_notes = period_notes[finer];
		if (!finer_notes) continue;
		const finer_cfg = cfg[finer];

		for (const coarser of CONTAINMENT[finer]) {
			const coarser_notes = period_notes[coarser];
			if (!coarser_notes) continue;
			const coarser_cfg = cfg[coarser];

			for (const note of finer_notes) {
				const target_basename = note.date.toFormat(coarser_cfg.date_format);
				const target = coarser_notes.find((n) => n.basename === target_basename);
				if (target) {
					results.edges.push(new GCEdgeData(note.path, target.path, finer_cfg.up_field, "date_note"));
				}
			}
		}
	}
}

/**
 * **date_note** — sequential date-based hierarchy builder.
 *
 * Builds containment edges between date-named notes using Luxon to parse
 * basenames against configured format strings. Supported periods:
 * `day → week → month → quarter → year`.
 *
 * For each configured period kind (week/month/quarter/year) the builder finds
 * notes whose basename matches the period's date format, then creates edges
 * from contained period notes to their containing period notes (e.g. a daily
 * note gets an edge to its weekly note). Periods must be configured in settings
 * (`explicit_edge_sources.date_note`); unconfigured periods are skipped.
 */
export const _add_explicit_edges_date_note: ExplicitEdgeBuilder = (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };

	const date_note_settings = plugin.settings.explicit_edge_sources.date_note;
	if (!date_note_settings.enabled) {
		add_period_edges(plugin, all_files, results);
		return results;
	} else if (
		!plugin.settings.edge_fields.find(
			(field) => field.label === date_note_settings.default_field,
		)
	) {
		results.errors.push({
			code: "invalid_setting_value",
			path: "explicit_edge_sources.date_note.default_field",
			message: `The default Date Note field "${date_note_settings.default_field}" is not a valid Breadcrumbs Edge field`,
		});

		return results;
	}

	const date_notes: {
		ext: string;
		path: string;
		folder: string;
		basename: string;
		date: DateTime<true>;
	}[] = [];

	all_files.obsidian?.forEach(({ file }) => {
		const date = DateTime.fromFormat(
			file.basename,
			date_note_settings.date_format,
		);
		if (!date.isValid) return;

		date_notes.push({
			date,
			path: file.path,
			ext: file.extension,
			basename: file.basename,
			folder: file.parent?.path ?? "",
		});
	});

	all_files.dataview?.forEach(({ file }) => {
		const date = DateTime.fromFormat(
			file.name,
			date_note_settings.date_format,
		);
		if (!date.isValid) return;

		date_notes.push({
			date,
			ext: file.ext,
			path: file.path,
			folder: file.folder,
			basename: file.name,
		});
	});

	const seen_paths = new Set<string>();
	const unique_date_notes = date_notes.filter((n) => {
		if (seen_paths.has(n.path)) return false;
		seen_paths.add(n.path);
		return true;
	});

	unique_date_notes
		.sort((a, b) => a.date.toMillis() - b.date.toMillis())
		.forEach((date_note, i) => {
			const basename_plus_one_day = date_note.date
				.plus({ days: 1 })
				.toFormat(date_note_settings.date_format);

			const tomorrow_year = date_note.date
				.plus({ days: 1 })
				.toFormat("yyyy");

			const tomorrow_month = date_note.date
				.plus({ days: 1 })
				.toFormat("MM");

			let tomorrow_folder = date_note.folder;

			if (tomorrow_year !== date_note.date.toFormat("yyyy")) {
				tomorrow_folder = tomorrow_folder.replace(
					date_note.date.toFormat("yyyy"),
					tomorrow_year,
				);
			}

			if (tomorrow_month !== date_note.date.toFormat("MM")) {
				tomorrow_folder = tomorrow_folder.replace(
					date_note.date.toFormat("MM"),
					tomorrow_month,
				);
			}

			const next_date_note = unique_date_notes.at(i + 1);
			const next_date_note_folder = next_date_note?.folder;
			const next_date_note_basename = next_date_note?.basename;
			const target_basename = date_note_settings.stretch_to_existing
				? (next_date_note_basename ?? basename_plus_one_day)
				: basename_plus_one_day;
			log.debug(`tomorrow_folder: ${tomorrow_folder}`);
			const target_folder = (date_note_settings.stretch_to_existing || target_basename === next_date_note_basename) ? (next_date_note_folder ?? tomorrow_folder) : tomorrow_folder;
			const target_id = Paths.build(
				target_folder,
				target_basename,
				date_note.ext,
			);

			const target_file = plugin.app.vault.getFileByPath(target_id);
			if (!target_file) {
				results.nodes.push(
					new GCNodeData(target_id, [], false, false, false),
				);
			}

			results.edges.push(
				new GCEdgeData(
					date_note.path,
					target_id,
					date_note_settings.default_field,
					"date_note",
				),
			);
		});

	add_period_edges(plugin, all_files, results);

	return results;
};
