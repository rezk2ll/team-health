<script lang="ts">
	import { AreaChart } from 'layerchart';

	// Drop-in replacement for the old SVG Sparkline: same prop surface.
	let {
		values,
		width = 120,
		height = 32,
		stroke = 'var(--color-brand)',
		fill
	}: {
		values: number[];
		width?: number;
		height?: number;
		stroke?: string;
		fill?: string;
	} = $props();

	const data = $derived(values.map((v, i) => ({ i, v })));
	// Default the area fill to a faint wash of the stroke colour.
	const fillColor = $derived(fill ?? `color-mix(in srgb, ${stroke} 14%, transparent)`);
</script>

<div style="width: {width}px; height: {height}px; max-width: 100%;">
	<AreaChart
		{data}
		x="i"
		y="v"
		axis={false}
		grid={false}
		legend={false}
		rule={false}
		tooltipContext={false}
		padding={{ top: 2, bottom: 2, left: 0, right: 0 }}
		series={[{ key: 'v', color: stroke }]}
		props={{
			area: {
				fill: fillColor,
				'fill-opacity': 1,
				line: { stroke, 'stroke-width': 1.5 }
			}
		}}
		class="h-full w-full"
	/>
</div>
