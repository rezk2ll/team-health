import { createCache } from './cache';
import { getFlowReport } from './flow';
import type { FlowResult, Repo } from './github/types';
import { env } from '$env/dynamic/private';

const TTL_MS = Number(env.FLOW_CACHE_TTL_MS ?? 30 * 60 * 1000);
const cache = createCache<FlowResult>('flow', TTL_MS);

/** Cached cycle-time + review-health report for a repo set over a window of
 * `months` ending at `to` (or the current month when omitted). */
export function getFlow(repos: Repo[], months: number, to?: string): Promise<FlowResult> {
	const key = JSON.stringify({
		repos: repos.map((r) => `${r.owner}/${r.repo}`).sort(),
		months,
		to: to ?? null
	});
	return cache.getOrCompute(key, () => getFlowReport(repos, months, to));
}
