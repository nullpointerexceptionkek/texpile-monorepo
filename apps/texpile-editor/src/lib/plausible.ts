// analytics removed in the desktop build; no-op stubs keep call sites compiling, nothing leaves the machine.

export function trackEvent(_eventName: string, _props?: Record<string, string | number | boolean>) {}

export function setReferralSource(_source: string) {}

export type EditorFeature = 'equation' | 'figure' | 'citation' | 'table' | 'code_block' | 'raw_latex';
export function trackFeatureUsed(_feature: EditorFeature) {}
