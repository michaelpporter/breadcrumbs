---
name: release
description: Cut a new Breadcrumbs release — bumps version, updates CHANGELOG, optionally rebuilds WASM, commits, tags, and pushes.
allowed-tools: Bash(bun *) Bash(git *) Bash(cargo *) Bash(wasm-pack *) Read Write Edit
---

# Release skill

Cut a new Breadcrumbs plugin release. Follow every step in order — stop and report any failure.

## Current state

!`git status --short`

!`cat package.json | grep '"version"'`

!`git log --oneline -10`

## Arguments

The user may pass: `/release [version] [--beta]`

- `version` — explicit version string like `4.12.1` or `4.13.0`. If omitted, infer from the user's message or propose next patch bump.
- `--beta` — if present (or if the version contains "beta"), create a prerelease tag (e.g. `4.12.1-beta.1`).

## Steps

### 1. Determine release type

Ask the user if not clear from arguments:
- **Full release** — stable tag (e.g. `4.12.1`). Goes into Obsidian community plugin list.
- **Beta release** — prerelease tag (e.g. `4.12.1-beta.1`). GitHub marks as pre-release; not auto-distributed.

### 2. Determine version

- Parse version from arguments or ask user.
- Validate format: `MAJOR.MINOR.PATCH` or `MAJOR.MINOR.PATCH-beta.N`.
- Check no existing git tag matches: `git tag -l <version>`.

### 3. Check branch

```
git branch --show-current
```

- **Full release**: current branch MUST be `main`. If not, stop with:
  > "Stable releases must be cut from `main`. Currently on `<branch>`. Switch branches or use `--beta`."
- **Beta release**: any branch is allowed.

### 4. Check working tree

Run `git status --short`. If there are uncommitted changes, ask the user whether to proceed (they may want to commit first, or include them in the release commit).

### 5. Rebuild WASM (if Rust changed)

Check if Rust sources changed since last tag:
```
git diff $(git describe --tags --abbrev=0) -- wasm/src/ wasm/Cargo.toml wasm/Cargo.lock
```

If changes exist, or if user explicitly requested a WASM rebuild:
- Run `bun run wasm:build`
- Stage `wasm/pkg/` changes

### 6. Run all tests

```
bun run wasm:test
bun run test
```

Stop on any failure.

### 7. Run build

```
bun run build
```

Stop on failure.

### 8. Bump version

Update `version` in both files to the new version string:
- `package.json`
- `manifest.json` (or `manifest-beta.json` for a beta)

Then update `versions.json` with the new `"<version>": "<minAppVersion>"` entry (minAppVersion comes from the manifest). The repo's bump scripts do this **and re-sort `versions.json` by semver** — prefer running them over hand-editing:

```
bun run version:prod    # stable: updates manifest.json, versions.json (sorted)
bun run version:beta    # beta:   updates manifest-beta.json, versions.json (sorted)
```

If you do edit `versions.json` by hand, insert the entry in semver order — don't append at the end (the file is kept sorted, prereleases before their release).

### 9. Update CHANGELOG.md

The changelog follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). The top of the file has a `## [Unreleased]` section; releases accumulate as `## [<version>] - <YYYY-MM-DD>` between `## [Unreleased]` and the legacy `## 4.X` umbrella (older entries below the umbrella are an archive — never reformat them).

Collect changes since the last tag:
```
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

**a. Convert the Unreleased section into the release:**
- Rename `## [Unreleased]` to `## [<version>] - <YYYY-MM-DD>`.
- Insert a fresh empty `## [Unreleased]` above it.
- The heading carries **no** inline compare link — links live in the bottom reference section (step c).

**b. Group changes under `###` subsections**, in this order, omitting any that are empty:
- **Added** — new features (`feat:` introducing something new)
- **Changed** — changes to existing behavior (`feat:` modifying behavior, `refactor:`)
- **Deprecated** — soon-to-be-removed features
- **Removed** — removed features
- **Fixed** — bug fixes (`fix:`)
- **Security** — vulnerability fixes (`security:`)
- **Performance** — perf work (`perf:`) — custom type, KAC 1.1.0 allows it
- **Build** — build/CI/tooling (`build:`, `ci:`) — custom type, when user-relevant

`docs:`, `chore:`, and `test:` commits are usually omitted — the changelog is for humans, not a commit dump. Include them only if user-facing. Write descriptive bullets, not raw commit subjects; use existing entries as a style reference.

**c. Update the bottom reference links:**
- Add a line for the new version:
  `[<version>]: https://github.com/michaelpporter/breadcrumbs/compare/<prev>...<version>`
- Repoint Unreleased:
  `[Unreleased]: https://github.com/michaelpporter/breadcrumbs/compare/<version>...HEAD`

### 10. Commit

```
git add package.json manifest.json versions.json CHANGELOG.md bun.lock wasm/pkg/
git commit -m "release: <version>"
```

`bun.lock` is safe to include unconditionally — `git add` on an unchanged file is a no-op.

### 11. Tag

```
git tag <version>
```

### 12. Push

```
git push origin main --tags
```

### 13. Confirm

Report:
- Tag pushed: `<version>`
- Release type: stable / beta
- GitHub Actions will build and publish the GitHub Release automatically.
- Remind: for Obsidian community plugin updates, the release workflow uploads `main.js`, `manifest.json`, `styles.css` — no extra steps needed.

#### Docs — What's New table

If updating the docs site "What's New" table or any announcement links, Astro strips dots from auto-generated slugs. Use the sanitized form in hrefs:

- Version `4.13.8` → slug fragment `v4138` (remove all dots from the version portion)
- Example link: `/announcements/announcement-2026-06-01-v4138/`

---

**Note on WASM**: `wasm/pkg/` is committed to the repo. The GitHub release workflow does **not** install Rust — it uses the pre-built binaries from the repo. Always rebuild WASM locally (`bun run wasm:build`) and commit before releasing if Rust sources changed.
