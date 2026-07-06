// false under vitest's node environment, so !browser guards keep protecting window/localStorage access in tests
export const browser = typeof window !== 'undefined';
