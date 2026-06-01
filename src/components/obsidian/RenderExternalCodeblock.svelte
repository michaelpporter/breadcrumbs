<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import { wrap_in_codeblock } from "src/utils/strings";
	import RenderMarkdown from "../obsidian/RenderMarkdown.svelte";

	import type { Component } from "obsidian";

	interface Props {
		/** **not** wrapped in a codeblock */
		code: string;
		type: string;
		plugin: BreadcrumbsPlugin;
		source_path?: string | undefined;
		parent_component?: Component | undefined;
	}

	let {
		code,
		type,
		plugin,
		source_path = undefined,
		parent_component = undefined,
	}: Props = $props();
</script>

<RenderMarkdown
	{plugin}
	{source_path}
	{parent_component}
	markdown={wrap_in_codeblock(code, type)}
/>
