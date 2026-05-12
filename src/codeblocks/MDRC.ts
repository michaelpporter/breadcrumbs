import { MarkdownRenderChild } from "obsidian";
import CodeblockErrors from "src/components/codeblocks/CodeblockErrors.svelte";
import CodeblockMarkmap from "src/components/codeblocks/CodeblockMarkmap.svelte";
import CodeblockMermaid from "src/components/codeblocks/CodeblockMermaid.svelte";
import CodeblockTree from "src/components/codeblocks/CodeblockTree.svelte";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { BCEvent } from "src/main";
import { Timer } from "src/utils/timer";
import { mount, unmount } from "svelte";
import { Codeblocks } from ".";

/* eslint-disable */
type SvelteComponent =
	| ReturnType<typeof CodeblockTree>
	| ReturnType<typeof CodeblockMermaid>
	| ReturnType<typeof CodeblockMarkmap>;
/* eslint-enable */

export class CodeblockMDRC extends MarkdownRenderChild {
	source: string;
	plugin: BreadcrumbsPlugin;
	component: SvelteComponent | undefined;
	file_path: string;
	id: string;

	constructor(
		plugin: BreadcrumbsPlugin,
		containerEl: HTMLElement,
		source: string,
		file_path: string,
	) {
		super(containerEl);

		this.plugin = plugin;
		this.source = source;
		this.file_path = file_path;
		this.id = window.crypto.randomUUID();
	}

	update(): void {
		log.debug("CodeblockMDRC.update");

		if (this.component) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				this.component.update();
			} catch (e) {
				log.error("CodeblockMDRC.update error >", e);
			}
		}
	}

	onload(): void {
		const timer_outer = new Timer();

		log.debug("CodeblockMDRC.load");

		this.containerEl.empty();

		const timer_inner = new Timer();

		const { parsed, errors } = Codeblocks.parse_source(this.source, {
			edge_fields: this.plugin.settings.edge_fields,
			field_groups: this.plugin.settings.edge_field_groups,
		});

		log.debug(timer_inner.elapsedMessage("Codeblocks.parse_source", true));

		if (!parsed) {
			log.warn(
				"fatal codeblock errors\n" +
				errors.map((e) => `  [${e.code}] ${e.path}: ${e.message}`).join("\n"),
			);

			mount(CodeblockErrors, {
				target: this.containerEl,
				props: { errors, plugin: this.plugin },
			});

			return;
		}

		const { options, file_path } = Codeblocks.postprocess_options(
			this.file_path,
			parsed,
			errors,
			this.plugin,
		);
		log.debug("resolved codeblock options", options);

		log.debug(
			timer_inner.elapsedMessage("Codeblocks.postprocess_options", true),
		);

		// Although the postprocessing could also have errors,
		// they're not fatal at this point, so we can still render the codeblock (which renders the errors as well)
		if (errors.length) log.warn("non-fatal codeblock errors", errors);

		if (options.type === "tree") {
			this.component = mount(CodeblockTree, {
				target: this.containerEl,
				props: {
					errors,
					options,
					file_path,
					plugin: this.plugin,
				},
			});
		} else if (options.type === "mermaid") {
			this.component = mount(CodeblockMermaid, {
				target: this.containerEl,
				props: {
					errors,
					options,
					file_path,
					plugin: this.plugin,
				},
			});
		} else if (options.type === "markmap") {
			this.component = mount(CodeblockMarkmap, {
				target: this.containerEl,
				props: {
					errors,
					options,
					file_path,
					plugin: this.plugin,
				},
			});
		} else {
			log.error("CodeblockMDRC unknown type", options.type);
		}

		log.debug(timer_inner.elapsedMessage("component creation", true));
		log.debug(timer_outer.elapsedMessage("CodeblockMDRC.onload"));

		this.registerEvent(
			this.plugin.events.on(BCEvent.GRAPH_UPDATE, () => {
				this.update();
			}),
		);
	}

	onunload(): void {
		log.debug("CodeblockMDRC.unload");

		if (this.component) {
			void unmount(this.component);
		}
	}
}
