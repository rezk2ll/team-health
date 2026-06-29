// Team-scoped report (driven by the Scope bar) and the independent org-wide
// Global report. Both are Resource loaders posting a Selection to /api/metrics.
import type { MetricsResult, Selection } from '$lib/server/github/types';
import type { Team } from './selection';
import { withTeamTz } from '$lib/tz';
import { Resource, postJson, redirectToSignIn } from './resource.svelte';

// Re-exported so existing importers (scope store, etc.) keep their import path.
export { redirectToSignIn };

export function selectionFor(
	team: Team,
	months: number,
	memberMonths: number,
	to?: string
): Selection {
	// Resolve each member's effective timezone (own override, else the team default)
	// so burnout/recovery classify commits in the right local time.
	return { repos: team.repos, members: withTeamTz(team.members, team.tz), months, memberMonths, ...(to ? { to } : {}) };
}

class MetricsStore extends Resource<MetricsResult> {
	load(selection: Selection): Promise<void> {
		return this.run(JSON.stringify(selection), () => postJson('/api/metrics', selection));
	}
}

export const metrics = new MetricsStore();
export const globalMetrics = new MetricsStore();
