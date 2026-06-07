# Security Policy

## Supported Versions

Breadcrumbs is maintained by a single developer; security fixes target the latest release and the most recent compatibility branch.

| Version | Obsidian | Supported |
| --- | --- | --- |
| 4.15.x (latest) | 1.13+ | ✅ Active — bug & security fixes |
| 4.14.x ([`1.12-compat`](https://github.com/michaelpporter/breadcrumbs/tree/1.12-compat)) | 1.12 | ⚠️ Security fixes only |
| < 4.14 | — | ❌ Unsupported |

Always update to the latest release before reporting an issue, where possible.

## Reporting a Vulnerability

**Do not report security vulnerabilities in public issues, discussions, or pull requests.**

Report privately via GitHub's **[Report a vulnerability](https://github.com/michaelpporter/breadcrumbs/security/advisories/new)** (repo → Security → Advisories). This opens a private channel between you and the maintainer.

Please include, where you can:

- The plugin and Obsidian versions affected
- Steps to reproduce, or a proof of concept
- The impact you believe the issue has

## Response Timeline

As a solo-maintained project, timelines are best-effort:

- **Acknowledgement:** within 7 days of your report.
- **Assessment & fix:** triaged by severity; a patch for confirmed high-severity issues is aimed for within 30 days.

You'll be kept updated through the private advisory thread.

## Disclosure Policy

Breadcrumbs follows **coordinated disclosure**. Please keep the report private until a fix is released. Once a patch ships, the advisory can be published and — with your permission — you'll be credited for the discovery.

## Source Transparency

For a full audit of the plugin's network requests, bundled WebAssembly engine, and non-obvious code patterns (i.e. *why* a static scan flags certain things), see **[DISCLOSURES.md](./DISCLOSURES.md)**.
