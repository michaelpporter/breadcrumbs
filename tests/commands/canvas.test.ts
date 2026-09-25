import { resolve_canvas_fields } from "src/commands/canvas";
import { describe, expect, test } from "vitest";

describe("resolve_canvas_fields", () => {
	const edge_field_groups = [
		{ label: "ups", fields: ["up"] },
		{ label: "sames", fields: ["same", "sibling"] },
	];

	test("resolves fields from the selected groups, not the saved snapshot", () => {
		// `fields` was saved before "sibling" joined the "sames" group.
		const fields = resolve_canvas_fields(edge_field_groups, {
			field_group_labels: ["ups", "sames"],
			fields: ["up", "same"],
		});

		expect(fields).toEqual(["up", "same", "sibling"]);
	});

	test("no selected groups follows all fields", () => {
		const fields = resolve_canvas_fields(edge_field_groups, {
			field_group_labels: [],
			fields: [],
		});

		expect(fields).toBeUndefined();
	});
});
