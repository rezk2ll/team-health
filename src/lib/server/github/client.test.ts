import { describe, it, expect, vi, beforeEach } from 'vitest';

// The client reads the token from $env/dynamic/private; mock it so the test is
// deterministic with or without a local .env (CI has none).
vi.mock('$env/dynamic/private', () => ({ env: { GITHUB_TOKEN: 'test-token' } }));

const { graphql, RateLimitError } = await import('./client');

const rateLimitResponse = () => ({
	status: 200,
	ok: true,
	headers: new Headers({ 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600) }),
	json: async () => ({ errors: [{ type: 'RATE_LIMIT', message: 'API rate limit exceeded' }] }),
	text: async () => '',
	body: null
});

describe('graphql rate-limit circuit breaker', () => {
	beforeEach(() => vi.restoreAllMocks());

	it('throws RateLimitError on a primary limit, then fails fast without re-fetching', async () => {
		const fetchMock = vi.fn().mockResolvedValue(rateLimitResponse());
		vi.stubGlobal('fetch', fetchMock);

		await expect(graphql('{ a }')).rejects.toBeInstanceOf(RateLimitError);
		const callsAfterFirst = fetchMock.mock.calls.length;
		expect(callsAfterFirst).toBe(1); // primary limit is not retried

		// Breaker is open now: the next call must not touch the network.
		await expect(graphql('{ b }')).rejects.toBeInstanceOf(RateLimitError);
		expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
	});
});
