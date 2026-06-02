<script lang="ts">
	import type { EdgeField } from "src/interfaces/settings";

	interface Props {
		fields: EdgeField[];
		undefine_on_change?: boolean;
		field?: EdgeField | undefined;
		placeholder?: string | undefined;
		onselect?: (field: EdgeField) => void | undefined;
	}

	let {
		fields,
		undefine_on_change = true,
		field = $bindable(undefined),
		placeholder = undefined,
		onselect = undefined,
	}: Props = $props();
</script>

<select
	class="dropdown"
	value={field?.label ?? ""}
	onchange={(e) => {
		field = fields.find((field) => field.label === e.currentTarget.value);

		if (field) {
			onselect?.(field);
		}

		if (undefine_on_change) field = undefined;
	}}
>
	<option value="" disabled>{placeholder ?? "Select Field"}</option>

	{#each fields as { label }}
		<option value={label}>{label}</option>
	{/each}
</select>
