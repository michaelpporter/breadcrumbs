import { _add_explicit_edges_folder_note } from "src/graph/builders/explicit/folder_note";
import { TFolder } from "obsidian";
import { describe, test } from "vitest";
import { make_all_files, make_plugin, mock_file } from "./helpers";

/** Build a TFolder with the given children (TFile or TFolder instances). */
function tfolder(path: string, children: unknown[]): TFolder {
	const folder = new TFolder();
	folder.path = path;
	folder.children = children as TFolder["children"];
	return folder;
}

function plugin(
	tree: Record<string, TFolder>,
	edge_fields = [{ label: "up" }, { label: "down" }],
) {
	return make_plugin(
		{ edge_fields, explicit_edge_sources: {} as never },
		[],
		undefined,
		{ getAbstractFileByPath: (p) => tree[p] ?? null },
	);
}

describe("folder_note builder", () => {
	test("folder note → up edges to sibling files (not itself)", async (t) => {
		const index = mock_file("Folder/index.md", {
			frontmatter: { "BC-folder-note-field": "up" },
		});
		const a = mock_file("Folder/a.md");
		const b = mock_file("Folder/b.md");
		const tree = {
			Folder: tfolder("Folder", [index.file, a.file, b.file]),
		};

		const r = await _add_explicit_edges_folder_note(
			plugin(tree),
			make_all_files([index, a, b]),
		);

		const targets = r.edges
			.filter((e) => e.source === "Folder/index.md")
			.map((e) => e.target)
			.sort();
		t.expect(targets).toEqual(["Folder/a.md", "Folder/b.md"]);
		t.expect(r.edges.every((e) => e.edge_type === "up")).toBe(true);
	});

	test("recurse=true includes sub-folder files", async (t) => {
		const index = mock_file("Folder/index.md", {
			frontmatter: {
				"BC-folder-note-field": "up",
				"BC-folder-note-recurse": true,
			},
		});
		const a = mock_file("Folder/a.md");
		const c = mock_file("Folder/Sub/c.md");
		const tree = {
			Folder: tfolder("Folder", [
				index.file,
				a.file,
				tfolder("Folder/Sub", [c.file]),
			]),
			"Folder/Sub": tfolder("Folder/Sub", [c.file]),
		};

		const r = await _add_explicit_edges_folder_note(
			plugin(tree),
			make_all_files([index, a, c]),
		);

		const targets = r.edges.map((e) => e.target);
		t.expect(targets).toContain("Folder/Sub/c.md");
	});

	test("recurse=false excludes sub-folder files", async (t) => {
		const index = mock_file("Folder/index.md", {
			frontmatter: { "BC-folder-note-field": "up" },
		});
		const a = mock_file("Folder/a.md");
		const c = mock_file("Folder/Sub/c.md");
		const tree = {
			Folder: tfolder("Folder", [
				index.file,
				a.file,
				tfolder("Folder/Sub", [c.file]),
			]),
			"Folder/Sub": tfolder("Folder/Sub", [c.file]),
		};

		const r = await _add_explicit_edges_folder_note(
			plugin(tree),
			make_all_files([index, a, c]),
		);

		t.expect(r.edges.map((e) => e.target)).not.toContain("Folder/Sub/c.md");
	});

	test("invalid field → invalid_edge_field", async (t) => {
		const index = mock_file("Folder/index.md", {
			frontmatter: { "BC-folder-note-field": "nope" },
		});
		const r = await _add_explicit_edges_folder_note(
			plugin({ Folder: tfolder("Folder", [index.file]) }),
			make_all_files([index]),
		);
		t.expect(r.errors[0]!.code).toBe("invalid_edge_field");
	});

	test("edge_source is folder_note", async (t) => {
		const index = mock_file("Folder/index.md", {
			frontmatter: { "BC-folder-note-field": "up" },
		});
		const a = mock_file("Folder/a.md");
		const r = await _add_explicit_edges_folder_note(
			plugin({ Folder: tfolder("Folder", [index.file, a.file]) }),
			make_all_files([index, a]),
		);
		t.expect(r.edges[0]!.edge_source).toBe("folder_note");
	});
});
