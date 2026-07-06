import { writable, derived } from 'svelte/store';

export type AccessLevel = 'owner' | 'editor' | 'viewer' | null;

// offline this stays null (never a viewer); kept so isReadOnly has a stable backing store
const userAccessLevel = writable<AccessLevel>(null);

export const isReadOnly = derived(userAccessLevel, ($level) => $level === 'viewer');
