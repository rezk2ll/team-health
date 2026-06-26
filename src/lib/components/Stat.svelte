<script lang="ts">
	import { fmtNum } from '$lib/utils';

	type Props = {
		label: string;
		value: number | string | null | undefined;
		unit?: string;
		hint?: string;
		trend?: number; // positive = up, negative = down
		size?: 'sm' | 'md' | 'lg';
	};
	let { label, value, unit, hint, trend, size = 'md' }: Props = $props();

	const display = $derived(typeof value === 'number' ? fmtNum(value) : (value ?? '—'));
	const trendUp = $derived(trend !== undefined && trend > 0);
	const trendDown = $derived(trend !== undefined && trend < 0);
</script>

<div class="group relative">
	<div class="eyebrow mb-3">{label}</div>
	<div class="flex items-baseline gap-2">
		<span
			class="font-display tabular text-[var(--color-ink-950)] {size === 'lg'
				? 'text-[5rem] leading-[0.9]'
				: size === 'sm'
					? 'text-[1.75rem] leading-none'
					: 'text-[3rem] leading-[0.9]'}"
		>
			{display}
		</span>
		{#if unit}
			<span class="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-600)]">
				{unit}
			</span>
		{/if}
	</div>
	{#if hint || trend !== undefined}
		<div class="mt-3 flex items-center gap-2 text-xs text-[var(--color-ink-700)]">
			{#if trend !== undefined}
				<span
					class="font-mono tabular {trendUp
						? 'text-[var(--color-positive)]'
						: trendDown
							? 'text-[var(--color-negative)]'
							: ''}"
				>
					{trendUp ? '↑' : trendDown ? '↓' : '·'} {fmtNum(Math.abs(trend), { maximumFractionDigits: 1 })}%
				</span>
			{/if}
			{#if hint}<span>{hint}</span>{/if}
		</div>
	{/if}
</div>
