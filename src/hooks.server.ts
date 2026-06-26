import { sequence } from '@sveltejs/kit/hooks';
import { redirect, type Handle } from '@sveltejs/kit';
import { authHandle, AUTH_DISABLED } from '$lib/server/auth';

const DEV_USER = { sub: 'dev', name: 'Dev User', email: 'dev@local' };

// Populate locals.user and gate every route behind a session (except the Auth.js
// endpoints). With AUTH_DISABLED, inject a synthetic user so local dev needs no SSO.
const guard: Handle = async ({ event, resolve }) => {
	if (AUTH_DISABLED) {
		event.locals.user = DEV_USER;
		return resolve(event);
	}

	const path = event.url.pathname;
	if (path === '/auth' || path.startsWith('/auth/')) return resolve(event);

	const session = await event.locals.auth();
	if (!session?.user) {
		// API clients get JSON 401 (not an HTML redirect they'd try to JSON.parse);
		// page navigations are redirected to sign in.
		if (path.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'unauthorized' }), {
				status: 401,
				headers: { 'content-type': 'application/json' }
			});
		}
		throw redirect(303, `/auth/signin?callbackUrl=${encodeURIComponent(path)}`);
	}
	const u = session.user as { id?: string; name?: string | null; email?: string | null };
	event.locals.user = { sub: u.id ?? u.email ?? 'unknown', name: u.name ?? '', email: u.email ?? '' };
	return resolve(event);
};

export const handle: Handle = AUTH_DISABLED ? guard : sequence(authHandle, guard);
