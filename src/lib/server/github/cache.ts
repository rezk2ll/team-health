// In-memory TTL cache with in-flight de-duplication. No disk, so it is safe to
// run on a stateless server; concurrent identical requests share one fetch.
export class TTLCache<V> {
	#entries = new Map<string, { value: V; expires: number }>();
	#inflight = new Map<string, Promise<V>>();

	constructor(
		private readonly ttlMs: number,
		private readonly maxEntries = 1000
	) {}

	get(key: string): V | undefined {
		const hit = this.#entries.get(key);
		if (!hit) return undefined;
		if (hit.expires < Date.now()) {
			this.#entries.delete(key);
			return undefined;
		}
		return hit.value;
	}

	set(key: string, value: V): void {
		this.#entries.set(key, { value, expires: Date.now() + this.ttlMs });
		if (this.#entries.size > this.maxEntries) this.#evict();
	}

	// Bound memory: drop expired entries, then oldest-inserted until under the cap.
	#evict(): void {
		const now = Date.now();
		for (const [k, e] of this.#entries) if (e.expires < now) this.#entries.delete(k);
		while (this.#entries.size > this.maxEntries) {
			const oldest = this.#entries.keys().next().value;
			if (oldest === undefined) break;
			this.#entries.delete(oldest);
		}
	}

	/** Return the cached value, or compute it once even under concurrent calls. */
	async getOrCompute(key: string, compute: () => Promise<V>): Promise<V> {
		const cached = this.get(key);
		if (cached !== undefined) return cached;

		const pending = this.#inflight.get(key);
		if (pending) return pending;

		const promise = compute()
			.then((value) => {
				this.set(key, value);
				return value;
			})
			.finally(() => this.#inflight.delete(key));
		this.#inflight.set(key, promise);
		return promise;
	}

	delete(key: string): void {
		this.#entries.delete(key);
	}

	clear(): void {
		this.#entries.clear();
	}
}
