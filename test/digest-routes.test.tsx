import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Digest } from '../src/digest/types.js';

const base = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };
let tmp: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  writeFileSync(join(tmp, '2030-01-01.jsonl'), '');
  writeFileSync(
    join(tmp, '2030-01-02.jsonl'),
    [
      '{"at":"2030-01-02T01:00:00+01:00","job":"a/one","status":"ok","owner":"rook"}',
      'this is not json',
      '{"at":"2030-01-02T02:00:00+01:00","job":"b/two","status":"ok","owner":null}',
    ].join('\n') + '\n',
  );
});

afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('digest routes', () => {
  const real = createApp({ ...base, runsDir: 'runs' });

  it('serves the real night as page and JSON', async () => {
    expect((await real.request('/digest/2026-10-28')).status).toBe(200);
    expect((await real.request('/api/digest/2026-10-28')).status).toBe(200);
  });

  it('404s on a night with no file', async () => {
    expect((await real.request('/digest/2001-01-01')).status).toBe(404);
    expect((await real.request('/api/digest/2001-01-01')).status).toBe(404);
  });

  it('empty night: page says nothing ran, JSON has no rows', async () => {
    const app = createApp({ ...base, runsDir: tmp });
    const page = await app.request('/digest/2030-01-01');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    const json = await app.request('/api/digest/2030-01-01');
    expect(json.status).toBe(200);
    expect(((await json.json()) as Digest).rows).toEqual([]);
  });

  it('bad line: page still 200, JSON counts it', async () => {
    const app = createApp({ ...base, runsDir: tmp });
    expect((await app.request('/digest/2030-01-02')).status).toBe(200);
    const d = (await (await app.request('/api/digest/2030-01-02')).json()) as Digest;
    expect(d.badLines).toBe(1);
    expect(d.rows.map((r) => r.job)).toEqual(['a/one', 'b/two']);
  });

  it('page and JSON list the same jobs in the same order', async () => {
    const html = await (await real.request('/digest/2026-10-28')).text();
    const d = (await (await real.request('/api/digest/2026-10-28')).json()) as Digest;
    const jobs = d.rows.map((r) => r.job);
    expect(jobs.length).toBeGreaterThan(0);
    const positions = jobs.map((j) => html.indexOf(`<td>${j}</td>`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
