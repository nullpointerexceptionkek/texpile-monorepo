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
});
