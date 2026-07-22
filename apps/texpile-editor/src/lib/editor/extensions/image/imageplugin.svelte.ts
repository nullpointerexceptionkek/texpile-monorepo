import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { Mapping, StepMap } from 'prosemirror-transform';
import type { Node as PMNode } from 'prosemirror-model';
import type { EditorState, Transaction } from 'prosemirror-state';
import type { ImagePluginAction, ImagePluginSettings } from './types';
import { imagePluginKey } from './imagepluginutils';
import { currentDocMetaStore } from '$lib/stores/metaStore';
import { get } from 'svelte/store';
import { mount } from 'svelte';
import ImageOverlay from './ImageOverlay.svelte';
// the library no longer exports ToastSettings
type ToastSettings = { message: string; timeout?: number };

import { getStorageUrl, uploadImage } from '$lib/editor/request';
import { joinPath, isRemoteSrc } from '$lib/workspace/fileSystem';
import { editorFileUrl, editorWriteBinary } from '$lib/editor/fileAccess';
import imageNotFoundPng from '$lib/assets/compile/image_not_found_placeholder.png';

export const defaultDeleteSrc = () => Promise.resolve();

export const defaultExtraAttributes = {
	width: null,
	height: null,
	maxWidth: null
};

export const defaultCreateOverlay = () => {
	const container = document.createElement('div');
	container.className = 'image-overlay-container absolute inset-0 pointer-events-none';
	container.setAttribute('contenteditable', 'false');
	return container;
};

// stashed on the overlay element so update calls can find the mounted component's props
// without a separate WeakMap registry
interface OverlayHost extends HTMLElement {
	__svelteComponentProps?: { node: PMNode; view: EditorView; getPos: () => number | undefined };
}

export const defaultUpdateOverlay = (overlay: Node, getPos: () => number | undefined, view: EditorView, node: PMNode) => {
	if (overlay instanceof HTMLElement) {
		const overlayHost = overlay as OverlayHost;
		const existingProps = overlayHost.__svelteComponentProps;

		if (existingProps) {
			existingProps.node = node;
			existingProps.view = view;
			existingProps.getPos = getPos;
		} else {
			const componentProps = $state({
				node,
				view,
				getPos
			});

			mount(ImageOverlay, {
				target: overlay,
				props: componentProps
			});

			overlayHost.__svelteComponentProps = componentProps;
		}
	}
};

export const defaultResizeCallback = (el: Element, updateCallback: () => void) => {
	const observer = new ResizeObserver(() => updateCallback());
	observer.observe(el);
	return () => {
		observer.unobserve(el);
	};
};

export const defaultCreateDecorations = (state: EditorState) => imagePluginKey.getState(state) || DecorationSet.empty;

const defaultFindPlaceholder = (state: EditorState, id: object) => {
	const decos = imagePluginKey.getState(state);
	const found = decos?.find(undefined, undefined, (spec) => spec.id === id);
	return found?.length ? found[0].from : undefined;
};

const defaultCreateState = () => ({
	init() {
		return DecorationSet.empty;
	},
	apply(tr: Transaction, value: DecorationSet, oldState: EditorState): DecorationSet {
		const diffStart = tr.doc.content.findDiffStart(oldState.doc.content);
		const diffEnd = oldState.doc.content.findDiffEnd(tr.doc.content);
		const map = diffEnd && diffStart ? new StepMap([diffStart, diffEnd.a - diffStart, diffEnd.b - diffStart]) : new StepMap([0, 0, 0]);

		const pmMapping = new Mapping([map]);
		let set = value.map(pmMapping, tr.doc);

		const action: ImagePluginAction = tr.getMeta(imagePluginKey);
		if (action?.type === 'add') {
			const widget = document.createElement('placeholder');
			const deco = Decoration.widget(action.pos, widget, {
				id: action.id
			});
			set = set.add(tr.doc, [deco]);
		} else if (action?.type === 'remove') {
			set = set.remove(set.find(undefined, undefined, (spec) => spec.id === action.id));
		}
		return set;
	}
});

// templates only get example content, never user images
const TEMPLATE_PLACEHOLDER_IMAGE = 'public/texpile/example_images/example_gradient_blue.png';

/** image settings for template editor mode: static placeholder, no uploads. */
export const createTemplateEditorSettings = (): ImagePluginSettings => {
	const uploadFile = async (_file: File): Promise<string> => {
		return TEMPLATE_PLACEHOLDER_IMAGE;
	};

	const deleteSrc = async (_filePath: string) => {
		return;
	};

	// offline build: no remote storage, use the bundled placeholder
	const downloadImage = async (_src: string): Promise<string> => {
		return imageNotFoundPng;
	};

	return {
		uploadFile,
		hasTitle: true,
		deleteSrc,
		extraAttributes: defaultExtraAttributes,
		createOverlay: defaultCreateOverlay,
		updateOverlay: defaultUpdateOverlay,
		defaultTitle: 'Image title',
		defaultAlt: 'Image',
		enableResize: true,
		isBlock: true,
		resizeCallback: defaultResizeCallback,
		imageMargin: 15,
		minSize: 50,
		maxSize: 2000,
		scaleImage: true,
		createState: defaultCreateState,
		createDecorations: defaultCreateDecorations,
		findPlaceholder: defaultFindPlaceholder,
		downloadImage
	} as ImagePluginSettings;
};

