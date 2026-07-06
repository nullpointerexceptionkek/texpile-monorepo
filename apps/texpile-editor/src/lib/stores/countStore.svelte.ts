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
