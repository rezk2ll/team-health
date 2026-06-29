import { and, eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { team } from '../db/schema';
import type { Member, Repo } from '../github/types';

export type TeamRow = { id: string; name: string; members: Member[]; repos: Repo[]; tz?: string };

const toRow = (r: typeof team.$inferSelect): TeamRow => ({
	id: r.id,
	name: r.name,
	members: r.members,
	repos: r.repos,
	...(r.tz ? { tz: r.tz } : {})
});

/** Teams owned by one user (private — never shared across users). */
export async function listUserTeams(ownerSub: string): Promise<TeamRow[]> {
	const rows = await db().select().from(team).where(eq(team.ownerSub, ownerSub)).orderBy(desc(team.createdAt));
	return rows.map(toRow);
}

export async function createUserTeam(
	ownerSub: string,
	name: string,
	members: Member[],
	repos: Repo[],
	tz?: string
): Promise<TeamRow> {
	const [r] = await db().insert(team).values({ ownerSub, name, members, repos, tz: tz ?? null }).returning();
	return toRow(r);
}

export async function updateUserTeam(
	ownerSub: string,
	id: string,
	patch: { name: string; members: Member[]; repos: Repo[]; tz?: string }
): Promise<TeamRow | null> {
	const [r] = await db()
		.update(team)
		// tz is explicitly nulled when absent so clearing a team's timezone persists.
		.set({ name: patch.name, members: patch.members, repos: patch.repos, tz: patch.tz ?? null, updatedAt: new Date() })
		.where(and(eq(team.id, id), eq(team.ownerSub, ownerSub)))
		.returning();
	return r ? toRow(r) : null;
}

export async function deleteUserTeam(ownerSub: string, id: string): Promise<boolean> {
	const r = await db()
		.delete(team)
		.where(and(eq(team.id, id), eq(team.ownerSub, ownerSub)))
		.returning({ id: team.id });
	return r.length > 0;
}
