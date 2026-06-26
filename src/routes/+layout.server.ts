import {
	defaultTeams,
	defaultGlobalRepos,
	DEFAULT_MONTHS,
	DEFAULT_MEMBER_MONTHS,
	GLOBAL_MONTHS
} from '$lib/server/preset';
import { allowedOrgs } from '$lib/server/discovery';
import { AUTH_DISABLED } from '$lib/server/auth';
import { hasDb } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		defaultTeams: defaultTeams(),
		allowedOrgs: allowedOrgs(),
		defaults: { months: DEFAULT_MONTHS, memberMonths: DEFAULT_MEMBER_MONTHS },
		global: { repos: defaultGlobalRepos(), months: GLOBAL_MONTHS },
		user: { name: locals.user.name, email: locals.user.email },
		authEnabled: !AUTH_DISABLED,
		teamsPersisted: hasDb()
	};
};
