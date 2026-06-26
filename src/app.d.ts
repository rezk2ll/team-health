import type { Session } from '@auth/sveltekit';

declare global {
	namespace App {
		interface Locals {
			/** The authenticated user (OIDC subject), or a synthetic dev user when AUTH_DISABLED. */
			user: { sub: string; name: string; email: string };
			auth(): Promise<Session | null>;
		}
	}
}

export {};
