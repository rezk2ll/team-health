import { defineCache } from './cache';
import { getReport } from './report';
import type { MetricsResult, Selection } from './github/types';
import { env } from '$env/dynamic/private';

const TTL_MS = Number(env.METRICS_CACHE_TTL_MS ?? 20 * 60 * 1000);

function selectionKey(s: Selection): string {
	return JSON.stringify({
		v: 2, // bump when MetricsResult's shape changes
		repos: s.repos.map((r) => `${r.owner}/${r.repo}`).sort(),
		// Include email: commit attribution matches on it, so two selections with
		// the same logins but different emails are not the same report.
		members: s.members.map((m) => `${m.login}:${m.email ?? ''}`).sort(),
		months: s.months,
		memberMonths: s.memberMonths,
		to: s.to ?? null
	});
}

/** Cached, concurrency-de-duplicated metrics for a selection. */
export const getMetrics = defineCache<[Selection], MetricsResult>(
	'metrics',
	TTL_MS,
	selectionKey,
	(selection) => getReport(selection)
);
