/**
 * Global vitest setup — initialise the WASM module before any test runs.
 * Listed in vite.config.mjs test.setupFiles so every test file gets it.
 */
import init from "wasm/pkg/breadcrumbs_graph_wasm";
import fs from "node:fs/promises";
import { beforeAll } from "vitest";

beforeAll(async () => {
	const wasmSource = await fs.readFile(
		"wasm/pkg/breadcrumbs_graph_wasm_bg.wasm",
	);
	// @ts-ignore TS2345
	const wasmModule = await WebAssembly.compile(wasmSource);
	await init(wasmModule);
});
