import type { EditorView } from 'prosemirror-view';
import type { ImagePluginSettings } from '../types';
import { startImageUpload } from '../imagepluginutils';

export default (pluginSettings: ImagePluginSettings) => (view: EditorView, event: ClipboardEvent) => {
	const clipboardItems = event?.clipboardData?.items;
	if (!clipboardItems) return false;
	const items = Array.from(clipboardItems).filter((item) => {
		return item.type.indexOf('image') !== -1;
	});
	if (items.length === 0) {
		return false;
	}

	const item = items[0];
	const file = item.getAsFile();
	if (!file) {
		return false;
	}
	if (event?.clipboardData?.types.includes('text/rtf')) {
		// rtf paste carries an image item, don't convert it to an image
		return false;
	}
	startImageUpload(view, file, pluginSettings.defaultAlt, pluginSettings, view.state.schema);
	event.preventDefault();
	return true;
};
