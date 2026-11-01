import { DEFAULT_SETTINGS } from "src/const/settings";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import {
	remove_field_references,
	remove_group_references,
	rename_field_references,
	rename_group_references,
	resolve_field_group_labels,
} from "src/utils/edge_fields";
import { describe, test } from "vitest";

const clone_settings = (): BreadcrumbsSettings =>
	JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

/** Every per-source settings slot that holds a single edge-field label. */
const set_every_field_slot = (
	settings: BreadcrumbsSettings,
	value: string,
): void => {
	const es = settings.explicit_edge_sources;
	es.tag_note.default_field = value;
	es.tag_note.default_sibling_field = value;
	es.dendron_note.default_field = value;
	es.dendron_note.default_sibling_field = value;
	es.johnny_decimal_note.default_field = value;
	es.johnny_decimal_note.default_sibling_field = value;
	es.regex_note.default_field = value;
	es.dataview_note.default_field = value;
	es.list_note.default_neighbour_field = value;
	es.date_note.default_field = value;
};

const every_field_slot = (settings: BreadcrumbsSettings): string[] => {
	const es = settings.explicit_edge_sources;
	return [
		es.tag_note.default_field,
		es.tag_note.default_sibling_field,
		es.dendron_note.default_field,
		es.dendron_note.default_sibling_field,
		es.johnny_decimal_note.default_field,
		es.johnny_decimal_note.default_sibling_field,
		es.regex_note.default_field,
		es.dataview_note.default_field,
		es.list_note.default_neighbour_field,
		es.date_note.default_field,
	];
};

const groups = [
	{ label: "hierarchy", fields: ["up", "down"] },
	{ label: "siblings", fields: ["same"] },
	{ label: "sequence", fields: ["next", "prev"] },
];

describe("resolve_field_group_labels", () => {
	test("single matching group", (t) => {
		t.expect(
			resolve_field_group_labels(groups, ["hierarchy"]),
		).toStrictEqual(["up", "down"]);
	});

	test("multiple matching groups", (t) => {
		const result = resolve_field_group_labels(groups, [
			"hierarchy",
			"siblings",
		]);
		t.expect(result).toStrictEqual(["up", "down", "same"]);
	});

	test("unknown group label returns empty", (t) => {
		t.expect(
			resolve_field_group_labels(groups, ["nonexistent"]),
		).toStrictEqual([]);
	});

	test("empty label list returns empty", (t) => {
		t.expect(resolve_field_group_labels(groups, [])).toStrictEqual([]);
	});

	test("empty groups returns empty", (t) => {
		t.expect(resolve_field_group_labels([], ["hierarchy"])).toStrictEqual(
			[],
		);
	});

	test("deduplicates fields appearing in multiple groups", (t) => {
		const overlapping = [
			{ label: "A", fields: ["up", "down"] },
			{ label: "B", fields: ["down", "same"] }, // "down" duplicated
		];
		const result = resolve_field_group_labels(overlapping, ["A", "B"]);
		t.expect(result).toStrictEqual(["up", "down", "same"]);
	});

	test("all groups selected", (t) => {
		const result = resolve_field_group_labels(groups, [
			"hierarchy",
			"siblings",
			"sequence",
		]);
		t.expect(result).toStrictEqual(["up", "down", "same", "next", "prev"]);
	});
});

describe("rename_field_references", () => {
	test("updates every per-source field-label slot", (t) => {
		const settings = clone_settings();
		set_every_field_slot(settings, "old");

		rename_field_references(settings, "old", "new");

		for (const value of every_field_slot(settings)) {
			t.expect(value).toBe("new");
		}
	});

	// Regression: dataview_note.default_field was absent from the cascade, so a
	// rename silently left Dataview pointing at the stale field name.
	test("updates dataview_note.default_field", (t) => {
		const settings = clone_settings();
		settings.explicit_edge_sources.dataview_note.default_field = "old";

		rename_field_references(settings, "old", "new");

		t.expect(
			settings.explicit_edge_sources.dataview_note.default_field,
		).toBe("new");
	});

	test("leaves unrelated field labels untouched", (t) => {
		const settings = clone_settings();
		settings.explicit_edge_sources.tag_note.default_field = "keep";

		rename_field_references(settings, "old", "new");

		t.expect(settings.explicit_edge_sources.tag_note.default_field).toBe(
			"keep",
		);
	});
});

describe("remove_field_references", () => {
	test("clears every per-source field-label slot", (t) => {
		const settings = clone_settings();
		set_every_field_slot(settings, "gone");

		remove_field_references(settings, "gone");

		for (const value of every_field_slot(settings)) {
			t.expect(value).toBe("");
		}
	});

	// Regression: dataview_note.default_field was absent from the cascade.
	test("clears dataview_note.default_field", (t) => {
		const settings = clone_settings();
		settings.explicit_edge_sources.dataview_note.default_field = "gone";

		remove_field_references(settings, "gone");

		t.expect(
			settings.explicit_edge_sources.dataview_note.default_field,
		).toBe("");
	});
});

/** Every settings slot that holds a list of edge-field-group labels. */
const every_group_slot = (settings: BreadcrumbsSettings): string[][] => [
	settings.views.page.trail.field_group_labels,
	settings.views.page.prev_next.field_group_labels.prev,
	settings.views.page.prev_next.field_group_labels.next,
	settings.views.side.matrix.field_group_labels,
	settings.views.side.tree.field_group_labels,
	settings.views.side.tree.find_root_field_group_labels,
	settings.commands.list_index.default_options.field_group_labels,
	settings.commands.create_canvas.default_options.field_group_labels,
];

const set_every_group_slot = (
	settings: BreadcrumbsSettings,
	labels: string[],
): void => {
	settings.views.page.trail.field_group_labels = [...labels];
	settings.views.page.prev_next.field_group_labels.prev = [...labels];
	settings.views.page.prev_next.field_group_labels.next = [...labels];
	settings.views.side.matrix.field_group_labels = [...labels];
	settings.views.side.tree.field_group_labels = [...labels];
	settings.views.side.tree.find_root_field_group_labels = [...labels];
	settings.commands.list_index.default_options.field_group_labels = [
		...labels,
	];
	settings.commands.create_canvas.default_options.field_group_labels = [
		...labels,
	];
};

describe("rename_group_references", () => {
	// Regression: the settings UI only renamed trail, prev/next and matrix
	// (twice), so renaming e.g. "ups" left the Tree view's find-root groups and
	// the list-index / canvas defaults pointing at a group that no longer exists.
	test("updates every group-label slot", (t) => {
		const settings = clone_settings();
		set_every_group_slot(settings, ["old", "keep"]);

		rename_group_references(settings, "old", "new");

		for (const labels of every_group_slot(settings)) {
			t.expect(labels).toEqual(["new", "keep"]);
		}
	});
});

describe("remove_group_references", () => {
	test("drops the label from every group-label slot", (t) => {
		const settings = clone_settings();
		set_every_group_slot(settings, ["gone", "keep"]);

		remove_group_references(settings, "gone");

		for (const labels of every_group_slot(settings)) {
			t.expect(labels).toEqual(["keep"]);
		}
	});
});
