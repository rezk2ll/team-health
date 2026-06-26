type Theme = 'light' | 'dark';

/** Light/dark theme toggle. The boot script in app.html applies the saved/preferred
 * theme before first paint; this store stays in sync and persists user changes. */
class ThemeStore {
	current = $state<Theme>('light');

	/** Read the class the boot script already applied so the store matches the DOM. */
	init() {
		if (typeof document === 'undefined') return;
		this.current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
	}

	set(t: Theme) {
		this.current = t;
		if (typeof document === 'undefined') return;
		document.documentElement.classList.toggle('dark', t === 'dark');
		try {
			localStorage.setItem('theme', t);
		} catch {
			/* storage blocked (private mode) — keep the in-memory choice */
		}
	}

	toggle() {
		this.set(this.current === 'dark' ? 'light' : 'dark');
	}
}

export const theme = new ThemeStore();
