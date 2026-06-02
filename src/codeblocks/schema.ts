import { SIMPLE_EDGE_SORT_FIELDS } from "src/const/graph";
import { EDGE_ATTRIBUTES } from "src/graph/utils";
import type { EdgeField, EdgeFieldGroup } from "src/interfaces/settings";
import { remove_duplicates } from "src/utils/arrays";
import { resolve_field_group_labels } from "src/utils/edge_fields";
import { Mermaid } from "src/utils/mermaid";
import { zod } from "src/utils/zod";
import { z } from "zod";

const FIELDS = [
	"type",
	"title",
	"start-note",
	"fields",
	"field-groups",
	"depth",
	"flat",
	"collapse",
	"merge-fields",
	"dataview-from",
	"content",
	"sort",
	"field-prefix",
	"show-attributes",
	"mermaid-direction",
	"mermaid-renderer",
	"mermaid-curve",
	"mermaid-arrow",
] as const;

interface InputData {
	edge_fields: EdgeField[];
	field_groups: EdgeFieldGroup[];
}

const BOOLEANS = [true, false] as const;

const build = (input: Record<string, unknown>, data: InputData) => {
	const field_labels = data.edge_fields.map((f) => f.label);
	const group_labels = data.field_groups.map((f) => f.label);

	return (
		z
			.object({
				title: z
					.string({
						message: zod.error.not_string("title", input.title),
					})
					.optional(),

				"start-note": z
					.string({
						message: zod.error.not_string(
							"start-note",
							input["start-note"],
						),
					})
					.optional(),

				"dataview-from": z
					.string({
						message: zod.error.not_string(
							"dataview-from",
							input["dataview-from"],
						),
					})
					.optional(),

				flat: z
					.boolean({
						message: zod.error.invalid_enum(
							"flat",
							BOOLEANS,
							input.flat,
						),
					})
					.default(false),

				collapse: z
					.boolean({
						message: zod.error.invalid_enum(
							"collapse",
							BOOLEANS,
							input.collapse,
						),
					})
					.default(false),

				"merge-fields": z
					.boolean({
						message: zod.error.invalid_enum(
							"merge-fields",
							BOOLEANS,
							input["merge-fields"],
						),
					})
					.default(true),

				content: z
					.enum(["open", "closed"], {
						message: zod.error.invalid_enum(
							"content",
							["open", "closed"],
							input.content,
						),
					})
					.optional(),

				type: z
					.enum(["tree", "mermaid", "markmap"], {
						message: zod.error.invalid_enum(
							"type",
							["tree", "mermaid", "markmap"],
							input.type,
						),
					})
					.default("tree"),

				"mermaid-renderer": z
					.enum(Mermaid.RENDERERS, {
						message: zod.error.invalid_enum(
							"mermaid-renderer",
							Mermaid.RENDERERS,
							input["mermaid-renderer"],
						),
					})
					.optional(),
				"mermaid-direction": z
					.enum(Mermaid.DIRECTIONS, {
						message: zod.error.invalid_enum(
							"mermaid-direction",
							Mermaid.DIRECTIONS,
							input["mermaid-direction"],
						),
					})
					.optional(),
				"mermaid-curve": z
					.enum(Mermaid.CURVE_STYLES, {
						message: zod.error.invalid_enum(
							"mermaid-curve",
							Mermaid.CURVE_STYLES,
							input["mermaid-curve"],
						),
					})
					.optional(),
				"mermaid-arrow": z
					.boolean({
						message: zod.error.invalid_enum(
							"mermaid-arrow",
							BOOLEANS,
							input["mermaid-arrow"],
						),
					})
					.optional(),

				"show-attributes": z
					.array(z.enum(EDGE_ATTRIBUTES), {
						message: zod.error.not_array(
							"show-attributes",
							EDGE_ATTRIBUTES,
							input["show-attributes"],
						),
					})
					.optional(),

				fields: zod.schema
					.dynamic_enum_array("fields", field_labels, input.fields)
					.optional(),

				"field-groups": zod.schema
					.dynamic_enum_array(
						"field-groups",
						group_labels,
						input["field-groups"],
					)
					.optional(),

				depth: z
					.array(
						z
							.number({
								message: `Expected a number, but got: \`${input.depth}\` (${typeof input.depth}). _Try using a number (integer)._
**Example**: \`depth: [0]\`, or \`depth: [0, 3]\``,
							})
							// NOTE: Doesn't do what I expect. A codeblock with no depth field gets blocked on this check...
							// .int({
							// 	message: `Expected an integer (whole number), but got: \`${input["depth"]}\`. _Try using a whole number (without any decimal points)._
							// **Example**: \`depth: [0]\`, or \`depth: [0, 3]\``,
							// })
							.min(
								0,
								`Minimum depth cannot be less than \`0\`, but got: \`${input.depth}\` _Try using a non-negative number (greater than or equal to zero \`0\`)._
**Example**: \`depth: [0]\`, or possibly: \`depth: [${typeof input.depth === "number" ? -1 * input.depth : input.depth}\`]`,
							),
						{
							message: `Expected a YAML list (array) of one or two numbers, but got: \`${input.depth}\` (${typeof input.depth}).  _Try wrapping it in square brackets._
**Example**: \`depth: [0]\`, or \`depth: [0, 3]\`, or possibly: \`depth: [${input.depth}]\``,
						},
					)
					.min(
						1,
						`At least one item is required, but got: \`[${input.depth}]\`. _Try adding a number to the list._
**Example**: \`depth: [0]\`, or \`depth: [0, 3]\``,
					)
					.max(
						2,
						// NOTE: I _could_ do something like:
						//    or possibly \`depth: [${(<number[] | null>input["depth"])?.slice(0, 2).join(", ")}]\`
						//    But even that mess isn't safe. What if it's a string or something without join?
						`Maximum of two items allowed, but got: \`[${input.depth}]\`. _Try removing one of the numbers._
**Example**: \`depth: [${(input.depth as number[] | null)?.[0] ?? 0}]\`, or possibly \`depth: [${(input.depth as number[] | null)?.[0] ?? 0}, 3]\``,
					)
					.transform((v) => {
						if (v.length === 1) return [v[0], Infinity];
						else return v;
					})
					.refine((v) => v[0] <= v[1], {
						message: `Minimum depth cannot be greater than maximum depth. _Try swapping the numbers._
**Example**: \`depth: [0, 3]\`, or possibly: \`depth: [${(input.depth as number[] | null)?.[1] ?? 0}, ${(input.depth as number[] | null)?.[0] ?? 3}]\``,
					})
					.default([0, Infinity]),

				sort: z
					.unknown()
					.transform((v) => {
						if (typeof v === "string") {
							const [field, order] = v.split(" ");
							return { field, order: order ?? "asc" };
						}
						return v;
					})
					.pipe(
						z.object({
							// TODO: Use a custom zod schema to retain string template literals here
							// https://github.com/colinhacks/zod?tab=readme-ov-file#custom-schemas
							field: zod.schema.dynamic_enum(
								[
									...SIMPLE_EDGE_SORT_FIELDS,
									...data.edge_fields.map(
										(f) => `neighbour-field:${f.label}`,
									),
								],
								"sort",
							),

							order: z
								.union([
									z.enum(["asc", "desc"]),
									// Something very weird happening...
									// If a note has two codeblocks, the one that gets rendered first seems to override config in the other?
									// So when the `sort` field of the second comes in for parsing,
									// It's already been transformed, and so sort.order is a number, not a string...
									z.literal(1),
									z.literal(-1),
								])
								.transform((v) =>
									v === "asc" ? 1 : v === "desc" ? -1 : v,
								),
						}),
					)
					.default({
						order: 1,
						field: "basename",
					}),
			})
			.loose()
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
			.default({} as any)

			.transform((options) => {
				// If field-groups are given, resolve them to their fields
				// adding them to the fields array
				if (options["field-groups"]) {
					const field_labels = resolve_field_group_labels(
						data.field_groups,
						options["field-groups"],
					);

					if (options.fields) {
						options.fields = remove_duplicates(
							options.fields.concat(field_labels),
						);
					} else {
						options.fields = field_labels;
					}
				}

				return options;
			})
			.superRefine((options, ctx) => {
				if (options["mermaid-curve"] && options["mermaid-renderer"]) {
					ctx.addIssue({
						code: "custom",
						path: ["mermaid-curve"],
						message: `Cannot specify both a mermaid curve and a renderer. _Try removing one of the fields._
**Example**: \`mermaid-curve: ${options["mermaid-curve"]}\`, or \`mermaid-renderer: ${options["mermaid-renderer"]}\``,
					});
				}
			})
	);
};

export const CodeblockSchema = {
	FIELDS,

	build,
};

export interface ICodeblock {
	InputData: InputData;

	/** Once resolved, the non-optional fields WILL be there, with a default if missing */
	Options: z.infer<ReturnType<typeof build>> & {
		"dataview-from-paths"?: string[];
	};
}
