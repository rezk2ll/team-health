import { describe, it, expect } from 'vitest';
import { parseRepos, parseMembers } from './validate';

describe('parseRepos', () => {
	it('rejects owner/repo that could break out of a GraphQL string (injection guard)', () => {
		const repos = parseRepos(
			[
				{ owner: 'linagora', repo: 'cozy-home' },
				{ owner: 'x" ) { evil }', repo: 'y' }, // injection attempt
				{ owner: 'ok', repo: 'has space' }, // invalid repo name
				{ owner: 'ok', repo: 'a"b' } // quote in repo name
			],
			40
		);
		expect(repos).toEqual([{ owner: 'linagora', repo: 'cozy-home' }]);
	});

	it('restricts to allowed orgs (authorization guard), case-insensitively, and dedupes', () => {
		const repos = parseRepos(
			[
				{ owner: 'Linagora', repo: 'a' },
				{ owner: 'linagora', repo: 'a' }, // dup
				{ owner: 'secret-org', repo: 'private' } // not allowed
			],
			40,
			['linagora', 'cozy']
		);
		expect(repos).toEqual([{ owner: 'Linagora', repo: 'a' }]);
	});

	it('caps the list length', () => {
		const many = Array.from({ length: 100 }, (_, i) => ({ owner: 'linagora', repo: `r${i}` }));
		expect(parseRepos(many, 5)).toHaveLength(5);
	});
});

describe('parseMembers', () => {
	it('keeps valid logins, drops malformed ones, defaults name', () => {
		const members = parseMembers(
			[
				{ login: 'Octo-Cat' },
				{ login: 'bad login!' }, // space + bang
				{ login: 'ok', name: 'Okay', email: 'o@x.io' },
				{ nope: true }
			],
			60
		);
		expect(members).toEqual([
			{ login: 'Octo-Cat', name: 'Octo-Cat', email: undefined },
			{ login: 'ok', name: 'Okay', email: 'o@x.io' }
		]);
	});

	it('drops an email containing a quote (injection guard)', () => {
		const [m] = parseMembers([{ login: 'x', email: 'a"b@x.io' }], 60);
		expect(m.email).toBeUndefined();
	});
});
