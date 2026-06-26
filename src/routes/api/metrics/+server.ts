import { json, error } from '@sveltejs/kit';
import { getMetrics } from '$lib/server/metrics-cache';
import { parseSelection } from '$lib/server/selection';
import { defaultSelection } from '$lib/server/preset';
import { GitHubError, RateLimitError } from '$lib/server/github/client';
import { audit } from '$lib/server/store/audit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	let selection;
	try {
		const body = await request.json().catch(() => ({}));
		selection = parseSelection(body);
	} catch (e) {
		throw error(400, (e as Error).message);
	}
	try {
		const result = await getMetrics(selection);
		await audit(locals.user.sub, 'report.generate', {
			repos: selection.repos.length,
			members: selection.members.length,
			months: selection.months
		});
		return json(result);
	} catch (e) {
		if (e instanceof RateLimitError) throw error(429, e.message);
		if (e instanceof GitHubError) {
			console.error('[api/metrics] GitHub error:', (e as Error).message);
			throw error(502, 'Upstream GitHub request failed');
		}
		throw e;
	}
};

// Convenience: GET returns metrics for the built-in default selection.
export const GET: RequestHandler = async () => {
	try {
		return json(await getMetrics(defaultSelection()));
	} catch (e) {
		if (e instanceof RateLimitError) throw error(429, e.message);
		if (e instanceof GitHubError) {
			console.error('[api/metrics] GitHub error:', (e as Error).message);
			throw error(502, 'Upstream GitHub request failed');
		}
		throw e;
	}
};
