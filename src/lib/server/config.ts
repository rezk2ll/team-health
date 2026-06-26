// Shared config-shaped types used by the chart transforms. (The app no longer
// reads a config.yaml from disk; selection comes from the client + env presets.)
export type Author = [login: string, displayName: string, email: string];
export type Repo = [owner: string, name: string];
export type Team = {
	name: string;
	authors: Author[];
	repos: Repo[];
};

export type AppConfig = {
	months: number;
	commit_months: number;
	repo_list: Repo[];
	active_teams: string[];
	teams: Team[];
};
