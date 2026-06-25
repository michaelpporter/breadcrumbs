import { describe, expect, it, vi } from "vitest";
import { tick } from "svelte";
import { useViewSettings } from "src/stores/use_view_settings.svelte";

type Slice = { count: number; nested: { label: string } };

function fakePlugin(initial: Slice) {
	return {
		settings: { views: { test: structuredClone(initial) } },
		saveSettingsDebounced: vi.fn(),
	};
}

const slice = {
	label: "Test",
	read: (p: any) => p.settings.views.test as Slice,
	write: (p: any, v: Slice) => {
		p.settings.views.test = v;
	},
};

/** Mount the helper in an effect scope and flush so its effects run once. */
async function mount(plugin: ReturnType<typeof fakePlugin>) {
	let settings!: Slice;
	const cleanup = $effect.root(() => {
		settings = useViewSettings(plugin as any, slice);
	});
	await tick();
	return { settings, cleanup };
}

describe("useViewSettings", () => {
	it("seeds the mirror from the plugin slice", async () => {
		const plugin = fakePlugin({ count: 1, nested: { label: "a" } });
		const { settings, cleanup } = await mount(plugin);

		expect(settings).toEqual({ count: 1, nested: { label: "a" } });
		cleanup();
	});

	it("does not save on the first (mount) writeback", async () => {
		const plugin = fakePlugin({ count: 1, nested: { label: "a" } });
		const { cleanup } = await mount(plugin);

		expect(plugin.saveSettingsDebounced).not.toHaveBeenCalled();
		cleanup();
	});

	it("writes mirror edits back to the plugin and saves", async () => {
		const plugin = fakePlugin({ count: 1, nested: { label: "a" } });
		const { settings, cleanup } = await mount(plugin);

		settings.count = 5;
		await tick();

		expect(plugin.settings.views.test).toEqual({
			count: 5,
			nested: { label: "a" },
		});
		expect(plugin.saveSettingsDebounced).toHaveBeenCalledTimes(1);
		cleanup();
	});

	it("propagates deep (bind:value-style) edits", async () => {
		const plugin = fakePlugin({ count: 1, nested: { label: "a" } });
		const { settings, cleanup } = await mount(plugin);

		settings.nested.label = "z";
		await tick();

		expect(plugin.settings.views.test.nested.label).toBe("z");
		expect(plugin.saveSettingsDebounced).toHaveBeenCalledTimes(1);
		cleanup();
	});

	it("is loop-safe — repeated edits never storm (untrack holds)", async () => {
		const plugin = fakePlugin({ count: 0, nested: { label: "a" } });
		const { settings, cleanup } = await mount(plugin);

		// Each flush would throw effect_update_depth_exceeded if the writeback
		// write were tracked rather than wrapped in untrack.
		for (let i = 1; i <= 5; i++) {
			settings.count = i;
			await tick();
		}

		expect(plugin.settings.views.test.count).toBe(5);
		expect(plugin.saveSettingsDebounced).toHaveBeenCalledTimes(5);
		cleanup();
	});
});
