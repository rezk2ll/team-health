import { createCache } from './cache';
import { getAttentionReport } from './attention';
import type { AttentionResult, Repo } from './github/types';
import { env } from '$env/dynamic/private';

// Open PRs change often, so this is a short-lived cache, not the monthly store.
const TTL_MS = Number(env.ATTENTION_CACHE_TTL_MS ?? 10 * 60 * 1000);
const cache = createCache<AttentionResult>('attention', TTL_MS);

/** Cached, concurrency-de-duplicated open-PR worklist for a repo set. */
export function getAttention(repos: Repo[]): Promise<AttentionResult> {
	const key = JSON.stringify(repos.map((r) => `${r.owner}/${r.repo}`).sort());
	return cache.getOrCompute(key, () => getAttentionReport(repos));
}
