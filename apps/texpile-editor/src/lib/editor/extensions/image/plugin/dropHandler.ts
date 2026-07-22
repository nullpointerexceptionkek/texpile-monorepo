import type { EditorView } from 'prosemirror-view';
import type { ImagePluginSettings } from '../types';
import { dataURIToFile, startImageUpload } from '../imagepluginutils';

export default (pluginSettings: ImagePluginSettings) => (view: EditorView, event: DragEvent) => {
	const textData = event?.dataTransfer?.getData('text/html');
	const file = event?.dataTransfer?.files?.[0];
	const posData = view.posAtCoords({
		top: event.clientY,
		left: event.clientX
	});
	if (textData && posData) {
		// parse inert: assigning innerHTML (even on a detached node) still loads <img src> and fires
		// onerror/onload; DOMParser builds the tree without executing or fetching anything
		const parsed = new DOMParser().parseFromString(textData, 'text/html');
		const firstChild = parsed.body.children[0];
		if (
			// drag originated in ProseMirror, let PM handle it
			!(firstChild instanceof HTMLImageElement) ||
			firstChild.dataset.pmSlice
		) {
			return false;
		}
		if (parsed.body.children.length === 1 && firstChild instanceof HTMLImageElement) {
			const fileFromHTML = dataURIToFile(firstChild.src, encodeURIComponent(firstChild.alt || 'dragged image'));
			startImageUpload(view, fileFromHTML, pluginSettings.defaultAlt, pluginSettings, view.state.schema, posData.pos);
		}
		event.preventDefault();
		event.stopPropagation();
		return true;
	}
	if (file && posData) {
		startImageUpload(view, file, pluginSettings.defaultAlt, pluginSettings, view.state.schema, posData.pos);
		event.preventDefault();
		event.stopPropagation();
		return true;
	}
	return false;
};
