<script lang="ts">
	import { run } from "svelte/legacy";

	import { Component, MarkdownRenderer } from "obsidian";
	import { log } from "src/logger";
	import type BreadcrumbsPlugin from "src/main";
	import { active_file_store } from "src/stores/active_file";
	import { onDestroy } from "svelte";
	import { effect_counter } from "src/utils/perf";

	interface Props {
		cls?: string;
		markdown: string;
		plugin: BreadcrumbsPlugin;
		source_path?: string | undefined;
	}

	let {
		cls = "",
		markdown,
		plugin,
		source_path = undefined,
	}: Props = $props();

	let el: HTMLElement | undefined = $state();
	let component: Component | undefined;

	let active_file = $derived($active_file_store);

	// we need to pass both the mermaid string and the target element, so that it re-renders when the mermaid string changes
	// and for the initial render the target element is undefined, so we need to check for that
	async function render(markdown: string): Promise<void> {
		if (!el) return;

		log.debug("rendering markdown");

		el.empty();

		if (component) {
			component.unload();
			component = undefined;
		}
		component = new Component();
		component.load();

		return MarkdownRenderer.render(
			plugin.app,
			markdown,
			el,
			source_path ?? active_file?.path ?? "",
			component,
		);
	}

	const tick_render_md = effect_counter("RenderMarkdown");
	$effect(() => {
		tick_render_md();
		void render(markdown);
	});

	onDestroy(() => {
		if (component) {
			component.unload();
			component = undefined;
		}
	});
</script>

<div class="markdown-rendered {cls}" bind:this={el}></div>
