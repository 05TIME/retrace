/** Canonical JSON: sorted object keys, no whitespace, rejects non-finite numbers and undefined values in arrays. */
export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export function canonicalize(value: unknown): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError('Non-finite number in canonical JSON');
      return JSON.stringify(Object.is(value, -0) ? 0 : value);
    case 'string':
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) {
        return '[' + value.map((v) => {
          if (v === undefined) throw new TypeError('undefined in array');
          return canonicalize(v);
        }).join(',') + ']';
      }
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
      return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
    }
    default:
      throw new TypeError(`Unsupported type in canonical JSON: ${typeof value}`);
  }
}
