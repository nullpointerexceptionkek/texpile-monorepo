import { PluginKey } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Schema } from 'prosemirror-model';
import { generateLabel } from '$lib/editor/utils/label';
import { trackFeatureUsed } from '$lib/plausible';
import type { ImagePluginSettings, ImagePluginState, InsertImagePlaceholder, RemoveImagePlaceholder } from './types';

export const dataURIToFile = (dataURI: string, name: string) => {
	const arr = dataURI.split(',');
	const mime = arr[0]?.match(/:(.*?);/)?.[1];
	const bstr = atob(arr[1]);
	let n = bstr.length;
	const u8arr = new Uint8Array(n);

	while (n--) {
		u8arr[n] = bstr.charCodeAt(n);
	}
	return new File([u8arr], name, { type: mime });
};

export const imagePluginKey = new PluginKey<ImagePluginState>('imagePlugin');

export type ImageUploadReturn = { url: string; alt?: string };

export const startImageUploadFn = (
	view: EditorView,
	uploadFile: () => Promise<ImageUploadReturn>,
	pos?: number
): Promise<ImageUploadReturn> => {
	// fresh object identity is the upload id
	const id = {};

	const { tr } = view.state;
	const { schema } = view.state;
	const pluginSettings = view.state.plugins.find((p) => p.spec.key === imagePluginKey)!.spec.settings as ImagePluginSettings;

	if (!tr.selection.empty && !pos) tr.deleteSelection();
	const imageMeta: InsertImagePlaceholder = {
		type: 'add',
		pos: pos || tr.selection.from,
		id
	};
	tr.setMeta(imagePluginKey, imageMeta);
	view.dispatch(tr);

	return uploadFile()
		.then((data) => {
			const { url, alt } = data;
			const placholderPos = pluginSettings.findPlaceholder(view.state, id);
			// placeholder was deleted, drop the image
			if (placholderPos == null) return data;
			const removeMeta: RemoveImagePlaceholder = { type: 'remove', id };

			const label = generateLabel('figure');

			view.dispatch(
				view.state.tr
					.insert(
						placholderPos,
						schema.nodes.image.create(
							{ src: url, alt, label },
							pluginSettings.hasTitle ? schema.text(pluginSettings.defaultTitle) : undefined
						)
					)
					.setMeta(imagePluginKey, removeMeta)
			);
			return data;
		})
		.catch((reason) => {
			const removeMeta: RemoveImagePlaceholder = { type: 'remove', id };
			view.dispatch(tr.setMeta(imagePluginKey, removeMeta));
			throw reason;
		});
};

export const startImageUpload = (
	view: EditorView,
	file: File,
	alt: string,
	pluginSettings: ImagePluginSettings,
	schema: Schema,
	pos?: number
) => {
	trackFeatureUsed('figure');
	// fresh object identity is the upload id
	const id = {};

	const { tr } = view.state;
	if (!tr.selection.empty && !pos) tr.deleteSelection();
	const imageMeta: InsertImagePlaceholder = {
		type: 'add',
		pos: pos || tr.selection.from,
		id
	};
	tr.setMeta(imagePluginKey, imageMeta);
	view.dispatch(tr);

	pluginSettings.uploadFile(file).then(
		(url) => {
			const placholderPos = pluginSettings.findPlaceholder(view.state, id);
			// placeholder was deleted, drop the image
			if (placholderPos == null) return;
			const removeMeta: RemoveImagePlaceholder = { type: 'remove', id };

			const label = generateLabel('figure');

			view.dispatch(
				view.state.tr
					.insert(
						placholderPos,
						schema.nodes.image.create(
							{ src: url, alt, label },
							pluginSettings.hasTitle ? schema.text(pluginSettings.defaultTitle) : undefined
						)
					)
					.setMeta(imagePluginKey, removeMeta)
			);
		},
		() => {
			const removeMeta: RemoveImagePlaceholder = { type: 'remove', id };
			view.dispatch(tr.setMeta(imagePluginKey, removeMeta));
		}
	);
};

export const clamp = (min: number, value: number, max: number) => Math.max(Math.min(max, value), min);

export const fetchImageAsBase64 = async (url: string) => {
	if (url.startsWith('data:image')) {
		return url;
	}
	return fetch(url)
		.then((response) => response.blob())
		.then(
			(blob) =>
				new Promise<string>((resolve, reject) => {
					const reader = new FileReader();
					reader.onloadend = () => resolve(reader.result as string);
					reader.onerror = reject;
					reader.readAsDataURL(blob);
				})
		);
};

export interface Store {
	get: (key: string) => string | undefined;
	set: (key: string, value: string) => void;
}

export const localStorageCache = (keyPrefix: string): Store => {
	const get = (key: string) => {
		const value = localStorage.getItem(`${keyPrefix}${key}`);
		if (value) {
			return value;
		}
		return undefined;
	};
	const set = (key: string, value: string) => {
		localStorage.setItem(`${keyPrefix}${key}`, value);
	};
	return { get, set };
};

export const imageCache =
	(cache: Store, shortStore: Map<string, Promise<string>> = new Map()) =>
	(downloadImage: (url: string) => Promise<string>) =>
	async (url: string) => {
		if (!url) {
			return url;
		}
		if (url.startsWith('data:image')) {
			return url;
		}

		const cached = cache.get(url);
		if (cached) {
			return cached;
		}
		if (shortStore.has(url)) {
			return shortStore.get(url)!;
		}
		const resultPromise = downloadImage(url);
		shortStore.set(url, resultPromise);
		const result = await resultPromise;
		cache.set(url, result);
		shortStore.delete(url);
		return result;
	};
