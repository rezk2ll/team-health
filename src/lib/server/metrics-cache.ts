import { createCache } from './cache';
import { getReport } from './report';
import type { MetricsResult, Selection } from './github/types';
import { env } from '$env/dynamic/private';

const TTL_MS = Number(env.METRICS_CACHE_TTL_MS ?? 20 * 60 * 1000);
const cache = createCache<MetricsResult>('metrics', TTL_MS);

function selectionKey(s: Selection): string {
	return JSON.stringify({
		repos: s.repos.map((r) => `${r.owner}/${r.repo}`).sort(),
		members: s.members.map((m) => m.login).sort(),
		months: s.months,
		memberMonths: s.memberMonths,
		to: s.to ?? null
	});
}

/** Cached, concurrency-de-duplicated metrics for a selection. */
export function getMetrics(selection: Selection): Promise<MetricsResult> {
	return cache.getOrCompute(selectionKey(selection), () => getReport(selection));
}
