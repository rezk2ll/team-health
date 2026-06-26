import { json, error } from '@sveltejs/kit';
import { listMembers, allowedOrgs } from '$lib/server/discovery';
import { GitHubError } from '$lib/server/github/client';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		return json({ orgs: allowedOrgs(), members: await listMembers() });
	} catch (e) {
		if (e instanceof GitHubError) throw error(502, `GitHub: ${e.message}`);
		throw e;
	}
};
