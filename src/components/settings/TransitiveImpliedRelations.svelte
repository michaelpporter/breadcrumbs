<script lang="ts">
	import {
		ArrowDown,
		ArrowUp,
		ClipboardIcon,
		PlusIcon,
		SaveIcon,
	} from "lucide-svelte";
	import { Menu, Notice } from "obsidian";
	import { ICON_SIZE } from "src/const";
	import type {
		EdgeField,
		BreadcrumbsSettings,
	} from "src/interfaces/settings";
	import { log } from "src/logger";
	import type BreadcrumbsPlugin from "src/main";
	import { Mermaid } from "src/utils/mermaid";
	import { split_and_trim } from "src/utils/strings";
	import {
		get_transitive_rule_name,
		input_transitive_rule_schema,
		parse_transitive_relation,
		stringify_transitive_relation,
	} from "src/utils/transitive_rules";
	import ChevronOpener from "../button/ChevronOpener.svelte";
	import RenderExternalCodeblock from "../obsidian/RenderExternalCodeblock.svelte";
	import Tag from "../obsidian/tag.svelte";
	import EdgeFieldSelector from "../selector/EdgeFieldSelector.svelte";

	interface Props {
		plugin: BreadcrumbsPlugin;
	}

	let { plugin = $bindable() }: Props = $props();

	let _cloned_settings: BreadcrumbsSettings;
	try {
		// Sanitize arrays that might have been proxied by reactive state before cloning
		const s = plugin.settings;
		const sanitized: BreadcrumbsSettings = {
			...s,
			views: {
				...s.views,
				side: {
					...s.views.side,
					matrix: {
						...s.views.side.matrix,
						show_attributes: [
							...s.views.side.matrix.show_attributes,
						],
					},
					tree: {
						...s.views.side.tree,
						show_attributes: [...s.views.side.tree.show_attributes],
					},
				},
			},
		};
		_cloned_settings = structuredClone(sanitized);
	} catch (e) {
		// <<< debug <<<
		type UncloneableDetail = {
			path: (string | number)[];
			type: string;
			error: string;
		} | null;
		function find_uncloneable(
			value: unknown,
			path: (string | number)[] = [],
		): UncloneableDetail {
			try {
				// @ts-ignore
				structuredClone(value);
				return null;
			} catch (err) {
				if (Array.isArray(value)) {
					for (let i = 0; i < value.length; i++) {
						const res: UncloneableDetail = find_uncloneable(
							value[i],
							path.concat(i),
						);
						if (res) return res;
					}
					return {
						path,
						type: Object.prototype.toString.call(value),
						error: (err as Error).message,
					};
				} else if (value && typeof value === "object") {
					for (const [k, v] of Object.entries(
						value as Record<string, unknown>,
					)) {
						const res: UncloneableDetail = find_uncloneable(
							v,
							path.concat(k),
						);
						if (res) return res;
					}
					return {
						path,
						type: Object.prototype.toString.call(value),
						error: (err as Error).message,
					};
				} else {
					return {
						path,
						type: typeof value,
						error: (err as Error).message,
					};
				}
			}
		}
		const detail: UncloneableDetail = find_uncloneable(plugin.settings);
		log.error(
			"TransitiveImpliedRelations structuredClone(plugin.settings) failed >",
			e,
			detail,
		);
		// >>> debug >>>
		_cloned_settings = plugin.settings;
	}
	const settings = $state(_cloned_settings);
	$effect(() => {
		plugin.settings = $state.snapshot(settings);
	});

	let filter = $state("");
	let transitives = $state([...settings.implied_relations.transitive]);
	// svelte-ignore state_referenced_locally
	const opens = $state(transitives.map(() => false));
	$effect(() => {
		settings.implied_relations.transitive = $state.snapshot(transitives);
	});

	const actions = {
		save: async () => {
			for (const { close_field } of transitives) {
				if (!close_field) {
					return new Notice("Closing field cannot be empty.");
				}
			}

			settings.is_dirty = false;

			await Promise.all([plugin.saveSettings(), plugin.rebuildGraph()]);

			// NOTE: saveSettings() resets the dirty flag, but now we have to tell Svelte to react
			plugin = plugin;
		},

		make_id: (rule_i: number) => `BC-transitive-rule-${rule_i}`,

		scroll_to: (rule_i: number) =>
			document
				.getElementById(actions.make_id(rule_i))
				?.scrollIntoView({ behavior: "smooth" }),

		add_transitive: () => {
			const new_length = transitives.push({
				name: "",
				chain: [],
				// NOTE: Max by default, users can lower if needed
				// It seems to fit with intuition that the implied relations just keep going
				rounds: 10,
				close_reversed: false,
				close_field: settings.edge_fields[0].label,
			});

			opens[new_length - 1] = true;

			setTimeout(() => actions.scroll_to(new_length - 1), 0);

			transitives = transitives;
			settings.is_dirty = true;
		},

		add_bulk: () => {
			const textarea = document.getElementById(
				"BC-transitive-bulk-str",
			) as HTMLTextAreaElement | null;
			if (!textarea) return new Notice("Could not find textarea.");

			const value = textarea.value.trim();
			if (!value) return new Notice("No rules to parse.");

			const lines = split_and_trim(value, "\n").filter(Boolean);

			const parsed = lines
				.map(parse_transitive_relation)
				.filter((r) => r.ok) as Extract<
				ReturnType<typeof parse_transitive_relation>,
				{ ok: true }
			>[];

			if (parsed.length !== lines.length) {
				return new Notice(
					"Some rules could not be parsed. Ensure you're using the correct syntax of `[field-one, field-two] -> close-field`, with each rule of a new line.",
				);
			}

			const validated = parsed.map((r) =>
				input_transitive_rule_schema({
					fields: plugin.settings.edge_fields,
				}).safeParse(r.data),
			);

			const validation_errors = validated.filter((r) => !r.success);

			if (validation_errors.length) {
				log.error(
					"Bulk-add transitive rule errors >",
					validation_errors.map((r) =>
						r.success ? null : r.error?.issues,
					),
				);

				return new Notice(
					"Some rules could not be parsed. Check the logs for more information.",
				);
			}

			validated.forEach((r) => {
				if (r.success) {
					transitives.push({ ...r.data, name: "", rounds: 10 });
				}
			});

			new Notice(`Bulk added ${validated.length} rules ✅`);

			transitives = transitives;
			settings.is_dirty = true;
		},

		copy_transitive: (i: number) => {
			const new_length = transitives.push({
				...transitives[i],
				name: `${get_transitive_rule_name(transitives[i])} (copy)`,
			});

			opens[new_length - 1] = true;

			setTimeout(() => actions.scroll_to(new_length - 1), 0);

			transitives = transitives;
			settings.is_dirty = true;
		},

		remove_transitive: (i: number) => {
			transitives = transitives.filter((_, j) => j !== i);

			settings.is_dirty = true;
		},

		rename_transitive: (i: number, new_name: string) => {
			if (transitives[i].name === new_name) return;

			transitives[i].name = new_name;

			transitives = transitives;
			settings.is_dirty = true;
		},

		reorder_transitive: (i: number, j: number) => {
			const temp = transitives[i];
			transitives[i] = transitives[j];
			transitives[j] = temp;

			transitives = transitives;
			settings.is_dirty = true;
		},

		add_chain_field: (i: number, field: EdgeField | undefined) => {
			if (!field) return;

			transitives[i].chain.push({ field: field.label });

			transitives = transitives;
			settings.is_dirty = true;
		},

		remove_chain_field: (i: number, j: number) => {
			transitives[i].chain = transitives[i].chain.filter(
				(_, k) => k !== j,
			);

			transitives = transitives;
			settings.is_dirty = true;
		},

		set_close_field: (i: number, field: EdgeField | undefined) => {
			if (!field) return;

			transitives[i].close_field = field.label;

			transitives = transitives;
			settings.is_dirty = true;
		},

		set_rounds: (i: number, rounds: number) => {
			if (isNaN(rounds) || rounds < 0) return;

			transitives[i].rounds = rounds;

			transitives = transitives;
			settings.is_dirty = true;
		},

		set_close_reversed: (i: number, reversed: boolean) => {
			transitives[i].close_reversed = reversed;

			transitives = transitives;
			settings.is_dirty = true;
		},
	};

	const context_menus = {
		chain_field: (rule_i: number, attr_i: number) => (e: MouseEvent) => {
			const menu = new Menu();

			menu.addItem((item) =>
				item
					.setTitle("Remove Field")
					.setIcon("x")
					.onClick(() => actions.remove_chain_field(rule_i, attr_i)),
			);

			menu.showAtMouseEvent(e);
		},
	};
