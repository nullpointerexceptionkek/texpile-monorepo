<script lang="ts">
	import { Download, ChevronDown, Check } from '@lucide/svelte';
	import Showcase from '$lib/comp/Showcase.svelte';
	import typingWebm from '$lib/assets/showcase/visual-typing.webm';
	import typingMp4 from '$lib/assets/showcase/visual-typing.mp4';
	import livePreviewMp4 from '$lib/assets/showcase/live-preview.mp4';
	import intellisenseShot from '$lib/assets/showcase/intellisense-dark.png';
	import errorlogZoomShot from '$lib/assets/showcase/errorlog-zoom-dark.png';
	// feature-grid thumbs, all 5:3
	import thumbSynctex from '$lib/assets/showcase/thumbs/thumb-synctex.png';
	import thumbTerminal from '$lib/assets/showcase/thumbs/thumb-terminal.png';
	import thumbDiff from '$lib/assets/showcase/thumbs/thumb-diff.png';
	import thumbToggle from '$lib/assets/showcase/thumbs/thumb-toggle.png';
	import thumbTree from '$lib/assets/showcase/thumbs/thumb-tree.png';
	import thumbMath from '$lib/assets/showcase/thumbs/thumb-math.png';
	import { m } from '$lib/paraglide/messages';

	const features = [
		{ shot: thumbSynctex, title: m.feature_synctex_title(), body: m.feature_synctex_body() },
		{ shot: thumbTerminal, title: m.feature_terminal_title(), body: m.feature_terminal_body() },
		{ shot: thumbDiff, title: m.feature_history_title(), body: m.feature_history_body() },
		{ shot: thumbToggle, title: m.feature_sync_title(), body: m.feature_sync_body() },
		{ shot: thumbTree, title: m.feature_multifile_title(), body: m.feature_multifile_body() },
		{ shot: thumbMath, title: m.feature_math_title(), body: m.feature_math_body() }
	];

	const editingPoints = [m.editing_point_1(), m.editing_point_2(), m.editing_point_3(), m.editing_point_4()];

	// every claim here is backed by the static project parse
	const intellisensePoints = [m.intellisense_point_1(), m.intellisense_point_2(), m.intellisense_point_3(), m.intellisense_point_4()];

	const faqs = [
		{ q: m.faq_q_free(), a: m.faq_a_free() },
		{ q: m.faq_q_files(), a: m.faq_a_files() },
		{ q: m.faq_q_internet(), a: m.faq_a_internet() },
		{ q: m.faq_q_rewrite(), a: m.faq_a_rewrite() },
		{ q: m.faq_q_latex_installed(), a: m.faq_a_latex_installed() },
		{ q: m.faq_q_electron(), a: m.faq_a_electron() }
	];

	const jsonLdFeatureList = [
		m.home_jsonld_feature_1(),
		m.home_jsonld_feature_2(),
		m.home_jsonld_feature_3(),
		m.home_jsonld_feature_4(),
		m.home_jsonld_feature_5(),
		m.home_jsonld_feature_6()
	];

	// escape for embedding in a <script type="application/ld+json"> block below
	const jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Texpile',
		description: m.home_meta_description(),
		url: 'https://texpile.com',
		applicationCategory: 'ProductivityApplication',
		operatingSystem: 'Windows, macOS, Linux',
		offers: {
			'@type': 'Offer',
			availability: 'https://schema.org/InStock'
		},
		creator: {
			'@type': 'Organization',
			name: 'Texpile'
		},
		featureList: jsonLdFeatureList
	}).replace(/</g, '\\u003c');

	let openFaq = $state(-1);
</script>

