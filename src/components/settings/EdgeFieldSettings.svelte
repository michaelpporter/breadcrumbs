<script lang="ts">
	import { ArrowDown, ArrowUp, PlusIcon, SaveIcon } from "lucide-svelte";
	import { Menu, Notice } from "obsidian";
	import { ICON_SIZE } from "src/const";
	import {
		MERMAID_ARROW_TYPES,
		type EdgeField,
		type EdgeFieldGroup,
		type MermaidArrowType,
	} from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import { reactive_settings } from "src/stores/reactive_settings.svelte";
	import Tag from "../obsidian/tag.svelte";
	import EdgeFieldSelector from "../selector/EdgeFieldSelector.svelte";

	interface Props {
		plugin: BreadcrumbsPlugin;
	}

	let { plugin }: Props = $props();

	const settings = $derived(reactive_settings.current);

	let filters = $state({
		fields: "",
		groups: "",
	});

	const autosave = () => {
		settings.is_dirty = true;
		plugin.saveSettingsDebounced();
	};

	const actions = {
		save: async () => {
			await plugin.flushPendingSettings();
		},

		fields: {
			make_id: (label: string) => `BC-edge-field-${label}`,

			scroll_to: (label: string) => {
				const el = document.getElementById(
					actions.fields.make_id(label),
				);

				if (el) {
					el.scrollIntoView({ behavior: "smooth", block: "center" });
					el.focus();
				}
			},

			add: () => {
				const field = {
					label: `Edge Field ${settings.edge_fields.length + 1}`,
				};

				settings.edge_fields.push(field);

				// Wait for Svelte to render the new item
				setTimeout(() => actions.fields.scroll_to(field.label), 0);

				autosave();
			},
			reorder: (from: number, to: number) => {
				if (from === to) return;
				const next = [...settings.edge_fields];
				const [item] = next.splice(from, 1);
				next.splice(to, 0, item);
				settings.edge_fields = next;

				autosave();
			},

			remove: (edge_field: EdgeField) => {
				settings.edge_fields = settings.edge_fields.filter(
					(f) => f.label !== edge_field.label,
				);

				settings.views.side.matrix.custom_sort_field_labels =
					settings.views.side.matrix.custom_sort_field_labels.filter(
						(label) => label !== edge_field.label,
					);

				settings.edge_field_groups.forEach((group) => {
					group.fields = group.fields.filter(
						(f) => f !== edge_field.label,
					);
				});

				autosave();
			},

			rename: (edge_field: EdgeField, new_label: string) => {
				if (edge_field.label === new_label) {
					return;
				} else if (new_label === "") {
					return new Notice("Field label cannot be empty.");
				} else if (
					settings.edge_fields.some((f) => f.label === new_label)
				) {
					return new Notice("Field label must be unique.");
				}

				settings.edge_field_groups.forEach((group) => {
					const index = group.fields.indexOf(edge_field.label);
					if (index === -1) return;

					group.fields[index] = new_label;
				});

				settings.implied_relations.transitive.forEach((rule) => {
					rule.chain = rule.chain.map((attr) =>
						attr.field === edge_field.label
							? { ...attr, field: new_label }
							: attr,
					);

					rule.close_field =
						rule.close_field === edge_field.label
							? new_label
							: rule.close_field;
				});

				settings.explicit_edge_sources.tag_note.default_field =
					settings.explicit_edge_sources.tag_note.default_field ===
					edge_field.label
						? new_label
						: settings.explicit_edge_sources.tag_note.default_field;

				settings.explicit_edge_sources.list_note.default_neighbour_field =
					settings.explicit_edge_sources.list_note
						.default_neighbour_field === edge_field.label
						? new_label
						: settings.explicit_edge_sources.list_note
								.default_neighbour_field;

				settings.explicit_edge_sources.dendron_note.default_field =
					settings.explicit_edge_sources.dendron_note
						.default_field === edge_field.label
						? new_label
						: settings.explicit_edge_sources.dendron_note
								.default_field;

				settings.explicit_edge_sources.johnny_decimal_note.default_field =
					settings.explicit_edge_sources.johnny_decimal_note
						.default_field === edge_field.label
						? new_label
						: settings.explicit_edge_sources.johnny_decimal_note
								.default_field;

				settings.explicit_edge_sources.date_note.default_field =
					settings.explicit_edge_sources.date_note.default_field ===
					edge_field.label
						? new_label
						: settings.explicit_edge_sources.date_note
								.default_field;

				settings.explicit_edge_sources.regex_note.default_field =
					settings.explicit_edge_sources.regex_note.default_field ===
					edge_field.label
						? new_label
						: settings.explicit_edge_sources.regex_note
								.default_field;

				settings.views.side.matrix.custom_sort_field_labels =
					settings.views.side.matrix.custom_sort_field_labels.map(
						(label) =>
							label === edge_field.label ? new_label : label,
					);

				// NOTE: Only rename the field after updating the groups
				edge_field.label = new_label;

				autosave();
			},

			set_arrow: (edge_field: EdgeField, value: string) => {
				const target = settings.edge_fields.find(
					(f) => f.label === edge_field.label,
				);
				if (!target) return;

				target.mermaid_arrow =
					value === "" ? undefined : (value as MermaidArrowType);

				autosave();
			},

			set_hidden: (edge_field: EdgeField, hidden: boolean) => {
				const target = settings.edge_fields.find(
					(f) => f.label === edge_field.label,
				);
				if (!target) return;

				target.hide_in_views = hidden || undefined;

				autosave();
			},
		},

		groups: {
			make_id: (label: string) => `BC-edge-group-${label}`,

			scroll_to: (label: string) => {
				const el = document.getElementById(
					actions.groups.make_id(label),
				);

				if (el) {
					el.scrollIntoView({ behavior: "smooth", block: "center" });
					el.focus();
				}
			},

			add: () => {
				const group = {
					label: `Group ${settings.edge_field_groups.length + 1}`,
					fields: [],
				};

				settings.edge_field_groups.push(group);

				// Wait for Svelte to render the new item
				setTimeout(() => actions.groups.scroll_to(group.label), 0);

				autosave();
			},

			remove: (group: EdgeFieldGroup) => {
				settings.edge_field_groups = settings.edge_field_groups.filter(
					(g) => g.label !== group.label,
				);

				autosave();
			},

			rename: (group: EdgeFieldGroup, new_label: string) => {
				if (group.label === new_label) return;

				settings.views.page.trail.field_group_labels =
					settings.views.page.trail.field_group_labels.map((label) =>
						label === group.label ? new_label : label,
					);

				settings.views.page.prev_next.field_group_labels.prev =
					settings.views.page.prev_next.field_group_labels.prev.map(
						(label) => (label === group.label ? new_label : label),
					);

				settings.views.page.prev_next.field_group_labels.next =
					settings.views.page.prev_next.field_group_labels.next.map(
						(label) => (label === group.label ? new_label : label),
					);

				settings.views.side.matrix.field_group_labels =
					settings.views.side.matrix.field_group_labels.map(
						(label) => (label === group.label ? new_label : label),
					);

				settings.views.side.matrix.field_group_labels =
					settings.views.side.matrix.field_group_labels.map(
						(label) => (label === group.label ? new_label : label),
					);

				group.label = new_label;

				autosave();
			},

			add_field: (
				group: EdgeFieldGroup | undefined,
				field_label: string,
			) => {
				if (!group) return;

				group.fields.push(field_label);

				autosave();
			},

			remove_field: (
				group: EdgeFieldGroup | undefined,
				field_label: string,
			) => {
				if (!group) return;

				group.fields = group.fields.filter((f) => f !== field_label);

				autosave();
			},
		},
	};

	const context_menus = {
		add_to_group: (edge_field: EdgeField) => (e: MouseEvent) => {
			const menu = new Menu();

			const available = settings.edge_field_groups.filter(
				(g) => !g.fields.includes(edge_field.label),
			);

			if (!available.length) {
				menu.addItem((item) =>
					item.setTitle("No groups available").setDisabled(true),
				);
			} else {
				available.forEach((group) =>
					menu.addItem((item) =>
						item
							.setTitle(group.label)
							.setIcon("plus")
							.onClick(() =>
								actions.groups.add_field(
									group,
									edge_field.label,
								),
							),
					),
				);
			}

			menu.showAtMouseEvent(e);
		},

		field_group:
			(edge_field: EdgeField, group_label: string) => (e: MouseEvent) => {
				const menu = new Menu();

				menu.addItem((item) =>
					item
						.setTitle("Remove from Group")
						.setIcon("x")
						.onClick(() =>
							actions.groups.remove_field(
								settings.edge_field_groups.find(
									(g) => g.label === group_label,
								),
								edge_field.label,
							),
						),
				);

				menu.showAtMouseEvent(e);
			},

		group_field:
			(group: EdgeFieldGroup, field_label: string) => (e: MouseEvent) => {
				const menu = new Menu();

				menu.addItem((item) =>
					item
						.setTitle("Remove Field")
						.setIcon("x")
						.onClick(() =>
							actions.groups.remove_field(group, field_label),
						),
				);

				menu.showAtMouseEvent(e);
			},
	};
