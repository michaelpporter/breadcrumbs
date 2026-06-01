import { Modal, Notice, Setting } from "obsidian";
import type BreadcrumbsPlugin from "src/main";

type PeriodKind = "week" | "month" | "quarter" | "year";

const PERIODS: PeriodKind[] = ["week", "month", "quarter", "year"];

const PERIOD_LABEL: Record<PeriodKind, string> = {
	week: "Week",
	month: "Month",
	quarter: "Quarter",
	year: "Year",
};

type WeekStart = "monday" | "sunday";

interface SetupState {
	daily_enabled: boolean;
	periods: Record<PeriodKind, boolean>;
	period_specific: boolean;
	week_start: WeekStart;
}

export class DateNoteSetupModal extends Modal {
	plugin: BreadcrumbsPlugin;

	private static last_state: SetupState = {
		daily_enabled: true,
		periods: { week: true, month: true, quarter: false, year: false },
		period_specific: true,
		week_start: "monday",
	};

	daily_enabled: boolean;
	periods: Record<PeriodKind, boolean>;
	period_specific: boolean;
	week_start: WeekStart;

	constructor(plugin: BreadcrumbsPlugin) {
		super(plugin.app);
		this.plugin = plugin;
		// Restore last state
		const s = DateNoteSetupModal.last_state;
		this.daily_enabled = s.daily_enabled;
		this.periods = { ...s.periods };
		this.period_specific = s.period_specific;
		this.week_start = s.week_start;
	}

	onOpen() {
		const { contentEl, plugin } = this;

		if (plugin.settings.explicit_edge_sources.date_note.enabled) {
			const warning = contentEl.createDiv({
				cls: "bc-date-note-setup-warning",
			});
			warning.createEl("strong", { text: "Warning: " });
			warning.appendText(
				"Date notes are already configured. This may overwrite your current settings.",
			);
			warning.style.cssText =
				"background:var(--background-modifier-error);color:var(--text-error);padding:8px 12px;border-radius:4px;margin-bottom:12px;";
		}

		contentEl.createEl("h2", { text: "Set up Date Notes" });
		contentEl.createEl("p", {
			text: "Configure date note edge sources and transitive hierarchy rules.",
		});

		new Setting(contentEl).setHeading().setName("Daily notes");

		new Setting(contentEl)
			.setName("Enabled")
			.setDesc(
				"Link daily notes sequentially and to their parent period notes",
			)
			.addToggle((t) =>
				t.setValue(this.daily_enabled).onChange((v) => {
					this.daily_enabled = v;
				}),
			);

		new Setting(contentEl).setHeading().setName("Period notes");

		for (const kind of PERIODS) {
			new Setting(contentEl)
				.setName(PERIOD_LABEL[kind])
				.addToggle((t) =>
					t.setValue(this.periods[kind]).onChange((v) => {
						this.periods[kind] = v;
					}),
				);
		}

		new Setting(contentEl).setHeading().setName("Field names");

		new Setting(contentEl)
			.setName("Period-specific fields")
			.setDesc(
				"Use next_week/prev_week, next_month/prev_month, etc. instead of generic next/prev. Fields are created automatically.",
			)
			.addToggle((t) =>
				t.setValue(this.period_specific).onChange((v) => {
					this.period_specific = v;
				}),
			);

		new Setting(contentEl).setHeading().setName("Week");

		new Setting(contentEl)
			.setName("Week starts on")
			.setDesc(
				"Monday uses ISO week numbering. Sunday shifts Sundays into the following week so they match US-style week files.",
			)
			.addDropdown((d) =>
				d
					.addOption("monday", "Monday (ISO)")
					.addOption("sunday", "Sunday (US)")
					.setValue(this.week_start)
					.onChange((v) => {
						this.week_start = v as WeekStart;
					}),
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Set up")
					.setCta()
					.onClick(async () => {
						await this.apply();
						this.close();
					}),
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => this.close()),
			);
	}

	onClose() {
		DateNoteSetupModal.last_state = {
			daily_enabled: this.daily_enabled,
			periods: { ...this.periods },
			period_specific: this.period_specific,
			week_start: this.week_start,
		};
		this.contentEl.empty();
	}

	async apply() {
		const { plugin, periods, period_specific, daily_enabled, week_start } = this;
		const s = plugin.settings;

		const ensure_field = (label: string) => {
			if (!s.edge_fields.some((f) => f.label === label)) {
				s.edge_fields.push({ label });
			}
		};

		const ensure_in_group = (group_label: string, field: string) => {
			const group = s.edge_field_groups.find((g) => g.label === group_label);
			if (group && !group.fields.includes(field)) {
				group.fields.push(field);
			}
		};

		for (const label of ["up", "down", "next", "prev"]) {
			ensure_field(label);
		}

		const enabled_periods = PERIODS.filter((k) => periods[k]);

		if (period_specific) {
			if (daily_enabled) {
				ensure_field("tomorrow");
				ensure_field("yesterday");
				ensure_in_group("nexts", "tomorrow");
				ensure_in_group("prevs", "yesterday");
			}
			for (const kind of enabled_periods) {
				ensure_field(`next_${kind}`);
				ensure_field(`prev_${kind}`);
				ensure_in_group("nexts", `next_${kind}`);
				ensure_in_group("prevs", `prev_${kind}`);
			}
		}

		// Configure date_note
		if (daily_enabled) {
			s.explicit_edge_sources.date_note.enabled = true;
			s.explicit_edge_sources.date_note.default_field = period_specific
				? "tomorrow"
				: "next";
		}
		s.explicit_edge_sources.date_note.week_start = week_start;

		for (const kind of enabled_periods) {
			s.explicit_edge_sources.date_note[kind].enabled = true;
			s.explicit_edge_sources.date_note[kind].next_field =
				period_specific ? `next_${kind}` : "next";
			s.explicit_edge_sources.date_note[kind].up_field = "up";
		}

		// Bump up/down transitive rounds to ≥ 3
		for (const rule of s.implied_relations.transitive) {
			if (
				rule.chain.length === 1 &&
				(rule.chain[0].field === "up" || rule.chain[0].field === "down")
			) {
				rule.rounds = Math.max(rule.rounds, 3);
			}
		}

		// Add reversal rules: tomorrow↔yesterday + next_{period}↔prev_{period}
		const add_reversal = (next_f: string, prev_f: string) => {
			const exists = s.implied_relations.transitive.some(
				(r) => r.chain.length === 1 && r.chain[0].field === next_f,
			);
			if (!exists) {
				s.implied_relations.transitive.push(
					{ name: "", rounds: 1, chain: [{ field: next_f }], close_field: prev_f, close_reversed: true },
					{ name: "", rounds: 1, chain: [{ field: prev_f }], close_field: next_f, close_reversed: true },
				);
			}
		};

		if (period_specific) {
			if (daily_enabled) add_reversal("tomorrow", "yesterday");
			for (const kind of enabled_periods) {
				add_reversal(`next_${kind}`, `prev_${kind}`);
			}
		}

		await Promise.all([plugin.saveSettings(), plugin.rebuildGraph()]);
		new Notice("Date notes configured");
	}
}
