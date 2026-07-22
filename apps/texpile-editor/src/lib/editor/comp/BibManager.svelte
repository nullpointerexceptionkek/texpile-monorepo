<!-- visual .bib editor: reference list + add/edit form. value is the raw .bib text;
  every change re-serialises and flows back through onInput -->
<script lang="ts">
	import { Pencil, Trash2, ChevronDown, Code } from '@lucide/svelte';
	import { generateLabel } from '$lib/editor/utils/label';
	import {
		type BibLaTeXReference,
		type BibToken,
		biblatexReferenceSchema,
		parseBibTeXWithWarnings,
		parseSingleEntry,
		serializeBibTeX,
		fitsVisualEditor,
		getFieldsForType,
		getEntryTypeOptions,
		isKeyUnique as checkKeyUnique
	} from '$lib/biblatex';
	import type { ZodIssue } from 'zod';
	import { referenceStore } from '$lib/stores/editorStore';
	import CodeMirrorLatex from '$lib/components/CodeMirrorLatex.svelte';
	import { m } from '$lib/paraglide/messages';

	let { value = '', onInput }: { value?: string; onInput?: (v: string) => void } = $props();

	// refs = entries, tokens = file-order stream for round-trip, parseError switches to whole-file raw mode
	let refs = $state<BibLaTeXReference[]>([]);
	let tokens = $state<BibToken[]>([]);
	let parseError = $state<string | null>(null);
	// initial value by design; the $effect below re-parses on later external changes
	// svelte-ignore state_referenced_locally
	let lastSerialized = $state(value);

	function reparse(text: string) {
		const result = parseBibTeXWithWarnings(text);
		refs = result.entries;
		tokens = result.tokens;
		parseError = result.parseError ?? null;
	}
	// svelte-ignore state_referenced_locally
	reparse(value);

	// re-parse external changes, unless it's text we just produced ourselves
	$effect(() => {
		const v = value;
		if (v !== lastSerialized) {
			reparse(v);
			lastSerialized = v;
		}
	});

	let currentReference: Partial<BibLaTeXReference> = $state({});
	let isEditing = $state(false);
	let editMode = $state<'form' | 'raw'>('form');
	let originalKey: string | null = $state(null);
	let formErrors: Record<string, string[]> = $state({});
	let showAdvanced = $state(false);
	let bibTeXContent = $state('');
	let bibTeXWarnings = $state<{ key: string; issues: string[] }[]>([]);
	let rawEntryText = $state('');
	let rawEntryError = $state<string | null>(null);
	let fileRawText = $state('');
	let fileRawError = $state<string | null>(null);

	// sync the whole-file CM buffer when entering file-raw mode
	$effect(() => {
		if (parseError) fileRawText = value;
	});

	const entryTypeOptions = getEntryTypeOptions();
	const currentFields = $derived(currentReference.entrytype ? getFieldsForType(currentReference.entrytype) : []);
	const regularFields = $derived(currentFields.filter((f) => f.name !== 'key'));
	const keyField = $derived(currentFields.find((f) => f.name === 'key'));

	const generateCitationKey = () => generateLabel('citation');
	const isKeyUnique = (k: string) => checkKeyUnique(k, refs, originalKey ?? undefined);

	$effect(() => {
		if (!isEditing && !currentReference.key && currentReference.entrytype) currentReference.key = generateCitationKey();
	});

	// reserialise via the token stream (preserves comments, @String, order); new refs without
	// a token get a synthetic one appended so the serializer emits them
	function commit() {
		const knownKeys = new Set<string>();
		for (const t of tokens) if (t.kind === 'entry') knownKeys.add(t.entry.citationKey);
		const appended: BibToken[] = [];
		for (const ref of refs) {
			if (!knownKeys.has(ref.key)) {
				appended.push({
					kind: 'entry',
					entry: { citationKey: ref.key, entryType: ref.entrytype, entryTags: {} },
					raw: '',
					hasInlineComment: false
				});
			}
		}
		if (appended.length) tokens = [...tokens, ...appended];

		const refsByKey = new Map(refs.map((r) => [r.key, r]));
		const text = serializeBibTeX(tokens, refsByKey);
		lastSerialized = text;
		referenceStore.set([...refs]);
		onInput?.(text);
	}

	function mapIssues(issues: ZodIssue[]) {
		const out: Record<string, string[]> = {};
		for (const i of issues) {
			const msg =
				i.code === 'invalid_type'
					? m.bib_error_required_field()
					: String(i.message)
							.replace(/received.+/i, '')
							.trim();
			(out[(i.path[0] as string) || 'form'] ||= []).push(msg);
		}
		return out;
	}

	function resetForm() {
		currentReference = {};
		isEditing = false;
		editMode = 'form';
		formErrors = {};
		originalKey = null;
		showAdvanced = false;
		rawEntryText = '';
		rawEntryError = null;
	}

	// entries the form can render losslessly get the pretty form; anything with unknown
	// fields/types or an in-entry comment gets raw CM so nothing is silently lost
	function editReference(r: BibLaTeXReference) {
		originalKey = r.key;
		isEditing = true;
		formErrors = {};
		showAdvanced = false;
		rawEntryError = null;

		if (fitsVisualEditor(r)) {
			editMode = 'form';
			// strip internal bookkeeping fields so they don't land in the form inputs
			const ref: BibLaTeXReference = { ...r };
			delete ref.raw;
			delete ref.displayLabel;
			delete ref.hasInlineComment;
			currentReference = ref;
		} else {
			editMode = 'raw';
			// prefer original source bytes (comments/spacing survive); regenerate for brand-new entries
			rawEntryText = r.raw ?? renderReferenceAsBibText(r);
			currentReference = { key: r.key, entrytype: r.entrytype };
		}
	}

	function saveReference() {
		formErrors = {};
		const parsed = biblatexReferenceSchema.safeParse(currentReference);
		if (!parsed.success) {
			formErrors = mapIssues(parsed.error.issues);
			return;
		}
		const data = parsed.data as BibLaTeXReference;
		if (!isKeyUnique(data.key)) {
			formErrors.key = [m.bib_error_key_unique()];
			return;
		}
		if (isEditing && originalKey) refs = refs.map((r) => (r.key === originalKey ? data : r));
		else refs = [...refs, data];
		commit();
		resetForm();
	}

	// re-parse the CM text as a single entry; on failure keep the CM open with an inline error
	function saveRawEntry() {
		rawEntryError = null;
		const parsed = parseSingleEntry(rawEntryText);
		if ('error' in parsed) {
			rawEntryError = parsed.error;
			return;
		}
		if (parsed.entry.key !== originalKey && !isKeyUnique(parsed.entry.key)) {
			rawEntryError = m.bib_error_key_unique();
			return;
		}
		if (isEditing && originalKey) refs = refs.map((r) => (r.key === originalKey ? parsed.entry : r));
		else refs = [...refs, parsed.entry];
		commit();
		resetForm();
	}

	// whole .bib failed to parse; on a clean re-parse drop back to the normal split-pane UI
	function saveFileRaw() {
		fileRawError = null;
		const result = parseBibTeXWithWarnings(fileRawText);
		if (result.parseError) {
			fileRawError = result.parseError;
			return;
		}
		refs = result.entries;
		tokens = result.tokens;
		parseError = null;
		lastSerialized = fileRawText;
		referenceStore.set([...refs]);
		onInput?.(fileRawText);
	}

	function renderReferenceAsBibText(ref: BibLaTeXReference): string {
		// fallback when ref.raw is missing (brand-new entry); skips internal bookkeeping fields
		const internal = new Set(['key', 'entrytype', 'raw', 'displayLabel', 'hasInlineComment']);
		const lines: string[] = [`@${ref.entrytype}{${ref.key},`];
		for (const [k, v] of Object.entries(ref)) {
			if (internal.has(k) || v === undefined || v === '') continue;
			lines.push(`    ${k} = {${v}},`);
		}
		lines.push('}');
		return lines.join('\n');
	}

	function deleteReference(key: string) {
		refs = refs.filter((r) => r.key !== key);
		commit();
		if (currentReference.key === key) resetForm();
	}

	function importBibTeX() {
		bibTeXWarnings = [];
		if (!bibTeXContent.trim()) return;
		const result = parseBibTeXWithWarnings(bibTeXContent);
		if (result.parseError) {
			bibTeXWarnings = [{ key: m.bib_parse_error_label(), issues: [result.parseError] }];
			return;
		}
		if (result.warnings.length) bibTeXWarnings = result.warnings;
		const fresh = result.entries.filter((r) => isKeyUnique(r.key));
		if (fresh.length) {
			refs = [...refs, ...fresh];
			commit();
			bibTeXContent = '';
		}
	}
