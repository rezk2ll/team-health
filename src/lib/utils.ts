import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Type helpers used by the shadcn-svelte components (e.g. the chart primitives).
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function fmtNum(n: number | null | undefined, opts?: Intl.NumberFormatOptions) {
	if (n === null || n === undefined || Number.isNaN(n)) return '—';
	return new Intl.NumberFormat('en-US', opts).format(n);
}

export function fmtMonth(ym: string) {
	const [y, m] = ym.split('-').map(Number);
	const d = new Date(y, m - 1, 1);
	return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function pluralize(n: number, single: string, plural?: string) {
	return n === 1 ? single : (plural ?? `${single}s`);
}
