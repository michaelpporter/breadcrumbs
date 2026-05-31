import type { App } from "obsidian";
import type { LinkKind } from "src/interfaces/links";
import { Paths } from "./paths";

/** Given an unresolved link path, return the absolute path of where it _would_ get created,
 * given the file it would be created in
 */
const resolve_to_absolute_path = (
	app: App,
	relative_path: string,
	/** The file the unresolved link is in/being created from */
	source_path: string,
) => {
	const folder = app.fileManager.getNewFileParent(source_path, relative_path);

	return Paths.build(folder.path, Paths.basename(relative_path), "md");
};

const ify = (
	path: string,
	display: string,
	options: { link_kind: LinkKind; app?: App; source_path?: string },
) => {
	switch (options.link_kind) {
		case "none": {
			return display;
		}
		case "wiki": {
			const no_ext = Paths.drop_ext(path);

			return display === path
				? `[[${no_ext}]]`
				: `[[${no_ext}|${display}]]`;
		}
		case "markdown": {
			if (options.app && options.source_path) {
				const file = options.app.vault.getFileByPath(path);
				if (file) {
					const alias = display !== path ? display : undefined;
					return options.app.fileManager.generateMarkdownLink(
						file,
						options.source_path,
						undefined,
						alias,
					);
				}
			}
			return display === path
				? `[${path}](${path})`
				: `[${display}](${path})`;
		}
	}
};

export const Links = {
	ify,
	resolve_to_absolute_path,
};
