import { DEFAULT_SETTINGS } from "src/const/settings";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { log } from "src/logger";
import { perf_end, perf_start } from "src/utils/perf";

let _settings = $state<BreadcrumbsSettings>(structuredClone(DEFAULT_SETTINGS));

export const reactive_settings = {
	get current(): BreadcrumbsSettings {
		return _settings;
	},

	init(value: BreadcrumbsSettings) {
		perf_start("reactive_settings.init");
		_settings = value;
		log.debug("reactive_settings.init", {
			keys: Object.keys(value).length,
		});
		perf_end("reactive_settings.init");
	},

	snapshot(): BreadcrumbsSettings {
		return $state.snapshot(_settings) as BreadcrumbsSettings;
	},
};
