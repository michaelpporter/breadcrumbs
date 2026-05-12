import { DEFAULT_SETTINGS } from "src/const/settings";
import type { BreadcrumbsSettings } from "src/interfaces/settings";

let _settings = $state<BreadcrumbsSettings>(structuredClone(DEFAULT_SETTINGS));

export const reactive_settings = {
	get current(): BreadcrumbsSettings {
		return _settings;
	},

	init(value: BreadcrumbsSettings) {
		_settings = value;
	},

	snapshot(): BreadcrumbsSettings {
		return $state.snapshot(_settings) as BreadcrumbsSettings;
	},
};
