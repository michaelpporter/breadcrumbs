import {
	dataview_from_query,
	try_dataview_from_query,
} from "src/codeblocks/dataview_from";
import { describe, expect, test } from "vitest";
import type { App } from "obsidian";
import { TFile, TFolder } from "obsidian";

/** Build a minimal file with an optional tag/frontmatter cache. */
function mock_file(
	path: string,
	opts: { tags?: string[]; frontmatter_tags?: string | string[] } = {},
) {
	const parts = path.split("/");
	const name = parts[parts.length - 1];
	const dot = name.lastIndexOf(".");

	const file = Object.assign(new TFile(), {
		path,
		name,
		basename: dot > -1 ? name.slice(0, dot) : name,
		extension: dot > -1 ? name.slice(dot + 1) : "",
		parent: Object.assign(new TFolder(), {
			path: parts.slice(0, -1).join("/"),
		}),
	});

	const cache =
		opts.tags || opts.frontmatter_tags
			? {
					tags: opts.tags?.map((tag) => ({ tag })),
					frontmatter: opts.frontmatter_tags
						? { tags: opts.frontmatter_tags }
						: undefined,
				}
			: null;

	return { file, cache };
}

/** Build a minimal App: a vault of files, plus link resolution for [[link]]. */
function mock_app(
	files: ReturnType<typeof mock_file>[],
	opts: {
		/** link text -> resolved TFile, for getFirstLinkpathDest */
		resolve?: Record<string, TFile>;
		/** source path -> set of target paths it resolves to (outlinks) */
		resolved_links?: Record<string, string[]>;
	} = {},
): App {
	const by_path = new Map(files.map((f) => [f.file.path, f]));

	return {
		vault: {
			getFiles: () => files.map((f) => f.file),
		},
		metadataCache: {
			getFileCache: (file: TFile) => by_path.get(file.path)?.cache ?? null,
			getFirstLinkpathDest: (link_text: string) =>
				opts.resolve?.[link_text] ?? null,
			resolvedLinks: Object.fromEntries(
				Object.entries(opts.resolved_links ?? {}).map(
					([source, targets]) => [
						source,
						Object.fromEntries(targets.map((t) => [t, 1])),
					],
				),
			),
		},
	} as unknown as App;
}

