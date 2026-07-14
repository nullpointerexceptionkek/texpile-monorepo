export interface DocumentCount {
	words: number;
	characters: number;
	charactersWithSpaces: number;
	// null when the selection is collapsed
	selectionWords: number | null;
	selectionCharacters: number | null;
	selectionCharactersWithSpaces: number | null;
}

export const documentCountStore = $state<DocumentCount>({
	words: 0,
	characters: 0,
	charactersWithSpaces: 0,
	selectionWords: null,
	selectionCharacters: null,
	selectionCharactersWithSpaces: null
});

function wordsOf(text: string): number {
	const t = text.trim();
	return t ? t.split(/\s+/).filter(Boolean).length : 0;
}

// Feed the store from raw editor text (source mode). Unlike the visual editor's plugin, which
// counts rendered prose, this counts the buffer verbatim -- LaTeX markup included -- because
// that is what the source view shows. Selection null/empty clears the selection counts.
export function setSourceDocCount(text: string): void {
	documentCountStore.words = wordsOf(text);
	documentCountStore.charactersWithSpaces = text.length;
	documentCountStore.characters = text.replace(/\s/g, '').length;
}

export function setSourceSelectionCount(selText: string | null): void {
	if (selText && selText.length) {
		documentCountStore.selectionWords = wordsOf(selText);
		documentCountStore.selectionCharactersWithSpaces = selText.length;
		documentCountStore.selectionCharacters = selText.replace(/\s/g, '').length;
	} else {
		documentCountStore.selectionWords = null;
		documentCountStore.selectionCharacters = null;
		documentCountStore.selectionCharactersWithSpaces = null;
	}
}
