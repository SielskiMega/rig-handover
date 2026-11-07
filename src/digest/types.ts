export type Status = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log. Missing data stays visible: owner is null, not dropped.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number; // every valid line for this job
  retries: number; // lines with status "retry"
  lastStatus: Status;
  lastError: string | null; // error of the last line that had one
  first: string; // `at` of the first line, offset kept as logged
  last: string; // `at` of the last line, offset kept as logged
};

export type Digest = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse or were not a valid run line
};

// Returns null when runs/<night>.jsonl does not exist (callers answer 404).
// An empty file returns { rows: [], badLines: 0 }. Never throws on bad lines.
export type ReadNight = (runsDir: string, night: string) => Digest | null;
