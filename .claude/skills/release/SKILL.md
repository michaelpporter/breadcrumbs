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
- `manifest.json`

### 9. Update CHANGELOG.md


Insert a new section at the top of the `## 4.X` block (or a new top-level `## X.Y` block for major bumps):

```
### [<version>](...compare/<prev>...<version>) (<YYYY-MM-DD>)
```

Collect changes from git log since last tag:
```
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

Group commits into CHANGELOG sections using conventional-commit prefixes:
- `feat:` / `feat(…):` → **Features**
- `fix:` / `fix(…):` → **Bug Fixes**
- `perf:` → **Performance**
- `chore:` / `ci:` / `build:` → **Chores** / **Build** / **CI**
- `docs:` → **Documentation**
- `refactor:` → **Refactors**

Use the existing CHANGELOG entries as style reference. Write descriptive bullets, not raw commit subjects.

### 10. Commit

```
git add package.json manifest.json CHANGELOG.md wasm/pkg/
git commit -m "release: <version>"
```

### 11. Tag

```
git tag <version>
```

### 12. Push

```
git push origin master --tags
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
