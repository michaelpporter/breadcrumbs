<script lang="ts">
	import { Search } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";

	interface Props {
		cls?: string;
		active: boolean;
	}

	let { cls = "", active = $bindable() }: Props = $props();
</script>

<button
	class={cls}
	class:is-active={active}
	aria-label={active ? "Hide search" : "Search"}
	onclick={() => (active = !active)}
>
	<Search size={ICON_SIZE} />
</button>
