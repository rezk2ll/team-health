<script lang="ts">
	import { page } from '$app/state';
	import { House, RotateCcw } from '@lucide/svelte';

	const status = $derived(page.status);
	const is404 = $derived(status === 404);
	const heading = $derived(
		is404 ? 'Page not found' : status >= 500 ? 'Something went wrong' : 'Unexpected error'
	);
	// Never surface a raw server error message (it can leak internals); use a safe
	// line for 5xx and the framework message only for client-side (4xx) errors.
	const body = $derived(
		is404
			? "This page doesn't exist, or it may have moved."
			: status >= 500
				? 'An unexpected error occurred on our side. Please try again in a moment.'
				: (page.error?.message ?? 'Something went wrong.')
	);
</script>

<svelte:head><title>{status} · team·health</title></svelte:head>

<div class="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
	<div class="eyebrow mb-4 text-[var(--color-ink-500)]">Error {status}</div>
	<div class="font-display tabular text-[5rem] leading-none text-[var(--color-ink-300)] sm:text-[7rem]">
		{status}
	</div>
	<h1 class="mt-4 font-display text-2xl tracking-tight text-[var(--color-ink-950)] sm:text-3xl">
		{heading}
	</h1>
	<p class="mt-3 max-w-md text-sm text-[var(--color-ink-600)]">{body}</p>
	<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
		<a
			href="/"
			class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
		>
			<House class="h-4 w-4" /> Back to Overview
		</a>
		{#if status >= 500}
			<button
				onclick={() => location.reload()}
				class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-ink-300)] bg-[var(--color-card)] px-4 py-2 text-sm text-[var(--color-ink-800)] hover:border-[var(--color-ink-400)]"
			>
				<RotateCcw class="h-4 w-4" /> Try again
			</button>
		{/if}
	</div>
</div>
