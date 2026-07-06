import { createTexpileSuggest } from './texpile-suggest';
import { suggestReference, keymapPlugin as referenceKeymapPlugin } from '../reference/referenceManagerPlugin';

export function createSuggestPlugin() {
	// custom suggest plugin, fixed for inline atom nodes
	const referenceSuggestPlugin = createTexpileSuggest(suggestReference);

	return [referenceSuggestPlugin, referenceKeymapPlugin];
}
