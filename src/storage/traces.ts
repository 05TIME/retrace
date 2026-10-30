import { kvs } from '@forge/kvs';
import type { Trace, TriageInput } from '../core';

export interface StoredTrace {
  trace: Trace;
  input: TriageInput;
}

const key = (issueKey: string) => `trace:${issueKey}`;

export async function saveTrace(record: StoredTrace): Promise<void> {
  await kvs.set(key(record.trace.issueKey), record);
}

export async function loadTrace(issueKey: string): Promise<StoredTrace | undefined> {
  return (await kvs.get(key(issueKey))) as StoredTrace | undefined;
}
