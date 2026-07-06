import { Plugin, type EditorState, type Transaction } from 'prosemirror-state';
import type { Node as PMNode } from 'prosemirror-model';

import type { ImagePluginSettings, ImagePluginState } from '../types';
import { imagePluginKey } from '../imagepluginutils';
import dropHandler from './dropHandler';
import imageNodeView from './imageNodeView';
import pasteHandler from './pasteHandler';
import { copyImage } from '$lib/editor/request';
import { currentDocMetaStore } from '$lib/stores/metaStore';
import { get } from 'svelte/store';

// in-flight copies, avoids duplicate requests
const copyingImages = new Set<string>();

/** parses users/{ownerId}/documents/{docId}/images/{filename}. */
function parseImagePath(src: string): { ownerId: string; docId: string } | null {
	if (!src || !src.startsWith('users/')) return null;

	const parts = src.split('/');
	if (parts.length < 6 || parts[2] !== 'documents' || parts[4] !== 'images') {
		return null;
	}

	return {
		ownerId: parts[1],
		docId: parts[3]
	};
}

function isForeignImage(src: string, currentDocId: string): boolean {
	const parsed = parseImagePath(src);
	if (!parsed) return false;
	return parsed.docId !== currentDocId;
}

function findImageNodes(doc: PMNode): Array<{ pos: number; node: PMNode }> {
	const images: Array<{ pos: number; node: PMNode }> = [];
	doc.descendants((node, pos) => {
		if (node.type.name === 'image' && node.attrs.src) {
			images.push({ pos, node });
		}
	});
	return images;
}

function createUpdateImageSrcTransaction(state: EditorState, oldSrc: string, newSrc: string): Transaction | null {
	const images = findImageNodes(state.doc);
	const toUpdate = images.filter(({ node }) => node.attrs.src === oldSrc);

	if (toUpdate.length === 0) return null;

	let tr = state.tr;
	// reverse order avoids position shifts
	for (const { pos, node } of toUpdate.reverse()) {
		tr = tr.setNodeMarkup(pos, null, { ...node.attrs, src: newSrc });
	}

	return tr;
}

const imagePlugin = (pluginSettings: ImagePluginSettings): Plugin<ImagePluginState> =>
	new Plugin({
		key: imagePluginKey,
		state: pluginSettings.createState(pluginSettings),
		props: {
			decorations: pluginSettings.createDecorations,
			handleDOMEvents: {
				paste: pasteHandler(pluginSettings),
				drop: dropHandler(pluginSettings)
			},
			nodeViews: {
				image: imageNodeView(pluginSettings)
			}
		},
		settings: pluginSettings,

		// copy foreign images into this doc when the document changes
		appendTransaction(transactions, _oldState, newState) {
			if (!transactions.some((tr) => tr.docChanged)) {
				return null;
			}

			const docMeta = get(currentDocMetaStore);
			if (!docMeta?.docref || !docMeta?.ownerUserId) return null;

			const currentDocId = docMeta.docref;
			const currentOwnerId = docMeta.ownerUserId;

			const images = findImageNodes(newState.doc);

			for (const { node } of images) {
				const src = node.attrs.src;
				if (!src) continue;

				if (!isForeignImage(src, currentDocId) || copyingImages.has(src)) continue;

				copyingImages.add(src);

				(async () => {
					try {
						console.log(`[ImagePlugin] Copying foreign image: ${src}`);
						const newPath = await copyImage(src, currentDocId, currentOwnerId);
						console.log(`[ImagePlugin] Image copied to: ${newPath}`);

						// can't dispatch from appendTransaction, so hand off to the view via an event
						dispatchEvent(
							new CustomEvent('foreignImageCopied', {
								detail: { oldSrc: src, newSrc: newPath }
							})
						);
					} catch (error) {
						console.error('[ImagePlugin] Failed to copy image:', error);
					} finally {
						copyingImages.delete(src);
					}
				})();
			}

			return null;
		},

		view(editorView) {
			const handleForeignImageCopied = (e: Event) => {
				const { oldSrc, newSrc } = (e as CustomEvent).detail;
				const tr = createUpdateImageSrcTransaction(editorView.state, oldSrc, newSrc);
				if (tr) {
					console.log(`[ImagePlugin] Updating image src: ${oldSrc} → ${newSrc}`);
					editorView.dispatch(tr);
				}
			};

			window.addEventListener('foreignImageCopied', handleForeignImageCopied);

			return {
				destroy() {
					window.removeEventListener('foreignImageCopied', handleForeignImageCopied);
				}
			};
		}
	});

export default imagePlugin;
