import type { BreadcrumbsError } from "src/interfaces/graph";
import type { Result } from "src/interfaces/result";

/**
 * Wrap a successful value in a `Result`.
 * Use inside builder helper functions (`get_<builder>_note_info`) to signal
 * that the note is valid and should produce edges.
 *
 * @example
 * return succ({ field: "up", recurse: false });
 */
export const succ = <S>(data: S): { ok: true; data: S } => ({
	ok: true,
	data,
});

/**
 * Wrap a failure value in a `Result`.
 * Pass `undefined` when the note simply doesn't qualify for this builder
 * (not an error — just skip it). Pass a `BreadcrumbsError` via
 * `graph_build_fail` when the note opted in but the configuration is invalid.
 *
 * @example
 * if (!metadata) return fail(undefined); // note has no frontmatter — skip silently
 */
export const fail = <F>(error: F): { ok: false; error: F } => ({
	ok: false,
	error,
});

/**
 * Convenience wrapper for a typed builder error.
 * Use when a note has the BC frontmatter key but the value is malformed.
 * The error is collected and shown in the Breadcrumbs UI without aborting the build.
 *
 * @example
 * return graph_build_fail({ path, code: "invalid_field_value", message: "..." });
 */
export const graph_build_fail = (error: BreadcrumbsError) => fail(error);
