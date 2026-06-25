/// <reference types="vitest" />
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import { compileModule } from "svelte/compiler";
import { transform as esbuildTransform } from "esbuild";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Compile rune-bearing `.svelte.ts` modules (and their `.svelte.test.ts`
// tests) for the `svelte` vitest project: strip TS with esbuild, then run
// Svelte's module compiler so `$state`/`$effect` become real reactivity.
// Scoped to that project only — the `node` project never sees `.svelte.ts`.
const svelteRunesPlugin = {
	name: "svelte-runes-module",
	enforce: "pre",
	async transform(code, id) {
		const file = id.split("?")[0];
		if (!/\.svelte(\.test)?\.(ts|js)$/.test(file)) return;
		const js = file.endsWith(".ts")
			? (await esbuildTransform(code, { loader: "ts", sourcefile: file }))
					.code
			: code;
		const { js: out } = compileModule(js, {
			filename: file,
			generate: "client",
			dev: false,
		});
		return { code: out.code, map: out.map };
	},
};

export default defineConfig({
	plugins: [wasm()],
	resolve: {
		alias: {
			src: resolve(__dirname, "src"),
			wasm: resolve(__dirname, "wasm"),
			obsidian: resolve(__dirname, "tests/__mocks__/obsidian.ts"),
			// Force BROWSER=true so Svelte user-effects run under the `svelte`
			// project (only that project imports Svelte). See the mock.
			"esm-env": resolve(__dirname, "tests/__mocks__/esm-env.ts"),
		},
	},
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "node",
					include: ["tests/**/*.test.ts"],
					exclude: ["tests/**/*.svelte.test.ts"],
					setupFiles: ["tests/setup.ts"],
				},
			},
			{
				extends: true,
				plugins: [svelteRunesPlugin],
				// One Svelte instance, or `flushSync` flushes a different
				// scheduler queue than the compiled effects use.
				resolve: { dedupe: ["svelte"] },
				test: {
					name: "svelte",
					include: ["tests/**/*.svelte.test.ts"],
					server: { deps: { inline: [/svelte/] } },
				},
			},
		],
	},
});
