import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Button, ButtonGroup, Code, Heading, Inline, Lozenge, SectionMessage, Spinner, Stack, Text, TextArea,
} from '@forge/react';
import { invoke } from '@forge/bridge';
import { isTrace } from '../core/guard';

const errText = (v: any) => (v && typeof v === 'object' && typeof v.error === 'string' ? v.error : null);

/** Without this, any render error unmounts the tree and the host shows an empty (blank) panel. */
class Boundary extends React.Component<{ children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: Error) { return { err: e?.message ?? String(e) }; }
  componentDidCatch(e: Error) { console.error('retrace panel render error', e); }
  render() {
    return this.state.err
      ? <SectionMessage appearance="error"><Text>Retrace panel error: {this.state.err}</Text></SectionMessage>
      : this.props.children;
  }
}

const short = (h?: string) => (h ? h.slice(0, 12) : '—');

const App = () => {
  const [trace, setTrace] = useState<any>(null);
  const [replayRes, setReplayRes] = useState<any>(null);
  const [whatIfRes, setWhatIfRes] = useState<any>(null);
  const [overrides, setOverrides] = useState('{"labels":["security"]}');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const accept = (v: any) => {
    const e = errText(v);
    if (e) throw new Error(e);
    if (v !== null && v !== undefined && !isTrace(v)) throw new Error('Unexpected trace format from resolver');
    setTrace(v ?? null);
  };

  useEffect(() => { run(async () => accept(await invoke('getTrace'))).finally(() => setLoaded(true)); }, []);

  return (
    <Stack space="space.200">
      {error && <SectionMessage appearance="error"><Text>{error}</Text></SectionMessage>}
      <ButtonGroup>
        <Button appearance="primary" isDisabled={busy} onClick={() => run(async () => { accept(await invoke('triage')); setReplayRes(null); setWhatIfRes(null); })}>Triage + record</Button>
        <Button isDisabled={busy || !trace} onClick={() => run(async () => setReplayRes(await invoke('replay')))}>Replay</Button>
        <Button isDisabled={busy || !trace} onClick={() => run(async () => setWhatIfRes(await invoke('whatIf', { overrides })))}>What-if</Button>
      </ButtonGroup>
      {!loaded && <Inline space="space.100"><Spinner size="small" /><Text>Loading Retrace trace…</Text></Inline>}
      {loaded && !trace && <Text>No trace yet for this issue.</Text>}
      {trace && (
        <Stack space="space.100">
          <Heading size="small">Decision</Heading>
          <Inline space="space.100">
            <Lozenge appearance="moved">{trace.decision.priority}</Lozenge>
            {trace.decision.labels.map((l: string) => <Lozenge key={l}>{l}</Lozenge>)}
          </Inline>
          <Text>Assignee: {trace.decision.assignee ?? 'none'} · seed {trace.seed} · root <Code>{short(trace.rootHash)}</Code></Text>
          <Heading size="small">Trace</Heading>
          {trace.steps.map((s: any) => (
            <Text key={s.index}>{s.index}. {s.name} → <Code>{short(s.hash)}</Code></Text>
          ))}
        </Stack>
      )}
      {replayRes && (
        <SectionMessage appearance={replayRes.ok ? 'success' : 'warning'}>
          <Text>{replayRes.ok ? 'Replay matched every step.' : `Replay diverged at step ${replayRes.divergedAt}: ${replayRes.reason}`}</Text>
        </SectionMessage>
      )}
      <TextArea name="overrides" value={overrides} onChange={(e: any) => setOverrides(e.target.value)} />
      {whatIfRes?.found && Array.isArray(whatIfRes.diff) && (
        <Stack space="space.050">
          <Heading size="small">What-if diff</Heading>
          {whatIfRes.diff.length === 0 && <Text>No change in outcome.</Text>}
          {whatIfRes.diff.map((d: any) => (
            <Text key={d.field}>{d.field}: <Code>{JSON.stringify(d.before)}</Code> → <Code>{JSON.stringify(d.after)}</Code></Text>
          ))}
        </Stack>
      )}
      <Text>Retrace panel v0.1.1</Text>
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><Boundary><App /></Boundary></React.StrictMode>);
