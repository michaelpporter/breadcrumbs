<script lang="ts">
	import { ArrowDown, PlusIcon, SaveIcon } from "lucide-svelte";
	import { Menu, Notice } from "obsidian";
	import { ICON_SIZE } from "src/const";
	import type {
		BreadcrumbsSettings,
		EdgeField,
		EdgeFieldGroup,
	} from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import { log } from "src/logger";
	import Tag from "../obsidian/tag.svelte";

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
			"EdgeFieldSettings structuredClone(plugin.settings) failed >",
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

	let filters = $state({
		fields: "",
		groups: "",
	});

	const actions = {
		save: async () => {
			settings.is_dirty = false;
			await Promise.all([plugin.saveSettings(), plugin.rebuildGraph()]);

			// NOTE: saveSettings() resets the dirty flag, but now we have to tell Svelte to react
			plugin = plugin;
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
				plugin = plugin;
			},
			remove: (edge_field: EdgeField) => {
				settings.edge_fields = settings.edge_fields.filter(
					(f) => f.label !== edge_field.label,
				);

				settings.edge_field_groups.forEach((group) => {
					group.fields = group.fields.filter(
						(f) => f !== edge_field.label,
					);
				});

				settings.is_dirty = true;
				plugin = plugin;
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

				// NOTE: Only rename the field after updating the groups
				edge_field.label = new_label;

				settings.is_dirty = true;
				plugin = plugin;
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
				plugin = plugin;
			},

			remove: (group: EdgeFieldGroup) => {
				settings.edge_field_groups = settings.edge_field_groups.filter(
					(g) => g.label !== group.label,
				);

				settings.is_dirty = true;
				plugin = plugin;
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
				plugin = plugin;
			},

			add_field: (
				group: EdgeFieldGroup | undefined,
				field_label: string,
			) => {
				if (!group) return;

				group.fields.push(field_label);

				settings.is_dirty = true;
				plugin = plugin;
			},

			remove_field: (
				group: EdgeFieldGroup | undefined,
				field_label: string,
			) => {
				if (!group) return;

				group.fields = group.fields.filter((f) => f !== field_label);

				settings.is_dirty = true;
				plugin = plugin;
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
	<div class="sticky-top my-2 flex items-center gap-2">
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

					<select
						class="dropdown"
						value=""
						onchange={(e) => {
							if (e.currentTarget.value) {
								actions.groups.add_field(
									group,
									e.currentTarget.value,
								);

								e.currentTarget.value = "";
							}
						}}
					>
						<option value="" disabled>Add Field</option>

						{#each settings.edge_fields as edge_field}
							{#if !group.fields.includes(edge_field.label)}
								<option value={edge_field.label}>
									{edge_field.label}
								</option>
							{/if}
						{/each}
					</select>
				</div>
			</div>
		{/each}

		<button class="flex items-center gap-1" onclick={actions.groups.add}>
			<PlusIcon size={ICON_SIZE} />
			New Group
		</button>
	</div>
</div>

<style>
	.sticky-top {
		position: sticky;
		top: -2rem;
		background-color: var(--background-secondary);
	}
</style>
