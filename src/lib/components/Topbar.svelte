<script lang="ts">
	type Props = {
		eyebrow?: string;
		title: string;
		subtitle?: string;
		actions?: import('svelte').Snippet;
	};
	let { eyebrow, title, subtitle, actions }: Props = $props();
</script>

<header class="flex items-start justify-between gap-4 px-4 pb-5 pt-6 sm:px-6 sm:gap-6 lg:px-10 lg:pb-6 lg:pt-8">
	<div class="min-w-0">
		{#if eyebrow}
			<div class="eyebrow mb-2 flex items-center gap-2">
				<span class="h-1 w-1 rounded-full bg-[var(--color-brand)]"></span>
				{eyebrow}
			</div>
		{/if}
		<h1 class="font-display text-[1.5rem] leading-tight tracking-tight text-[var(--color-ink-950)] sm:text-[1.9rem] sm:leading-none">
			{title}
		</h1>
		{#if subtitle}
			<p class="mt-2.5 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-600)]">
				{subtitle}
			</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex shrink-0 items-center gap-3 pt-1 print:hidden">{@render actions()}</div>
	{/if}
</header>
