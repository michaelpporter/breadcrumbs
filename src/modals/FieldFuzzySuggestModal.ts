import { FuzzySuggestModal } from "obsidian";
import type { EdgeField } from "src/interfaces/settings";
import type BreadcrumbsPlugin from "src/main";

export class FieldFuzzySuggester extends FuzzySuggestModal<EdgeField> {
	private plugin: BreadcrumbsPlugin;
	private cb: (field: EdgeField) => void;

	constructor(
		plugin: BreadcrumbsPlugin,
		value: EdgeField | null,
		cb: (field: EdgeField) => void,
	) {
		super(plugin.app);

		this.cb = cb;
		this.plugin = plugin;

		this.setPlaceholder("Choose a field...");
		this.setContent(value ? value.label : "");

		this.setInstructions([
			{ command: "↑↓", purpose: "Navigate" },
			{ command: "↵", purpose: "Choose" },
			{ command: "Ctrl+Enter", purpose: "Choose and close" },
		]);
	}

	getItems() {
		return this.plugin.settings.edge_fields;
	}

	getItemText(field: EdgeField): string {
		return field.label;
	}

	onChooseItem(field: EdgeField): void {
		this.cb(field);
		this.open();
	}

	onNoSuggestion(): void {}
}
