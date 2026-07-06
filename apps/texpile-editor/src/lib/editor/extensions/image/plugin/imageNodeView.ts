import { TextSelection } from 'prosemirror-state';
import type { Node } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import imageNotFoundPng from '$lib/assets/compile/image_not_found_placeholder.png';
import { imagePluginClassNames, type ImagePluginSettings } from '../types';
import createResizeControls from './resize/createResizeControls';
import getImageDimensions from './resize/getImageDimensions';
import getMaxWidth from './resize/getMaxWidth';
import calculateImageDimensions from './resize/calculateImageDimensions';

const getSrc = (
	image: HTMLImageElement,
	pluginSettings: ImagePluginSettings,
	node: Node,
	root: Element,
	view: EditorView
): { newSrc: Promise<string>; appliedClass?: string } => {
	if (pluginSettings.downloadImage) {
		let appliedClass;
		if (pluginSettings.downloadPlaceholder) {
			if (pluginSettings.enableResize && node.attrs.width && node.attrs.height) {
				const maxWidth = getMaxWidth(root, pluginSettings);
				const finalDimensions = calculateImageDimensions(
					maxWidth,
					maxWidth,
					node.attrs.width,
					node.attrs.height,
					pluginSettings,
					node.attrs.width,
					node.attrs.height
				);

				image.style.height = `${finalDimensions.height}px`;

				image.style.width = `${finalDimensions.width}px`;
			}
			const placeholder = pluginSettings.downloadPlaceholder(node.attrs.src, view);
			if (typeof placeholder === 'string') {
				image.src = placeholder;
			} else if (typeof placeholder === 'object') {
				if ('src' in placeholder && typeof placeholder.src === 'string') {
					image.src = placeholder.src;
				}
				if ('className' in placeholder && typeof placeholder.className === 'string') {
					appliedClass = placeholder.className;

					image.className = `${image.className} ${appliedClass}`;
				}
			}
		}
		return {
			newSrc: pluginSettings.downloadImage(node.attrs.src),
			appliedClass
		};
	}
	return { newSrc: node.attrs.src };
};

