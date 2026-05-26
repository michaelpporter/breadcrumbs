<script lang="ts">
	import type BreadcrumbsPlugin from "src/main";
	import {
		ensure_square_array,
		gather_by_runs,
		transpose,
	} from "src/utils/arrays";
	import EdgeLink from "../EdgeLink.svelte";
	import type { Path } from "wasm/pkg/breadcrumbs_graph_wasm";
	import { to_node_stringify_options } from "src/graph/utils";

	interface Props {
		plugin: BreadcrumbsPlugin;
		all_paths: Path[];
	}

	let { plugin, all_paths }: Props = $props();

	let node_stringify_options = $derived(
		to_node_stringify_options(
			plugin.settings,
			plugin.settings.views.page.trail.show_node_options,
		),
	);

	$effect(() => {
		const o = node_stringify_options;
		return () => o.free();
	});

	let trail_grid = $derived.by(() => {
		// Precompute target-path strings once to avoid repeated WASM calls in sort.
		const path_keys = all_paths.map((path) =>
			path.reverse_edges.map((e) => e.target_path(plugin.graph)),
		);
		const max_len = Math.max(0, ...path_keys.map((k) => k.length));
		// Left-pad to match ensure_square_array(pre=true) alignment.
		const padded_keys = path_keys.map((keys) => {
			const pad = max_len - keys.length;
			return [...Array<string | null>(pad).fill(null), ...keys];
		});

		// Sort right-to-left (immediate parent first) so paths sharing ancestors
		// are adjacent, maximising gather_by_runs rowspans. null sorts last.
		const sorted = all_paths
			.map((_, i) => i)
			.sort((ai, bi) => {
				for (let col = max_len - 1; col >= 0; col--) {
					const av = padded_keys[ai][col];
					const bv = padded_keys[bi][col];
					if (av === bv) continue;
					if (av === null) return 1;
					if (bv === null) return -1;
					return av < bv ? -1 : 1;
				}
				return 0;
			})
			.map((i) => all_paths[i]);

		const reversed = sorted.map((path) => path.reverse_edges);
		const square = ensure_square_array(reversed, null, true);
		const col_runs = transpose(square).map((col) =>
			gather_by_runs(col, (e) =>
				e ? e.target_path(plugin.graph) : null,
			),
		);
		return { square, col_runs };
	});
</script>

<!-- TODO: sailKite says using grid-template-rows: subgrid could work some magic here
			https://discord.com/channels/686053708261228577/702656734631821413/1234871810185629859 -->
<div
	class="BC-trail-view grid"
	style="grid-template-rows: min-content;
grid-template-columns: {'1fr '.repeat(trail_grid.square.at(0)?.length ?? 0)};"
>
	{#each trail_grid.col_runs as col, j}
		{#each col as { first, last }}
			{@const edge = trail_grid.square[first][j]}

			<div
				class="BC-trail-view-item flex"
				style="
					grid-area: {first + 1} / {j + 1} / {last + 2} / {j + 2};"
			>
				{#if edge}
					<EdgeLink
						{edge}
						{plugin}
						cls="p-1 grow flex justify-center items-center"
						{node_stringify_options}
					/>
				{/if}
			</div>
		{/each}
	{/each}
</div>

<style>
	/* Handles the outer border, with some rounding */
	.BC-trail-view {
		/* Don't let the inner cell borders overlow */
		overflow: hidden;
		border-radius: var(--radius-m);
		border: 1px solid var(--background-modifier-border);
		background-color: var(--background-primary);
	}

	.BC-trail-view-item {
		/* Undo the effect of the double border on the top and right side */
		margin: -1px -1px 0 0;
		/* Only add borders on the top and right sides, to avoid inner duplications, and some outer duplicates */
		border-right: 1px solid var(--background-modifier-border);
		border-top: 1px solid var(--background-modifier-border);
	}
</style>
