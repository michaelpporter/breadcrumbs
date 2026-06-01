import { Notice, Setting } from "obsidian";
import type { PeriodNoteConfig } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";
import { DateNoteSetupModal } from "src/modals/DateNoteSetupModal";
import { new_setting } from "src/utils/settings";

type PeriodKind = "week" | "month" | "quarter" | "year";

const PERIOD_LABEL: Record<PeriodKind, string> = {
	week: "Week",
	month: "Month",
	quarter: "Quarter",
	year: "Year",
};

const PERIOD_FORMAT_HINT: Record<PeriodKind, string> = {
	week: "kkkk-'W'WW  (e.g. 2024-W03)",
	month: "yyyy-MM  (e.g. 2024-03)",
	quarter: "yyyy-'Q'q  (e.g. 2024-Q1)",
	year: "yyyy  (e.g. 2024)",
};

function add_period_settings(
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
	kind: PeriodKind,
) {
	const label = PERIOD_LABEL[kind];
	const cfg = (): PeriodNoteConfig =>
		plugin.settings.explicit_edge_sources.date_note[kind];

	new Setting(containerEl).setHeading().setName(label);

	new_setting(containerEl, {
		name: "Enabled",
		desc: `Look for ${label.toLowerCase()} notes to build period hierarchy edges`,
		toggle: {
			value: cfg().enabled,
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.date_note[kind].enabled = value;
				await Promise.all([plugin.rebuildGraph(), plugin.saveSettings()]);
			},
		},
	});

	const format_frag = new DocumentFragment();
	const format_frag_span = format_frag.createEl("span");
	format_frag_span.createEl("a", {
		text: "Luxon format",
		href: "https://moment.github.io/luxon/#/formatting?id=table-of-tokens",
	});
	format_frag_span.appendText(` matching the note filename. Default: `);
	format_frag_span.createEl("code", { text: PERIOD_FORMAT_HINT[kind] });

	new_setting(containerEl, {
		name: "Date format",
		desc: format_frag,
		input: {
			value: cfg().date_format,
			placeholder: PERIOD_FORMAT_HINT[kind],
			cb: async (value) => {
				if (!value) {
					new Notice("Date format cannot be empty");
				} else {
					plugin.settings.explicit_edge_sources.date_note[kind].date_format = value;
					await Promise.all([plugin.rebuildGraph(), plugin.saveSettings()]);
				}
			},
		},
	});

	new_setting(containerEl, {
		name: "Folder",
		desc: `Vault folder containing ${label.toLowerCase()} notes. Leave empty to match anywhere.`,
		input: {
			value: cfg().folder,
			placeholder: "",
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.date_note[kind].folder = value;
				await Promise.all([plugin.rebuildGraph(), plugin.saveSettings()]);
			},
		},
	});

	const edge_field_options = plugin.settings.edge_fields.map((f) => f.label);

	new_setting(containerEl, {
		name: "Next field",
		desc: `Edge field for sequential next/prev edges between ${label.toLowerCase()} notes`,
		select: {
			value: cfg().next_field,
			options: edge_field_options,
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.date_note[kind].next_field = value;
				await Promise.all([plugin.rebuildGraph(), plugin.saveSettings()]);
			},
		},
	});

	new_setting(containerEl, {
		name: "Up field",
		desc: `Edge field for child-note → ${label.toLowerCase()}-note containment edges`,
		select: {
			value: cfg().up_field,
			options: edge_field_options,
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.date_note[kind].up_field = value;
				await Promise.all([plugin.rebuildGraph(), plugin.saveSettings()]);
			},
		},
	});
}

export const _add_settings_date_note = (
	plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	new Setting(containerEl)
		.setName("Quick setup")
		.setDesc(
			"Enable date notes with period hierarchy and transitive rules",
		)
		.addButton((btn) =>
			btn
				.setButtonText("Set up...")
				.setCta()
				.onClick(() => new DateNoteSetupModal(plugin).open()),
		);

	new_setting(containerEl, {
		name: "Enabled",
		desc: "Look for date notes to use as edge sources",
		toggle: {
			value: plugin.settings.explicit_edge_sources.date_note.enabled,
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.date_note.enabled = value;
				await Promise.all([
					plugin.rebuildGraph(),
					plugin.saveSettings(),
				]);
			},
		},
	});

	new_setting(containerEl, {
		name: "Default field",
		desc: "Field used to join date notes together. Breadcrumbs takes the current note's date, adds one day, and joins the two notes with this field.",
		select: {
			value: plugin.settings.explicit_edge_sources.date_note.default_field,
			options: plugin.settings.edge_fields.map((f) => f.label),
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.date_note.default_field = value;
				await Promise.all([
					plugin.rebuildGraph(),
					plugin.saveSettings(),
				]);
			},
		},
	});

	const date_format_fragment = new DocumentFragment();
	const date_format_span = date_format_fragment.createEl("span");
	date_format_span.createEl("a", {
		text: "Luxon date format",
		href: "https://moment.github.io/luxon/#/formatting?id=table-of-tokens",
	});
	date_format_span.appendText(" to use");

	new_setting(containerEl, {
		name: "Date format",
		desc: date_format_fragment,
		input: {
			value: plugin.settings.explicit_edge_sources.date_note.date_format,
			cb: async (value) => {
				if (!value) new Notice("Date format cannot be empty");
				else {
					plugin.settings.explicit_edge_sources.date_note.date_format = value;
					await Promise.all([
						plugin.rebuildGraph(),
						plugin.saveSettings(),
					]);
				}
			},
		},
	});

	new_setting(containerEl, {
		name: "Stretch to existing",
		desc: "If there is a gap from one day to another, should the next note be the unresolved one in one day or should it 'stretch' to the next resolved (existing) note?",
		toggle: {
			value: plugin.settings.explicit_edge_sources.date_note.stretch_to_existing,
			cb: async (value) => {
				plugin.settings.explicit_edge_sources.date_note.stretch_to_existing = value;
				await Promise.all([
					plugin.rebuildGraph(),
					plugin.saveSettings(),
				]);
			},
		},
	});

	new Setting(containerEl)
		.setName("Week starts on")
		.setDesc(
			"Monday uses ISO week numbering. Sunday shifts Sundays into the following week to match US-style week files.",
		)
		.addDropdown((d) =>
			d
				.addOption("monday", "Monday (ISO)")
				.addOption("sunday", "Sunday (US)")
				.setValue(
					plugin.settings.explicit_edge_sources.date_note.week_start,
				)
				.onChange(async (value) => {
					plugin.settings.explicit_edge_sources.date_note.week_start =
						value as "monday" | "sunday";
					await Promise.all([
						plugin.rebuildGraph(),
						plugin.saveSettings(),
					]);
				}),
		);

	new Setting(containerEl).setHeading().setName("Period notes");
	for (const kind of ["week", "month", "quarter", "year"] as PeriodKind[]) {
		add_period_settings(plugin, containerEl, kind);
	}
};