</script>

<div class="flex flex-col">
	<div class="my-2 flex items-center gap-2">
		<button class="flex items-center gap-1" onclick={actions.save}>
			<SaveIcon size={ICON_SIZE} />
			Save
		</button>

		{#if settings.is_dirty}
			<span class="text-warning">Unsaved changes</span>
		{/if}
	</div>

	<div class="flex items-center gap-4">
		<h4>Fields</h4>

		<div class="flex gap-1">
			<input
				type="text"
				placeholder="Filter Fields by Name"
				bind:value={filters.fields}
			/>
			<button
				class="w-8"
				aria-label="Clear Filter"
				disabled={filters.fields === ""}
				onclick={() => (filters.fields = "")}
			>
				X
			</button>
		</div>

		{#if settings.edge_fields.length > 3}
			<button
				class="w-10"
				aria-label="Jump to bottom"
				onclick={() =>
					actions.fields.scroll_to(
						settings.edge_fields.last()?.label ?? "",
					)}
			>
				<ArrowDown size={ICON_SIZE} />
			</button>
		{/if}
	</div>

	<div class="flex flex-col">
		{#each settings.edge_fields.filter( (f) => f.label.includes(filters.fields.toLowerCase()), ) as field, i}
			{@const group_labels = settings.edge_field_groups
				.filter((group) => group.fields.includes(field.label))
				.map((g) => g.label)}
			{@const field_i = settings.edge_fields.indexOf(field)}

			{#if i > 0}
				<hr class="my-1 opacity-20" />
			{/if}

			<!-- TODO: I don't think this key even does what I'm looking for
			The intention is to update the groups_label references when the groups themselves change
			To replicate an issue this cause, context-menu > remove field from group, then do that again. It doesn't remove the second time -->
			{#key settings.edge_field_groups}
				<div class="flex flex-wrap items-center gap-1">
					<input
						id={actions.fields.make_id(field.label)}
						type="text"
						class="w-48 scroll-mt-40"
						placeholder="Field Label"
						value={field.label}
						onblur={(e) =>
							actions.fields.rename(field, e.currentTarget.value)}
					/>
					<button
						class="w-8"
						title="Remove field"
						onclick={() => actions.fields.remove(field)}
					>
						X
					</button>
					<button
						disabled={field_i === 0}
						title="Move up"
						onclick={() =>
							actions.fields.reorder(field_i, field_i - 1)}
					>
						<ArrowUp size={ICON_SIZE} />
					</button>
					<button
						disabled={field_i === settings.edge_fields.length - 1}
						title="Move down"
						onclick={() =>
							actions.fields.reorder(field_i, field_i + 1)}
					>
						<ArrowDown size={ICON_SIZE} />
					</button>
					<select
						class="dropdown"
						title="Mermaid arrow shape for this field"
						value={field.mermaid_arrow ?? ""}
						onchange={(e) =>
							actions.fields.set_arrow(
								field,
								e.currentTarget.value,
							)}
					>
						<option value="">Default arrow</option>
						{#each MERMAID_ARROW_TYPES as arrow}
							<option value={arrow}>{arrow}</option>
						{/each}
					</select>

					<label
						class="flex items-center gap-1"
						title="Hide this field from the Matrix and Tree side views"
					>
						<input
							type="checkbox"
							checked={field.hide_in_views ?? false}
							onchange={(e) =>
								actions.fields.set_hidden(
									field,
									e.currentTarget.checked,
								)}
						/>
						Hide in views
					</label>

					{#each group_labels as group_label}
						<Tag
							tag={group_label}
							title="Jump to group. Right click to remove."
							onclick={() =>
								actions.groups.scroll_to(group_label)}
							oncontextmenu={context_menus.field_group(
								field,
								group_label,
							)}
						/>
					{/each}

					<button
						class="w-6"
						title="Add to group"
						onclick={context_menus.add_to_group(field)}
					>
						<PlusIcon size={ICON_SIZE} />
					</button>
				</div>
			{/key}
		{/each}

		<button
			class="mt-2 flex items-center gap-1"
			onclick={actions.fields.add}
		>
			<PlusIcon size={ICON_SIZE} />
			New Edge Field
		</button>
	</div>

	<hr />

	<div class="flex items-center gap-4">
		<h4>Groups</h4>

		<div class="flex gap-1">
			<input
				type="text"
				placeholder="Filter Groups by Name"
				bind:value={filters.groups}
			/>
			<button
				class="w-8"
				aria-label="Clear Filter"
				disabled={filters.groups === ""}
				onclick={() => (filters.groups = "")}
			>
				X
			</button>
		</div>

		{#if settings.edge_field_groups.length > 3}
			<button
				class="w-10"
				aria-label="Jump to bottom"
				onclick={() =>
					actions.groups.scroll_to(
						settings.edge_field_groups.last()?.label ?? "",
					)}
			>
				<ArrowDown size={ICON_SIZE} />
			</button>
		{/if}
	</div>

	<div class="flex flex-col gap-7">
		{#each settings.edge_field_groups.filter( (group) => group.label.includes(filters.groups.toLowerCase()), ) as group}
			<div class="flex flex-col gap-2">
				<div class="flex flex-wrap items-center gap-1">
					<input
						id={actions.groups.make_id(group.label)}
						type="text"
						class="w-48 scroll-mt-40"
						placeholder="Group Label"
						value={group.label}
						onblur={(e) =>
							actions.groups.rename(group, e.currentTarget.value)}
					/>

					<button
						class="w-8"
						title="Remove Group"
						onclick={() => actions.groups.remove(group)}
					>
						X
					</button>
				</div>

				<div class="flex flex-wrap items-center gap-1.5">
					<span>Fields</span>

					{#each group.fields as field_label}
						<div class="flex items-center gap-0.5">
							<Tag
								tag={field_label}
								title="Jump to field. Right click for more actions."
								onclick={() =>
									actions.fields.scroll_to(field_label)}
								oncontextmenu={context_menus.group_field(
									group,
									field_label,
								)}
							/>
						</div>
					{/each}

					{#if !group.fields.length}
						<span class="search-empty-state my-0">{"<none>"}</span>
					{/if}

					<EdgeFieldSelector
						placeholder="Add Field"
						fields={settings.edge_fields.filter(
							(f) => !group.fields.includes(f.label),
						)}
						onselect={(f) =>
							actions.groups.add_field(group, f.label)}
					/>
				</div>
			</div>
		{/each}

		<button class="flex items-center gap-1" onclick={actions.groups.add}>
			<PlusIcon size={ICON_SIZE} />
			New Group
		</button>

		<div class="mt-4 border p-2" style="border-radius: var(--radius-m); border: var(--modal-border-width) solid var(--background-modifier-border);">
			<div class="mb-1 font-semibold">Self</div>
			<p class="text-sm mb-2">
				Notes with any outgoing edge of these fields get an implied
				self-loop — they appear in their own sibling list.
			</p>
			<div class="flex flex-wrap items-center gap-1.5">
				{#each settings.self_is_sibling as label (label)}
					<Tag
						tag={label}
						title="Right click to remove"
						oncontextmenu={(e) => {
							const menu = new Menu();
							menu.addItem((item) =>
								item
									.setTitle("Remove")
									.setIcon("x")
									.onClick(() => {
										settings.self_is_sibling =
											settings.self_is_sibling.filter(
												(f) => f !== label,
											);
										autosave();
									}),
							);
							menu.showAtMouseEvent(e);
						}}
					/>
				{/each}

				<EdgeFieldSelector
					placeholder="Add Field"
					fields={settings.edge_fields.filter(
						(f) => !settings.self_is_sibling.includes(f.label),
					)}
					onselect={(f) => {
						if (!f) return;
						settings.self_is_sibling.push(f.label);
						autosave();
					}}
				/>
			</div>
		</div>
	</div>
</div>