export const createDefaultSettings = (firebaseUid: string): ImagePluginSettings => {
	const defaultUploadFile = (file: File): Promise<string> =>
		new Promise((resolve, reject) => {
			console.log('Uploading image:', file.name, 'size:', file.size, 'type:', file.type);
			if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
				const t: ToastSettings = {
					message: 'Only PNG and JPEG images are allowed. Please upload the correct file type.',
					timeout: 3000
				};
				dispatchEvent(new CustomEvent('toast', { detail: t }));
				reject(new Error('Only PNG and JPEG images are allowed. Please upload the correct file type.'));
				return;
			}

			if (file.size > 1.5 * 1024 * 1024) {
				const t: ToastSettings = {
					message: 'File size exceeds 1.5 MB. Please resize your image and try again.',
					timeout: 3000
				};
				dispatchEvent(new CustomEvent('toast', { detail: t }));
				reject(new Error('File size exceeds 1.5 MB. Please resize your image and try again.'));
				return;
			}

			const docId = get(currentDocMetaStore).docref;
			const fileExtension = file.name.split('.').pop();
			const imageId = crypto.randomUUID() + '-' + Date.now();
			const sanitizedFileName = `${imageId}.${fileExtension}`;

			const filePath = `users/${firebaseUid}/documents/${docId}/images/${sanitizedFileName}`;
			console.log('Uploading image to path:', filePath);
			uploadImage(filePath, file)
				.then(() => {
					resolve(filePath);
				})
				.catch((error) => {
					reject(error);
				});
		});

	const deleteSrc = async (_filePath: string) => {
		return;
	};

	const downloadImage = async (src: string): Promise<string> => {
		console.log('Downloading image from src:', src);
		// offline build: images resolve to local paths/URLs via getStorageUrl below

		const retries = 3;
		const delayInterval = 1000;

		const filePath = src;

		const attemptDownload = (attempt: number): Promise<string> => {
			return getStorageUrl(filePath)
				.then((url) => url)
				.catch(async (error) => {
					console.log(error);
					if (attempt < retries - 1) {
						return new Promise((resolve) => {
							setTimeout(() => resolve(attemptDownload(attempt + 1)), delayInterval);
						});
					} else {
						const t = {
							message: 'Error downloading image',
							timeout: 3000
						};
						dispatchEvent(new CustomEvent('toast', { detail: t }));
						// fall back to the bundled image-not-found placeholder
						return imageNotFoundPng;
					}
				});
		};

		return attemptDownload(0);
	};

	return {
		uploadFile: defaultUploadFile,
		hasTitle: true,
		deleteSrc,
		extraAttributes: defaultExtraAttributes,
		createOverlay: defaultCreateOverlay,
		updateOverlay: defaultUpdateOverlay,
		defaultTitle: 'Image title',
		defaultAlt: 'Image',
		enableResize: true,
		isBlock: true,
		resizeCallback: defaultResizeCallback,
		imageMargin: 15,
		minSize: 50,
		maxSize: 2000,
		scaleImage: true,
		createState: defaultCreateState,
		createDecorations: defaultCreateDecorations,
		findPlaceholder: defaultFindPlaceholder,
		downloadImage
	} as ImagePluginSettings;
};

const LOCAL_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

async function uploadLocalImage(file: File, imageDir: string): Promise<string> {
	if (!LOCAL_IMAGE_TYPES.includes(file.type)) {
		dispatchEvent(new CustomEvent('toast', { detail: { message: 'Only PNG, JPEG, GIF and WebP images are supported.', timeout: 3000 } }));
		throw new Error('Unsupported image type');
	}
	const ext = (file.name.split('.').pop() || 'png').toLowerCase();
	// short but collision-resistant filename, e.g. images/pasted-image-a1b2c3d4.png
	const shortId = crypto.randomUUID().split('-')[0];
	const name = `pasted-image-${shortId}.${ext}`;
	const abs = joinPath(joinPath(imageDir, 'images'), name);
	await editorWriteBinary(abs, file);
	// tell the workspace the folder changed so the file-tree sidebar re-scans
	dispatchEvent(new CustomEvent('texpile:fs-changed'));
	// the node stores the on-disk-relative path the .tex needs; downloadImage resolves it for display
	return `images/${name}`;
}

/** image settings for the local folder editor: images land in images/ next to the document. */
export const createLocalImageSettings = (imageDir: string): ImagePluginSettings => {
	const base = createDefaultSettings('local');
	return {
		...base,
		uploadFile: (file: File) => uploadLocalImage(file, imageDir),
		// resolve the relative path to a served URL; pass through already-resolved srcs
		downloadImage: async (src: string) => {
			if (!src || isRemoteSrc(src) || /^(data:|blob:|file:)/.test(src)) return src;
			return editorFileUrl(joinPath(imageDir, src));
		},
		deleteSrc: async () => {}
	};
};
