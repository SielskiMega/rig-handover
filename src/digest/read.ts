import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Digest, DigestRow, ReadNight, Status } from './types.js';

const STATUSES: readonly string[] = ['ok', 'retry', 'fail'];
const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

export type Line = { at: string; job: string; status: Status; owner: string | null; error: string | null };

// Parse at the edge: anything that is not a valid run line is a bad line.
export function parseLine(text: string): Line | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string' || typeof o.status !== 'string') return null;
  if (!STATUSES.includes(o.status)) return null;
  return {
    at: o.at,
    job: o.job,
    status: o.status as Status,
    owner: typeof o.owner === 'string' ? o.owner : null,
    error: typeof o.error === 'string' ? o.error : null,
  };
}

export const readNight: ReadNight = (runsDir, night): Digest | null => {
  if (!NIGHT.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const rows = new Map<string, DigestRow>();
  let badLines = 0;
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    const l = parseLine(raw);
    if (!l) {
      badLines++;
      continue;
    }
    const row = rows.get(l.job);
    if (!row) {
      rows.set(l.job, {
        job: l.job, owner: l.owner, runs: 1, retries: l.status === 'retry' ? 1 : 0,
        lastStatus: l.status, lastError: l.error, first: l.at, last: l.at,
      });
      continue;
    }
    row.runs++;
    if (l.status === 'retry') row.retries++;
    row.lastStatus = l.status;
    row.last = l.at;
    if (l.error) row.lastError = l.error;
    if (l.owner && !row.owner) row.owner = l.owner;
  }
  return { night, rows: [...rows.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0)), badLines };
};
