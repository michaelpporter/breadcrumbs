import type { Result } from "src/interfaces/result";
import type { BreadcrumbsSettings, EdgeField } from "src/interfaces/settings";
import { url_search_params } from "src/utils/url";
import { z } from "zod";
import { fail, succ } from "./result";
import { split_and_trim } from "./strings";
import { zod } from "./zod";

type TransitiveRule =
	BreadcrumbsSettings["implied_relations"]["transitive"][number];

export const stringify_transitive_relation = (
	rule: Pick<TransitiveRule, "chain" | "close_field" | "close_reversed">,
) =>
	`[${rule.chain
		.map((attr) => url_search_params(attr, { trim_lone_param: true }))
		.join(", ")}] ${rule.close_reversed ? "<-" : "->"} ${rule.close_field}`;

/**
 * Whether a stored rule is safe to hand to WASM. Settings arrays aren't
 * default-merged per element, so a hand-edited, synced, or very old
 * `data.json` can hold a rule missing `close_field` or a chain field — passing
 * `undefined` as a string throws inside the bindings and aborts the whole
 * rebuild (#778). A missing `name` is tolerated; the caller defaults it.
 */
export const is_valid_transitive_rule = (rule: TransitiveRule) =>
	typeof rule.close_field === "string" &&
	Array.isArray(rule.chain) &&
	rule.chain.every((attr) => typeof attr?.field === "string");

const regex = /\[(.+)\]\s*(<-|->)\s*(.+)/;

export const get_transitive_rule_name = (
	rule: Pick<
		TransitiveRule,
		"chain" | "close_field" | "close_reversed" | "name"
	>,
) => rule.name || stringify_transitive_relation(rule);

export const parse_transitive_relation = (
	str: string,
): Result<
	Pick<TransitiveRule, "chain" | "close_field" | "close_reversed">,
	null
> => {
	const match = regex.exec(str);

	if (!match) {
		return fail(null);
	} else {
		return succ({
			close_field: match[3],
			close_reversed: match[2] === "<-",
			chain: split_and_trim(match[1]).map((field) => ({ field })),
		});
	}
};

export const input_transitive_rule_schema = (data: { fields: EdgeField[] }) => {
	const field_labels = data.fields.map((f) => f.label);

	return z.object({
		chain: z.array(
			z.object({ field: zod.schema.dynamic_enum(field_labels) }),
		),

		close_field: zod.schema.dynamic_enum(field_labels, "close_field"),

		close_reversed: z.boolean(),
	});
};
