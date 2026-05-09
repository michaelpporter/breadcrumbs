import type { BreadcrumbsSettings } from "src/interfaces/settings";

let _settings = $state<BreadcrumbsSettings | null>(null);

export const reactive_settings = {
	get current(): BreadcrumbsSettings {
		if (!_settings) {
			throw new Error("reactive_settings accessed before init");
		}
		return _settings;
	},

	init(value: BreadcrumbsSettings) {
		_settings = value;
	},
};
