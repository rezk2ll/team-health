import { describe, it, expect, vi, beforeEach } from 'vitest';

// The client reads the token from $env/dynamic/private; mock it so the test is
// deterministic with or without a local .env (CI has none).
vi.mock('$env/dynamic/private', () => ({ env: { GITHUB_TOKEN: 'test-token' } }));

// The breaker is module-level state; re-import fresh per test so they don't leak.
async function freshClient() {
	vi.resetModules();
	return import('./client');
}

const primaryLimit = () => ({
	status: 200,
	ok: true,
	headers: new Headers({ 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600) }),
	json: async () => ({ errors: [{ type: 'RATE_LIMIT', message: 'API rate limit exceeded' }] }),
	text: async () => '',
	body: null
});

const secondaryLimit = () => ({
	status: 403,
	ok: false,
	headers: new Headers({ 'retry-after': '1' }),
	json: async () => ({}),
	text: async () => 'You have exceeded a secondary rate limit',
	body: null
});

describe('graphql rate-limit circuit breaker', () => {
	beforeEach(() => vi.restoreAllMocks());

	it('throws RateLimitError on a primary limit, then fails fast without re-fetching', async () => {
		const { graphql, RateLimitError } = await freshClient();
		const fetchMock = vi.fn().mockResolvedValue(primaryLimit());
		vi.stubGlobal('fetch', fetchMock);

		await expect(graphql('{ a }')).rejects.toBeInstanceOf(RateLimitError);
		expect(fetchMock.mock.calls.length).toBe(1); // primary limit is not retried

		await expect(graphql('{ b }')).rejects.toBeInstanceOf(RateLimitError);
		expect(fetchMock.mock.calls.length).toBe(1); // breaker open: no network
	});

	it('backs off (no retry) and opens the breaker on a secondary/abuse limit', async () => {
		const { graphql, RateLimitError } = await freshClient();
		const fetchMock = vi.fn().mockResolvedValue(secondaryLimit());
		vi.stubGlobal('fetch', fetchMock);

		await expect(graphql('{ a }')).rejects.toBeInstanceOf(RateLimitError);
		expect(fetchMock.mock.calls.length).toBe(1); // not retried into the abuse wall

		await expect(graphql('{ b }')).rejects.toBeInstanceOf(RateLimitError);
		expect(fetchMock.mock.calls.length).toBe(1); // coordinated cooldown: no network
	});
});
