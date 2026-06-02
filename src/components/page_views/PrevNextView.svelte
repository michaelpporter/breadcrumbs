<script lang="ts">
	import { DateTime } from "luxon";
	import BreadcrumbsPlugin from "src/main";
	import { group_by, remove_duplicates } from "src/utils/arrays";
	import { resolve_field_group_labels } from "src/utils/edge_fields";
	import { implied_pair_close_field } from "src/utils/implied_pair_close_field";
	import EdgeLink from "../EdgeLink.svelte";
	import { to_node_stringify_options } from "src/graph/utils";

	interface Props {
		file_path: string;
		plugin: BreadcrumbsPlugin;
	}

	let { file_path, plugin }: Props = $props();

	let edge_field_labels = $derived.by(() => {
		const { field_group_labels } = plugin.settings.views.page.prev_next;
		return {
			prev: resolve_field_group_labels(
				plugin.settings.edge_field_groups,
				field_group_labels.prev,
			),
			next: resolve_field_group_labels(
				plugin.settings.edge_field_groups,
				field_group_labels.next,
			),
		};
	});

	let merged_field_labels = $derived(
		remove_duplicates([
			...edge_field_labels.prev,
			...edge_field_labels.next,
		]),
	);

	let node_stringify_options = $derived(
		to_node_stringify_options(
			plugin.settings,
			plugin.settings.views.page.prev_next.show_node_options,
		),
	);

	$effect(() => {
		const o = node_stringify_options;
		return () => o.free();
	});

	let grouped_out_edges = $derived.by(() => {
		if (!plugin.graph.has_node(file_path)) return null;
		const efl = edge_field_labels;
		return group_by(
			plugin.graph
				.get_filtered_outgoing_edges(file_path, merged_field_labels)
				.get_edges(),
			(e) =>
				efl.prev.includes(e.edge_type)
					? ("prev" as const)
					: ("next" as const),
		);
	});

	type PeriodKind = "week" | "month" | "quarter" | "year";
	const PERIOD_KINDS: PeriodKind[] = ["week", "month", "quarter", "year"];

	interface PeriodRow {
		kind: PeriodKind;
		period_path: string;
		prev_path: string | null;
		next_path: string | null;
	}

	function period_rows_derived(): PeriodRow[] {
		const rows: PeriodRow[] = [];
		const { period_rows } = plugin.settings.views.page.prev_next;
		const period_cfg = plugin.settings.explicit_edge_sources.date_note;
		const basename =
			file_path
				.split("/")
				.pop()
				?.replace(/\.[^.]+$/, "") ?? "";

		for (const kind of PERIOD_KINDS) {
			if (!period_rows[kind]) continue;
			const cfg = period_cfg[kind];
			if (!cfg.enabled) continue;

			let period_path: string | null = null;

			// Is this note itself a period note of this kind?
			if (DateTime.fromFormat(basename, cfg.date_format).isValid) {
				period_path = file_path;
			} else if (plugin.graph.has_node(file_path)) {
				// Follow up_field edges to find containing period note
				const up_edges = plugin.graph
					.get_filtered_outgoing_edges(file_path, [cfg.up_field])
					.get_edges();
				for (const edge of up_edges) {
					const target = edge.target_path(plugin.graph);
					const target_basename =
						target
							.split("/")
							.pop()
							?.replace(/\.[^.]+$/, "") ?? "";
					if (
						DateTime.fromFormat(target_basename, cfg.date_format)
							.isValid
					) {
						period_path = target;
						break;
					}
				}
			}

			if (!period_path) continue;
			if (!plugin.graph.has_node(period_path)) continue;

			const prev_field =
				implied_pair_close_field(plugin.settings, cfg.next_field) ??
				null;

			const next_edges = plugin.graph
				.get_filtered_outgoing_edges(period_path, [cfg.next_field])
				.get_edges();
			const prev_edges = prev_field
				? plugin.graph
						.get_filtered_outgoing_edges(period_path, [prev_field])
						.get_edges()
				: [];

			rows.push({
				kind,
				period_path,
				next_path: next_edges[0]?.target_path(plugin.graph) ?? null,
				prev_path: prev_edges[0]?.target_path(plugin.graph) ?? null,
			});
		}
		return rows;
	}

	let period_rows = $derived(period_rows_derived());
</script>

<div class="BC-prev-next-view flex flex-col">
	{#if grouped_out_edges?.prev?.length || grouped_out_edges?.next?.length}
		<div class="BC-prev-next-daily flex">
			<div
				class="flex w-full flex-col"
				style="border-radius: var(--radius-m) 0 0 var(--radius-m)"
			>
				{#each grouped_out_edges?.prev ?? [] as edge}
					<div
						class="BC-next-prev-item flex gap-3 py-1 pl-2 pr-1 text-left"
					>
						<span class="BC-field px-2">{edge.edge_type}</span>

						<EdgeLink
							cls="grow"
							{edge}
							{plugin}
							{node_stringify_options}
						/>
					</div>
				{/each}
			</div>

			<div
				class="flex w-full flex-col"
				style="border-radius:  0 var(--radius-m) var(--radius-m) 0"
			>
				{#each grouped_out_edges?.next ?? [] as edge}
					<div
						class="BC-next-prev-item flex gap-3 py-1 pl-1 pr-2 text-right"
					>
						<EdgeLink
							cls="grow"
							{edge}
							{plugin}
							{node_stringify_options}
						/>

						<span class="BC-field px-2">{edge.edge_type}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#each period_rows as row}
		<div class="BC-period-row flex items-center gap-1 py-1 px-2">
			<span class="BC-period-kind text-xs opacity-60">{row.kind}</span>

			<div class="flex grow items-center justify-between">
				<div class="flex-1 text-left">
					{#if row.prev_path}
						<EdgeLink
							cls=""
							edge={plugin.graph
								.get_filtered_outgoing_edges(row.period_path, [
									implied_pair_close_field(
										plugin.settings,
										plugin.settings.explicit_edge_sources
											.date_note[row.kind].next_field,
									) ?? "",
								])
								.get_edges()[0]}
							{plugin}
							{node_stringify_options}
						/>
					{/if}
				</div>

				<span class="BC-period-current mx-2 font-medium">
					{row.period_path
						.split("/")
						.pop()
						?.replace(/\.[^.]+$/, "") ?? ""}
				</span>

				<div class="flex-1 text-right">
					{#if row.next_path}
						<EdgeLink
							cls=""
							edge={plugin.graph
								.get_filtered_outgoing_edges(row.period_path, [
									plugin.settings.explicit_edge_sources
										.date_note[row.kind].next_field,
								])
								.get_edges()[0]}
							{plugin}
							{node_stringify_options}
						/>
					{/if}
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	.BC-prev-next-view > div {
		border: 1px solid var(--background-modifier-border);
	}
	.BC-prev-next-view .flex-col {
		background-color: var(--background-primary);
	}
	.BC-period-row {
		background-color: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: var(--radius-m);
	}
	:global(.BC-next-prev-item) {
		padding: 0.25rem 0.25rem !important;
	}
	:global(.BC-next-prev-item .BC-field) {
		padding-left: 0.25rem !important;
		padding-right: 0.25rem !important;
	}
</style>
