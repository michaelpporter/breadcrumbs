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
