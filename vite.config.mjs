/// <reference types="vitest" />
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	plugins: [wasm()],
	resolve: {
		alias: {
			src: resolve(__dirname, "src"),
			wasm: resolve(__dirname, "wasm"),
			obsidian: resolve(__dirname, "tests/__mocks__/obsidian.ts"),
		},
	},
	test: {
		setupFiles: ["tests/setup.ts"],
	},
});
