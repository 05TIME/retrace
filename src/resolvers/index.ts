import Resolver from '@forge/resolver';
import { latest, replayLatest, triage, whatIfLatest } from '../service';

const resolver = new Resolver();
const issueKeyOf = (req: any) => {
  const key = req.context?.extension?.issue?.key;
  console.log(`retrace resolver: issue=${key ?? 'none'}`);
  return key;
};

resolver.define('getTrace', async (req) => {
  const r = await latest(issueKeyOf(req));
  console.log(`retrace getTrace: ${r.trace ? 'trace ' + r.trace.rootHash.slice(0, 12) : r.legacy ? 'legacy' : 'none'}`);
  return r;
});
const safe = <T>(fn: () => Promise<T>) => fn().catch((e: Error) => ({ error: e.message }));
resolver.define('triage', async (req) => safe(() => triage(issueKeyOf(req))));
resolver.define('replay', async (req) => safe(() => replayLatest(issueKeyOf(req))));
resolver.define('whatIf', async (req) => safe(() => whatIfLatest(issueKeyOf(req), (req.payload as any) ?? {})));

export const handler = resolver.getDefinitions();