</script>

<div class="BC-custom-transitive-implied-relations">
	<p>
		Transitive implied relations represent <em>chains</em> of your
		Breadcrumbs fields that collapse into a single field. For example, if
		you have the fields: "spouse", "sibling", and "sibling-in-law", you can
		add the transitive chain
		<code>
			{stringify_transitive_relation({
				close_reversed: false,
				close_field: "sibling-in-law",
				chain: [{ field: "spouse" }, { field: "sibling" }],
			})}
		</code>. In other words, your spouse's sibling is your sibling-in-law.
	</p>

	<div class="sticky-top my-2 flex items-center gap-2">
		<button class="flex items-center gap-1" onclick={actions.save}>
			<SaveIcon size={ICON_SIZE} />
			Save
		</button>

		<div class="flex gap-1">
			<input
				type="text"
				placeholder="Filter Rules by Name"
				bind:value={filter}
			/>
			<button
				class="w-8"
				aria-label="Clear Filter"
				disabled={filter === ""}
				onclick={() => (filter = "")}
			>
				X
			</button>
		</div>

		{#if transitives.length > 3}
			<button
				class="w-10"
				aria-label="Jump to bottom"
				onclick={() => actions.scroll_to(transitives.length - 1)}
			>
				<ArrowDown size={ICON_SIZE} />
			</button>
		{/if}

		{#if settings.is_dirty}
			<span class="text-warning">Unsaved changes</span>
		{/if}
	</div>

	<div class="flex flex-col gap-3">
		{#each transitives
			.map( (rule, rule_i) => ({ rule, rule_i, name: get_transitive_rule_name(rule) }), )
			.filter( (r) => r.name.includes(filter.toLowerCase()), ) as { rule, rule_i, name } (name + rule_i)}
			<!--  -->
			<details
				id={actions.make_id(rule_i)}
				class="scroll-mt-40 border p-2"
				bind:open={opens[rule_i]}
			>
				<summary class="flex items-center justify-between gap-2">
					<div class="flex items-center gap-2">
						<ChevronOpener open={opens[rule_i]} />

						<code> {name} </code>
					</div>

					<div class="flex gap-1">
						<button
							disabled={rule_i === 0}
							onclick={() =>
								actions.reorder_transitive(rule_i, rule_i - 1)}
						>
							<ArrowUp size={ICON_SIZE} />
						</button>
						<button
							disabled={rule_i === transitives.length - 1}
							onclick={() =>
								actions.reorder_transitive(rule_i, rule_i + 1)}
						>
							<ArrowDown size={ICON_SIZE} />
						</button>

						<button
							aria-label="Copy Transitive Implied Relation"
							onclick={() => actions.copy_transitive(rule_i)}
						>
							<ClipboardIcon size={ICON_SIZE} />
						</button>

						<button
							aria-label="Delete Transitive Implied Relation"
							onclick={() => actions.remove_transitive(rule_i)}
						>
							X
						</button>
					</div>
				</summary>

				{#key rule}
					<div class="my-2 flex flex-col gap-3 px-4 py-2">
						<div class="flex flex-wrap items-center gap-3">
							<span class="font-semibold">Edge Chain:</span>

							{#if rule.chain.length}
								<div class="flex flex-wrap gap-3">
									{#each rule.chain as attr, attr_i (attr_i + (attr.field ?? ""))}
										<Tag
											tag={attr.field ?? ""}
											title="Right click for more actions."
											oncontextmenu={context_menus.chain_field(
												rule_i,
												attr_i,
											)}
										/>
									{/each}
								</div>
							{:else}
								<span class="search-empty-state my-0">
									No fields in the chain.
								</span>
							{/if}

							<EdgeFieldSelector
								fields={settings.edge_fields}
								on:select={(e) =>
									actions.add_chain_field(rule_i, e.detail)}
							/>
						</div>

						<div>
							<span class="font-semibold">Closing Field: </span>

							<EdgeFieldSelector
								undefine_on_change={false}
								fields={settings.edge_fields}
								field={settings.edge_fields.find(
									(f) => f.label === rule.close_field,
								)}
								on:select={(e) =>
									actions.set_close_field(rule_i, e.detail)}
							/>
						</div>

						<div class="flex items-center gap-2">
							<span class="font-semibold">Close Reversed: </span>

							<input
								type="checkbox"
								bind:checked={rule.close_reversed}
								onclick={(e) =>
									actions.set_close_reversed(
										rule_i,
										e.currentTarget.checked,
									)}
							/>
						</div>

						<div>
							<span class="font-semibold">Rounds: </span>

							<input
								type="number"
								min={0}
								max={100}
								value={rule.rounds}
								onblur={(e) =>
									actions.set_rounds(
										rule_i,
										+e.currentTarget.value,
									)}
							/>
						</div>

						<div class="flex flex-wrap items-center gap-3">
							<span class="font-semibold">Name (optional):</span>

							<div class="flex gap-1">
								<input
									type="text"
									value={rule.name}
									placeholder="Rule Name"
									onblur={(e) =>
										actions.rename_transitive(
											rule_i,
											e.currentTarget.value,
										)}
								/>

								<button
									aria-label="Reset Name"
									onclick={() =>
										actions.rename_transitive(rule_i, "")}
								>
									X
								</button>
							</div>
						</div>

						{#if opens[rule_i]}
							<RenderExternalCodeblock
								{plugin}
								type="mermaid"
								code={Mermaid.from_transitive_rule(rule)
									.mermaid}
							/>
						{/if}
					</div>
				{/key}
			</details>
		{/each}

		<button
			class="flex items-center gap-1"
			onclick={actions.add_transitive}
		>
			<PlusIcon size={ICON_SIZE} />
			Add New Transitive Implied Relation
		</button>

		<details>
			<summary>Bulk Add Rules (Advanced)</summary>

			<div class="flex flex-col gap-1">
				<p>
					Quickly add multiple rules using the shorthand syntax: <code
					>
						[field-one, field-two] -> close-field
					</code>. Each rule should be on a new line.
				</p>

				<textarea
					id="BC-transitive-bulk-str"
					class="h-32 w-60"
					placeholder="[up] <- down"
				></textarea>

				<button class="w-60" onclick={actions.add_bulk}>
					Bulk Add
				</button>
			</div>
		</details>
	</div>
</div>

<style>
	.border {
		border-radius: var(--radius-m);
		border: var(--modal-border-width) solid
			var(--background-modifier-border);
	}

	.sticky-top {
		position: sticky;
		top: -2rem;
		background-color: var(--background-secondary);
	}
</style>
