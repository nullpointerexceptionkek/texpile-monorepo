<script lang="ts">
	import { onMount } from 'svelte';
	import Footer from '$lib/comp/Footer.svelte';
	import Navbar from '$lib/comp/Navbar.svelte';
	import { initAnalytics } from '$lib/plausible';
	import '../app.css';

	let { children } = $props();

	onMount(initAnalytics);
</script>

<Navbar />

{@render children()}

<Footer />
