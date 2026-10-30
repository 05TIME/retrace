import { createHash } from 'node:crypto';
import { canonicalize } from './canonical';

export const GENESIS = '0'.repeat(64);

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function hashValue(value: unknown): string {
  return sha256(canonicalize(value));
}