describe("dataview_from_query", () => {
	test("#tag matches a file with that exact tag", () => {
		const a = mock_file("a.md", { tags: ["#project"] });
		const b = mock_file("b.md", { tags: ["#other"] });
		const app = mock_app([a, b]);

		expect(dataview_from_query("#project", app, "src.md")).toEqual([
			"a.md",
		]);
	});

	test("#tag matches sub-tags (#project matches #project/sub)", () => {
		const a = mock_file("a.md", { tags: ["#project/sub"] });
		const app = mock_app([a]);

		expect(dataview_from_query("#project", app, "src.md")).toEqual([
			"a.md",
		]);
	});

	test("#tag does not match a different parent tag", () => {
		const a = mock_file("a.md", { tags: ["#projectx"] });
		const app = mock_app([a]);

		expect(dataview_from_query("#project", app, "src.md")).toEqual([]);
	});

	test("#tag reads frontmatter tags (string form)", () => {
		const a = mock_file("a.md", { frontmatter_tags: "project" });
		const app = mock_app([a]);

		expect(dataview_from_query("#project", app, "src.md")).toEqual([
			"a.md",
		]);
	});

	test("#tag reads frontmatter tags (array form)", () => {
		const a = mock_file("a.md", { frontmatter_tags: ["other", "project"] });
		const app = mock_app([a]);

		expect(dataview_from_query("#project", app, "src.md")).toEqual([
			"a.md",
		]);
	});

	test('"folder" matches files in that folder and its subfolders', () => {
		const a = mock_file("Projects/a.md");
		const b = mock_file("Projects/Sub/b.md");
		const c = mock_file("Other/c.md");
		const app = mock_app([a, b, c]);

		expect(
			dataview_from_query('"Projects"', app, "src.md").sort(),
		).toEqual(["Projects/Sub/b.md", "Projects/a.md"]);
	});

	test('"folder" is case-insensitive', () => {
		const a = mock_file("Projects/a.md");
		const app = mock_app([a]);

		expect(dataview_from_query('"projects"', app, "src.md")).toEqual([
			"Projects/a.md",
		]);
	});

	test('"" (empty folder) matches every file', () => {
		const a = mock_file("a.md");
		const b = mock_file("Projects/b.md");
		const app = mock_app([a, b]);

		expect(dataview_from_query('""', app, "src.md").sort()).toEqual([
			"Projects/b.md",
			"a.md",
		]);
	});

	test("[[link]] matches files that resolve a link to the target", () => {
		const target = Object.assign(new TFile(), {
			path: "Target.md",
			basename: "Target",
		});
		const a = mock_file("a.md");
		const b = mock_file("b.md");
		const app = mock_app([a, b], {
			resolve: { Target: target },
			resolved_links: { "a.md": ["Target.md"] },
		});

		expect(dataview_from_query("[[Target]]", app, "src.md")).toEqual([
			"a.md",
		]);
	});

	test("[[link]] with an unresolved target matches nothing", () => {
		const a = mock_file("a.md");
		const app = mock_app([a]);

		expect(dataview_from_query("[[Missing]]", app, "src.md")).toEqual([]);
	});

	test("AND requires both sides", () => {
		const a = mock_file("a.md", { tags: ["#x", "#y"] });
		const b = mock_file("b.md", { tags: ["#x"] });
		const app = mock_app([a, b]);

		expect(dataview_from_query("#x AND #y", app, "src.md")).toEqual([
			"a.md",
		]);
	});

	test("OR matches either side", () => {
		const a = mock_file("a.md", { tags: ["#x"] });
		const b = mock_file("b.md", { tags: ["#y"] });
		const c = mock_file("c.md", { tags: ["#z"] });
		const app = mock_app([a, b, c]);

		expect(
			dataview_from_query("#x OR #y", app, "src.md").sort(),
		).toEqual(["a.md", "b.md"]);
	});

	test("NOT negates the following atom", () => {
		const a = mock_file("a.md", { tags: ["#x"] });
		const b = mock_file("b.md", { tags: ["#y"] });
		const app = mock_app([a, b]);

		expect(dataview_from_query("NOT #x", app, "src.md")).toEqual([
			"b.md",
		]);
	});

	test("AND binds tighter than OR: #x OR #y AND #z == #x OR (#y AND #z)", () => {
		const a = mock_file("a.md", { tags: ["#x"] });
		const b = mock_file("b.md", { tags: ["#y"] }); // y without z: shouldn't match
		const c = mock_file("c.md", { tags: ["#y", "#z"] });
		const app = mock_app([a, b, c]);

		expect(
			dataview_from_query("#x OR #y AND #z", app, "src.md").sort(),
		).toEqual(["a.md", "c.md"]);
	});

	test("parens override default precedence", () => {
		const a = mock_file("a.md", { tags: ["#x"] });
		const b = mock_file("b.md", { tags: ["#y"] });
		const c = mock_file("c.md", { tags: ["#z"] });
		const app = mock_app([a, b, c]);

		// (#x OR #y) AND #z -- none of these files satisfy it, unlike the
		// unparenthesised #x OR (#y AND #z) case above.
		expect(
			dataview_from_query("(#x OR #y) AND #z", app, "src.md"),
		).toEqual([]);
	});

	test("an unrecognised atom matches nothing, without throwing", () => {
		const a = mock_file("a.md", { tags: ["#x"] });
		const app = mock_app([a]);

		expect(() =>
			dataview_from_query("garbage!!!", app, "src.md"),
		).not.toThrow();
		expect(dataview_from_query("garbage!!!", app, "src.md")).toEqual([]);
	});

	test("only md/canvas/base extensions are candidates", () => {
		const md = mock_file("a.md");
		const png = mock_file("b.png");
		const app = mock_app([md, png]);

		expect(dataview_from_query('""', app, "src.md")).toEqual(["a.md"]);
	});
});

describe("try_dataview_from_query", () => {
	test("undefined query -> undefined", () => {
		const app = mock_app([]);
		expect(try_dataview_from_query(undefined, app, "src.md")).toBeUndefined();
	});

	test("empty-string query -> undefined", () => {
		const app = mock_app([]);
		expect(try_dataview_from_query("", app, "src.md")).toBeUndefined();
	});

	test("a real query delegates to dataview_from_query", () => {
		const a = mock_file("a.md", { tags: ["#x"] });
		const app = mock_app([a]);

		expect(try_dataview_from_query("#x", app, "src.md")).toEqual([
			"a.md",
		]);
	});
});
