<script lang="ts">
	import { ArrowDown, PlusIcon, SaveIcon } from "lucide-svelte";
	import { Menu, Notice } from "obsidian";
	import { ICON_SIZE } from "src/const";
	import {
		MERMAID_ARROW_TYPES,
		type BreadcrumbsSettings,
		type EdgeField,
		type EdgeFieldGroup,
		type MermaidArrowType,
	} from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import Tag from "../obsidian/tag.svelte";
	import EdgeFieldSelector from "../selector/EdgeFieldSelector.svelte";

	interface Props {
		plugin: BreadcrumbsPlugin;
	}

	let { plugin }: Props = $props();

	let last_plugin: BreadcrumbsPlugin | null = null;
	// svelte-ignore state_referenced_locally — seed valid $state for bindings; `$effect.pre` resyncs if `plugin` changes
	let settings = $state<BreadcrumbsSettings>(plugin.settings);

	$effect.pre(() => {
		if (last_plugin !== plugin) {
			last_plugin = plugin;
			settings = plugin.settings;
		}
	});

	let filters = $state({
		fields: "",
		groups: "",
	});

	const actions = {
		save: async () => {
			// WORKAROUND: `settings` is a reactive proxy around plugin.settings
			// that, most importantly, does not pass through mutations. We have
			// to manually reassign it an un-reactified copy to ensure that
			// `plugin.saveSettings()` actually uses our updated settings.
			plugin.settings = $state.snapshot(settings);

			await Promise.all([plugin.saveSettings(), plugin.rebuildGraph()]);

			// NOTE: saveSettings() resets the dirty flag, but now we have to tell Svelte to react
			settings = plugin.settings;
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

				settings.is_dirty = true;
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

				settings.is_dirty = true;
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

				settings.is_dirty = true;
			},

			set_arrow: (edge_field: EdgeField, value: string) => {
				const target = settings.edge_fields.find(
					(f) => f.label === edge_field.label,
				);
				if (!target) return;

				target.mermaid_arrow =
					value === "" ? undefined : (value as MermaidArrowType);

				settings.is_dirty = true;
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

				settings.is_dirty = true;
			},

			remove: (group: EdgeFieldGroup) => {
				settings.edge_field_groups = settings.edge_field_groups.filter(
					(g) => g.label !== group.label,
				);

				settings.is_dirty = true;
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

				settings.is_dirty = true;
			},

			add_field: (
				group: EdgeFieldGroup | undefined,
				field_label: string,
			) => {
				if (!group) return;

				group.fields.push(field_label);

				settings.is_dirty = true;
			},

			remove_field: (
				group: EdgeFieldGroup | undefined,
				field_label: string,
			) => {
				if (!group) return;

				group.fields = group.fields.filter((f) => f !== field_label);

				settings.is_dirty = true;
			},
		},
	};

	const context_menus = {
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

	<div class="flex flex-col gap-7">
		{#each settings.edge_fields.filter( (f) => f.label.includes(filters.fields.toLowerCase()), ) as field}
			{@const group_labels = settings.edge_field_groups
				.filter((group) => group.fields.includes(field.label))
				.map((g) => g.label)}

			<div class="flex flex-col gap-2">
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
						title="Remove Field"
						onclick={() => actions.fields.remove(field)}
					>
						X
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
				</div>

				<!-- TODO: I don't think this key even does what I'm looking for
				The intention is to update the groups_label references when the groups themselves change
			To replicate an issue this cause, context-menu > remove field from group, then do that again. It doesn't remove the second time -->
				{#key settings.edge_field_groups}
					<div class="flex flex-wrap items-center gap-1.5">
						<span>Groups</span>

						{#each group_labels as group_label}
							<div class="flex items-center gap-0.5">
								<Tag
									tag={group_label}
									title="Jump to group. Right click for more actions."
									onclick={() =>
										actions.groups.scroll_to(group_label)}
									oncontextmenu={context_menus.field_group(
										field,
										group_label,
									)}
								/>
							</div>
						{/each}

						{#if !group_labels.length}
							<span class="search-empty-state my-0">
								{"<none>"}
							</span>
						{/if}

						<select
							class="dropdown"
							value=""
							onchange={(e) => {
								if (e.currentTarget.value) {
									actions.groups.add_field(
										settings.edge_field_groups.find(
											(g) =>
												g.label ===
												e.currentTarget.value,
										),
										field.label,
									);

									e.currentTarget.value = "";
								}
							}}
						>
							<option value="" disabled>Add to Group</option>

							{#each settings.edge_field_groups as group}
								{#if !group.fields.includes(field.label)}
									<option value={group.label}>
										{group.label}
									</option>
								{/if}
							{/each}
						</select>
					</div>
				{/key}
			</div>
		{/each}

		<button class="flex items-center gap-1" onclick={actions.fields.add}>
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
						fields={settings.edge_fields.filter((f) => !group.fields.includes(f.label))}
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
	</div>
</div>
