import { error } from '@sveltejs/kit';
import { GitHubError, RateLimitError } from './github/client';

/** Map a GitHub failure to an HTTP response shared by every API route: a clear
 * 429 with the reset time for rate limits, and a generic 502 (with the detail
 * logged, not leaked) for everything else. Re-throws non-GitHub errors. */
export function throwUpstreamError(e: unknown, context: string): never {
	if (e instanceof RateLimitError) throw error(429, e.message);
	if (e instanceof GitHubError) {
		console.error(`[${context}] GitHub error:`, e.message);
		throw error(502, 'Upstream GitHub request failed');
	}
	throw e;
}
