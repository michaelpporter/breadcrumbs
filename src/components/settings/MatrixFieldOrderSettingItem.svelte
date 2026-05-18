<script lang="ts">
	import type { EdgeField } from "src/interfaces/settings";
	import { effect_counter } from "src/utils/perf";
	import SettingItem from "./SettingItem.svelte";

	interface Props {
		edge_fields: EdgeField[];
		custom_sort_field_labels: string[];
		select_cb?: (value: string[]) => void;
	}

	let {
		edge_fields,
		custom_sort_field_labels = $bindable(),
		select_cb = () => {},
	}: Props = $props();

	function build_ordered_labels() {
		const all_labels = edge_fields.map((field) => field.label);
		const selected = custom_sort_field_labels.filter((label) =>
			all_labels.includes(label),
		);
		const selected_set = new Set(selected);
		const unselected = all_labels.filter((label) => !selected_set.has(label));

		return [...selected, ...unselected];
	}

	let ordered_labels = $state(build_ordered_labels());
	let selected_labels = $state(new Set(custom_sort_field_labels));
	let drag_index = $state<number | null>(null);

	const tick_mfo = effect_counter("MatrixFieldOrderSettingItem");
	$effect(() => {
		tick_mfo();
		ordered_labels = build_ordered_labels();
		selected_labels = new Set(
			custom_sort_field_labels.filter((label) =>
				edge_fields.some((field) => field.label === label),
			),
		);
	});

	function emit() {
		const next = ordered_labels.filter((label) => selected_labels.has(label));
		custom_sort_field_labels = next;
		select_cb(next);
	}

	function move(from: number, to: number) {
		if (from === to || from < 0 || to < 0) return;
		if (from >= ordered_labels.length || to >= ordered_labels.length) return;

		const next = [...ordered_labels];
		const [label] = next.splice(from, 1);
		next.splice(to, 0, label);
		ordered_labels = next;
		emit();
	}

	function toggle_label(label: string, checked: boolean) {
		const next = new Set(selected_labels);
		if (checked) next.add(label);
		else next.delete(label);

		selected_labels = next;
		emit();
	}
</script>

<SettingItem
	name="Custom Field Order"
	description="Use defined edge fields, then reorder with arrows or drag-and-drop."
>
	<div class="BC-matrix-field-order" role="list">
		{#each ordered_labels as label, i}
			<div
				class="BC-matrix-field-order-row"
				role="listitem"
				draggable="true"
				ondragstart={() => (drag_index = i)}
				ondragover={(e) => e.preventDefault()}
				ondrop={() => {
					if (drag_index === null) return;
					move(drag_index, i);
					drag_index = null;
				}}
				ondragend={() => (drag_index = null)}
			>
				<label class="BC-matrix-field-order-label">
					<input
						type="checkbox"
						checked={selected_labels.has(label)}
						onchange={(e) =>
							toggle_label(label, e.currentTarget.checked)}
					/>
					<span>{label}</span>
				</label>

				<div class="BC-matrix-field-order-buttons">
					<button
						type="button"
						aria-label={`Move ${label} up`}
						disabled={i === 0}
						onclick={() => move(i, i - 1)}
					>
						↑
					</button>
					<button
						type="button"
						aria-label={`Move ${label} down`}
						disabled={i === ordered_labels.length - 1}
						onclick={() => move(i, i + 1)}
					>
						↓
					</button>
				</div>
			</div>
		{/each}
	</div>
</SettingItem>

<style>
	.BC-matrix-field-order {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 280px;
	}

	.BC-matrix-field-order-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 4px 6px;
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-s);
		background: var(--background-primary);
	}

	.BC-matrix-field-order-label {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.BC-matrix-field-order-label span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.BC-matrix-field-order-buttons {
		display: flex;
		gap: 4px;
	}

	.BC-matrix-field-order-buttons button {
		width: 26px;
		height: 24px;
		line-height: 1;
		padding: 0;
	}
</style>
