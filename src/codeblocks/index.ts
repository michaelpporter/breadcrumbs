import { parseYaml } from "obsidian";
import type { BreadcrumbsError } from "src/interfaces/graph";
import { dataview_from_query } from "./dataview_from";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { remove_duplicates_by } from "src/utils/arrays";
import { Paths } from "src/utils/paths";
import { quote_join } from "src/utils/strings";
import type { z } from "zod";
import type { ICodeblock } from "./schema";
import { CodeblockSchema } from "./schema";

/** Raw YAML string -> YAML -> zod-parsed */
function parse_source(
	source: string,
	data: ICodeblock["InputData"],
): {
	errors: BreadcrumbsError[];
	parsed: z.infer<ReturnType<typeof CodeblockSchema.build>> | null;
} {
	const errors: BreadcrumbsError[] = [];

	let yaml: Record<string, unknown>;
	try {
		yaml = (parseYaml(source) as Record<string, unknown>) ?? {};

		log.debug("Codeblock > parsed_yaml >", yaml);
	} catch (error) {
		log.error("Codeblock > parse_source > ", error);

		errors.push({
			path: "yaml",
			code: "invalid_yaml",
			message:
				"Invalid codeblock YAML. Check the console for more information (press `Ctrl + Shift + I` to open the console).",
		});

		return { parsed: null, errors };
	}

	// NOTE: An empty codeblock is valid, but yaml sees it as null
	const parsed = CodeblockSchema.build(yaml, data).safeParse(yaml);
	if (!parsed.success) {
		errors.push(
			// Sometimes what I thought would be a fatal parsing error just continues...
			// The `depth` schema, for example, can send multiple issues, the latter of which don't make sense in the context of the previous failures
			// So, we just take the first issue for each path and ignore the rest
			...remove_duplicates_by(parsed.error.issues, (issue) =>
				issue.path.join("."),
			).map((issue) => ({
				message: issue.message,
				code: "invalid_field_value" as const,
				path: issue.path
					.map((key) => (typeof key === "number" ? key + 1 : key))
					.join(" > "),
			})),
		);

		return {
			errors,
			parsed: null,
		};
	}

	const invalid_fields = Object.keys(parsed.data).filter(
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
		(key) => !CodeblockSchema.FIELDS.includes(key as any),
	);

	if (invalid_fields.length) {
		errors.push({
			path: "yaml",
			code: "invalid_yaml",
			message: `The following is not a valid codeblock field: \`${invalid_fields[0]}\`. Valid options are: ${quote_join(CodeblockSchema.FIELDS, "`", ", or ")}`,
		});
	}

	return { parsed: parsed.data, errors };
}

/** Refine the results of parsing, with the plugin now available in context */
function postprocess_options(
	/** Where the codeblock is */
	source_path: string,
	parsed: ICodeblock["Options"],
	errors: BreadcrumbsError[],
	plugin: BreadcrumbsPlugin,
) {
	let file_path = source_path;

	if (parsed["start-note"]) {
		const normalized = Paths.normalize(
			Paths.ensure_ext(parsed["start-note"], "md"),
		);

		const start_file = plugin.app.metadataCache.getFirstLinkpathDest(
			normalized,
			file_path,
		);

		if (start_file) {
			file_path = start_file.path;
		} else {
			errors.push({
				path: "start-note",
				code: "invalid_field_value",
				message: `Could not find note \`${normalized}\` in your vault. Try a different path.`,
			});
		}
	}

	if (parsed["dataview-from"]) {
		log.warn(
			"Codeblock field `dataview-from` is deprecated; use `from` instead.",
		);
	}

	// `from` is the canonical field (the schema coalesces `dataview-from` into it).
	// Only validated here -- each codeblock type live-queries it on its own
	// update() (via try_dataview_from_query) rather than reading a value
	// precomputed once at parse time, which could go stale.
	if (parsed.from) {
		try {
			dataview_from_query(parsed.from, plugin.app, source_path);
		} catch {
			errors.push({
				path: "from",
				code: "invalid_field_value",
				message: `Input \`${parsed.from}\` is not a valid query. Supported: \`#tag\`, \`"folder"\`, \`[[link]]\`, and \`AND\`/\`OR\`/\`NOT\` combinations.`,
			});
		}
	}

	return { options: parsed, file_path };
}

export const Codeblocks = {
	parse_source,
	postprocess_options,
};
