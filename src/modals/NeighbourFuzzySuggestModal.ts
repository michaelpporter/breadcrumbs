import { FuzzySuggestModal } from "obsidian";
import { open_neighbour } from "src/commands/jump";
import type BreadcrumbsPlugin from "src/main";
import { Paths } from "src/utils/paths";

/**
 * Plain snapshot of a neighbour edge. We deliberately resolve paths up front
 * rather than holding live `EdgeStruct`s — those carry a graph revision and
 * throw a "Revision mismatch" if the graph rebuilds while the modal is open.
 */
interface Neighbour {
	edge_type: string;
	target_path: string;
}

export class NeighbourFuzzySuggester extends FuzzySuggestModal<Neighbour> {
	private plugin: BreadcrumbsPlugin;
	private source_path: string;

	constructor(plugin: BreadcrumbsPlugin, source_path: string) {
		super(plugin.app);

		this.plugin = plugin;
		this.source_path = source_path;

		this.setPlaceholder("Jump to a neighbour...");
		this.setInstructions([
			{ command: "↑↓", purpose: "Navigate" },
			{ command: "↵", purpose: "Jump" },
		]);
	}

	getItems(): Neighbour[] {
		return this.plugin.graph
			.get_outgoing_edges(this.source_path)
			.get_edges()
			.map((e) => ({
				edge_type: e.edge_type,
				target_path: e.target_path(this.plugin.graph),
			}))
			.filter((n) => n.target_path !== this.source_path);
	}

	getItemText(neighbour: Neighbour): string {
		return `${neighbour.edge_type}: ${Paths.basename(neighbour.target_path)}`;
	}

	onChooseItem(neighbour: Neighbour): void {
		void open_neighbour(
			this.plugin,
			neighbour.target_path,
			this.source_path,
		);
	}
}
