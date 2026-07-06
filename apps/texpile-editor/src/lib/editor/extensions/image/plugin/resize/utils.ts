import { resizeDirection } from '../../types';

const setHeight = (element: HTMLElement, width: number, height: number) => {
	element.style.height = `${height}px`;
};
const setWidth = (element: HTMLElement, width: number) => {
	element.style.width = `${width}px`;
};
export const setSize = (element: HTMLElement, width: number, height: number) => {
	element.style.height = `${height}px`;

	element.style.width = `${width}px`;
};
export const resizeFunctions: {
	[direction in resizeDirection]: (element: HTMLElement, width: number, height: number) => void;
} = {
	[resizeDirection.left]: setWidth,
	[resizeDirection.topLeft]: setSize,
	[resizeDirection.top]: setHeight,
	[resizeDirection.topRight]: setSize,
	[resizeDirection.right]: setWidth,
	[resizeDirection.bottomRight]: setSize,
	[resizeDirection.bottom]: setHeight,
	[resizeDirection.bottomLeft]: setSize
};
