Breadcrumbs is an Obsidian plugin that lets you add _typed links_ to your notes, then view/traverse them in various ways. Internally, Breadcrumbs uses a graph to represent this structure (much like the regular Obsidian graph, except now, links have _types_ to them). You tell Breadcrumbs about the structure of your notes, then it lets you visualise and navigate the graph.

## Documentation

Breadcrumbs has its own docs site!✨ All detailed documentation lives there: https://breadcrumbs-docs.michaelpporter.com

## Media

Media related to Breacrumbs. Thanks to everyone for sharing!

### Written

-   @Rhoadey: [How a Hierarchy Note sharpened my thinking in 20 minutes](https://medium.com/obsidian-observer/how-a-hierarchy-note-sharpened-my-thinking-in-20-minutes-f1c65945f41e?sk=64f4d1f889ff8a99009a060a24778a7f)
-   [Obsidian Hub - Breadcrumbs Quickstart Guide](https://publish.obsidian.md/hub/04+-+Guides%2C+Workflows%2C+%26+Courses/Guides/Breadcrumbs+Quickstart+Guide)
-   [Obsidian Hub - Breadcrumbs for Comparative Law](https://publish.obsidian.md/hub/03+-+Showcases+%26+Templates/Plugin+Showcases/Breadcrumbs+for+Comparative+Law)
-   [Obsidian Hub - How to get the most out of Breadcrumbs](https://publish.obsidian.md/hub/04+-+Guides%2C+Workflows%2C+%26+Courses/Guides/How+to+get+the+most+out+of+the+Breadcrumbs+plugin)

## Security & Privacy

Breadcrumbs is fully open source. This section discloses every network request, binary module, and non-obvious code pattern in the compiled plugin.

### Network Requests

**Mermaid diagrams** — when you open a `breadcrumbs` codeblock rendered as Mermaid and click the **"View Image on mermaid.ink"** button, your browser opens `https://mermaid.ink/img/<encoded-diagram>` in a new tab. This is the only outbound network request. It is user-initiated (button click), not automatic. The diagram text is base64-encoded with `btoa()` and appended to the URL; no data is sent to any Breadcrumbs server.

No other network requests are made by this plugin.

### WebAssembly Module

The compiled bundle includes an inline WebAssembly binary. This is the **Breadcrumbs graph engine**, written in Rust and compiled with [`wasm-pack`](https://rustwasm.github.io/wasm-pack/). The full Rust source is in [`wasm/src/`](./wasm/src/) and can be audited directly. The WASM binary is never fetched from a remote URL; it is embedded at build time.

### wasm-bindgen Generated Code Patterns

`wasm-pack` generates JavaScript glue code in `wasm/pkg/breadcrumbs_graph_wasm.js`. Static scanners may flag three patterns in this generated file:

| Pattern | Origin | Purpose |
|---|---|---|
| `fetch()` | wasm-bindgen shim | Fallback for loading WASM by URL. **Never called** — the plugin passes the inline binary directly to `init({ module_or_path: wasmbin })`. |
| `new Function(...)` | wasm-bindgen shim | Exposes `js_sys::Function` to Rust. Standard wasm-bindgen pattern; no arbitrary code is constructed from user input. |
| `wasm.memory` access | wasm-bindgen shim | JS reads/writes WASM linear memory to pass strings and arrays between Rust and JavaScript. Required by the WASM spec for cross-boundary data transfer. |

All of the above are generated automatically by wasm-bindgen and are not written by the plugin authors.

## Credits

-   [mProjectsCode](https://github.com/mProjectsCode): For their PRs, insightful suggestions, and efficiency improvements.
-   [HEmile](https://github.com/HEmile): For their PRs, and helpful discussions on graph-theory.
-   [michaelpporter](https://github.com/michaelpporter): For their PRs and issue support

<!-- NOTE: This heading is linked to in the manifest.fundingUrl. Be sure to change that if updating the heading label -->

## Donations

If you like Breadcrumbs and want to show your support, there are a few ways you can do so:

-   Make a donation to your local animal shelter or charity. To support the animals in my country, you can [donate to the SPCA](https://nspca.co.za/donate/). If you do, please let me know! I'd love to hear about it :)
-   I have a coffee problem, which you can indulge here: https://ko-fi.com/skepticmystic

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, build commands, and how to submit a pull request.

### Release process

#### Beta

1. Push all previous changes to the actual project
2. Bump version in `package.json`
3. `bun run version:beta` to update `manifest-beta.json` and `versions.json` accordingly
4. `git tag -a x.x.x-beta -m 'x.x.x-beta'` to tag the build
5. `git push origin x.x.x-beta` to push the release and trigger the action

Or, do steps 3-5 in one go with `bun run release:beta`

## History

Older media kept for posterity. Many predate v4 and may not match current behavior, but the effort of the authors is appreciated.

### Videos

-   @SkepticMystic: [Breadcrumbs - Everything you need to know](https://www.youtube.com/watch?v=N4QmszBRu9I&pp=ygUUYnJlYWRjcnVtYnMgb2JzaWRpYW4%3D) (Outdated)
-   @SkepticMystic: [Breadcrumbs - Obsidian Community Showcase](https://www.youtube.com/watch?v=DXXB7fHcArg&pp=ygUUYnJlYWRjcnVtYnMgb2JzaWRpYW4%3D) (Outdated)
-   @Zen Productivist: [Threading Mode with the Breadcrumbs Plugin in Obsidian](https://www.youtube.com/watch?v=AS5Mv6YNmsQ) (2022-01-01)
