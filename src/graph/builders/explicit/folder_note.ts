import { TFile, TFolder } from "obsidian";
import { META_ALIAS } from "src/const/metadata_fields";
import { NON_MD_EXTENSIONS } from "./files";
import type {
	BreadcrumbsError,
	EdgeBuilderResults,
	ExplicitEdgeBuilder,
} from "src/interfaces/graph";
import type { Result } from "src/interfaces/result";
import type BreadcrumbsPlugin from "src/main";
import { fail, succ } from "src/utils/result";
import { GCEdgeData } from "wasm/pkg/breadcrumbs_graph_wasm";
import { validate_edge_field } from "./validate_field";

interface FolderNoteData {
	field: string;
	recurse: boolean;
}

const get_folder_note_info = (
	plugin: BreadcrumbsPlugin,
	metadata: Record<string, unknown> | undefined,
	path: string,
): Result<FolderNoteData, BreadcrumbsError | undefined> => {
	if (!metadata) return fail(undefined);

	const field_res = validate_edge_field(
		plugin,
		metadata[META_ALIAS["folder-note-field"]],
		path,
		"folder-note-field",
	);
	if (!field_res.ok) return field_res;

	const recurse = Boolean(metadata[META_ALIAS["folder-note-recurse"]]);

	return succ({
		field: field_res.data,
		recurse,
	});
};

const iterate_folder_files = (
	plugin: BreadcrumbsPlugin,
	folder_path: string,
	cb: (path: string) => void,
	/** Keep going for subfolders? Or just stop after the first folder */
	recurse: boolean,
) => {
	const folder = plugin.app.vault.getAbstractFileByPath(folder_path);
	if (!(folder instanceof TFolder)) return;

	for (const child of folder.children) {
		if (child instanceof TFile) {
			cb(child.path);
		} else if (recurse && child instanceof TFolder) {
			// When the subfolder is recursed, what does it mean when the callback runs?
			// Where will it point up to? The initial folder's files point up to the folder_note
			// But the subfolders don't specify a folder_note
			// NOTE: For now, the subfiles will point up to the initial folder_note
			iterate_folder_files(plugin, child.path, cb, true);
		}
	}
};

const VALID_EXTENSIONS = new Set(["md", ...NON_MD_EXTENSIONS]);

/**
 * **folder_note** — folder containment edge builder.
 *
 * A note annotated with `BC-folder-note-field: <field>` represents its
 * containing folder. Every other note inside that folder gets a `<field>` edge
 * pointing to the folder note (folder note = parent). When `recurse: true` is
 * set, all notes in sub-folders are also included.
 *
 * The builder walks the vault's folder tree via Obsidian's `TFolder` API;
 * edges are only created for markdown files that are not the folder note itself.
 */
export const _add_explicit_edges_folder_note: ExplicitEdgeBuilder = async (
	plugin,
	all_files,
) => {
	const results: EdgeBuilderResults = { nodes: [], edges: [], errors: [] };

	const folder_notes: {
		file: { path: string; folder: string };
		data: FolderNoteData;
	}[] = [];

	all_files.obsidian?.forEach(
		({ file: folder_note_file, cache: folder_note_cache }) => {
			if (!folder_note_cache) return;

			const folder_note_info = get_folder_note_info(
				plugin,
				folder_note_cache?.frontmatter,
				folder_note_file.path,
			);
			if (!folder_note_info.ok) {
				if (folder_note_info.error)
					results.errors.push(folder_note_info.error);
				return;
			}

			folder_notes.push({
				data: folder_note_info.data,
				file: {
					path: folder_note_file.path,
					folder: folder_note_file.parent?.path ?? "",
				},
			});
		},
	);

	all_files.dataview?.forEach((folder_note_page) => {
		const folder_note_info = get_folder_note_info(
			plugin,
			folder_note_page,
			folder_note_page.file.path,
		);
		if (!folder_note_info.ok) {
			if (folder_note_info.error)
				results.errors.push(folder_note_info.error);
			return;
		}

		folder_notes.push({
			data: folder_note_info.data,
			file: {
				path: folder_note_page.file.path,
				folder: folder_note_page.file.folder,
			},
		});
	});

	folder_notes.forEach(({ data, file: folder_note }) =>
		iterate_folder_files(
			plugin,
			folder_note.folder,
			(target_path) => {
				const ext = target_path.split(".").pop() ?? "";
				if (
					!VALID_EXTENSIONS.has(ext) ||
					target_path === folder_note.path
				) {
					return;
				}

				// We know path is resolved
				results.edges.push(
					new GCEdgeData(
						folder_note.path,
						target_path,
						data.field,
						"folder_note",
					),
				);
			},
			data.recurse,
		),
	);

	return results;
};
