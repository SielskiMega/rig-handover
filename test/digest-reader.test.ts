import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl: 5 jobs, 1 bad line', () => {
    const d = readNight('runs', '2026-10-28');
    expect(d?.rows.map((r) => r.job)).toEqual([
      'digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs',
    ]);
    expect(d?.badLines).toBe(1);
    const fx = d?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(fx).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: 'upstream 503' });
    expect(d?.rows.find((r) => r.job === 'notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('keeps a null owner and the logged offset', () => {
    const r = readNight('runs', '2026-10-28')?.rows.find((x) => x.job === 'digest/render');
    expect(r?.owner).toBeNull();
    expect(r?.first).toBe('2026-10-29T05:41:09+01:00');
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '2001-01-01')).toBeNull();
  });
});
