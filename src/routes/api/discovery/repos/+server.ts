import { json } from '@sveltejs/kit';
import { listRepos, allowedOrgs } from '$lib/server/discovery';
import { throwUpstreamError } from '$lib/server/api-errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		return json({ orgs: allowedOrgs(), repos: await listRepos() });
	} catch (e) {
		throwUpstreamError(e, 'api/discovery/repos');
	}
};
