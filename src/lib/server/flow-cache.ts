import { createCache } from './cache';
import { getFlowReport } from './flow';
import type { FlowResult, Repo } from './github/types';
import { env } from '$env/dynamic/private';

const TTL_MS = Number(env.FLOW_CACHE_TTL_MS ?? 30 * 60 * 1000);
const cache = createCache<FlowResult>('flow', TTL_MS);

/** Cached cycle-time + review-health report for a repo set over `months`. */
export function getFlow(repos: Repo[], months: number): Promise<FlowResult> {
	const key = JSON.stringify({ repos: repos.map((r) => `${r.owner}/${r.repo}`).sort(), months });
	return cache.getOrCompute(key, () => getFlowReport(repos, months));
}
