import Resolver from '@forge/resolver';
import { latest, replayLatest, triage, whatIfLatest } from '../service';

const resolver = new Resolver();
const issueKeyOf = (req: any) => {
  const key = req.context?.extension?.issue?.key;
  console.log(`retrace resolver: issue=${key ?? 'none'}`);
  return key;
};

resolver.define('getTrace', async (req) => latest(issueKeyOf(req)));
resolver.define('triage', async (req) => triage(issueKeyOf(req)));
resolver.define('replay', async (req) => replayLatest(issueKeyOf(req)));
resolver.define('whatIf', async (req) => whatIfLatest(issueKeyOf(req), (req.payload as any)?.overrides));

export const handler = resolver.getDefinitions();