</script>

{#if parseError}
	<!-- file-level parse failure: edit the whole .bib as raw CM until it parses cleanly -->
	<div class="mx-auto flex h-full max-w-5xl flex-col gap-3 p-4">
		<div class="border-error-500 bg-error-500/10 rounded border p-3 text-sm">
			<div class="mb-1 flex items-center gap-2 font-semibold">
				<Code class="size-4" />
				{m.bib_parse_syntax_error_title()}
			</div>
			<div class="text-error-600-400 text-xs">{parseError}</div>
			<div class="text-surface-600-400 mt-2 text-xs">
				{m.bib_parse_syntax_error_hint()}
			</div>
		</div>
		<div class="min-h-0 flex-1 overflow-hidden rounded border border-surface-200-800">
			<CodeMirrorLatex bind:value={fileRawText} language="bibtex" minHeight="100%" />
		</div>
		{#if fileRawError}
			<p class="text-error-500 text-sm">{fileRawError}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<button class="btn hover:preset-tonal" type="button" onclick={() => (fileRawText = value)}>{m.bib_reset_button()}</button>
			<button class="btn preset-filled-primary-500" type="button" onclick={saveFileRaw}>{m.bib_save_button()}</button>
		</div>
	</div>
{:else}
	<div class="mx-auto flex h-full max-w-5xl gap-4 p-4">
		<div class="w-1/2 overflow-y-auto pr-2">
			<button class="btn preset-outlined-primary-500 hover:preset-tonal mb-3 w-full" type="button" onclick={resetForm}
				>{m.bib_new_reference_button()}</button
			>
			<ul>
				{#if refs.length === 0}
					<li class="text-surface-500 flex h-40 items-center justify-center rounded border border-dashed text-sm">
						{m.bib_no_references_empty()}
					</li>
				{:else}
					{#each refs as ref (ref.key)}
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_click_events_have_key_events -->
						<li
							class="mb-2 flex cursor-pointer items-center justify-between gap-2 rounded border p-3 transition-colors {ref.key ===
								currentReference.key && isEditing
								? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
								: 'border-surface-200-800 hover:bg-surface-100-900'}"
							onclick={() => editReference(ref)}
						>
							<div class="pointer-events-none min-w-0 flex-1">
								<div class="truncate text-sm font-semibold">{ref.author || m.bib_unknown_author_placeholder()}</div>
								<div class="text-surface-600-400 truncate text-xs">{ref.title || m.bib_untitled_placeholder()}</div>
								<div class="text-surface-500 mt-1 flex items-center gap-2 text-xs">
									<span>{ref.year || m.bib_no_year_placeholder()}</span>
									<span>•</span>
									<code class="text-xs">{ref.key}</code>
									{#if !fitsVisualEditor(ref)}
										<!-- raw badge: this row edits as raw CM -->
										<span
											class="border-surface-300-700 text-surface-500 inline-flex items-center gap-0.5 rounded border px-1 py-px text-[10px]"
											title={m.bib_raw_badge_list_tooltip()}
										>
											<Code class="size-2.5" />
											{m.bib_raw_badge_text()}
										</span>
									{/if}
								</div>
							</div>
							<button
								type="button"
								class="btn-icon btn-icon-sm hover:preset-tonal-error shrink-0"
								onclick={(e) => {
									e.stopPropagation();
									deleteReference(ref.key);
								}}
								title={m.bib_delete_tooltip()}
							>
								<Trash2 class="size-4" />
							</button>
						</li>
					{/each}
				{/if}
			</ul>
		</div>

		<div class="border-surface-200-800 w-1/2 overflow-y-auto border-l pl-4">
			<div class="mb-2 flex items-center gap-2 text-base font-semibold">
				{#if isEditing}
					<Pencil class="size-4" />
					{m.bib_editing_heading({ key: currentReference.key ?? '' })}
					{#if editMode === 'raw'}
						<span
							class="border-surface-300-700 text-surface-500 ml-1 inline-flex items-center gap-0.5 rounded border px-1 py-px text-[10px]"
							title={m.bib_raw_badge_edit_tooltip()}
						>
							<Code class="size-2.5" />
							{m.bib_raw_badge_text()}
						</span>
					{/if}
				{:else}{m.bib_new_reference_heading()}{/if}
			</div>

			{#if editMode === 'raw'}
				<div class="border-surface-200-800 min-h-[16rem] overflow-hidden rounded border">
					<CodeMirrorLatex bind:value={rawEntryText} language="bibtex" minHeight="16rem" />
				</div>
				{#if rawEntryError}
					<p class="text-error-500 mt-2 text-sm">{rawEntryError}</p>
				{/if}
				<div class="mt-3 flex justify-end gap-2">
					<button class="btn hover:preset-tonal" type="button" onclick={resetForm}>{m.bib_cancel_button()}</button>
					<button class="btn preset-filled-primary-500" type="button" onclick={saveRawEntry}>{m.bib_update_reference_button()}</button>
				</div>
			{:else}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						saveReference();
					}}
				>
					<label class="label mb-3 block">
						<span class="text-sm font-medium">{m.bib_type_label()}</span>
						<select class="input mt-1 w-full" bind:value={currentReference.entrytype}>
							<option value="">{m.bib_select_type_option()}</option>
							{#each entryTypeOptions as opt}<option value={opt.value}>{opt.label}</option>{/each}
						</select>
						{#if formErrors.entrytype}<p class="text-error-500 text-sm">{formErrors.entrytype[0]}</p>{/if}
					</label>

					{#each regularFields as field (field.name)}
						<label class="label mb-3 block">
							<span class="text-sm font-medium"
								>{field.label}{#if field.required}<span class="text-error-500">*</span>{/if}</span
							>
							{#if field.type === 'textarea'}
								<textarea class="input mt-1 w-full" rows="3" placeholder={field.placeholder} bind:value={currentReference[field.name]}
								></textarea>
							{:else}
								<input
									class="input mt-1 w-full"
									type={field.type === 'number' ? 'number' : 'text'}
									placeholder={field.placeholder}
									bind:value={currentReference[field.name]}
								/>
							{/if}
							{#if formErrors[field.name]}<p class="text-error-500 text-sm">{formErrors[field.name][0]}</p>{/if}
						</label>
					{/each}

					{#if currentReference.entrytype}
						<button
							type="button"
							class="text-surface-600-400 my-2 flex items-center gap-2 text-sm"
							onclick={() => (showAdvanced = !showAdvanced)}
						>
							<ChevronDown class="size-4 transition-transform {showAdvanced ? 'rotate-180' : ''}" />
							{m.bib_advanced_citation_key_button()}
						</button>
						{#if showAdvanced && keyField}
							<label class="label mb-3 block pl-6">
								<span class="text-sm font-medium">{m.bib_key_label()}</span>
								<input
									class="input mt-1 w-full text-sm"
									type="text"
									bind:value={currentReference.key}
									placeholder={generateCitationKey()}
								/>
								{#if formErrors.key}<p class="text-error-500 text-sm">{formErrors.key[0]}</p>{/if}
							</label>
						{/if}
					{/if}

					{#if formErrors.form}<p class="text-error-500 text-sm">{formErrors.form[0]}</p>{/if}

					<div class="mt-3 flex justify-end gap-2">
						{#if isEditing}<button class="btn hover:preset-tonal" type="button" onclick={resetForm}>{m.bib_cancel_button()}</button>{/if}
						<button class="btn preset-filled-primary-500" type="submit"
							>{isEditing ? m.bib_update_reference_button() : m.bib_add_reference_button()}</button
						>
					</div>
				</form>
			{/if}

			{#if !isEditing}
				<div class="border-surface-200-800 mt-4 border-t pt-4">
					<div class="text-sm font-semibold">{m.bib_paste_bibtex_heading()}</div>
					<textarea
						class="input mt-1 w-full font-mono text-xs"
						rows="5"
						bind:value={bibTeXContent}
						placeholder={m.bib_paste_bibtex_placeholder()}></textarea>
					{#if bibTeXWarnings.length}
						<div class="border-warning-500 bg-warning-500/10 mt-2 rounded border p-2 text-xs">
							{#each bibTeXWarnings as w}<div><strong>{w.key}:</strong> {w.issues.join(', ')}</div>{/each}
						</div>
					{/if}
					<div class="mt-2 flex justify-end">
						<button class="btn btn-sm preset-outlined-primary-500 hover:preset-tonal" type="button" onclick={importBibTeX}
							>{m.bib_import_button()}</button
						>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
