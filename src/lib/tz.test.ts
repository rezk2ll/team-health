import { describe, it, expect } from 'vitest';
import { isValidTimeZone, withTeamTz } from './tz';

describe('isValidTimeZone', () => {
	it('accepts real IANA zones and rejects junk', () => {
		expect(isValidTimeZone('Asia/Ho_Chi_Minh')).toBe(true);
		expect(isValidTimeZone('Europe/Paris')).toBe(true);
		expect(isValidTimeZone('UTC')).toBe(true);
		expect(isValidTimeZone('Not/AZone')).toBe(false);
		expect(isValidTimeZone('')).toBe(false);
		expect(isValidTimeZone(undefined)).toBe(false);
		expect(isValidTimeZone(7)).toBe(false);
	});
});

describe('withTeamTz', () => {
	const members = [
		{ login: 'a', name: 'A' }, // inherits the team default
		{ login: 'b', name: 'B', tz: 'Europe/Paris' }, // own override wins
		{ login: 'c', name: 'C', tz: 'Bogus/Zone' } // invalid override -> team default
	];

	it('applies the team default to members without a valid own zone', () => {
		const out = withTeamTz(members, 'Asia/Ho_Chi_Minh');
		expect(out.find((m) => m.login === 'a')?.tz).toBe('Asia/Ho_Chi_Minh');
		expect(out.find((m) => m.login === 'b')?.tz).toBe('Europe/Paris');
		expect(out.find((m) => m.login === 'c')?.tz).toBe('Asia/Ho_Chi_Minh');
	});

	it('leaves members without any zone undefined when the team default is missing/invalid', () => {
		const out = withTeamTz(members, 'Bogus/Zone');
		expect(out.find((m) => m.login === 'a')?.tz).toBeUndefined();
		expect(out.find((m) => m.login === 'b')?.tz).toBe('Europe/Paris');
	});
});