<svelte:head>
	<title>{m.home_title()}</title>
	<meta name="description" content={m.home_meta_description()} />
	<meta name="keywords" content={m.home_meta_keywords()} />

	<!-- Page-specific Open Graph -->
	<meta property="og:url" content="https://texpile.com/" />
	<meta property="og:title" content={m.home_title()} />
	<meta property="og:description" content={m.home_social_description()} />

	<!-- Page-specific Twitter -->
	<meta property="twitter:url" content="https://texpile.com/" />
	<meta property="twitter:title" content={m.home_title()} />
	<meta property="twitter:description" content={m.home_social_description()} />

	<link rel="canonical" href="https://texpile.com/" />
	<link rel="alternate" hreflang="en" href="https://texpile.com/" />
	<link rel="alternate" hreflang="zh-Hans" href="https://texpile.com/zh-Hans/" />
	<link rel="alternate" hreflang="zh-Hant" href="https://texpile.com/zh-Hant/" />
	<link rel="alternate" hreflang="de" href="https://texpile.com/de/" />
	<link rel="alternate" hreflang="x-default" href="https://texpile.com/" />

	<!-- Structured Data -->
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<section id="top" class="from-primary-50 to-secondary-50 bg-gradient-to-br">
	<div class="container mx-auto px-4 pt-16 pb-6 sm:px-6 md:pt-24 lg:px-8">
		<div class="mx-auto max-w-3xl space-y-6 text-center">
			<h1 class="text-3xl leading-tight font-bold sm:text-4xl">{m.hero_heading()}</h1>
			<p class="text-surface-600 mx-auto max-w-2xl text-lg leading-relaxed">
				{m.hero_body()}
			</p>
			<div class="flex flex-col items-center justify-center gap-3">
				<a
					href="/download"
					class="btn preset-filled-primary-500 rounded-base inline-flex items-center gap-2 px-7 py-3 font-semibold text-white"
				>
					<Download class="h-5 w-5" />
					{m.word_download()}
				</a>
				<p class="text-surface-500 font-mono text-xs">{m.hero_tagline()}</p>
			</div>
		</div>
	</div>

	<div class="pb-16 md:pb-20">
		<Showcase />
	</div>
</section>

<section id="live-preview" class="bg-white py-16 md:py-20">
	<div class="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
		<h2 class="text-surface-900 text-center text-2xl font-semibold md:text-3xl">{m.live_preview_heading()}</h2>
		<p class="text-surface-600 mx-auto mt-4 mb-10 max-w-2xl text-center text-lg leading-relaxed">
			{m.live_preview_body()}
		</p>
		<div class="border-surface-200 overflow-hidden rounded-xl border shadow-2xl">
			<!-- muted looping demo, behaves like an animated image -->
			<video autoplay muted loop playsinline disablepictureinpicture aria-label={m.live_preview_video_aria()} class="block w-full">
				<source src={livePreviewMp4} type="video/mp4" />
			</video>
		</div>
	</div>
</section>

