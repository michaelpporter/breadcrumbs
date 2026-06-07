# Source Transparency & Disclosures

Breadcrumbs is fully open source. This document discloses every network request, binary module, and non-obvious code pattern in the compiled plugin, so reviewers and auditors can understand *why* a static scan of `main.js` flags certain things.

For the security **policy** (supported versions, how to report a vulnerability, disclosure process), see [SECURITY.md](./SECURITY.md).

## Network Requests

**Mermaid diagrams** — when you open a `breadcrumbs` codeblock rendered as Mermaid and click the **"View Image on mermaid.ink"** button, your browser opens `https://mermaid.ink/img/<encoded-diagram>` in a new tab. This is the only outbound network request the plugin can make. It is user-initiated (button click), not automatic. The diagram text is base64-encoded with `btoa()` and appended to the URL; no data is sent to any Breadcrumbs server.

No other network requests are made by this plugin. A static scan of the compiled `main.js` will report `fetch(` matches inside bundled dependencies; none are reachable network calls:

- **KaTeX** (math rendering, pulled in transitively) defines a lexer method `Parser.fetch()` that returns the next parse token. The name collides with the Web `fetch` API but performs no networking — this accounts for the large majority of the matches.
- **markmap-view / markmap-lib** (used to render `breadcrumbs` codeblocks with `type: markmap`) bundle a CDN asset loader that *can* `fetch` KaTeX/plugin files from `cdn.jsdelivr.net` (fallback `unpkg.com`). Breadcrumbs does not use that path: it injects markmap's stylesheet inline via `loadCSS([{ type: "style", data: globalCSS }])` and never requests remote assets, so the fetch branch is never reached.

## WebAssembly Module

The compiled bundle includes one inline WebAssembly binary, [`wasm/pkg/breadcrumbs_graph_wasm_bg.wasm`](./wasm/pkg/breadcrumbs_graph_wasm_bg.wasm). This is the **Breadcrumbs graph engine**, written in Rust and compiled with [`wasm-pack`](https://rustwasm.github.io/wasm-pack/). The full Rust source is in [`wasm/src/`](./wasm/src/) and can be audited directly.

The binary is **not native machine code** — it is portable WebAssembly that runs in the same sandbox as the plugin's JavaScript, with no filesystem, network, or system-call access beyond what JS explicitly passes across the boundary. It is **never fetched from a remote URL**: `esbuild`'s `binary` loader embeds the bytes into `main.js` at build time, and `src/main.ts` initializes the engine with the inline bytes via `init({ module_or_path: wasmbin })`.

To verify the binary matches the source, rebuild it from the Rust sources with `bun run wasm:build` and compare — the `.wasm` is reproducible from [`wasm/src/`](./wasm/src/).

## wasm-bindgen Generated Code Patterns

`wasm-pack` generates JavaScript glue code in `wasm/pkg/breadcrumbs_graph_wasm.js`. Static scanners may flag three patterns in this generated file:

| Pattern | Origin | Purpose |
|---|---|---|
| `fetch()` | wasm-bindgen shim | Fallback for loading WASM by URL. **Never called** — the plugin passes the inline binary directly to `init({ module_or_path: wasmbin })`. |
| `new Function(...)` | wasm-bindgen shim (`__wbg_newnoargs`) | Part of wasm-bindgen's standard generated runtime. It is invoked only with a fixed string compiled into the WASM binary, never with user input, and the plugin's own Rust code never calls it. The plugin does use the `js_sys::Function` **type** (`update_callback`, `node_label_fn`, `iterate_nodes`), but only to *receive and call back* JavaScript functions passed in from the plugin — it never constructs functions from strings. The bundle contains **no `eval()`**. |
| exported `memory` / `wasm.memory` access | wasm-bindgen shim | The module exports its linear memory and the JS glue reads/writes it to pass strings and arrays between Rust and JavaScript. Required by wasm-bindgen for any non-scalar data transfer across the boundary. |

All of the above are generated automatically by wasm-bindgen and are not written by the plugin authors.

**On the exported linear memory specifically:** static scanners flag that the WASM module exports its `memory`. This is unavoidable and standard for every wasm-bindgen module — JavaScript cannot pass a string, `Vec`, or array to Rust (or read one back) without direct access to the module's linear memory, so wasm-bindgen exports it and the generated glue (`getUint8ArrayMemory0`, `getDataViewMemory0`, etc.) copies bytes in and out. It is not a privilege escalation: the JavaScript host instantiates the module and already fully controls it, and the WASM sandbox has no filesystem, network, or system-call access of its own. Exporting memory only lets the two halves of the same plugin exchange data.
