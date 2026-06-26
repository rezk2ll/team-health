<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ScopeBar from '$lib/components/ScopeBar.svelte';
	import LoadingBar from '$lib/components/LoadingBar.svelte';
	import { scope } from '$lib/client/scope.svelte';
	import { metrics, globalMetrics } from '$lib/client/metrics.svelte';
	import { page } from '$app/state';

	let { children, data } = $props();

	// True whenever a report (team or global) is being (re)fetched.
	const loading = $derived(metrics.loading || globalMetrics.loading);

	// Mobile nav drawer (sidebar collapses below lg).
	let drawerOpen = $state(false);
	// Close the drawer on navigation.
	$effect(() => {
		void page.url.pathname;
		drawerOpen = false;
	});

	// Seed the scope from server configuration (the configurable default teams),
	// then let it manage selection + metrics loading client-side.
	$effect(() => {
		if (!scope.initialized) {
			scope.months = data.defaults.months;
			scope.memberMonths = data.defaults.memberMonths;
			scope.init(data.defaultTeams, data.teamsPersisted);
		}
	});
</script>

<svelte:head>
	<title>team·health</title>
</svelte:head>

<div class="flex min-h-screen">
	{#if drawerOpen}
		<button
			class="fixed inset-0 z-40 bg-[var(--color-ink-950)]/30 backdrop-blur-sm lg:hidden"
			aria-label="Close menu"
			onclick={() => (drawerOpen = false)}
		></button>
	{/if}

	<Sidebar open={drawerOpen} onClose={() => (drawerOpen = false)} />

	<main class="flex-1 min-w-0">
		<ScopeBar
			user={data.user}
			authEnabled={data.authEnabled}
			onMenu={() => (drawerOpen = true)}
		/>
		<LoadingBar active={loading} />
		<!-- Dim + soften the stale view while a new report loads, so it's clearly refreshing. -->
		<div class="transition-opacity duration-200 {loading ? 'pointer-events-none opacity-45' : ''}" aria-busy={loading}>
			{@render children()}
		</div>
	</main>
</div>
