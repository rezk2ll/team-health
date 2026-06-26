import { db, hasDb } from '../db';
import { auditLog } from '../db/schema';

/** Best-effort per-user action log. No-op without a database; never throws. */
export async function audit(
	userSub: string,
	action: string,
	detail?: Record<string, unknown>
): Promise<void> {
	if (!hasDb()) return;
	try {
		await db().insert(auditLog).values({ userSub, action, detail: detail ?? null });
	} catch {
		/* auditing must never break the request */
	}
}
