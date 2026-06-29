import { describe, it, expect } from 'vitest';
import { groupHistory, dayKey } from './signal-history';

describe('dayKey', () => {
	it('formats a UTC date as YYYY-MM-DD', () => {
		expect(dayKey(new Date('2026-06-29T23:30:00Z'))).toBe('2026-06-29');
	});
});

describe('groupHistory', () => {
	it('groups by signal id and orders each timeline oldest-day-first', () => {
		const rows = [
			{ signalId: 'burnout', day: '2026-06-03', level: 'bad', value: '2 people' },
			{ signalId: 'burnout', day: '2026-06-01', level: 'warn', value: '1 person' },
			{ signalId: 'workload', day: '2026-06-02', level: 'ok', value: '20%' }
		];
		const h = groupHistory(rows);
		expect(h.burnout.map((p) => p.day)).toEqual(['2026-06-01', '2026-06-03']);
		expect(h.burnout[0].level).toBe('warn');
		expect(h.workload).toEqual([{ day: '2026-06-02', level: 'ok', value: '20%' }]);
	});

	it('returns an empty object for no rows', () => {
		expect(groupHistory([])).toEqual({});
	});
});
