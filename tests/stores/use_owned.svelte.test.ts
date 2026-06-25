import { describe, expect, it, vi } from "vitest";
import { tick } from "svelte";
import { useOwned } from "src/stores/use_owned.svelte";

function fakeWasm(id: number) {
	return { id, free: vi.fn() };
}

describe("useOwned", () => {
	it("exposes the created value and does not free it while live", async () => {
		const w = fakeWasm(0);
		let owned!: { current: ReturnType<typeof fakeWasm> | undefined };
		const cleanup = $effect.root(() => {
			owned = useOwned(() => w);
		});
		await tick();

		expect(owned.current).toBe(w);
		expect(w.free).not.toHaveBeenCalled();
		cleanup();
	});

	it("re-derives on input change, freeing the superseded value", async () => {
		let key = $state(0);
		const made: ReturnType<typeof fakeWasm>[] = [];
		let owned!: { current: ReturnType<typeof fakeWasm> | undefined };

		const cleanup = $effect.root(() => {
			owned = useOwned(() => {
				const w = fakeWasm(key);
				made.push(w);
				return w;
			});
		});
		await tick();
		expect(owned.current).toBe(made[0]);

		key = 1;
		await tick();

		expect(made[0].free).toHaveBeenCalledOnce(); // old freed
		expect(owned.current).toBe(made[1]);
		expect(made[1].free).not.toHaveBeenCalled();

		cleanup();
		expect(made[1].free).toHaveBeenCalledOnce(); // last freed on unmount
	});

	it("tolerates an undefined value", async () => {
		let present = $state(false);
		const w = fakeWasm(0);
		let owned!: { current: ReturnType<typeof fakeWasm> | undefined };

		const cleanup = $effect.root(() => {
			owned = useOwned(() => (present ? w : undefined));
		});
		await tick();
		expect(owned.current).toBeUndefined();

		present = true;
		await tick();
		expect(owned.current).toBe(w);

		cleanup();
		expect(w.free).toHaveBeenCalledOnce();
	});
});
