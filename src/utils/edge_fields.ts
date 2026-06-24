import type { ExplicitEdgeSource } from "src/const/graph";
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
 * A settings slot holding a single edge-field label, addressed by the settings
 * object so the registry below can be a module-level constant.
 */
interface EdgeFieldSlot {
	get: (settings: BreadcrumbsSettings) => string;
	set: (settings: BreadcrumbsSettings, value: string) => void;
}

const slot = (
	get: EdgeFieldSlot["get"],
	set: EdgeFieldSlot["set"],
): EdgeFieldSlot => ({ get, set });

/**
 * The single source of truth for the per-source settings slots that hold an
 * edge-field label. Both the rename/remove cascade
 * ({@link collect_field_references}) and the explicit builders' `read_edge_field`
 * helper read from this map, so the two can never disagree on which slots
 * exist. Add a source's primary / sibling / neighbour slot here, once.
 */
export const EDGE_FIELD_SLOTS: Partial<
	Record<
		ExplicitEdgeSource,
		{
			primary?: EdgeFieldSlot;
			sibling?: EdgeFieldSlot;
			neighbour?: EdgeFieldSlot;
		}
	>
> = {
	tag_note: {
		primary: slot(
			(s) => s.explicit_edge_sources.tag_note.default_field,
			(s, v) => (s.explicit_edge_sources.tag_note.default_field = v),
		),
		sibling: slot(
			(s) => s.explicit_edge_sources.tag_note.default_sibling_field,
			(s, v) =>
				(s.explicit_edge_sources.tag_note.default_sibling_field = v),
		),
	},
	dendron_note: {
		primary: slot(
			(s) => s.explicit_edge_sources.dendron_note.default_field,
			(s, v) => (s.explicit_edge_sources.dendron_note.default_field = v),
		),
		sibling: slot(
			(s) => s.explicit_edge_sources.dendron_note.default_sibling_field,
			(s, v) =>
				(s.explicit_edge_sources.dendron_note.default_sibling_field = v),
		),
	},
	johnny_decimal_note: {
		primary: slot(
			(s) => s.explicit_edge_sources.johnny_decimal_note.default_field,
			(s, v) =>
				(s.explicit_edge_sources.johnny_decimal_note.default_field = v),
		),
		sibling: slot(
			(s) =>
				s.explicit_edge_sources.johnny_decimal_note
					.default_sibling_field,
			(s, v) =>
				(s.explicit_edge_sources.johnny_decimal_note.default_sibling_field =
					v),
		),
	},
	regex_note: {
		primary: slot(
			(s) => s.explicit_edge_sources.regex_note.default_field,
			(s, v) => (s.explicit_edge_sources.regex_note.default_field = v),
		),
	},
	dataview_note: {
		primary: slot(
			(s) => s.explicit_edge_sources.dataview_note.default_field,
			(s, v) => (s.explicit_edge_sources.dataview_note.default_field = v),
		),
	},
	list_note: {
		neighbour: slot(
			(s) => s.explicit_edge_sources.list_note.default_neighbour_field,
			(s, v) =>
				(s.explicit_edge_sources.list_note.default_neighbour_field = v),
		),
	},
	date_note: {
		primary: slot(
			(s) => s.explicit_edge_sources.date_note.default_field,
			(s, v) => (s.explicit_edge_sources.date_note.default_field = v),
		),
	},
};

/**
 * Every place in settings that references an edge field by label, used by the
 * rename/remove cascade — when a field is renamed or deleted, both operations
 * walk this list so a reference can never be silently missed.
 *
 * Per-source single-label slots come from {@link EDGE_FIELD_SLOTS} (add new ones
 * there, once); this function adds the references that don't fit that shape
 * (date-note period fields, matrix sort order, `self_is_sibling`, field
 * groups). Transitive rules are handled separately because *removing* a field
 * drops the whole rule rather than clearing a slot.
 */
const collect_field_references = (
	settings: BreadcrumbsSettings,
): { scalars: ScalarFieldRef[]; arrays: ArrayFieldRef[] } => {
	const sources = settings.explicit_edge_sources;

	// Per-source single-label slots, bound to this `settings`. Shared with
	// read_edge_field via EDGE_FIELD_SLOTS so the two can never drift.
	const scalars: ScalarFieldRef[] = Object.values(EDGE_FIELD_SLOTS)
		.flatMap((slots) =>
			slots ? [slots.primary, slots.sibling, slots.neighbour] : [],
		)
		.filter((ref): ref is EdgeFieldSlot => ref !== undefined)
		.map((ref) => ({
			get: () => ref.get(settings),
			set: (v) => ref.set(settings, v),
		}));

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
