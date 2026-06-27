import { json } from '@sveltejs/kit';
import { listMembers, allowedOrgs } from '$lib/server/discovery';
import { throwUpstreamError } from '$lib/server/api-errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		return json({ orgs: allowedOrgs(), members: await listMembers() });
	} catch (e) {
		throwUpstreamError(e, 'api/discovery/members');
	}
};
