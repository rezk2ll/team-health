import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

// Lazy singleton: the DB connection is created on first use so the app can boot
// (and dev can run) without DATABASE_URL. Persistence features check `hasDb()`.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function hasDb(): boolean {
	return Boolean(env.DATABASE_URL);
}

export function db() {
	if (!_db) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
		const client = postgres(env.DATABASE_URL, { max: Number(env.DATABASE_POOL_MAX ?? 10) });
		_db = drizzle(client, { schema });
	}
	return _db;
}

export { schema };
