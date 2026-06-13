import { get_all_files } from "src/graph/builders/explicit/files";
import type { App } from "obsidian";
import { describe, test } from "vitest";
import { mock_file } from "./helpers";

/** Minimal App stub exposing the vault list + metadata cache get_all_files uses. */
function mock_app(paths: string[]): App {
	const files = paths.map((p) => mock_file(p).file);
	const md = files.filter((f) => f.extension === "md");

	return {
		vault: {
			getFiles: () => files,
			getMarkdownFiles: () => md,
		},
		metadataCache: {
			getFileCache: () => null,
		},
	} as unknown as App;
}

const paths_of = (r: ReturnType<typeof get_all_files>) =>
	r.obsidian.map((o) => o.file.path);

describe("get_all_files — exclude_folders", () => {
	test("no excludes → all files", (t) => {
		const app = mock_app(["A.md", "sub/B.md"]);
		t.expect(paths_of(get_all_files(app)).sort()).toEqual([
			"A.md",
			"sub/B.md",
		]);
	});

	test("excludes notes inside a listed folder", (t) => {
		const app = mock_app(["A.md", "templates/T.md", "templates/x/Y.md"]);
		t.expect(paths_of(get_all_files(app, ["templates"]))).toEqual(["A.md"]);
	});

	test("trailing slash and a folder-named-prefix sibling are handled", (t) => {
		// "arch" must not exclude "archive/..." — only a real path boundary matches
		const app = mock_app(["archive/old.md", "arch-notes.md"]);
		t.expect(paths_of(get_all_files(app, ["archive/"]))).toEqual([
			"arch-notes.md",
		]);
	});

	test("empty-string entries are ignored (do not exclude everything)", (t) => {
		const app = mock_app(["A.md", "B.md"]);
		t.expect(paths_of(get_all_files(app, [""])).sort()).toEqual([
			"A.md",
			"B.md",
		]);
	});
});
