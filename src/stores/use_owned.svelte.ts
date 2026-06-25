/**
 * Own the lifecycle of a derived WASM object: re-create it when `create`'s
 * reactive inputs change, free the superseded one, and free the last on unmount.
 *
 * Replaces the hand-written
 *   `$effect(() => { const o = value; return () => o.free(); })`
 * that was copy-pasted across the views for `node_stringify_options`, the
 * traversal result, etc. Read the live value via `.current`.
 *
 * Call once at component init:
 *   const tree = useOwned(() => traverse(plugin.graph, { entry, … }));
 *   // template: tree.current
 */
export function useOwned<T extends { free: () => void }>(create: () => T): {
	readonly current: T;
};
export function useOwned<T extends { free: () => void }>(
	create: () => T | undefined,
): { readonly current: T | undefined };
export function useOwned<T extends { free: () => void }>(
	create: () => T | undefined,
): { readonly current: T | undefined } {
	const value = $derived.by(create);

	$effect(() => {
		const owned = value;
		// Cleanup runs before the next re-derive (freeing the old handle) and
		// on unmount (freeing the last) — same ordering as the hand-written effect.
		return () => owned?.free();
	});

	return {
		get current() {
			return value;
		},
	};
}
