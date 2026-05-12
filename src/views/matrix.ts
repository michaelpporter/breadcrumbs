import type { WorkspaceLeaf } from "obsidian";
import { debounce, ItemView } from "obsidian";
import MatrixComponent from "src/components/side_views/Matrix.svelte";
import { VIEW_IDS } from "src/const/views";
import type BreadcrumbsPlugin from "src/main";
import { BCEvent } from "src/main";
import { mount, unmount } from "svelte";

export class MatrixView extends ItemView {
	plugin: BreadcrumbsPlugin;
	component: ReturnType<typeof MatrixComponent> | undefined;

	constructor(leaf: WorkspaceLeaf, plugin: BreadcrumbsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_IDS.matrix;
	}

	getDisplayText() {
		return "Matrix view";
	}

	icon = "blinds";

	onload(): void {
		const redraw = debounce(() => void this.onOpen(), 100);
		this.registerEvent(
			this.plugin.events.on(BCEvent.REDRAW_SIDE_VIEWS, redraw),
		);
	}

	async onOpen() {
		if (this.component) {
			const old = this.component;
			this.component = undefined;
			await unmount(old);
		}

		const container = this.containerEl.children[1];
		container.empty();

		this.component = mount(MatrixComponent, {
			target: this.contentEl,
			props: { plugin: this.plugin },
		});
	}

	async onClose() {
		if (this.component) {
			const old = this.component;
			this.component = undefined;
			await unmount(old);
		}
	}
}
