import type { ImagePluginSettings } from '../../types';

export default (
	maxWidth: number,
	containerWidth: number,
	sourceWidth: number,
	sourceHeight: number,
	pluginSettings: ImagePluginSettings,
	nodeWidth?: number,
	nodeHeight?: number,
	nodeMaxWidth?: number
): { width: number; height: number } => {
	const aspectRatio = sourceWidth && sourceHeight ? sourceWidth / sourceHeight : 1;
	const scale = pluginSettings.scaleImage && nodeMaxWidth ? maxWidth / nodeMaxWidth : null;
	let width = scale && nodeWidth ? nodeWidth * scale : nodeWidth;
	let height = scale && nodeHeight ? nodeHeight * scale : nodeHeight;
	if (width && !height) {
		height = width / aspectRatio;
	} else if (height && !width) {
		width = height * aspectRatio;
	} else if (!width && !height) {
		// image-not-found: naturalWidth/Height are 0, which would collapse the wrapper
		// and NaN the resize handles
		if (sourceWidth && sourceHeight) {
			width = sourceWidth;
			height = sourceHeight;
		} else {
			width = Math.round(containerWidth * 0.5);
			height = Math.round(width / aspectRatio);
		}
	}
	if (width && width > containerWidth) {
		width = containerWidth;
		height = width / aspectRatio;
	}
	if (!width || !height) return { height: pluginSettings.minSize, width: pluginSettings.minSize };
	return {
		width,
		height
	};
};
