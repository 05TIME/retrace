import Resolver from '@forge/resolver';
import { latest, replayLatest, triage, whatIfLatest } from '../service';

const resolver = new Resolver();
const issueKeyOf = (req: any) => {
  const key = req.context?.extension?.issue?.key;
  console.log(`retrace resolver: issue=${key ?? 'none'}`);
  return key;
};

resolver.define('getTrace', async (req) => {
  const t = await latest(issueKeyOf(req));
  console.log(`retrace getTrace: ${t ? 'trace ' + t.rootHash.slice(0, 12) : 'none'}`);
  return t;
});
resolver.define('triage', async (req) => triage(issueKeyOf(req)));
resolver.define('replay', async (req) => replayLatest(issueKeyOf(req)));
resolver.define('whatIf', async (req) => whatIfLatest(issueKeyOf(req), (req.payload as any)?.overrides));

export const handler = resolver.getDefinitions();
