<script lang="ts">
	// Thin indeterminate progress bar; render it when a report is loading.
	let { active = false }: { active?: boolean } = $props();
</script>

{#if active}
	<div class="h-0.5 w-full overflow-hidden bg-[var(--color-brand)]/15 print:hidden" role="status" aria-label="Loading">
		<div class="h-full w-2/5 bg-[var(--color-brand)]" style="animation: loadingbar 1.1s ease-in-out infinite;"></div>
	</div>
{/if}
