import { DEFAULT_SETTINGS } from "src/const/settings";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { log } from "src/logger";

let _settings = $state<BreadcrumbsSettings | null>(null);

export const reactive_settings = {
	get current(): BreadcrumbsSettings {
		if (!_settings) {
			log.warn(
				"reactive_settings accessed before init — returning defaults",
			);
			_settings = structuredClone(DEFAULT_SETTINGS);
		}
		return _settings;
	},

	init(value: BreadcrumbsSettings) {
		_settings = value;
	},

	snapshot(): BreadcrumbsSettings {
		if (!_settings) {
			throw new Error("reactive_settings accessed before init");
		}
		return $state.snapshot(_settings) as BreadcrumbsSettings;
	},
};
