/**
 * Local augmentations for unofficial Obsidian APIs.
 *
 * obsidian-typings 3.16+ packages its augmentations in .d.cts files; TypeScript 6
 * does not apply module augmentations from .d.cts type-reference entries. These
 * declarations replicate the subset used by this plugin so the project compiles
 * without resorting to `as any` casts.
 */

import "obsidian";

declare module "obsidian" {
	interface MetadataTypeManager {
		/** Get widget type assigned to a property (Obsidian < 1.x compat). */
		getAssignedType(property: string): string | null;
		/** Set the widget type for a property. */
		setType(property: string, type: string): Promise<void>;
	}

	interface App {
		/** Manages frontmatter property types for the vault. @unofficial */
		metadataTypeManager: MetadataTypeManager;
	}

	interface MetadataCache {
		/** True once the cache has finished its initial scan. @unofficial */
		initialized: boolean;
		on(name: "initialized", callback: () => void, ctx?: unknown): EventRef;
	}
}
