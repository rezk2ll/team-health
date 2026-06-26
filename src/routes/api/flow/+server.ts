import { json, error } from '@sveltejs/kit';
import { getFlow } from '$lib/server/flow-cache';
import { parseRepoSelection } from '$lib/server/selection';
import { isMonthKey } from '$lib/months';
import { GitHubError, RateLimitError } from '$lib/server/github/client';
import { audit } from '$lib/server/store/audit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	let repos;
	let months = 12;
	let to: string | undefined;
	try {
		const body = await request.json().catch(() => ({}));
		repos = parseRepoSelection(body);
		months = Math.max(1, Math.min(24, Math.round(Number((body as { months?: number }).months ?? 12))));
		const rawTo = (body as { to?: unknown }).to;
		to = isMonthKey(rawTo) ? rawTo : undefined;
	} catch (e) {
		throw error(400, (e as Error).message);
	}
	try {
		const result = await getFlow(repos, months, to);
		await audit(locals.user.sub, 'flow.view', { repos: repos.length, months, to });
		return json(result);
	} catch (e) {
		if (e instanceof RateLimitError) throw error(429, e.message);
		if (e instanceof GitHubError) {
			console.error('[api/flow] GitHub error:', (e as Error).message);
			throw error(502, 'Upstream GitHub request failed');
		}
		throw e;
	}
};
