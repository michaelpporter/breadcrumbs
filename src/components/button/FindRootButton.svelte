<script lang="ts">
	import { FolderTreeIcon, ListTreeIcon } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";

	interface Props {
		cls?: string;
		find_root: boolean;
	}

	let { cls = "", find_root = $bindable() }: Props = $props();
</script>

<button
	class={cls}
	aria-label={find_root
		? "Show Tree From Root"
		: "Show Tree From Active Note"}
	onclick={() => (find_root = !find_root)}
>
	{#if find_root}
		<FolderTreeIcon size={ICON_SIZE} />
	{:else}
		<ListTreeIcon size={ICON_SIZE} />
	{/if}
</button>
