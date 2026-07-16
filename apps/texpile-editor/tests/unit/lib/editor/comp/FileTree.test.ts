// @vitest-environment jsdom
// The inline name input is driven by focus, and focus bugs are invisible to the node-environment
// tests the rest of the suite uses. These cover the two ways the naming step used to break.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FileTree from '../../../../../src/lib/editor/comp/FileTree.svelte';
import type { TreeEntry } from '../../../../../src/lib/workspace/fileSystem';

const ROOT = '/ws';
const tree: TreeEntry[] = [
	{ name: 'main.tex', path: '/ws/main.tex', type: 'file' },
	{ name: 'chapters', path: '/ws/chapters', type: 'dir', children: [] }
];

let host: HTMLDivElement;
let app: Record<string, unknown> | null = null;
let onCreate: ReturnType<typeof vi.fn>;

const nameInput = () => host.querySelector<HTMLInputElement>('input.input');
const byText = (text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
const newAtRoot = (name: string) => {
	(app as unknown as { newAtRoot: (t: string, n: string) => void }).newAtRoot('file', name);
	flushSync();
};

/** the real user gesture: right-click empty tree space, then click "New File". */
function rightClickNewFile() {
	host.querySelector('div')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
	flushSync();
	byText('New File')!.click();
	flushSync();
}

function type(input: HTMLInputElement, value: string) {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

beforeEach(() => {
	host = document.createElement('div');
	document.body.appendChild(host);
	onCreate = vi.fn();
	app = mount(FileTree, {
		target: host,
		props: {
			tree,
			rootPath: ROOT,
			activePath: null,
			onOpen: vi.fn(),
			onCreate,
			onRename: vi.fn(),
			onDelete: vi.fn(),
			onMove: vi.fn()
		}
	});
	flushSync();
});
afterEach(() => {
	if (app) void unmount(app);
	host.remove();
});

describe('FileTree inline create', () => {
	it('creates the file under the name the user typed', () => {
		rightClickNewFile();
		const input = nameInput()!;
		expect(document.activeElement).toBe(input);
		type(input, 'intro.tex');
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();
		expect(onCreate).toHaveBeenCalledWith(ROOT, 'intro.tex', 'file');
	});

	// blur is not consent: a closing menu refocusing its trigger used to commit the pre-filled
	// name, handing you an untitled.tex you never agreed to and now have to rename.
	it('does not commit a pre-filled name the user never accepted, and keeps the field open', () => {
		newAtRoot('untitled.tex');
		nameInput()!.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
		flushSync();
		expect(onCreate).not.toHaveBeenCalled();
		expect(nameInput()).toBeTruthy();
	});

	// mirrors @zag-js/menu's focusTrigger: on close it does queueMicrotask(() => trigger.focus()),
	// landing right after our input mounts and stealing the field before you can type.
	it('takes focus back when a closing menu refocuses its trigger', async () => {
		const trigger = document.createElement('button');
		document.body.appendChild(trigger);
		newAtRoot('untitled.tex');
		queueMicrotask(() => trigger.focus());
		await new Promise((resolve) => requestAnimationFrame(resolve));
		expect(document.activeElement).toBe(nameInput());
		trigger.remove();
	});
});
