import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { remove_duplicates } from "./arrays";

export const resolve_field_group_labels = (
	edge_field_groups: BreadcrumbsSettings["edge_field_groups"],
	field_group_labels: string[],
) =>
	remove_duplicates(
		edge_field_groups
			.filter((group) => field_group_labels.includes(group.label))
			.flatMap((group) => group.fields),
	);

export const omit_hidden_view_fields = (
	edge_fields: BreadcrumbsSettings["edge_fields"],
	labels: string[],
) => {
	const hidden = new Set(
		edge_fields.filter((f) => f.hide_in_views).map((f) => f.label),
	);
	return labels.filter((l) => !hidden.has(l));
};

/** Accessor for a setting that holds a single edge-field label. */
interface ScalarFieldRef {
	get: () => string;
	set: (value: string) => void;
}
/** Accessor for a setting that holds a list of edge-field labels. */
interface ArrayFieldRef {
	get: () => string[];
	set: (value: string[]) => void;
}

/**
 * Every place in settings that references an edge field by label.
 *
 * This is the single source of truth for the rename/remove cascade — when a
 * field is renamed or deleted, both operations walk this list so a new
 * reference can never be silently missed. Add new field-label references here,
 * not in the settings UI. (Transitive rules are handled separately because
 * *removing* a field drops the whole rule rather than clearing a slot.)
 */
const collect_field_references = (
	settings: BreadcrumbsSettings,
): { scalars: ScalarFieldRef[]; arrays: ArrayFieldRef[] } => {
	const sources = settings.explicit_edge_sources;

	const scalars: ScalarFieldRef[] = [
		{
			get: () => sources.tag_note.default_field,
			set: (v) => (sources.tag_note.default_field = v),
		},
		{
			get: () => sources.tag_note.default_sibling_field,
			set: (v) => (sources.tag_note.default_sibling_field = v),
		},
		{
			get: () => sources.list_note.default_neighbour_field,
			set: (v) => (sources.list_note.default_neighbour_field = v),
		},
		{
			get: () => sources.dendron_note.default_field,
			set: (v) => (sources.dendron_note.default_field = v),
		},
		{
			get: () => sources.dendron_note.default_sibling_field,
			set: (v) => (sources.dendron_note.default_sibling_field = v),
		},
		{
			get: () => sources.johnny_decimal_note.default_field,
			set: (v) => (sources.johnny_decimal_note.default_field = v),
		},
		{
			get: () => sources.johnny_decimal_note.default_sibling_field,
			set: (v) => (sources.johnny_decimal_note.default_sibling_field = v),
		},
		{
			get: () => sources.date_note.default_field,
			set: (v) => (sources.date_note.default_field = v),
		},
		{
			get: () => sources.regex_note.default_field,
			set: (v) => (sources.regex_note.default_field = v),
		},
	];

	// Date-note period configs each reference two fields.
	(["week", "month", "quarter", "year"] as const).forEach((period) => {
		const config = sources.date_note[period];
		scalars.push(
			{
				get: () => config.next_field,
				set: (v) => (config.next_field = v),
			},
			{
				get: () => config.up_field,
				set: (v) => (config.up_field = v),
			},
		);
	});

	const arrays: ArrayFieldRef[] = [
		{
			get: () => settings.views.side.matrix.custom_sort_field_labels,
			set: (v) =>
				(settings.views.side.matrix.custom_sort_field_labels = v),
		},
		{
			get: () => settings.self_is_sibling,
			set: (v) => (settings.self_is_sibling = v),
		},
	];

	settings.edge_field_groups.forEach((group) => {
		arrays.push({
			get: () => group.fields,
			set: (v) => (group.fields = v),
		});
	});

	return { scalars, arrays };
};

/** Clear/remove every reference to `label` after the field is deleted. */
export const remove_field_references = (
	settings: BreadcrumbsSettings,
	label: string,
) => {
	const { scalars, arrays } = collect_field_references(settings);

	scalars.forEach((ref) => {
		if (ref.get() === label) ref.set("");
	});
	arrays.forEach((ref) => ref.set(ref.get().filter((l) => l !== label)));

	// Drop transitive rules that reference the removed field — unlike rename,
	// there's no replacement label to substitute.
	settings.implied_relations.transitive =
		settings.implied_relations.transitive.filter(
			(rule) =>
				rule.close_field !== label &&
				!rule.chain.some((attr) => attr.field === label),
		);
};

/** Point every reference to `from` at `to` after the field is renamed. */
export const rename_field_references = (
	settings: BreadcrumbsSettings,
	from: string,
	to: string,
) => {
	const { scalars, arrays } = collect_field_references(settings);

	scalars.forEach((ref) => {
		if (ref.get() === from) ref.set(to);
	});
	arrays.forEach((ref) =>
		ref.set(ref.get().map((l) => (l === from ? to : l))),
	);

	settings.implied_relations.transitive.forEach((rule) => {
		rule.chain = rule.chain.map((attr) =>
			attr.field === from ? { ...attr, field: to } : attr,
		);
		rule.close_field = rule.close_field === from ? to : rule.close_field;
	});
};
