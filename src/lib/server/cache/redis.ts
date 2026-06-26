import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

// Single shared ioredis connection per process, created lazily on first use.
let client: Redis | null = null;

export function getRedis(): Redis {
	if (!client) {
		client = new Redis(env.REDIS_URL as string, {
			maxRetriesPerRequest: 2,
			enableReadyCheck: true,
			lazyConnect: false
		});
		// Don't let connection errors crash the process; cache ops swallow failures.
		client.on('error', () => {});
	}
	return client;
}
