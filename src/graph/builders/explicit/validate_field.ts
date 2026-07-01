import type { BreadcrumbsError } from "src/interfaces/graph";
import type { Result } from "src/interfaces/result";
import type BreadcrumbsPlugin from "src/main";
import { fail, graph_build_fail, succ } from "src/utils/result";

/**
 * Validate a metadata edge-field value, shared across the explicit builders.
 *
 * - falsy → `fail(undefined)`: the note doesn't opt in, skip it silently
 * - non-string → `invalid_field_value`
 * - not a registered Breadcrumbs edge field → `invalid_edge_field`
 *
 * On success the validated label is returned as a `string`. `field_name` is the
 * human-readable key used in error messages (e.g. `"tag-note-field"`).
 *
 * For *optional* fields, guard the call with `if (raw_field)` so a missing value
 * stays optional instead of producing `fail(undefined)`.
 */
export const validate_edge_field = (
	plugin: BreadcrumbsPlugin,
	field: unknown,
	path: string,
	field_name: string,
): Result<string, BreadcrumbsError | undefined> => {
	if (!field) {
		return fail(undefined);
	} else if (typeof field !== "string") {
		return graph_build_fail({
			path,
			code: "invalid_field_value",
			message: `${field_name} is not a string: '${field}'`,
		});
	} else if (!plugin.settings.edge_fields.find((f) => f.label === field)) {
		return graph_build_fail({
			path,
			code: "invalid_edge_field",
			message: `${field_name} is not a valid field: '${field}'`,
		});
	}

	return succ(field);
};

/**
 * Validate an *optional* secondary edge-field (e.g. a sibling/neighbour
 * field): the caller has already merged the per-note override with its
 * settings default. Unset stays unset (`succ(undefined)`, not `fail`) so the
 * caller can continue building the note rather than bailing out — only a
 * present-but-invalid value is an error.
 */
export const validate_optional_edge_field = (
	plugin: BreadcrumbsPlugin,
	field: unknown,
	path: string,
	field_name: string,
): Result<string | undefined, BreadcrumbsError> => {
	if (!field) return succ(undefined);

	const res = validate_edge_field(plugin, field, path, field_name);
	// `field` is truthy here, so validate_edge_field can't take its
	// fail(undefined) branch -- error is always a real BreadcrumbsError.
	return res.ok ? succ(res.data) : { ok: false, error: res.error! };
};
