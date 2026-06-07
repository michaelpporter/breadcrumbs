# Breadcrumbs

**Give your Obsidian vault a structure you can see and navigate.**

Breadcrumbs lets you add _typed links_ to your notes — `up`/`down`, `next`/`prev`, or any relationship you define — and builds them into a directed graph. Where Obsidian's own graph only shows _that_ two notes link, Breadcrumbs shows _how_ they relate: which note is the parent, which comes next, which belongs to which. You describe the shape of your vault once, then Breadcrumbs lets you visualise and walk it.

## What you can do

- **See where you are.** A breadcrumb **trail** at the top of each note shows its ancestors and the path back to the top.
- **Browse the hierarchy.** The **Tree** side view expands the full structure beneath the current note; the **Matrix** view groups every incoming and outgoing relationship by type.
- **Move through your notes.** **Previous / Next** buttons turn a chain of notes into a readable sequence.
- **Embed diagrams.** Drop a ` ```breadcrumbs ``` ` codeblock into any note to render its neighbourhood as a tree, a **Mermaid** diagram, or an interactive **Markmap** mind-map.

## Ways to define relationships

You're not limited to one convention — Breadcrumbs reads structure from whatever you already use:

- **Frontmatter properties** (typed links), **tags**, and **Markdown lists**
- **Naming schemes** — Dendron (`parent.child`), Johnny.Decimal (`01.02 Title`), dates, and custom regex
- **Folders** (folder notes) and **Dataview** queries

On top of the relationships you declare, Breadcrumbs derives **implied relations** automatically — e.g. if A is `up` from B, then B is `down` from A — and lets you define your own transitive rules.

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
-   [Buy Me a Coffee — michaelpporter](https://www.buymeacoffee.com/michaelpporter)

Original creator SkepticMystic also accepts donations via [Ko-fi](https://ko-fi.com/skepticmystic) — their foundational work is what made this plugin possible.

## Security & Privacy

Breadcrumbs is fully open source and makes no automatic network requests. To report a vulnerability, see the [Security Policy](./SECURITY.md). For a full audit of network requests, the bundled WebAssembly engine, and non-obvious code patterns, see [DISCLOSURES.md](./DISCLOSURES.md).

## Credits

-   [SkepticMystic](https://github.com/SkepticMystic): Original creator of Breadcrumbs. The plugin concept, architecture, and community were built by them.
-   [mProjectsCode](https://github.com/mProjectsCode): For their PRs, insightful suggestions, and efficiency improvements.
-   [HEmile](https://github.com/HEmile): For their PRs, and helpful discussions on graph-theory.
-   [michaelpporter](https://github.com/michaelpporter): Current maintainer.

<!-- NOTE: This heading is linked to in the manifest.fundingUrl. Be sure to change that if updating the heading label -->

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
