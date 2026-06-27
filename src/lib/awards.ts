// Playful "MVP" superlatives for the Overview: the standout member for each of a
// handful of engineering stats, computed from the report. Pure and unit-tested.
import type { MetricsResult, Member } from './server/github/types';
import { fmtNum } from './utils';

export type Award = {
	key: string;
	title: string; // the award name, e.g. "The Machine"
	tagline: string; // what it measures, e.g. "Most commits"
	login: string;
	name: string;
	stat: string; // formatted winner value, e.g. "1,059 commits"
};

const lc = (s: string) => s.toLowerCase();

/** The standout member per stat, restricted to team members. Awards with no
 * winner (nobody scored above zero) are omitted. */
export function computeAwards(metrics: MetricsResult, members: Member[]): Award[] {
	const memberByLc = new Map(members.map((m) => [lc(m.login), m]));
	const bump = (map: Map<string, number>, login: string, n: number) => {
		const k = lc(login);
		if (!memberByLc.has(k)) return;
		map.set(k, (map.get(k) ?? 0) + n);
	};

	const commits = new Map<string, number>();
	for (const a of metrics.authors) bump(commits, a.author, a.commits);
	const merged = new Map<string, number>();
	for (const a of metrics.mergedByAuthor) bump(merged, a.author, a.mergedPRs);
	const reviews = new Map<string, number>();
	const comments = new Map<string, number>();
	for (const r of metrics.reviewActivity) {
		bump(reviews, r.author, r.reviews);
		bump(comments, r.author, r.comments);
	}
	const lines = new Map<string, number>();
	for (const l of metrics.linesByAuthor) bump(lines, l.author, l.additions + l.deletions);
	// Breadth: how many distinct repos a member committed to.
	const repoSets = new Map<string, Set<string>>();
	for (const c of metrics.commitsByAuthorRepo) {
		const k = lc(c.author);
		if (c.commits <= 0 || !memberByLc.has(k)) continue;
		(repoSets.get(k) ?? repoSets.set(k, new Set()).get(k)!).add(c.repo);
	}
	const breadth = new Map<string, number>();
	for (const [k, s] of repoSets) breadth.set(k, s.size);

	const winner = (map: Map<string, number>): { login: string; value: number } | null => {
		let best: { login: string; value: number } | null = null;
		for (const [k, v] of map) if (v > 0 && (!best || v > best.value)) best = { login: k, value: v };
		return best;
	};

	const defs: { key: string; title: string; tagline: string; map: Map<string, number>; unit: string }[] = [
		{ key: 'commits', title: 'The Machine', tagline: 'Most commits', map: commits, unit: 'commits' },
		{ key: 'merged', title: 'The Closer', tagline: 'Most PRs merged', map: merged, unit: 'merged' },
		{ key: 'reviews', title: 'The Gatekeeper', tagline: 'Most reviews', map: reviews, unit: 'reviews' },
		{ key: 'comments', title: 'The Diplomat', tagline: 'Most PR comments', map: comments, unit: 'comments' },
		{ key: 'lines', title: 'The Heavyweight', tagline: 'Most lines changed', map: lines, unit: 'lines' },
		{ key: 'breadth', title: 'The Explorer', tagline: 'Most repos touched', map: breadth, unit: 'repos' }
	];

	const out: Award[] = [];
	for (const d of defs) {
		const w = winner(d.map);
		if (!w) continue;
		const m = memberByLc.get(w.login)!;
		out.push({
			key: d.key,
			title: d.title,
			tagline: d.tagline,
			login: m.login,
			name: m.name,
			stat: `${fmtNum(w.value)} ${d.unit}`
		});
	}
	return out;
}
