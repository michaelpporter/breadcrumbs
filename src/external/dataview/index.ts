import type { App } from "obsidian";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";

interface DataviewApi {
	index: { initialized: boolean };
	page: (path: string) => unknown;
	pages: (query?: string, path?: string) => unknown;
}

function get_api(app: App): DataviewApi | undefined {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (app as any).plugins?.plugins?.["dataview"]?.api as
		| DataviewApi
		| undefined;
}

function is_enabled(app: App): boolean {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return Boolean((app as any).plugins?.plugins?.["dataview"]);
}

/** `FullIndex.initialized` is set when the vault walk finishes (0.5.x). */
function dataview_index_already_ready(api: DataviewApi | undefined): boolean {
	return Boolean(api?.index?.initialized);
}

function await_if_enabled(plugin: BreadcrumbsPlugin) {
	return new Promise<void>((resolve) => {
		if (is_enabled(plugin.app)) {
			if (dataview_index_already_ready(get_api(plugin.app))) {
				log.debug("dataview > already initialized");
				resolve();
			}

			plugin.registerEvent(
				plugin.app.metadataCache.on(
					//@ts-ignore: It's there if dataview is enabled
					"dataview:index-ready",
					() => {
						log.debug("dataview > ready");
						resolve();
					},
				),
			);
		} else {
			log.debug("dataview > not enabled");
			resolve();
		}
	});
}

export type { DataviewApi };

export const dataview_plugin = {
	get_api,
	is_enabled,
	await_if_enabled,
};
