import { Setting } from "obsidian";
import { META_ALIAS } from "src/const/metadata_fields";
import type BreadcrumbsPlugin from "src/main";

export const _add_settings_traverse_note = (
	_plugin: BreadcrumbsPlugin,
	containerEl: HTMLElement,
) => {
	// Traverse notes have no configurable defaults: the per-note field below is
	// the sole opt-in marker, so a "default field" can't be applied (it would
	// turn every note into a traversal root). This page is informational.
	new Setting(containerEl).setDesc(
		`Add "${META_ALIAS["traverse-note-field"]}: <field>" to a note's frontmatter to make it a traversal root. Breadcrumbs walks outward along that note's resolved links, adding one edge per hop using the chosen field.`,
	);
};
