import { MarkdownView } from "obsidian";
import PageViewsComponent from "src/components/page_views/index.svelte";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { mount } from "svelte";

export function redraw_page_views(plugin: BreadcrumbsPlugin) {
	const markdown_views = plugin.app.workspace.getLeavesOfType("markdown");
	if (!markdown_views.length) {
		log.info("redraw_page_views > No markdown views found");
		return;
	}

	markdown_views.forEach((leaf) => {
		if (!(leaf.view instanceof MarkdownView)) return;

		const markdown_view = leaf.view;
		const mode = markdown_view.getMode();

		// Ensure the container exists _on the current page_, leaving other pages' containers alone
		const page_views_el =
			markdown_view.containerEl.querySelector<HTMLElement>(".BC-page-views") ??
			markdown_view.containerEl.createDiv({
				cls: "BC-page-views w-full mx-auto",
			});

		// Set the max width
		// NOTE: Do this _after_ getting the element
		//   So that if it existed already, it gets updated
		const max_width = plugin.settings.views.page.all.readable_line_width
			? "var(--file-line-width)"
			: "none";
		page_views_el.setAttribute("style", `max-width: ${max_width};`);

		// Stickyness
		page_views_el.classList.toggle(
			"BC-page-views-sticky",
			plugin.settings.views.page.all.sticky,
		);

		// Clear out any old content
		page_views_el.empty();

		// Move it to the right place
		if (mode === "preview") {
			// NOTE: Embedded notes also match ".markdown-preview-view", so instead
			//   we ensure the immediate parent is ".markdown-reading-view", which doesn't
			//   exist on embedded notes
			const view_parent = markdown_view.containerEl.querySelector(
				".markdown-reading-view > .markdown-preview-view",
			);
			if (!view_parent) {
				log.info("redraw_page_views > No view_parent (mode=preview)");
				return;
			}

			view_parent.insertBefore(page_views_el, view_parent.firstChild);

			page_views_el.style.removeProperty("margin-left");
			page_views_el.style.removeProperty("margin-right");

			// Source mode may have left these on .cm-scroller in older versions.
			const preview_scroller = markdown_view.containerEl.querySelector(
				".cm-scroller",
			);
			preview_scroller?.classList.remove("flex-col");
			preview_scroller?.classList.remove("BC-cm-scroller-inline-page-views");
		} else {
			const cm_scroller = markdown_view.containerEl.querySelector(
				".cm-scroller",
			);
			if (!cm_scroller) {
				log.info("redraw_page_views > No cm-scroller (mode=source)");
				return;
			}

			// Never add Tailwind `flex-col` on .cm-scroller — it breaks CM6 drag-selection autoscroll (#660).
			cm_scroller.classList.remove("flex-col");
			cm_scroller.classList.remove("BC-cm-scroller-inline-page-views");

			const pin_page_views = plugin.settings.views.page.all.sticky;

			if (pin_page_views) {
				// Full-width row above `.cm-editor` (not beside gutters inside the editor flex row).
				const source_view =
					markdown_view.containerEl.querySelector(
						".markdown-source-view.mod-cm6",
					) ??
					markdown_view.containerEl.querySelector(".markdown-source-view");
				const cm_editor =
					markdown_view.containerEl.querySelector(".cm-editor");

				if (
					source_view &&
					cm_editor &&
					source_view.contains(cm_editor)
				) {
					source_view.insertBefore(page_views_el, cm_editor);
				} else {
					const host = cm_scroller.parentElement;
					if (!host) {
						log.info("redraw_page_views > No parent of cm-scroller");
						return;
					}
					host.insertBefore(page_views_el, cm_scroller);
				}
				page_views_el.style.removeProperty("margin-left");
				page_views_el.style.removeProperty("margin-right");
			} else {
				// Inside the scroller so the trail scrolls with the note; layout class wraps a full-width row.
				// Insert as the first child so BC-page-views occupies row 1 (flex: 0 0 100%),
				// leaving gutters and content to lay out normally on row 2.
				cm_scroller.classList.add("BC-cm-scroller-inline-page-views");
				cm_scroller.insertBefore(
					page_views_el,
					cm_scroller.firstChild,
				);

				// Obsidian centers text via .cm-sizer (max-width + margin:auto), so text
				// starts at (scroller_w - file_line_w) / 2 + gutter_w. Shift BC's
				// margin-left by the gutter width to match.
				if (plugin.settings.views.page.all.readable_line_width) {
					requestAnimationFrame(() => {
						if (!page_views_el.isConnected) return;
						const gutters =
							cm_scroller.querySelector<HTMLElement>(".cm-gutters");
						const G = gutters?.getBoundingClientRect().width ?? 0;
						page_views_el.style.marginLeft = `calc((100% - var(--file-line-width)) / 2 + ${G}px)`;
						page_views_el.style.marginRight = "auto";
					});
				} else {
					page_views_el.style.removeProperty("margin-left");
					page_views_el.style.removeProperty("margin-right");
				}
			}
		}

		// Render the component into the container
		mount(PageViewsComponent, {
			target: page_views_el,
			props: { plugin, file_path: markdown_view.file?.path ?? "" },
		});
	});
}
