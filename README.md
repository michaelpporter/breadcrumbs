Breadcrumbs is an Obsidian plugin that lets you add _typed links_ to your notes, then view/traverse them in various ways. Internally, Breadcrumbs uses a graph to represent this structure (much like the regular Obsidian graph, except now, links have _types_ to them). You tell Breadcrumbs about the structure of your notes, then it lets you visualise and navigate the graph.

## Obsidian 1.13

As of 4.15.0, Breadcrumbs requires Obsidian 1.13 or later (`minAppVersion` 1.13.0). The settings tab uses the new declarative settings API, so every section appears in global settings search and supports page-based navigation. The legacy imperative `display()` fallback has been removed.

Still on Obsidian 1.12? Use Breadcrumbs 4.14.2 — the last release supporting 1.12. Fixes for the 1.12 line are maintained on the [`1.12-compat`](https://github.com/michaelpporter/breadcrumbs/tree/1.12-compat) branch.

## Demo Vault

Want to see Breadcrumbs in action before configuring your own vault? The [Breadcrumbs Demo Vault](https://github.com/michaelpporter/breadcrumbs-demo) is a ready-to-open vault with pre-configured edge fields, example notes, and working graph structure.

## Documentation

Breadcrumbs has its own docs site!✨ All detailed documentation lives there: https://breadcrumbs-docs.michaelpporter.com

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, build commands, and how to submit a pull request.

## Donations

If you find Breadcrumbs useful, consider sponsoring continued development:

-   [GitHub Sponsors — michaelpporter](https://github.com/sponsors/michaelpporter)

Original creator SkepticMystic also accepts donations via [Ko-fi](https://ko-fi.com/skepticmystic) — their foundational work is what made this plugin possible.

## Security & Privacy

Breadcrumbs is fully open source. This section discloses every network request, binary module, and non-obvious code pattern in the compiled plugin.

### Network Requests

**Mermaid diagrams** — when you open a `breadcrumbs` codeblock rendered as Mermaid and click the **"View Image on mermaid.ink"** button, your browser opens `https://mermaid.ink/img/<encoded-diagram>` in a new tab. This is the only outbound network request the plugin can make. It is user-initiated (button click), not automatic. The diagram text is base64-encoded with `btoa()` and appended to the URL; no data is sent to any Breadcrumbs server.

No other network requests are made by this plugin. A static scan of the compiled `main.js` will report `fetch(` matches inside bundled dependencies; none are reachable network calls:

- **KaTeX** (math rendering, pulled in transitively) defines a lexer method `Parser.fetch()` that returns the next parse token. The name collides with the Web `fetch` API but performs no networking — this accounts for the large majority of the matches.
- **markmap-view / markmap-lib** (used to render `breadcrumbs` codeblocks with `type: markmap`) bundle a CDN asset loader that *can* `fetch` KaTeX/plugin files from `cdn.jsdelivr.net` (fallback `unpkg.com`). Breadcrumbs does not use that path: it injects markmap's stylesheet inline via `loadCSS([{ type: "style", data: globalCSS }])` and never requests remote assets, so the fetch branch is never reached.

### WebAssembly Module

The compiled bundle includes one inline WebAssembly binary, [`wasm/pkg/breadcrumbs_graph_wasm_bg.wasm`](./wasm/pkg/breadcrumbs_graph_wasm_bg.wasm). This is the **Breadcrumbs graph engine**, written in Rust and compiled with [`wasm-pack`](https://rustwasm.github.io/wasm-pack/). The full Rust source is in [`wasm/src/`](./wasm/src/) and can be audited directly.

The binary is **not native machine code** — it is portable WebAssembly that runs in the same sandbox as the plugin's JavaScript, with no filesystem, network, or system-call access beyond what JS explicitly passes across the boundary. It is **never fetched from a remote URL**: `esbuild`'s `binary` loader embeds the bytes into `main.js` at build time, and `src/main.ts` initializes the engine with the inline bytes via `init({ module_or_path: wasmbin })`.

To verify the binary matches the source, rebuild it from the Rust sources with `bun run wasm:build` and compare — the `.wasm` is reproducible from [`wasm/src/`](./wasm/src/).

### wasm-bindgen Generated Code Patterns

`wasm-pack` generates JavaScript glue code in `wasm/pkg/breadcrumbs_graph_wasm.js`. Static scanners may flag three patterns in this generated file:

| Pattern | Origin | Purpose |
|---|---|---|
| `fetch()` | wasm-bindgen shim | Fallback for loading WASM by URL. **Never called** — the plugin passes the inline binary directly to `init({ module_or_path: wasmbin })`. |
| `new Function(...)` | wasm-bindgen shim (`__wbg_newnoargs`) | Part of wasm-bindgen's standard generated runtime. It is invoked only with a fixed string compiled into the WASM binary, never with user input, and the plugin's own Rust code never calls it. The plugin does use the `js_sys::Function` **type** (`update_callback`, `node_label_fn`, `iterate_nodes`), but only to *receive and call back* JavaScript functions passed in from the plugin — it never constructs functions from strings. The bundle contains **no `eval()`**. |
| exported `memory` / `wasm.memory` access | wasm-bindgen shim | The module exports its linear memory and the JS glue reads/writes it to pass strings and arrays between Rust and JavaScript. Required by wasm-bindgen for any non-scalar data transfer across the boundary. |

All of the above are generated automatically by wasm-bindgen and are not written by the plugin authors.

**On the exported linear memory specifically:** static scanners flag that the WASM module exports its `memory`. This is unavoidable and standard for every wasm-bindgen module — JavaScript cannot pass a string, `Vec`, or array to Rust (or read one back) without direct access to the module's linear memory, so wasm-bindgen exports it and the generated glue (`getUint8ArrayMemory0`, `getDataViewMemory0`, etc.) copies bytes in and out. It is not a privilege escalation: the JavaScript host instantiates the module and already fully controls it, and the WASM sandbox has no filesystem, network, or system-call access of its own. Exporting memory only lets the two halves of the same plugin exchange data.

## Credits

-   [SkepticMystic](https://github.com/SkepticMystic): Original creator of Breadcrumbs. The plugin concept, architecture, and community were built by them.
-   [mProjectsCode](https://github.com/mProjectsCode): For their PRs, insightful suggestions, and efficiency improvements.
-   [HEmile](https://github.com/HEmile): For their PRs, and helpful discussions on graph-theory.
-   [michaelpporter](https://github.com/michaelpporter): Current maintainer.

<!-- NOTE: This heading is linked to in the manifest.fundingUrl. Be sure to change that if updating the heading label -->

### Release process

#### Beta

1. Push all previous changes to the actual project
2. Bump version in `package.json`
3. `bun run version:beta` to update `manifest-beta.json` and `versions.json` accordingly
4. `git tag -a x.x.x-beta -m 'x.x.x-beta'` to tag the build
5. `git push origin x.x.x-beta` to push the release and trigger the action

Or, do steps 3-5 in one go with `bun run release:beta`

## History

As of May 2026, Breadcrumbs is maintained by [michaelpporter](https://github.com/michaelpporter). The plugin was originally created by [SkepticMystic](https://github.com/SkepticMystic), whose foundational work made this all possible. Development continues at [github.com/michaelpporter/breadcrumbs](https://github.com/michaelpporter/breadcrumbs).

Older media kept for posterity. Many predate v4 and may not match current behavior, but the effort of the authors is appreciated.

### Written

-   @Rhoadey: [How a Hierarchy Note sharpened my thinking in 20 minutes](https://medium.com/obsidian-observer/how-a-hierarchy-note-sharpened-my-thinking-in-20-minutes-f1c65945f41e?sk=64f4d1f889ff8a99009a060a24778a7f)
-   [Obsidian Hub - Breadcrumbs Quickstart Guide](https://publish.obsidian.md/hub/04+-+Guides%2C+Workflows%2C+%26+Courses/Guides/Breadcrumbs+Quickstart+Guide)
-   [Obsidian Hub - Breadcrumbs for Comparative Law](https://publish.obsidian.md/hub/03+-+Showcases+%26+Templates/Plugin+Showcases/Breadcrumbs+for+Comparative+Law)
-   [Obsidian Hub - How to get the most out of Breadcrumbs](https://publish.obsidian.md/hub/04+-+Guides%2C+Workflows%2C+%26+Courses/Guides/How+to+get+the+most+out+of+the+Breadcrumbs+plugin)

### Videos

-   @SkepticMystic: [Breadcrumbs - Everything you need to know](https://www.youtube.com/watch?v=N4QmszBRu9I&pp=ygUUYnJlYWRjcnVtYnMgb2JzaWRpYW4%3D) (Outdated)
-   @SkepticMystic: [Breadcrumbs - Obsidian Community Showcase](https://www.youtube.com/watch?v=DXXB7fHcArg&pp=ygUUYnJlYWRjcnVtYnMgb2JzaWRpYW4%3D) (Outdated)
-   @Zen Productivist: [Threading Mode with the Breadcrumbs Plugin in Obsidian](https://www.youtube.com/watch?v=AS5Mv6YNmsQ) (2022-01-01)
