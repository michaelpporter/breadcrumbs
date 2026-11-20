import { DEFAULT_SETTINGS } from "src/const/settings";
import { InlineFieldCache } from "src/graph/builders/explicit/inline_field_cache";
import { _add_explicit_edges_typed_link } from "src/graph/builders/explicit/typed_link";
import { describe, expect, test, vi } from "vitest";
import { make_all_files, make_plugin, mock_file } from "./helpers";

const BODY = "up:: [[p]]\n(other:: [[o]])";
const LINKS = [
	{ line: 0, col: 5, link: "p" },
	{ line: 1, col: 9, link: "o" },
];

/** A vault of one note, `a.md`, with BODY as its content and a mutable stat. */
function setup(labels = ["up"], cache_inline_fields = true) {
	const cachedRead = vi.fn(async () => BODY);
	const plugin = make_plugin(
		{
			edge_fields: labels.map((label) => ({ label })),
			commands: {
				...DEFAULT_SETTINGS.commands,
				rebuild_graph: {
					...DEFAULT_SETTINGS.commands.rebuild_graph,
					cache_inline_fields,
				},
			},
		},
		[],
		undefined,
		{ cachedRead },
	);
	const note = mock_file("a.md", { links: LINKS });
	note.file.stat = { ctime: 0, mtime: 1, size: BODY.length };

	const build = async () => {
		const r = await _add_explicit_edges_typed_link(
			plugin,
			make_all_files([note]),
		);
		return r.edges.map((e) => [e.edge_type, e.target]);
	};

	return { plugin, note, cachedRead, build };
}

describe("inline-field cache in the typed_link builder", () => {
	test("setting off (default) → every rebuild reads, nothing cached", async () => {
		const { plugin, cachedRead, build } = setup(["up"], false);

		await build();
		plugin.inline_field_cache.commit();
		await build();

		expect(cachedRead).toHaveBeenCalledTimes(2);
		expect(plugin.inline_field_cache.commit()).toBe(false);
	});

	test("unchanged note → second rebuild skips the read, same edges", async () => {
		const { plugin, cachedRead, build } = setup();

		const first = await build();
		plugin.inline_field_cache.commit();
		const second = await build();

		expect(first).toEqual([["up", "p.md"]]);
		expect(second).toEqual(first);
		expect(cachedRead).toHaveBeenCalledTimes(1);
	});

	test("mtime or size change → note is re-read", async () => {
		const { plugin, note, cachedRead, build } = setup();

		await build();
		plugin.inline_field_cache.commit();
		note.file.stat = { ...note.file.stat, mtime: 2 };
		await build();
		plugin.inline_field_cache.commit();
		note.file.stat = { ...note.file.stat, size: 99 };
		await build();

		expect(cachedRead).toHaveBeenCalledTimes(3);
	});

	test("edge_fields change → served from cache, no re-read", async () => {
		const { plugin, cachedRead, build } = setup(["up"]);

		await build();
		plugin.inline_field_cache.commit();
		plugin.settings.edge_fields = [{ label: "other" }];
		const edges = await build();

		expect(edges).toEqual([["other", "o.md"]]);
		expect(cachedRead).toHaveBeenCalledTimes(1);
	});
});

describe("InlineFieldCache", () => {
	const file = (path: string, mtime = 1) =>
		({ path, stat: { ctime: 0, mtime, size: 10 } }) as never;

	test("commit is dirty on new entries, clean when nothing changed", () => {
		const cache = new InlineFieldCache();
		cache.set(file("a.md"), [["up", "p"]]);
		expect(cache.commit()).toBe(true);

		cache.get(file("a.md"));
		expect(cache.commit()).toBe(false);
	});

	test("notes not seen in a rebuild are pruned (and that is dirty)", () => {
		const cache = new InlineFieldCache();
		cache.set(file("a.md"), [["up", "p"]]);
		cache.set(file("b.md"), [["up", "q"]]);
		cache.commit();

		cache.get(file("a.md"));
		expect(cache.commit()).toBe(true);
		expect(cache.get(file("b.md"))).toBeNull();
	});

	test("to_json → from_json round-trips entries", () => {
		const cache = new InlineFieldCache();
		cache.set(file("a.md"), [["up", "p"]]);
		cache.commit();

		const restored = InlineFieldCache.from_json(cache.to_json());
		expect(restored.get(file("a.md"))).toEqual([["up", "p"]]);
		expect(restored.get(file("a.md", 2))).toBeNull();
	});

	test.each([
		["missing", null],
		["corrupt", "{not json"],
		["other version", JSON.stringify({ version: 0, entries: { "a.md": { mtime: 1, size: 10, links: [] } } })],
	])("%s file → empty cache", (_, raw) => {
		expect(InlineFieldCache.from_json(raw).get(file("a.md"))).toBeNull();
	});
});
