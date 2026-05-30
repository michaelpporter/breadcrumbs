import type { PropertyWidgetType } from "src/interfaces/obsidian";

export const METADATA_FIELDS_LIST = [
	"BC-tag-note-tag",
	"BC-tag-note-field",
	"BC-tag-note-exact",
	"BC-tag-note-sibling-field",
	//
	"BC-regex-note-regex",
	"BC-regex-note-flags",
	"BC-regex-note-field",
	//
	"BC-folder-note-field",
	"BC-folder-note-recurse",
	//
	"BC-list-note-field",
	"BC-list-note-neighbour-field",
	"BC-list-note-exclude-index",
	//
	"BC-dendron-note-field",
	//
	"BC-johnny-decimal-note-field",
	//
	"BC-dataview-note-query",
	"BC-dataview-note-field",
	//
	"BC-traverse-note-field",
	//
	"BC-ignore-in-edges",
	"BC-ignore-out-edges",
] as const;

export type MetadataField = (typeof METADATA_FIELDS_LIST)[number];

export const METADATA_FIELDS_MAP: Record<
	MetadataField,
	{
		property_type: PropertyWidgetType;
	}
> = {
	"BC-tag-note-tag": {
		property_type: "text",
	},
	"BC-tag-note-field": {
		property_type: "text",
	},
	"BC-tag-note-exact": {
		property_type: "checkbox",
	},
	"BC-tag-note-sibling-field": {
		property_type: "text",
	},
	//
	"BC-regex-note-regex": {
		property_type: "text",
	},
	"BC-regex-note-flags": {
		property_type: "text",
	},
	"BC-regex-note-field": {
		property_type: "text",
	},
	//
	"BC-folder-note-field": {
		property_type: "text",
	},
	"BC-folder-note-recurse": {
		property_type: "checkbox",
	},
	//
	"BC-list-note-field": {
		property_type: "text",
	},
	"BC-list-note-neighbour-field": {
		property_type: "text",
	},
	"BC-list-note-exclude-index": {
		property_type: "checkbox",
	},
	//
	"BC-dendron-note-field": {
		property_type: "text",
	},
	//
	"BC-johnny-decimal-note-field": {
		property_type: "text",
	},
	//
	"BC-dataview-note-query": {
		property_type: "text",
	},
	"BC-dataview-note-field": {
		property_type: "text",
	},
	//
	"BC-traverse-note-field": {
		property_type: "text",
	},
	//
	"BC-ignore-in-edges": {
		property_type: "checkbox",
	},
	"BC-ignore-out-edges": {
		property_type: "checkbox",
	},
};

export const META_ALIAS = {
	"tag-note-tag": "BC-tag-note-tag",
	"tag-note-field": "BC-tag-note-field",
	"tag-note-exact": "BC-tag-note-exact",
	"tag-note-sibling-field": "BC-tag-note-sibling-field",
	//
	"regex-note-regex": "BC-regex-note-regex",
	"regex-note-flags": "BC-regex-note-flags",
	"regex-note-field": "BC-regex-note-field",
	//
	"folder-note-field": "BC-folder-note-field",
	"folder-note-recurse": "BC-folder-note-recurse",
	//
	"list-note-field": "BC-list-note-field",
	"list-note-neighbour-field": "BC-list-note-neighbour-field",
	"list-note-exclude-index": "BC-list-note-exclude-index",
	//
	"dendron-note-field": "BC-dendron-note-field",
	//
	"johnny-decimal-note-field": "BC-johnny-decimal-note-field",
	//
	"dataview-note-query": "BC-dataview-note-query",
	"dataview-note-field": "BC-dataview-note-field",
	//
	"traverse-note-field": "BC-traverse-note-field",
	//
	"ignore-in-edges": "BC-ignore-in-edges",
	"ignore-out-edges": "BC-ignore-out-edges",
} satisfies Record<string, MetadataField>;
