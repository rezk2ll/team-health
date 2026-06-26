import { json, error } from '@sveltejs/kit';
import { getAttention } from '$lib/server/attention-cache';
import { parseRepoSelection } from '$lib/server/selection';
import { GitHubError } from '$lib/server/github/client';
import { audit } from '$lib/server/store/audit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	let repos;
	try {
		const body = await request.json().catch(() => ({}));
		repos = parseRepoSelection(body);
	} catch (e) {
		throw error(400, (e as Error).message);
	}
	try {
		const result = await getAttention(repos);
		await audit(locals.user.sub, 'attention.view', { repos: repos.length });
		return json(result);
	} catch (e) {
		if (e instanceof GitHubError) throw error(502, `GitHub: ${e.message}`);
		throw e;
	}
};
