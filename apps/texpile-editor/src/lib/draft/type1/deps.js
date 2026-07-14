// @ts-nocheck -- vendored (see README.md)
// Minimal shims for the vendored pdf.js modules (see README.md in this dir).
export function warn(msg) {
	console.warn('t1: ' + msg);
}

export function isWhiteSpace(ch) {
	return ch === 0x20 || ch === 0x09 || ch === 0x0d || ch === 0x0a;
}

export function unreachable(msg) {
	throw new Error(msg);
}

export function shadow(obj, prop, value, nonSerializable = false) {
	Object.defineProperty(obj, prop, {
		value,
		enumerable: !nonSerializable,
		configurable: true,
		writable: false
	});
	return value;
}

export function stringToBytes(str) {
	const bytes = new Uint8Array(str.length);
	for (let i = 0; i < str.length; ++i) bytes[i] = str.charCodeAt(i) & 0xff;
	return bytes;
}

export function bytesToString(bytes) {
	const CHUNK = 8192;
	if (bytes.length < CHUNK) return String.fromCharCode.apply(null, bytes);
	const buf = [];
	for (let i = 0; i < bytes.length; i += CHUNK) buf.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)));
	return buf.join('');
}

export function getLookupTableFactory(initializer) {
	let lookup;
	return function () {
		if (initializer) {
			lookup = Object.create(null);
			initializer(lookup);
			initializer = null;
		}
		return lookup;
	};
}
