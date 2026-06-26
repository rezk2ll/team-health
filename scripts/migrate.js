// Apply Drizzle migrations at container start. Uses drizzle-orm's migrator (a
// prod dependency) so the runtime image doesn't need drizzle-kit.
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('migrate: DATABASE_URL is not set');
	process.exit(1);
}

const sql = postgres(url, { max: 1 });
try {
	await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
	console.log('migrate: up to date');
} catch (e) {
	console.error('migrate: failed', e);
	process.exit(1);
} finally {
	await sql.end();
}
