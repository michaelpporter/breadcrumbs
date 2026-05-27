/**
 * Minimal Obsidian API mock for vitest.
 *
 * The real `obsidian` npm package ships only TypeScript declarations (no JS).
 * vite.config.mjs aliases `obsidian` → this file so builders can be tested
 * without a running Obsidian instance.
 */

export function normalizePath(path: string): string {
	// Match real Obsidian: normalise backslashes, collapse double-slashes,
	// strip leading slash.
	return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\//, "");
}

export class TAbstractFile {
	path: string = "";
	name: string = "";
}

export class TFile extends TAbstractFile {
	basename: string = "";
	extension: string = "md";
	parent: TFolder | null = null;
}

export class TFolder extends TAbstractFile {
	children: TAbstractFile[] = [];
	isRoot() {
		return false;
	}
}

export class Plugin {}
export class PluginSettingTab {}
export class Modal {}
export class Notice {}
export class Setting {}
export class App {}
