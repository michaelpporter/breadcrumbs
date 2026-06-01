import type { TFile } from "obsidian";
import type { CrumbDestination } from "src/interfaces/settings";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import {
	ensure_is_array,
	group_by,
	group_projection,
	remove_duplicates,
} from "src/utils/arrays";
import type { EdgeStruct } from "wasm/pkg/breadcrumbs_graph_wasm";
import { Paths } from "./paths";

function linkify_edge(
	plugin: BreadcrumbsPlugin,
	struct: EdgeStruct,
	use_alias: boolean,
) {
	const target_path = struct.target_path(plugin.graph);

	// target_id is a full path
	const target_file = plugin.app.vault.getFileByPath(target_path);

	if (!target_file) {
		return `[[${Paths.drop_ext(target_path)}]]`;
	} else {
		return plugin.app.fileManager.generateMarkdownLink(
			target_file,
			struct.source_path(plugin.graph),
			undefined,
			use_alias
				? struct.target_data(plugin.graph).aliases?.at(0)
				: undefined,
		);
	}
}

export async function drop_crumbs(
	plugin: BreadcrumbsPlugin,
	destination_file: TFile,
	crumbs: EdgeStruct[],
	options: {
		destination: CrumbDestination | "none";
		included_fields?: string[];
		use_alias?: boolean;
	},
) {
	if (!crumbs.length) return;
	const included_fields: string[] =
		options.included_fields?.flatMap(
			(key) =>
				plugin.settings.edge_field_groups.find((f) => f.label === key)
					?.fields ?? [],
		) ?? [];
	const links_by_field = group_projection(
		group_by(crumbs, (e) => e.edge_type),
		(edges) =>
			edges.map((e) =>
				linkify_edge(plugin, e, options.use_alias ?? false),
			),
	);

	switch (options.destination) {
		case "frontmatter": {
			let mutated = false;

			const frontmatter =
				(plugin.app.metadataCache.getFileCache(destination_file)
					?.frontmatter as Record<string, unknown>) ?? {};

			Object.entries(links_by_field).forEach(([field, links]) => {
				if (!links?.length) return;
				if (included_fields.length && !included_fields.includes(field))
					return;

				const existing = frontmatter[field];
				if (existing) {
					const existing_array = ensure_is_array(existing);
					const new_links = remove_duplicates(
						existing_array.concat(links),
					);

					if (new_links.length !== existing_array.length) {
						mutated = true;
						frontmatter[field] = new_links;
					}
				} else {
					mutated = true;
					frontmatter[field] = links;
				}
			});

			if (mutated) {
				await plugin.app.fileManager.processFrontMatter(
					destination_file,
					(old_frontmatter) => {
						const new_frontmatter = Object.assign(
							old_frontmatter as Record<string, unknown>,
							frontmatter,
						);

						log.debug(
							"drop_crumbs > processed frontmatter",
							new_frontmatter,
						);
					},
				);
			}

			break;
		}

		case "dataview-inline": {
			await plugin.app.vault.process(destination_file, (content) => {
				let result = content;
				const to_append: string[] = [];

				Object.entries(links_by_field).forEach(([field, links]) => {
					if (!links?.length) return;
					if (
						included_fields.length &&
						!included_fields.includes(field)
					)
						return;

					const escaped = field.replace(
						/[.*+?^${}()|[\]\\]/g,
						"\\$&",
					);
					const regex = new RegExp(`^(${escaped}:: )(.+)$`, "m");
					const match = result.match(regex);

					if (match) {
						const existing = match[2]
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean);
						const merged = remove_duplicates([
							...existing,
							...links,
						]);
						result = result.replace(
							regex,
							`${match[1]}${merged.join(", ")}`,
						);
					} else {
						to_append.push(`${field}:: ${links.join(", ")}`);
					}
				});

				if (to_append.length) {
					result += "\n\n" + to_append.join("\n");
				}

				return result;
			});

			break;
		}

		case "none": {
			// Do nothing
			break;
		}
	}
}
