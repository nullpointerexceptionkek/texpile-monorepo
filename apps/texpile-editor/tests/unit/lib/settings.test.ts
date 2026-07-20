import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// force the browser branch and stub the Electron native bridge
vi.mock('$lib/runtime', () => ({ browser: true }));

describe('settings hydration (auto-reopen depends on this)', () => {
	beforeEach(() => {
		vi.resetModules();
	});
	afterEach(() => {
		delete (globalThis as { window?: unknown }).window;
	});

	it('getSettings() waits for the async native read instead of returning defaults early', async () => {
		// the native read resolves on a later tick, the exact case the old boolean flag mishandled
		(globalThis as { window?: unknown }).window = {
			texpileNative: {
				getSettings: () => new Promise((r) => setTimeout(() => r({ lastFolder: '/saved/project', reopenLastFolder: true }), 15)),
				setSettings: () => Promise.resolve()
			}
		};
		const { getSettings } = await import('../../../src/lib/settings');
		const s = await getSettings();
		expect(s.lastFolder).toBe('/saved/project'); // regression guard for the reopen-last-folder bug
		expect(s.reopenLastFolder).toBe(true);
	});

	it('memoizes the load: concurrent callers share one native read and all see the value', async () => {
		let calls = 0;
		(globalThis as { window?: unknown }).window = {
			texpileNative: {
				getSettings: () => {
					calls++;
					return Promise.resolve({ lastFolder: '/x' });
				},
				setSettings: () => Promise.resolve()
			}
		};
		const { loadSettings } = await import('../../../src/lib/settings');
		const [a, b] = await Promise.all([loadSettings(), loadSettings()]);
		expect(a.lastFolder).toBe('/x');
		expect(b.lastFolder).toBe('/x');
		expect(calls).toBe(1); // one read, shared (the eager module-load hydrate)
	});

	it('applies a persisted uiLocale to the Paraglide runtime, not just the settings store', async () => {
		(globalThis as { window?: unknown }).window = {
			texpileNative: {
				getSettings: () => Promise.resolve({ uiLocale: 'zh-Hans' }),
				setSettings: () => Promise.resolve()
			}
		};
		const { loadSettings } = await import('../../../src/lib/settings');
		const { getLocale } = await import('../../../src/lib/paraglide/runtime');
		const s = await loadSettings();
		expect(s.uiLocale).toBe('zh-Hans');
		expect(getLocale()).toBe('zh-Hans'); // regression guard: the two must not drift apart
	});

	it('defaults uiLocale to en when nothing is persisted', async () => {
		(globalThis as { window?: unknown }).window = {
			texpileNative: { getSettings: () => Promise.resolve({}), setSettings: () => Promise.resolve() }
		};
		const { loadSettings } = await import('../../../src/lib/settings');
		const s = await loadSettings();
		expect(s.uiLocale).toBe('en');
	});

	it('persists only the changed fields, not the whole settings object', async () => {
		// two windows share settings.json; a whole-object write would clobber the other
		// window's fields with this window's stale copies (the multi-window regression)
		const writes: Record<string, unknown>[] = [];
		(globalThis as { window?: unknown }).window = {
			texpileNative: {
				getSettings: () => Promise.resolve({ sidebarWidth: 999 }),
				setSettings: (p: Record<string, unknown>) => {
					writes.push(p);
					return Promise.resolve({});
				}
			}
		};
		const { loadSettings, updateSettings } = await import('../../../src/lib/settings');
		await loadSettings();
		updateSettings({ terminalHeight: 300 });
		expect(writes.at(-1)).toEqual({ terminalHeight: 300 });
	});
});
