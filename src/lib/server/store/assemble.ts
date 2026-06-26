import type { MetricsResult, RepoMonth, Member } from '../github/types';

export type MemberRepoMonthRow = {
	login: string;
	owner: string;
	repo: string;
	month: string;
	commits: number;
	mergedPrs: number;
	additions: number; // lines added by this member's merged PRs in the month
	deletions: number;
};

export type ReviewRepoMonthRow = {
	reviewer: string;
	owner: string;
	repo: string;
	month: string;
	reviews: number;
	comments: number;
};

export type StoredRows = {
	repoRows: RepoMonth[];
	memberRows: MemberRepoMonthRow[];
	reviewRows: ReviewRepoMonthRow[];
};

/**
 * Pure: fold the per-entity rows (completed months from Postgres + the live
 * current month, already merged into these arrays) into a MetricsResult for a
 * given team. Member metrics use only the selected members; the review "Others"
 * bucket is every non-member reviewer, reconstructed from the stored rows.
 */
export function assembleMetrics(rows: StoredRows, members: Member[], generatedAt: number): MetricsResult {
	// Match logins case-insensitively (GitHub logins are), mapping to our canonical
	// member login so e.g. Octo-Cat reviews credit the octo-cat member.
	const canonByLower = new Map(members.map((m) => [m.login.toLowerCase(), m.login]));
	const canon = (login: string) => canonByLower.get(login.toLowerCase());

	const commitsByMonth = new Map<string, number>(); // `${login}::${month}`
	const mergedByMonth = new Map<string, number>();
	const commitsByRepo = new Map<string, number>(); // `${login}::${owner}/${repo}`
	const linesByAuthor = new Map<string, { additions: number; deletions: number }>();
	for (const r of rows.memberRows) {
		const login = canon(r.login);
		if (!login) continue;
		const mk = `${login}::${r.month}`;
		commitsByMonth.set(mk, (commitsByMonth.get(mk) ?? 0) + r.commits);
		mergedByMonth.set(mk, (mergedByMonth.get(mk) ?? 0) + r.mergedPrs);
		if (r.commits) {
			const rk = `${login}::${r.owner}/${r.repo}`;
			commitsByRepo.set(rk, (commitsByRepo.get(rk) ?? 0) + r.commits);
		}
		if (r.additions || r.deletions) {
			const e = linesByAuthor.get(login) ?? { additions: 0, deletions: 0 };
			e.additions += r.additions;
			e.deletions += r.deletions;
			linesByAuthor.set(login, e);
		}
	}

	const authors = [...commitsByMonth]
		.filter(([, commits]) => commits > 0) // ignore stored zero-marker rows
		.map(([k, commits]) => {
			const [author, month] = k.split('::');
			return { author, month, commits };
		});
	const mergedByAuthor = [...mergedByMonth]
		.filter(([, v]) => v > 0)
		.map(([k, mergedPRs]) => {
			const [author, month] = k.split('::');
			return { author, month, mergedPRs };
		});
	const commitsByAuthorRepo = [...commitsByRepo].map(([k, commits]) => {
		const [author, repo] = k.split('::');
		return { author, repo, commits };
	});

	const rev = new Map<string, { reviews: number; comments: number }>();
	let othersReviews = 0;
	let othersComments = 0;
	for (const r of rows.reviewRows) {
		const login = canon(r.reviewer);
		if (login) {
			const e = rev.get(login) ?? { reviews: 0, comments: 0 };
			e.reviews += r.reviews;
			e.comments += r.comments;
			rev.set(login, e);
		} else {
			othersReviews += r.reviews;
			othersComments += r.comments;
		}
	}
	const reviewActivity = [...rev].map(([author, v]) => ({ author, ...v }));
	if (othersReviews || othersComments) {
		reviewActivity.push({ author: 'Others', reviews: othersReviews, comments: othersComments });
	}

	const im = new Map<string, { tickets: number; bugs: number }>();
	for (const r of rows.repoRows) {
		const e = im.get(r.month) ?? { tickets: 0, bugs: 0 };
		e.tickets += r.issues;
		e.bugs += r.bugs;
		im.set(r.month, e);
	}
	const issuesByMonth = [...im]
		.map(([month, v]) => ({ month, ...v }))
		.sort((a, b) => a.month.localeCompare(b.month));

	return {
		repos: [...rows.repoRows].sort((a, b) => `${a.owner}/${a.repo}/${a.month}`.localeCompare(`${b.owner}/${b.repo}/${b.month}`)),
		authors,
		mergedByAuthor,
		reviewActivity,
		issuesByMonth,
		commitsByAuthorRepo,
		linesByAuthor: [...linesByAuthor.entries()].map(([author, v]) => ({ author, ...v })),
		generatedAt
	};
}
