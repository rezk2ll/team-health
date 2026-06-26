<script lang="ts">
	import { onMount } from 'svelte';
	import Topbar from '$lib/components/Topbar.svelte';
	import OrgTrendView from '$lib/components/OrgTrendView.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { globalMetrics } from '$lib/client/metrics.svelte';
	import { scope } from '$lib/client/scope.svelte';
	import { repoKey } from '$lib/client/selection';
	import { orgTrend, type OrgMonth } from '$lib/charts';
	import { pluralize } from '$lib/utils';
	import type { Repo } from '$lib/server/github/types';
	import { AlertCircle, Loader2, FileDown, Filter } from '@lucide/svelte';

	let { data } = $props();

	onMount(() => {
		// Shares the org-wide dataset with /global; load it if this is the entry point.
		if (!globalMetrics.data) {
			globalMetrics.load({ repos: data.global.repos, members: [], months: data.global.months, memberMonths: 1 });
		}
	});

	const allRepos = $derived<Repo[]>(data.global.repos);

	type Mode = 'team' | 'repo';
	const MODES: { k: Mode; l: string }[] = [
		{ k: 'team', l: 'Team' },
		{ k: 'repo', l: 'Repo' }
	];
	let mode = $state<Mode>('team');
	let teamIds = $state<string[]>([]);
	let repoKeys = $state<string[]>([]);

	// Seed the team selection once teams are available: the scope bar's active team
	// (else the first team). After this the user is free to clear the selection.
	let seeded = $state(false);
	$effect(() => {
		if (!seeded && scope.teams.length) {
			const id = scope.activeTeam?.id ?? scope.teams[0]?.id;
			if (id) {
				teamIds = [id];
				seeded = true;
			}
		}
	});

	// The repo-key set the current scope resolves to (union of selected teams' repos,
	// or the selected repos directly).
	const selectedKeys = $derived.by(() => {
		if (mode === 'team') {
			const keys = new Set<string>();
			for (const id of teamIds) {
				const t = scope.teams.find((x) => x.id === id);
				t?.repos.forEach((r) => keys.add(repoKey(r)));
			}
			return keys;
		}
		return new Set(repoKeys);
	});

	const filtered = $derived(
		globalMetrics.data ? globalMetrics.data.repos.filter((r) => selectedKeys.has(repoKey(r))) : []
	);
	const trend = $derived<OrgMonth[]>(orgTrend(filtered));
	const presentRepos = $derived(new Set(filtered.map(repoKey)).size);

	const scopeLabel = $derived.by(() => {
		if (mode === 'team') {
			const names = teamIds
				.map((id) => scope.teams.find((t) => t.id === id)?.name)
				.filter((n): n is string => !!n);
			return names.length ? names.join(' + ') : 'No teams selected';
		}
		return repoKeys.length ? repoKeys.join(' + ') : 'No repos selected';
	});

	const hasSelection = $derived(selectedKeys.size > 0);
</script>

<Topbar
	eyebrow="Breakdown"
	title="Scoped, side by side."
	subtitle="{scopeLabel} · {presentRepos} repos · {data.global.months} months"
>
	{#snippet actions()}
		{#if globalMetrics.data}
			<Button variant="outline" size="lg" onclick={() => window.print()}>
				<FileDown class="h-4 w-4" /> Export PDF
			</Button>
		{/if}
	{/snippet}
</Topbar>

<div class="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
	<!-- Scope selector -->
	<div class="mb-8 flex flex-wrap items-center gap-3 print:hidden">
		<span class="eyebrow flex items-center gap-1.5"><Filter class="h-3.5 w-3.5" /> Scope by</span>
		<div class="inline-flex rounded-lg border border-[var(--color-ink-300)] bg-[var(--color-card)] p-0.5">
			{#each MODES as opt (opt.k)}
				<button
					onclick={() => (mode = opt.k)}
					class="rounded-md px-3 py-1 text-sm transition-colors {mode === opt.k
						? 'bg-[var(--color-brand)]/10 text-[var(--color-ink-950)]'
						: 'text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]'}"
				>
					{opt.l}
				</button>
			{/each}
		</div>

		{#if mode === 'team'}
			<Select.Root type="multiple" bind:value={teamIds}>
				<Select.Trigger class="h-8 min-w-[180px] bg-[var(--color-card)]">
					{teamIds.length ? `${teamIds.length} ${pluralize(teamIds.length, 'team')} selected` : 'Select teams'}
				</Select.Trigger>
				<Select.Content>
					{#each scope.teams as t (t.id)}
						<Select.Item value={t.id} label={t.name}>{t.name}{t.builtin ? ' (default)' : ''}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{:else}
			<Select.Root type="multiple" bind:value={repoKeys}>
				<Select.Trigger class="h-8 min-w-[180px] bg-[var(--color-card)]">
					{repoKeys.length ? `${repoKeys.length} ${pluralize(repoKeys.length, 'repo')} selected` : 'Select repos'}
				</Select.Trigger>
				<Select.Content>
					{#each allRepos as r (repoKey(r))}
						{@const key = repoKey(r)}
						<Select.Item value={key} label={key}>{key}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{/if}
	</div>

	{#if globalMetrics.error}
		<Card.Root class="p-10 text-center shadow-sm">
			<AlertCircle class="mx-auto h-9 w-9 text-[var(--color-negative)]" />
			<p class="mt-3 font-mono text-xs text-[var(--color-ink-600)]">{globalMetrics.error}</p>
		</Card.Root>
	{:else if !globalMetrics.data && globalMetrics.loading}
		<div class="flex items-center justify-center gap-3 py-32 text-[var(--color-ink-600)]">
			<Loader2 class="h-5 w-5 animate-spin text-[var(--color-brand)]" />
			<span class="text-sm">Aggregating metrics…</span>
		</div>
	{:else if !hasSelection}
		<Card.Root class="p-10 text-center text-sm text-[var(--color-ink-600)] shadow-sm">
			Select at least one {mode} above to see its breakdown.
		</Card.Root>
	{:else if trend.length}
		<OrgTrendView {trend} heading="How {scopeLabel} is shipping" />
	{:else}
		<Card.Root class="p-10 text-center text-sm text-[var(--color-ink-600)] shadow-sm">
			{mode === 'team'
				? 'None of the selected teams have repos in the global dataset.'
				: 'None of the selected repos are in the global dataset.'}
		</Card.Root>
	{/if}
</div>
