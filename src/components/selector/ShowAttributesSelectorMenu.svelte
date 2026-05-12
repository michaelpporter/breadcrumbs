<script lang="ts">
	import { FileJson } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import type { EdgeAttribute } from "src/graph/utils";
	import { ShowAttributesSelectorMenu } from "src/menus/ShowAttributesMenu";
	import { effect_counter } from "src/utils/perf";

	interface Props {
		show_attributes: EdgeAttribute[];
		exclude_attributes?: EdgeAttribute[];
		cls?: string;
	}

	let {
		show_attributes = $bindable(),
		exclude_attributes = [],
		cls = "",
	}: Props = $props();

	let did_strip_excluded = $state(false);

	// Remove any excluded items in the initial value
	// This makes it cleaner to pass in EDGE_ATTRIBUTES as the starter, then immediately exclude some
	const tick_strip = effect_counter("ShowAttributesSelectorMenu.strip");
	$effect.pre(() => {
		tick_strip();
		if (did_strip_excluded) return;
		const ex = exclude_attributes;
		if (!ex?.length) return;
		show_attributes = show_attributes.filter((v) => !ex.includes(v));
		did_strip_excluded = true;
	});
</script>

<button
	class={cls}
	aria-label="Change which edge attributes show"
	onclick={(e) => {
		ShowAttributesSelectorMenu({
			exclude_attributes,
			value: show_attributes,
			cb: (value) => (show_attributes = value),
		}).showAtMouseEvent(e);
	}}
>
	<FileJson size={ICON_SIZE} />
</button>
