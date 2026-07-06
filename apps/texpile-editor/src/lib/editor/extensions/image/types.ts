import type { DecorationSet, EditorView } from 'prosemirror-view';
import type { Node as PMNode } from 'prosemirror-model';
import type { EditorState, StateField } from 'prosemirror-state';

export type ImagePluginState = DecorationSet;

export interface InsertImagePlaceholder {
	type: 'add';
	pos: number;
	id: unknown;
}

export interface RemoveImagePlaceholder {
	type: 'remove';
	id: unknown;
}

export type ImagePluginAction = InsertImagePlaceholder | RemoveImagePlaceholder;

export type ImagePlaceholderObject = { src?: string; className?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ImagePluginSettings<T = any> {
	downloadImage?: (url: string) => Promise<string>;
	downloadPlaceholder?: (url: string, view: EditorView) => string | ImagePlaceholderObject;
	uploadFile: (file: File) => Promise<string>;
	deleteSrc: (src: string) => Promise<void>;
	hasTitle: boolean;
	extraAttributes: Record<string, string | null>;
	createOverlay: (node: PMNode, getPos: () => number | undefined, view: EditorView) => Node | undefined;
	updateOverlay: (overlayRoot: Node, getPos: () => number | undefined, view: EditorView, node: PMNode) => void;
	defaultTitle: string;
	defaultAlt: string;
	enableResize: boolean;
	isBlock: boolean;
	resizeCallback: (el: Element, updateCallback: () => void) => () => void;
	imageMargin: number;
	minSize: number;
	maxSize: number;
	scaleImage: boolean;
	createState: (pluginSettings: ImagePluginSettings) => StateField<T>;
	createDecorations: (state: EditorState) => DecorationSet;
	findPlaceholder: (state: EditorState, id: object) => number | undefined;
}

export enum resizeDirection {
	top = 'top',
	topRight = 'topRight',
	right = 'right',
	bottomRight = 'bottomRight',
	bottom = 'bottom',
	bottomLeft = 'bottomLeft',
	left = 'left',
	topLeft = 'topLeft'
}

export enum imagePluginClassNames {
	imageResizeBoxWrapper = 'imageResizeBoxWrapper',
	imageResizeBoxCenter = 'imageResizeBoxCenter',
	imageResizeBox = 'imageResizeBox',
	imageResizeBoxControl = 'imageResizeBoxControl',
	imagePluginRoot = 'imagePluginRoot',
	imagePluginImg = 'imagePluginImg'
}
