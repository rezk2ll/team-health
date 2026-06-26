import type { Selection } from './github/types';
import { parseMembers, parseRepos } from './validate';
import { allowedOrgs } from './discovery';

const MAX_REPOS = 40;
const MAX_MEMBERS = 60;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

/** Validate and normalize an untrusted selection payload. Repos are sanitized
 * against GitHub identifier rules (injection guard) and restricted to the
 * allowed orgs (authorization guard, so the privileged token can't be pointed at
 * arbitrary repositories). Throws on a payload with no valid in-scope repos. */
export function parseSelection(body: unknown): Selection {
	const b = (body ?? {}) as Record<string, unknown>;
	const repos = parseRepos(b.repos, MAX_REPOS, allowedOrgs());
	const members = parseMembers(b.members, MAX_MEMBERS);

	if (repos.length === 0) {
		throw new Error('selection must include at least one repository in an allowed organization');
	}

	return {
		repos,
		members,
		months: clamp(Number(b.months ?? 12), 1, 24),
		memberMonths: clamp(Number(b.memberMonths ?? 3), 1, 12)
	};
}
