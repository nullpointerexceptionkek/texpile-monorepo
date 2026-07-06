import { createDefaultSettings } from './imageplugin.svelte';
import imagePlugin from './plugin/index';

import type { ImagePluginSettings, RemoveImagePlaceholder, InsertImagePlaceholder, ImagePluginAction, ImagePluginState } from './types';

import updateImageNode from './updateImageNode';
import {
	startImageUpload,
	startImageUploadFn,
	imagePluginKey,
	type ImageUploadReturn,
	fetchImageAsBase64,
	type Store,
	localStorageCache,
	imageCache
} from './imagepluginutils';

export {
	updateImageNode,
	type ImagePluginSettings,
	type RemoveImagePlaceholder,
	type InsertImagePlaceholder,
	type ImagePluginAction,
	type ImagePluginState,
	imagePlugin,
	startImageUpload,
	startImageUploadFn,
	type ImageUploadReturn,
	createDefaultSettings,
	imagePluginKey,
	fetchImageAsBase64,
	type Store,
	localStorageCache,
	imageCache
};