<section id="visual-editing" class="border-surface-200 border-t bg-white py-16 md:py-20">
	<div class="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
		<h2 class="text-surface-900 mb-10 text-center text-2xl font-semibold md:text-3xl">{m.visual_editing_heading()}</h2>
		<div class="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
			<div class="flex flex-col justify-center gap-6">
				<p class="text-surface-600 text-lg leading-relaxed">
					{m.visual_editing_body()}
				</p>
				<ul class="space-y-3">
					{#each editingPoints as point (point)}
						<li class="flex items-start gap-3">
							<Check class="text-primary-500 mt-1 h-4 w-4 shrink-0" strokeWidth={2.5} />
							<span class="text-surface-700 leading-relaxed">{point}</span>
						</li>
					{/each}
				</ul>
			</div>
			<div class="border-surface-200 mx-auto w-fit overflow-hidden rounded-xl border shadow-2xl">
				<!-- muted looping demo, behaves like an animated image -->
				<video
					autoplay
					muted
					loop
					playsinline
					disablepictureinpicture
					aria-label={m.visual_editing_video_aria()}
					class="block max-h-[340px] w-auto max-w-full"
				>
					<source src={typingWebm} type="video/webm" />
					<source src={typingMp4} type="video/mp4" />
				</video>
			</div>
		</div>
	</div>
</section>

<section id="intellisense" class="border-surface-200 border-t bg-white py-16 md:py-20">
	<div class="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
		<h2 class="text-surface-900 mb-10 text-center text-2xl font-semibold md:text-3xl">{m.intellisense_heading()}</h2>
		<div class="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
			<div class="order-2 lg:order-1">
				<div class="border-surface-200 mx-auto w-fit overflow-hidden rounded-xl border shadow-2xl">
					<img
						src={intellisenseShot}
						alt={m.intellisense_shot_alt()}
						loading="lazy"
						draggable="false"
						class="block max-h-[380px] w-auto max-w-full"
					/>
				</div>
			</div>
			<div class="order-1 space-y-6 lg:order-2">
				<p class="text-surface-600 text-lg leading-relaxed">{m.intellisense_body()}</p>
				<ul class="space-y-3">
					{#each intellisensePoints as point (point)}
						<li class="flex items-start gap-3">
							<Check class="text-primary-500 mt-1 h-4 w-4 shrink-0" strokeWidth={2.5} />
							<span class="text-surface-700 leading-relaxed">{point}</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
</section>

<section id="diagnostics" class="border-surface-200 border-t bg-white py-16 md:py-20">
	<div class="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
		<h2 class="text-surface-900 mb-10 text-center text-2xl font-semibold md:text-3xl">{m.diagnostics_heading()}</h2>
		<div class="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
			<div class="space-y-6">
				<p class="text-surface-600 text-lg leading-relaxed">
					{m.diagnostics_body()}
				</p>
			</div>
			<div class="border-surface-200 mx-auto w-fit overflow-hidden rounded-xl border shadow-2xl">
				<img
					src={errorlogZoomShot}
					alt={m.diagnostics_shot_alt()}
					loading="lazy"
					draggable="false"
					class="block max-h-[260px] w-auto max-w-full"
				/>
			</div>
		</div>
	</div>
</section>

<section id="features" class="border-surface-200 border-t bg-white py-16 md:py-20">
	<div class="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
		<h2 class="text-surface-900 mb-10 text-center text-2xl font-semibold md:text-3xl">{m.features_heading()}</h2>

		<div class="mx-auto grid max-w-5xl gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as f (f.title)}
				<div>
					<div class="border-surface-200 mb-3 overflow-hidden rounded-lg border">
						<img src={f.shot} alt={f.title} loading="lazy" draggable="false" class="aspect-[5/3] w-full object-cover" />
					</div>
					<h3 class="text-surface-500 mb-1.5 text-base tracking-wider uppercase">{f.title}</h3>
					<p class="text-surface-600 leading-relaxed">{f.body}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<section id="download" class="border-surface-200 border-t bg-white py-16 md:py-20">
	<div class="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
		<div class="space-y-6 text-center">
			<h2 class="text-surface-900 text-2xl font-semibold md:text-3xl">{m.download_section_heading()}</h2>
			<p class="text-surface-600">{m.download_section_body()}</p>
			<a
				href="/download"
				class="btn preset-filled-primary-500 rounded-base inline-flex items-center gap-2 px-7 py-3 font-semibold text-white"
			>
				<Download class="h-5 w-5" />
				{m.word_download()}
			</a>
		</div>
	</div>
</section>

<section id="faq" class="border-surface-200 border-t bg-white py-16 md:py-20">
	<div class="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
		<h2 class="text-surface-900 mb-10 text-center text-2xl font-semibold md:text-3xl">{m.faq_heading()}</h2>
		<div class="divide-surface-200 border-surface-200 divide-y rounded-lg border">
			{#each faqs as f, i (f.q)}
				<div class="bg-white first:rounded-t-lg last:rounded-b-lg">
					<button
						class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium"
						onclick={() => (openFaq = openFaq === i ? -1 : i)}
						aria-expanded={openFaq === i}
					>
						{f.q}
						<ChevronDown class="text-surface-400 h-5 w-5 shrink-0 transition-transform {openFaq === i ? 'rotate-180' : ''}" />
					</button>
					{#if openFaq === i}
						<p class="text-surface-600 px-5 pb-5 leading-relaxed">{f.a}</p>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<section id="ps" class="border-surface-200 border-t bg-white py-14">
	<div class="container mx-auto max-w-2xl px-4 text-center sm:px-6">
		<h2 class="text-surface-900 text-lg font-semibold">{m.ps_heading()}</h2>
		<p class="text-surface-600 mt-3 leading-relaxed">
			{m.ps_body()}
		</p>
	</div>
</section>
