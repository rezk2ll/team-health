export type Repo = { owner: string; repo: string };
export type Member = { login: string; name: string; email?: string };

/** One repository's metrics for one month. Mirrors the old RepoMonth shape so the
 * existing chart transforms keep working, plus the derived stock/release/resolution. */
export type RepoMonth = {
	owner: string;
	repo: string;
	month: string; // YYYY-MM
	created: number;
	merged: number;
	closed: number;
	additions: number; // total additions across merged PRs in the month
	deletions: number; // total deletions across merged PRs in the month
	addPerPr: number;
	delPerPr: number;
	daysPerPr: number;
	commentsPerPr: number;
	reviewsPerPr: number;
	bugs: number;
	issues: number;
	issuesOpen: number;
	bugsOpen: number;
	prsOpen: number;
	prsStale: number;
	releases: number;
	resolutionDays: number;
	resolutionStd: number;
	resolutionRate: number;
};

export type AuthorMonth = { author: string; month: string; commits: number };
export type MergedAuthorMonth = { author: string; month: string; mergedPRs: number };
export type ReviewActivity = { author: string; reviews: number; comments: number };
export type IssueMonth = { month: string; tickets: number; bugs: number };
/** New metric: commits by a member, broken down per repository, over the window. */
export type AuthorRepoCommits = { author: string; repo: string; commits: number };
/** Lines added/removed by a member's merged PRs, over the window. */
export type AuthorLines = { author: string; additions: number; deletions: number };

export type MetricsResult = {
	repos: RepoMonth[];
	authors: AuthorMonth[];
	mergedByAuthor: MergedAuthorMonth[];
	reviewActivity: ReviewActivity[];
	issuesByMonth: IssueMonth[];
	commitsByAuthorRepo: AuthorRepoCommits[];
	linesByAuthor: AuthorLines[];
	generatedAt: number;
};

export type Selection = {
	repos: Repo[];
	members: Member[];
	/** Months of repo history (incl. current). */
	months: number;
	/** Months of per-member history (commits/merged/reviews/tickets). */
	memberMonths: number;
};
