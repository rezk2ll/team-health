import { describe, it, expect } from 'vitest';
import { buildWorklist } from './attention';
import type { OpenPr } from './github/types';

const NOW = Date.parse('2026-06-26T00:00:00Z');
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

function pr(over: Partial<OpenPr>): OpenPr {
	return {
		repo: 'o/r',
		number: 1,
		title: 't',
		url: 'u',
		author: 'alice',
		bot: false,
		draft: false,
		createdAt: daysAgo(0),
		updatedAt: daysAgo(0),
		reviewDecision: null,
		reviews: 0,
		comments: 0,
		additions: 0,
		deletions: 0,
		...over
	};
}

describe('buildWorklist', () => {
	const prs: OpenPr[] = [
		pr({ number: 1, bot: true, createdAt: daysAgo(30), updatedAt: daysAgo(30) }), // bot -> excluded
		pr({ number: 2, reviews: 1, createdAt: daysAgo(0), updatedAt: daysAgo(0) }), // fresh + reviewed -> no reason
		pr({ number: 3, reviews: 0, createdAt: daysAgo(3), updatedAt: daysAgo(3) }), // unreviewed
		pr({ number: 4, reviews: 2, reviewDecision: 'CHANGES_REQUESTED', createdAt: daysAgo(1), updatedAt: daysAgo(1) }),
		pr({ number: 5, reviews: 2, createdAt: daysAgo(10), updatedAt: daysAgo(10) }), // stale (idle 10)
		pr({ number: 6, draft: true, createdAt: daysAgo(20), updatedAt: daysAgo(1) }), // old draft
		pr({ number: 7, reviews: 1, createdAt: daysAgo(20), updatedAt: daysAgo(1) }) // aging
	];
	const r = buildWorklist(prs, NOW);
	const byNum = (n: number) => r.items.find((it) => it.number === n);

	it('excludes bot PRs and PRs that need nothing', () => {
		expect(byNum(1)).toBeUndefined();
		expect(byNum(2)).toBeUndefined();
		expect(r.items).toHaveLength(5);
	});

	it('classifies each reason', () => {
		expect(byNum(3)?.reasons).toEqual(['unreviewed']);
		expect(byNum(4)?.reasons).toContain('changes_requested');
		expect(byNum(5)?.reasons).toEqual(['stale']);
		expect(byNum(6)?.reasons).toEqual(['draft_stale']);
		expect(byNum(7)?.reasons).toEqual(['aging']);
	});

	it('counts the summary and ranks most-stuck first', () => {
		expect(r.summary).toMatchObject({ total: 5, unreviewed: 1, changes_requested: 1, stale: 1, aging: 1, draft_stale: 1 });
		expect(r.items[0].number).toBe(5); // highest priority
	});
});
