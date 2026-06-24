import { readFile } from "fs/promises";
import { DEFAULT_SETTINGS } from "src/const/settings";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { migrate_old_settings } from "src/settings/migration";
import { deep_merge_objects } from "src/utils/objects";
import { describe, expect, test } from "vitest";

/**
 * A deep-partial of the settings: every nested object is optional, but arrays
 * are kept whole — they replace rather than merge, matching how
 * `deep_merge_objects` treats them.
 */
type DeepPartial<T> = T extends readonly unknown[]
	? T
	: T extends object
		? { [K in keyof T]?: DeepPartial<T[K]> }
		: T;

const load_migrated = async (
	fixture: string,
): Promise<BreadcrumbsSettings> => {
	const old = deep_merge_objects(
		JSON.parse(
			await readFile(`tests/__mocks__/settings/${fixture}.json`, "utf-8"),
		),
		DEFAULT_SETTINGS,
	);

	return migrate_old_settings(old);
};

/**
 * Build the expected settings from the migration's *delta* against the
 * defaults: list only the fields the migration changes. `deep_merge_objects`
 * gives the delta precedence (whole arrays and scalars win; nested objects
 * merge recursively), so every field the migration leaves alone is asserted to
 * equal `DEFAULT_SETTINGS`.
 *
 * This keeps the full-object `toStrictEqual` regression check while meaning a
 * newly-added settings field (with a default) needs NO change here — it flows
 * in from `DEFAULT_SETTINGS` automatically.
 */
const with_defaults = (
	delta: DeepPartial<BreadcrumbsSettings>,
): BreadcrumbsSettings =>
	deep_merge_objects(delta as BreadcrumbsSettings, DEFAULT_SETTINGS);

describe("migration", () => {
	test("v4-with-directions", async () => {
		const migrated = await load_migrated("v4-with-directions");

		expect(migrated).toStrictEqual(
			with_defaults({
				explicit_edge_sources: {
					dendron_note: { enabled: true, display_trimmed: true },
					date_note: {
						enabled: true,
						date_format: "yyyy-MM-dd 'DN'",
					},
				},
				views: {
					page: { trail: { show_controls: false } },
					side: {
						matrix: { show_node_options: { ext: true } },
						tree: { collapse: true },
					},
				},
				commands: {
					list_index: {
						default_options: {
							// `dir` is a legacy option the migration doesn't strip; it's
							// no longer part of ListIndexOptions but still lingers in the
							// migrated output, so the type check needs a nudge here.
							// @ts-expect-error — legacy key absent from ListIndexOptions
							dir: "down",
							hierarchy_i: -1,
						},
					},
				},
				suggestors: { edge_field: { enabled: true } },
				debug: { level: "DEBUG" },
				_bc_migrations: {
					tree_ups_with_downs_default: true,
					tree_find_root_default: true,
				},
			}),
		);
	});

	test("lemons-settings", async () => {
		const migrated = await load_migrated("lemons-settings");

		expect(migrated).toStrictEqual(
			with_defaults({
				views: { page: { trail: { format: "path" } } },
				commands: {
					list_index: {
						default_options: {
							// `dir` is a legacy option the migration doesn't strip; it's
							// no longer part of ListIndexOptions but still lingers in the
							// migrated output, so the type check needs a nudge here.
							// @ts-expect-error — legacy key absent from ListIndexOptions
							dir: "down",
							hierarchy_i: -1,
						},
					},
				},
				debug: { level: "DEBUG" },
				_bc_migrations: {
					tree_ups_with_downs_default: true,
					tree_find_root_default: true,
				},
			}),
		);
	});
});