const imageNodeView =
	(pluginSettings: ImagePluginSettings) =>
	(node: Node, view: EditorView, getPos: () => number | undefined): NodeView => {
		let finalSrc: string | undefined;
		let currentNodeSrc: string = node.attrs.src;
		const root = document.createElement('div');
		root.className = imagePluginClassNames.imagePluginRoot;
		const image = document.createElement('img');
		image.className = imagePluginClassNames.imagePluginImg;
		image.contentEditable = 'false';
		let resizeActive = false;
		const setResizeActive = (value: boolean) => {
			resizeActive = value;
		};
		root.appendChild(image);

		// failed loads show the bundled placeholder, re-checked on folder changes so a stale
		// cached image doesn't linger. HEAD avoids re-downloading bytes.
		let notFound = false;
		const showNotFound = () => {
			if (image.src === imageNotFoundPng) return; // already showing the placeholder
			notFound = true;
			image.src = imageNotFoundPng;
			image.classList.add('image-not-found');
			image.title = `File not found: ${node.attrs.src}`;
		};
		image.addEventListener('error', showNotFound);
		const revalidate = async () => {
			if (!finalSrc || /^(data:|blob:)/.test(finalSrc)) return; // placeholders / inline data never go missing
			try {
				const res = await fetch(finalSrc, { method: 'HEAD', cache: 'no-store' });
				if (!res.ok) return showNotFound();
				if (notFound) {
					// file came back: bust the cache and show it again
					notFound = false;
					image.classList.remove('image-not-found');
					image.title = node.attrs.alt ?? '';
					image.src = `${finalSrc}${finalSrc.includes('?') ? '&' : '?'}_=${Date.now()}`;
				}
			} catch {
				showNotFound();
			}
		};
		const onFolderChanged = () => void revalidate();
		window.addEventListener('texpile:fs-changed', onFolderChanged);
		window.addEventListener('focus', onFolderChanged);

		let dimensions: { width: number; height: number; completed: boolean } | undefined;
		Object.keys(node.attrs).map((key) => root.setAttribute(`imageplugin-${key}`, node.attrs[key]));
		const contentDOM = pluginSettings.hasTitle && document.createElement('div');
		if (contentDOM) {
			contentDOM.className = 'imagePluginContent';
			contentDOM.addEventListener('click', (e) => {
				const pos = getPos();
				if (!pos || contentDOM.innerText.length > 1) {
					return;
				}
				e.preventDefault();
				view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos + 1))));
				view.focus();
			});
			contentDOM.className = 'text';
			root.appendChild(contentDOM);
		}

		const overlay = pluginSettings.createOverlay(node, getPos, view);
		if (overlay) {
			root.appendChild(overlay);
			pluginSettings.updateOverlay(overlay, getPos, view, node);
		}

		image.alt = node.attrs.alt;
		let resizeControls: HTMLDivElement | undefined;
		const updateDOM = () => {
			if (resizeActive) {
				return;
			}

			const pos = getPos();
			if (!pos || (pluginSettings.enableResize && !dimensions)) {
				return;
			}

			const updatedNode = view.state.doc.nodeAt(pos);

			if (!updatedNode) {
				return;
			}

			Object.keys(updatedNode.attrs).map((attr) => root.setAttribute(`imageplugin-${attr}`, updatedNode.attrs[attr]));

			if (pluginSettings.enableResize && dimensions) {
				const maxWidth = getMaxWidth(root, pluginSettings);
				const finalDimensions = calculateImageDimensions(
					maxWidth,
					maxWidth,
					dimensions.width,
					dimensions.height,
					pluginSettings,
					updatedNode.attrs.width,
					updatedNode.attrs.height,
					updatedNode.attrs.maxWidth
				);
				image.style.height = `${finalDimensions.height}px`;
				image.style.width = `${finalDimensions.width}px`;
				if (resizeControls) {
					resizeControls.remove();
				}
				resizeControls = createResizeControls(
					finalDimensions.height,
					finalDimensions.width,
					getPos,
					updatedNode,
					view,
					image,
					setResizeActive,
					maxWidth,
					pluginSettings
				);
				root.appendChild(resizeControls);
			}
		};
		let unsubscribeResizeObserver: (() => void) | undefined;
		(async () => {
			const { newSrc, appliedClass } = getSrc(image, pluginSettings, node, root, view);
			finalSrc = await newSrc;
			if (appliedClass) {
				image.className = image.className
					.split(' ')
					.filter((c: string) => c !== appliedClass)
					.join(' ');
			}
			if (pluginSettings.enableResize) {
				dimensions = await getImageDimensions(finalSrc);
			}
			image.src = finalSrc;
			updateDOM();
			const parent = root.parentElement;
			if (!parent || !pluginSettings.enableResize) return;
			unsubscribeResizeObserver = pluginSettings.resizeCallback(parent, updateDOM);
		})();
		return {
			...(contentDOM
				? {
						contentDOM,
						stopEvent: (e: Event) => e.target === contentDOM,
						selectable: true,
						content: 'text*'
					}
				: {}),
			dom: root,
			update: (updateNode: Node) => {
				if (updateNode.type.name !== 'image' || !finalSrc) {
					return false;
				}

				// src changed (e.g. a foreign image was copied), re-resolve the url
				if (updateNode.attrs.src !== currentNodeSrc) {
					currentNodeSrc = updateNode.attrs.src;
					if (pluginSettings.downloadImage) {
						pluginSettings.downloadImage(updateNode.attrs.src).then((newUrl) => {
							finalSrc = newUrl;
							image.src = newUrl;
						});
					}
				}

				if (overlay) pluginSettings.updateOverlay(overlay, getPos, view, updateNode);
				updateDOM();
				return true;
			},
			ignoreMutation: () => true,
			destroy: () => {
				unsubscribeResizeObserver?.();
				window.removeEventListener('texpile:fs-changed', onFolderChanged);
				window.removeEventListener('focus', onFolderChanged);
				pluginSettings.deleteSrc(node.attrs.src);
			}
		};
	};

export default imageNodeView;
