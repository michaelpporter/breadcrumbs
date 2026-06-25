import type BreadcrumbsPlugin from "src/main";
import { new_setting } from "src/utils/settings";
import { redraw_page_views } from "src/views/page";

export const _add_settings_page_views = (
	plugin: BreadcrumbsPlugin,
	container_el: HTMLElement,
) => {
	new_setting(container_el, {
		name: "Sticky",
		desc: "Keep the page views pinned to the top of the note as you scroll",
		toggle: {
			value: plugin.settings.views.page.all.sticky,
			cb: async (value) => {
				plugin.settings.views.page.all.sticky = value;

				await plugin.commitSettings("none");
				redraw_page_views(plugin);
			},
		},
	});
};
