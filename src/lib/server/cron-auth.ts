import { createHash, timingSafeEqual } from 'node:crypto';

/** Authorize a cron/automation request by a shared bearer secret. Returns false
 * when no secret is configured, so the endpoint stays disabled by default rather
 * than open. Compared in constant time (over SHA-256 digests, which are equal
 * length) so the check doesn't leak the secret via timing. */
export function bearerAuthorized(header: string | null, secret: string | undefined): boolean {
	if (!secret || !header) return false;
	const a = createHash('sha256').update(header).digest();
	const b = createHash('sha256').update(`Bearer ${secret}`).digest();
	return timingSafeEqual(a, b);
}
