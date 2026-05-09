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

		// Reset inline styles from any prior render. Width is handled by CSS
		// (source modes) or by the parent .markdown-preview-sizer (preview).
		page_views_el.setAttribute("style", "max-width: none;");

		// Stickyness
		page_views_el.classList.toggle(
			"BC-page-views-sticky",
			plugin.settings.views.page.all.sticky,
		);

		// Clear out any old content
		page_views_el.empty();

		// Determines what we mount the Svelte component into. For source-unpinned with
		// readable_line_width, we wrap with an inner div so the outer can stay full-row
		// (otherwise flex wrap mis-computes and BC ends up sharing row 1 with gutters).
		let mount_target: HTMLElement = page_views_el;

		// Move it to the right place
		if (mode === "preview") {
			// NOTE: Embedded notes also match ".markdown-preview-view", so we anchor
			//   on ".markdown-reading-view", which doesn't exist on embedded notes.
			//   Insert inside .markdown-preview-sizer so we inherit Obsidian's
			//   readable-line-width centering instead of fighting it with margin math.
			const view_parent = markdown_view.containerEl.querySelector(
				".markdown-reading-view > .markdown-preview-view > .markdown-preview-sizer",
			);
			if (!view_parent) {
				log.info("redraw_page_views > No view_parent (mode=preview)");
				return;
			}

			view_parent.insertBefore(page_views_el, view_parent.firstChild);

			// Clear any stale inline margins/padding left over from a prior source-mode render.
			page_views_el.style.removeProperty("margin-left");
			page_views_el.style.removeProperty("margin-right");
			page_views_el.style.removeProperty("padding-left");

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
				if (plugin.settings.views.page.all.readable_line_width) {
					page_views_el.style.maxWidth = "var(--file-line-width)";
					page_views_el.style.marginLeft = "auto";
					page_views_el.style.marginRight = "auto";
				} else {
					page_views_el.style.removeProperty("margin-left");
					page_views_el.style.removeProperty("margin-right");
					page_views_el.style.removeProperty("padding-left");
					page_views_el.style.removeProperty("max-width");
				}
			} else {
				// Inside the scroller so the trail scrolls with the note; layout class wraps a full-width row.
				// Insert as the first child so BC-page-views occupies row 1 (flex: 0 0 100%),
				// leaving gutters and content to lay out normally on row 2.
				cm_scroller.classList.add("BC-cm-scroller-inline-page-views");
				cm_scroller.insertBefore(
					page_views_el,
					cm_scroller.firstChild,
				);

				// Inner wrapper holds the visible content and gets the readable-line-width
				// constraint + offset. The outer stays full-row so flex always wraps it.
				if (plugin.settings.views.page.all.readable_line_width) {
					const inner = page_views_el.createDiv({
						cls: "BC-page-views-inner",
					});
					inner.style.maxWidth = "var(--file-line-width)";
					inner.style.marginLeft = "auto";
					inner.style.marginRight = "auto";
					mount_target = inner;
				} else {
					page_views_el.style.removeProperty("margin-left");
					page_views_el.style.removeProperty("margin-right");
					page_views_el.style.removeProperty("padding-left");
					page_views_el.style.removeProperty("max-width");
				}
			}
		}

		// Render the component into the container
		mount(PageViewsComponent, {
			target: mount_target,
			props: { plugin, file_path: markdown_view.file?.path ?? "" },
		});
	});
}
