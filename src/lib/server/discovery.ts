import { graphql } from './github/client';
import { createCache } from './cache';
import { env } from '$env/dynamic/private';
import type { Repo, Member } from './github/types';

const TTL_MS = Number(env.DISCOVERY_CACHE_TTL_MS ?? 6 * 60 * 60 * 1000);
const repoCache = createCache<Repo[]>('discovery:repos', TTL_MS);
const memberCache = createCache<Member[]>('discovery:members', TTL_MS);

export function allowedOrgs(): string[] {
	return (env.ALLOWED_ORGS ?? 'linagora,cozy')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

async function paginate<T>(
	build: (after: string | null) => string,
	pick: (data: Record<string, unknown>) => { nodes: T[]; pageInfo: { hasNextPage: boolean; endCursor: string } } | null
): Promise<T[]> {
	const out: T[] = [];
	let cursor: string | null = null;
	for (let page = 0; page < 20; page++) {
		const data = await graphql(build(cursor));
		const conn = pick(data);
		if (!conn) break;
		out.push(...conn.nodes);
		if (!conn.pageInfo.hasNextPage) break;
		cursor = conn.pageInfo.endCursor;
	}
	return out;
}

// A forbidden / non-existent org returns a 200 with `organization: null` (the
// client now preserves partial data), so paginate yields []. A *transient* failure
// (5xx / rate limit) instead throws — and we let it propagate so the empty result
// is NOT cached for the full discovery TTL.
async function fetchOrgRepos(org: string): Promise<Repo[]> {
	const nodes = await paginate<{ name: string; isArchived: boolean }>(
		(after) =>
			`{ organization(login: "${org}") { repositories(first: 100, after: ${after ? `"${after}"` : 'null'}, orderBy: { field: PUSHED_AT, direction: DESC }) { pageInfo { hasNextPage endCursor } nodes { name isArchived } } } }`,
		(d) => (d.organization as any)?.repositories ?? null
	);
	return nodes.filter((n) => !n.isArchived).map((n) => ({ owner: org, repo: n.name }));
}

async function fetchOrgMembers(org: string): Promise<Member[]> {
	const nodes = await paginate<{ login: string; name: string | null }>(
		(after) =>
			`{ organization(login: "${org}") { membersWithRole(first: 100, after: ${after ? `"${after}"` : 'null'}) { pageInfo { hasNextPage endCursor } nodes { login name } } } }`,
		(d) => (d.organization as any)?.membersWithRole ?? null
	);
	return nodes.map((n) => ({ login: n.login, name: n.name || n.login }));
}

/** All non-archived repos across the allowed orgs (cached). */
export function listRepos(): Promise<Repo[]> {
	return repoCache.getOrCompute(`repos:${allowedOrgs().join(',')}`, async () => {
		const all = await Promise.all(allowedOrgs().map(fetchOrgRepos));
		return all.flat().sort((a, b) => `${a.owner}/${a.repo}`.localeCompare(`${b.owner}/${b.repo}`));
	});
}

/** All members across the allowed orgs, deduped by login (cached). */
export function listMembers(): Promise<Member[]> {
	return memberCache.getOrCompute(`members:${allowedOrgs().join(',')}`, async () => {
		const all = await Promise.all(allowedOrgs().map(fetchOrgMembers));
		const seen = new Map<string, Member>();
		for (const m of all.flat()) if (!seen.has(m.login)) seen.set(m.login, m);
		return [...seen.values()].sort((a, b) => a.login.localeCompare(b.login));
	});
}
