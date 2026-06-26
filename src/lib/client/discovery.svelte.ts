// Client cache of org repos + members, fetched once from the discovery endpoints.
import type { Member, Repo } from '$lib/server/github/types';
import { redirectToSignIn } from './metrics.svelte';

class DiscoveryStore {
	repos = $state<Repo[]>([]);
	members = $state<Member[]>([]);
	orgs = $state<string[]>([]);
	loading = $state(false);
	loaded = $state(false);
	error = $state<string | null>(null);

	async ensure(): Promise<void> {
		if (this.loaded || this.loading) return;
		this.loading = true;
		this.error = null;
		try {
			const [r, m] = await Promise.all([
				fetch('/api/discovery/repos'),
				fetch('/api/discovery/members')
			]);
			if (r.status === 401 || m.status === 401) return redirectToSignIn();
			if (!r.ok) throw new Error(`repos: ${r.status}`);
			if (!m.ok) throw new Error(`members: ${m.status}`);
			const rj = await r.json();
			const mj = await m.json();
			this.repos = rj.repos;
			this.members = mj.members;
			this.orgs = rj.orgs;
			this.loaded = true;
		} catch (e) {
			this.error = (e as Error).message;
		} finally {
			this.loading = false;
		}
	}
}

export const discovery = new DiscoveryStore();
