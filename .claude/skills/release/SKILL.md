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

**First, edit `version` in `package.json` by hand** to the new version string. This is required: the bump scripts read the target version from `npm_package_version` (i.e. `package.json`'s `version`) and do **not** set it themselves. Skipping this makes `version:prod`/`version:beta` a no-op that re-stamps the *current* version.

Then run the bump script — it copies that version into the manifest and adds the `versions.json` entry, **re-sorting `versions.json` by semver**:

```
bun run version:prod    # stable: reads package.json version → updates manifest.json + versions.json (sorted)
bun run version:beta    # beta:   reads package.json version → updates manifest-beta.json + versions.json (sorted)
```

After running, verify all three files show the new version (`grep '"version"' package.json manifest.json` and check `versions.json`'s last entry) — the script is silent on the no-op failure above.

If you do edit `versions.json` by hand, insert the entry in semver order — don't append at the end (the file is kept sorted, prereleases before their release).

### 9. Update CHANGELOG.md

The changelog loosely follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), but **match the file's actual layout, not the KAC spec.** The real structure is:

- An empty `## [Unreleased]` section at the very top (leave it empty — this repo does not accumulate changes under Unreleased between releases).
- A `## 4.X` umbrella heading.
- Under the umbrella, one entry **per release**, newest first, in this exact form:
  `### [<version>](https://github.com/michaelpporter/breadcrumbs/compare/<prev>...<version>) (<YYYY-MM-DD>)`
  — i.e. the compare link is **inline in the heading**, and the version is **not** wrapped in `[]` brackets beyond the markdown link. There is **no bottom reference-link section**; don't add one.
- Older entries far below are an archive — never reformat them.

Collect changes since the last tag:
```
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

**a. Insert the new entry** directly under `## 4.X`, above the previous release's `### [...]` heading. Leave the top `## [Unreleased]` section empty.

**b. Group changes under `###` subsections.** Use the headings the existing entries already use — **`### Features`**, **`### Changed`**, **`### Removed`**, **`### Fixed`**, **`### Build`** (and **`### Security`**, **`### Performance`** when relevant). Note `### Features` (not KAC's "Added"). Omit empty sections. Rough mapping:
- **Features** — new features (`feat:` introducing something new)
- **Changed** — changes to existing behavior (`feat:` modifying behavior, `refactor:`)
- **Removed** — removed features
- **Fixed** — bug fixes (`fix:`)
- **Security** — vulnerability fixes (`security:`, dependency advisory pins)
- **Performance** — perf work (`perf:`)
- **Build** — build/CI/tooling and routine dependency bumps (`build:`, `ci:`, `chore(deps)`)

`docs:`, `chore:` (non-deps), and `test:` commits are usually omitted — the changelog is for humans, not a commit dump. Include them only if user-facing. Write descriptive bullets, not raw commit subjects; use existing entries as a style reference.

A deps-only / security release is fine — see `4.18.1` for the pattern (a `### Security` note for an advisory pin plus a `### Build` note summarizing the bumps).

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
