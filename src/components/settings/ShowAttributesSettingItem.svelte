<script lang="ts">
	import type { EdgeAttribute } from "src/graph/utils";
	import { effect_counter } from "src/utils/perf";
	import ShowAttributesSelectorMenu from "../selector/ShowAttributesSelectorMenu.svelte";
	import SettingItem from "./SettingItem.svelte";

	interface Props {
		show_attributes: EdgeAttribute[];
		exclude_attributes?: EdgeAttribute[];
		select_cb?: (value: EdgeAttribute[]) => void;
	}

	let {
		show_attributes = $bindable(),
		exclude_attributes = [],
		select_cb = () => {},
	}: Props = $props();

	const tick_sa = effect_counter("ShowAttributesSettingItem");
	let prev_sa: EdgeAttribute[] | undefined;
	$effect(() => {
		tick_sa();
		if (show_attributes === prev_sa) return;
		prev_sa = show_attributes;
		if (show_attributes) {
			select_cb(show_attributes);
		}
	});
</script>

<SettingItem
	name="Show Attributes"
	description="Select the edge attributes to show."
>
	<ShowAttributesSelectorMenu {exclude_attributes} bind:show_attributes />
</SettingItem>
