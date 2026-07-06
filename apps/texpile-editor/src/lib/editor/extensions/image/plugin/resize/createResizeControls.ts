import type { Node } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';
import { imagePluginClassNames, type ImagePluginSettings, resizeDirection } from '../../types';
import { resizeFunctions, setSize } from './utils';
import { clamp } from '../../imagepluginutils';
import { get } from 'svelte/store';
import { settings } from '$lib/settings';

const createMouseDownHandler =
	(
		direction: resizeDirection,
		wrapper: HTMLDivElement,
		resizeControl: HTMLSpanElement,
		getPos: () => number | undefined,
		node: Node,
		view: EditorView,
		image: HTMLImageElement,
		setResizeActive: (value: boolean) => void,
		maxWidth: number,
		pluginSettings: ImagePluginSettings
	) =>
	(event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		setResizeActive(true);
		wrapper.classList.add(direction);
		wrapper.classList.add('active');
		const originX = event.clientX;
		const originY = event.clientY;
		// if the wrapper collapsed (image-not-found before calculateImageDimensions ran),
		// fall back to minSize so the drag math doesn't NaN out
		const initialWidth = wrapper.clientWidth || pluginSettings.minSize;
		const initialHeight = wrapper.clientHeight || pluginSettings.minSize;
		const aspectRatio = initialWidth / initialHeight || 1;
		const mouseMoveListener = (ev: MouseEvent) => {
			ev.preventDefault();
			ev.stopPropagation();
			const updateImageSize = () => {
				// images are always centered, so corner/side drags double the delta to keep
				// both edges tracking the cursor
				const doubleScale = direction !== resizeDirection.top && direction !== resizeDirection.bottom;
				const dx = (originX - ev.clientX) * (/left/i.test(direction) ? 1 : -1) * (doubleScale ? 2 : 1);
				const dy = (originY - ev.clientY) * (/top/i.test(direction) ? 1 : -1) * (doubleScale ? 2 : 1);
				let widthUpdate = clamp(pluginSettings.minSize, Math.round(initialWidth + dx), maxWidth);
				let heightUpdate = clamp(pluginSettings.minSize, Math.round(initialHeight + dy), pluginSettings.maxSize);
				const resizeFunction = resizeFunctions[direction];
				if (resizeFunction === setSize) {
					heightUpdate = Math.max(widthUpdate / aspectRatio, pluginSettings.minSize);
					widthUpdate = heightUpdate * aspectRatio;
				}
				// snap during the drag so the image jumps between step sizes,
				// not free-move then snap on release
				const step = get(settings).figureResizeStep || 0.25;
				const frac = Math.min(1, Math.max(step, widthUpdate / maxWidth));
				const snappedFrac = Math.min(1, Math.max(step, Math.round(frac / step) * step));
				widthUpdate = Math.round(snappedFrac * maxWidth);
				if (resizeFunction === setSize) heightUpdate = Math.round(widthUpdate / aspectRatio);
				const parent = wrapper.parentElement;
				if (!parent) return;
				resizeFunction(image, widthUpdate, heightUpdate);
				resizeFunction(parent, widthUpdate, heightUpdate);
				resizeFunction(wrapper, widthUpdate, heightUpdate);
			};
			requestAnimationFrame(updateImageSize);
		};
		document.addEventListener('mousemove', mouseMoveListener);
		document.addEventListener(
			'mouseup',
			(ev) => {
				ev.preventDefault();
				ev.stopPropagation();
				setResizeActive(false);
				document.removeEventListener('mousemove', mouseMoveListener);
				wrapper.classList.remove(direction);
				wrapper.classList.remove('active');
				if (typeof getPos !== 'function') return;
				const pos = getPos();
				if (!pos) return;
				const currentNode = view.state.doc.nodeAt(pos);
				if (currentNode?.type.name !== 'image') {
					return;
				}
				// snap to clean multiples of \textwidth so the serialized figure gets a round
				// width=0.5\textwidth, not width=0.873...
				const step = get(settings).figureResizeStep || 0.25;
				const rawFrac = Math.min(1, Math.max(step, wrapper.clientWidth / maxWidth));
				const snappedFrac = Math.min(1, Math.max(step, Math.round(rawFrac / step) * step));
				const snappedWidth = Math.round(snappedFrac * maxWidth);
				const factor = wrapper.clientWidth > 0 ? snappedWidth / wrapper.clientWidth : 1;
				const attrs = {
					...currentNode.attrs,
					width: snappedWidth,
					height: Math.round(wrapper.clientHeight * factor),
					maxWidth
				};
				const tr = view.state.tr.setNodeMarkup(pos, undefined, attrs);
				view.dispatch(tr);
			},
			{ once: true }
		);
	};

const createResizeControl = (
	wrapper: HTMLDivElement,
	direction: resizeDirection,
	getPos: () => number | undefined,
	node: Node,
	view: EditorView,
	image: HTMLImageElement,
	setResizeActive: (value: boolean) => void,
	maxWidth: number,
	pluginSettings: ImagePluginSettings
) => {
	const resizeControl = document.createElement('span');
	resizeControl.className = `${imagePluginClassNames.imageResizeBoxControl} ${direction}`;
	resizeControl.addEventListener(
		'mousedown',
		createMouseDownHandler(direction, wrapper, resizeControl, getPos, node, view, image, setResizeActive, maxWidth, pluginSettings)
	);
	wrapper.appendChild(resizeControl);
};

export default (
	height: number,
	width: number,
	getPos: () => number | undefined,
	node: Node,
	view: EditorView,
	image: HTMLImageElement,
	setResizeActive: (value: boolean) => void,
	maxWidth: number,
	pluginSettings: ImagePluginSettings
) => {
	const controlsWrapper = document.createElement('div');
	controlsWrapper.className = imagePluginClassNames.imageResizeBoxWrapper;
	const centeredWrapper = document.createElement('div');
	controlsWrapper.appendChild(centeredWrapper);
	centeredWrapper.className = imagePluginClassNames.imageResizeBoxCenter;
	centeredWrapper.style.height = `${height}px`;
	centeredWrapper.style.width = `${width}px`;
	const controlsRoot = document.createElement('div');
	centeredWrapper.appendChild(controlsRoot);
	controlsRoot.className = imagePluginClassNames.imageResizeBox;
	controlsRoot.style.height = `${height}px`;
	controlsRoot.style.width = `${width}px`;
	(Object.keys(resizeDirection) as Array<keyof typeof resizeDirection>).map((direction) =>
		createResizeControl(controlsRoot, resizeDirection[direction], getPos, node, view, image, setResizeActive, maxWidth, pluginSettings)
	);
	return controlsWrapper;
};
