import { env } from '$env/dynamic/private';
import { graphql, type GraphQL } from './github/client';
import { fetchOpenPullRequests } from './github/metrics';
import type { Repo, OpenPr, AttentionItem, AttentionReason, AttentionResult } from './github/types';

const DAY_MS = 86_400_000;

// Thresholds (days), tunable via env.
const STALE_DAYS = Number(env.ATTENTION_STALE_DAYS ?? 7); // no activity for a week
const AGING_DAYS = Number(env.ATTENTION_AGING_DAYS ?? 14); // open for two weeks

/** Classify currently-open PRs into a ranked worklist. Pure: only PRs that need
 * a human are returned, most-stuck first. */
export function buildWorklist(prs: OpenPr[], now: number): AttentionResult {
	const items: AttentionItem[] = prs
		// Bot PRs (dependabot etc.) are handled by other automation, not a review
		// worklist; including them buries the human PRs that actually need a person.
		.filter((pr) => !pr.bot)
		.map((pr): AttentionItem => {
			const ageDays = Math.max(0, Math.floor((now - Date.parse(pr.createdAt)) / DAY_MS));
			const idleDays = Math.max(0, Math.floor((now - Date.parse(pr.updatedAt)) / DAY_MS));
			const reasons: AttentionReason[] = [];
			if (pr.draft) {
				if (ageDays >= AGING_DAYS) reasons.push('draft_stale');
			} else {
				if (pr.reviewDecision === 'CHANGES_REQUESTED') reasons.push('changes_requested');
				if (pr.reviews === 0 && ageDays >= 1) reasons.push('unreviewed');
				if (idleDays >= STALE_DAYS) reasons.push('stale');
				if (ageDays >= AGING_DAYS) reasons.push('aging');
			}
			const priority =
				ageDays +
				idleDays * 1.5 +
				(reasons.includes('unreviewed') ? 12 : 0) +
				(reasons.includes('stale') ? 10 : 0) +
				(reasons.includes('changes_requested') ? 6 : 0);
			return { ...pr, ageDays, idleDays, reasons, priority };
		})
		.filter((it) => it.reasons.length > 0)
		.sort((a, b) => b.priority - a.priority);

	const summary = { total: items.length, unreviewed: 0, changes_requested: 0, stale: 0, aging: 0, draft_stale: 0 };
	for (const it of items) for (const r of it.reasons) summary[r]++;

	return { items, summary, generatedAt: now };
}

/** Fetch + classify the open-PR worklist for a set of repos. */
export async function getAttentionReport(repos: Repo[], now = Date.now(), gql: GraphQL = graphql): Promise<AttentionResult> {
	const prs = await fetchOpenPullRequests(gql, repos);
	return buildWorklist(prs, now);
}
