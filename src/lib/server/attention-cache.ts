import { defineCache } from './cache';
import { getAttentionReport } from './attention';
import type { AttentionResult, Repo } from './github/types';
import { env } from '$env/dynamic/private';

// Open PRs change often, so this is a short-lived cache, not the monthly store.
const TTL_MS = Number(env.ATTENTION_CACHE_TTL_MS ?? 10 * 60 * 1000);

/** Cached, concurrency-de-duplicated open-PR worklist for a repo set. */
export const getAttention = defineCache<[Repo[]], AttentionResult>(
	'attention',
	TTL_MS,
	(repos) => JSON.stringify(repos.map((r) => `${r.owner}/${r.repo}`).sort()),
	(repos) => getAttentionReport(repos)
);
