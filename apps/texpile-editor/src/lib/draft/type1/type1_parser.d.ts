export const Type1Parser: new (
	stream: unknown,
	encrypted: boolean,
	seacAnalysisEnabled: boolean
) => {
	extractFontHeader(properties: object): void;
	extractFontProgram(properties: object): { charstrings: unknown[]; subrs: unknown[] };
};
