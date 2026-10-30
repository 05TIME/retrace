import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Badge, Button, ButtonGroup, Checkbox, Code, Heading, Inline, Label, Lozenge, SectionMessage, Select, Spinner, Stack,
  Text, TextArea, Toggle,
} from '@forge/react';
import { invoke } from '@forge/bridge';
import { traceStatus } from '../core/guard';

const VERSION = 'v0.3.0';
const LABEL_CHOICES = ['security', 'outage', 'crash', 'data-loss', 'performance', 'bug', 'ux', 'docs'];
const PRIORITY_OPTIONS = [
  { label: 'Keep scored priority', value: '' },
  ...['Highest', 'High', 'Medium', 'Low', 'Lowest'].map((p) => ({ label: `Force ${p}`, value: p })),
];

const errText = (v: any) => (v && typeof v === 'object' && typeof v.error === 'string' ? v.error : null);
const short = (h?: string | null) => (h ? h.slice(0, 12) : '—');
const priorityLook = (p: string): 'removed' | 'moved' | 'inprogress' | 'default' | 'success' =>
  p === 'Highest' ? 'removed' : p === 'High' ? 'moved' : p === 'Medium' ? 'inprogress' : p === 'Low' ? 'default' : 'success';
const show = (v: unknown) => (Array.isArray(v) ? (v.length ? v.join(', ') : 'none') : v === null || v === undefined ? 'none' : String(v));

/** Display-only rewording; hashed trace text must stay byte-identical within an engine version. */
const displayReason = (r: string) =>
  r === 'Assignee: no assignable users found.' ? 'Assignee: Unassigned: no assignable users on this project.' : r;

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

const Decision = ({ d }: { d: any }) => (
  <Stack space="space.100">
    <Inline space="space.100" alignBlock="center">
      <Text>Priority</Text>
      <Lozenge appearance={priorityLook(d.priority)} isBold>{d.priority}</Lozenge>
    </Inline>
    <Inline space="space.100" alignBlock="center" shouldWrap>
      <Text>Labels</Text>
      {d.labels.length === 0 ? <Text>none</Text> : d.labels.map((l: string) => <Lozenge key={l}>{l}</Lozenge>)}
    </Inline>
    <Text>Assignee: {d.assigneeName ?? d.assignee ?? 'Unassigned: no assignable users on this project'}</Text>
    {Array.isArray(d.reasons) && d.reasons.length > 0 && (
      <Stack space="space.050">
        <Heading size="xsmall">Why</Heading>
        {d.reasons.map((r: string, i: number) => <Text key={i}>• {displayReason(r)}</Text>)}
      </Stack>
    )}
  </Stack>
);

const App = () => {
  const [trace, setTrace] = useState<any>(null);
  const [legacy, setLegacy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'information'; text: string } | null>(null);
  const [replayRes, setReplayRes] = useState<any>(null);
  const [whatIfRes, setWhatIfRes] = useState<any>(null);
  const [addLabels, setAddLabels] = useState<string[]>([]);
  const [removeLabels, setRemoveLabels] = useState<string[]>([]);
  const [force, setForce] = useState(PRIORITY_OPTIONS[0]);
  const [advanced, setAdvanced] = useState(false);
  const [json, setJson] = useState('{"summary":"Checkout is down for all users"}');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const check = (v: any) => { const e = errText(v); if (e) throw new Error(e); return v; };

  const load = async () => {
    const v = check(await invoke('getTrace'));
    // Accept both the current {trace, legacy} shape and a bare trace from older resolvers.
    const t = v && typeof v === 'object' && 'trace' in v ? v.trace : v;
    const st = traceStatus(t);
    setTrace(st === 'current' ? t : null);
    setLegacy(Boolean(v?.legacy) || st === 'legacy');
  };

  useEffect(() => { run(load).finally(() => setLoaded(true)); }, []);

  const doTriage = () => run(async () => {
    const t = check(await invoke('triage'));
    setTrace(t); setLegacy(false); setReplayRes(null); setWhatIfRes(null);
    setNotice(t.unchanged
      ? { kind: 'information', text: `Unchanged: same inputs → same hash ${short(t.rootHash)}. That's determinism.` }
      : { kind: 'success', text: `Recorded new trace. Root hash ${short(t.rootHash)}${t.previousRootHash ? ` (was ${short(t.previousRootHash)}; the issue changed)` : ''}.` });
  });

  const doWhatIf = () => run(async () => {
    const payload: any = { addLabels, removeLabels, forcePriority: force.value };
    if (advanced) payload.overrides = json;
    setWhatIfRes(check(await invoke('whatIf', payload)));
  });

  const toggleIn = (set: typeof setAddLabels) => (l: string, on: boolean) =>
    set((cur) => (on ? [...new Set([...cur, l])].sort() : cur.filter((x) => x !== l)));
  const toggleLabel = toggleIn(setAddLabels);
  const toggleRemove = toggleIn(setRemoveLabels);
  const resetWhatIf = () => { setAddLabels([]); setRemoveLabels([]); setForce(PRIORITY_OPTIONS[0]); setAdvanced(false); setWhatIfRes(null); };

  return (
    <Stack space="space.200">
      {error && <SectionMessage appearance="error"><Text>{error}</Text></SectionMessage>}
      <ButtonGroup>
        <Button appearance="primary" isDisabled={busy} onClick={doTriage}>Triage + record</Button>
        <Button isDisabled={busy || !trace} onClick={() => run(async () => setReplayRes(check(await invoke('replay'))))}>Replay</Button>
      </ButtonGroup>
      {busy && <Inline space="space.100"><Spinner size="small" /><Text>Working…</Text></Inline>}
      {notice && <SectionMessage appearance={notice.kind}><Text>{notice.text}</Text></SectionMessage>}
      {!loaded && <Inline space="space.100"><Spinner size="small" /><Text>Loading Retrace trace…</Text></Inline>}
      {loaded && legacy && !trace && (
        <SectionMessage appearance="information">
          <Text>This issue has a trace from an older Retrace version. Click "Triage + record" to make a fresh one.</Text>
        </SectionMessage>
      )}
      {loaded && !legacy && !trace && <Text>No trace yet. Click "Triage + record" to triage this issue.</Text>}

      {replayRes && (replayRes.found ? (
        <SectionMessage appearance={replayRes.ok ? 'success' : 'error'}>
          <Inline space="space.100" alignBlock="center">
            <Lozenge appearance={replayRes.ok ? 'success' : 'removed'} isBold>{replayRes.ok ? 'Verified' : 'Mismatch'}</Lozenge>
            <Text>{replayRes.ok
              ? `Re-ran all ${replayRes.steps} steps; every hash matched (${short(replayRes.rootHash)}).`
              : `Diverged at step ${replayRes.divergedAt}: ${replayRes.reason}`}</Text>
          </Inline>
        </SectionMessage>
      ) : <SectionMessage appearance="information"><Text>{replayRes.note}</Text></SectionMessage>)}

      {trace && (
        <Stack space="space.100">
          <Heading size="small">Decision</Heading>
          <Decision d={trace.decision} />
          <Heading size="small">Trace</Heading>
          {trace.steps.map((s: any) => (
            <Inline key={s.index} space="space.100" alignBlock="center">
              <Badge>{s.index}</Badge><Text>{s.name}</Text><Code>{short(s.hash)}</Code>
            </Inline>
          ))}
          <Text>Seed {trace.seed} · root <Code>{short(trace.rootHash)}</Code></Text>

          <Heading size="small">What-if</Heading>
          <Text>Pretend the issue also had these labels:</Text>
          <Inline space="space.100" shouldWrap>
            {LABEL_CHOICES.map((l) => (
              <Checkbox key={l} label={l} value={l} isChecked={addLabels.includes(l)}
                onChange={(e: any) => toggleLabel(l, Boolean(e?.target?.checked))} />
            ))}
          </Inline>
          {trace.decision.labels.length > 0 && (<>
            <Text>Pretend these detected labels were removed:</Text>
            <Inline space="space.100" shouldWrap>
              {trace.decision.labels.map((l: string) => (
                <Checkbox key={`rm-${l}`} label={l} value={l} isChecked={removeLabels.includes(l)}
                  onChange={(e: any) => toggleRemove(l, Boolean(e?.target?.checked))} />
              ))}
            </Inline>
          </>)}
          <Label labelFor="retrace-force">Priority</Label>
          <Select inputId="retrace-force" options={PRIORITY_OPTIONS} value={force} onChange={(o: any) => setForce(o ?? PRIORITY_OPTIONS[0])} />
          <Inline space="space.100" alignBlock="center">
            <Toggle id="retrace-adv" isChecked={advanced} onChange={() => setAdvanced(!advanced)} />
            <Label labelFor="retrace-adv">Advanced: JSON overrides</Label>
          </Inline>
          {advanced && <TextArea name="overrides" value={json} onChange={(e: any) => setJson(e.target.value)} />}
          <ButtonGroup>
            <Button isDisabled={busy} onClick={doWhatIf}>Run what-if</Button>
            <Button appearance="subtle" isDisabled={busy} onClick={resetWhatIf}>Reset</Button>
          </ButtonGroup>
        </Stack>
      )}

      {whatIfRes && !whatIfRes.found && <SectionMessage appearance="information"><Text>{whatIfRes.note}</Text></SectionMessage>}
      {whatIfRes?.found && (
        <Stack space="space.100">
          <Heading size="small">What-if result</Heading>
          <Text>Applied: {Array.isArray(whatIfRes.appliedSummary) && whatIfRes.appliedSummary.length ? whatIfRes.appliedSummary.join('; ') : 'nothing (no overrides chosen)'}</Text>
          {whatIfRes.diff.length === 0
            ? <SectionMessage appearance="information"><Text>No change: the overrides above matched the current decision, so priority, labels and assignee stay the same.</Text></SectionMessage>
            : whatIfRes.diff.map((d: any) => (
              <Inline key={d.field} space="space.100" alignBlock="center" shouldWrap>
                <Text>{d.field}:</Text>
                <Lozenge appearance="removed">{show(d.before)}</Lozenge>
                <Text>→</Text>
                <Lozenge appearance="success">{show(d.after)}</Lozenge>
              </Inline>
            ))}
          <Text>Before <Code>{short(whatIfRes.rootHash)}</Code> → after <Code>{short(whatIfRes.altRootHash)}</Code> (same seed; nothing stored)</Text>
        </Stack>
      )}
      <Text>Retrace panel {VERSION}</Text>
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><Boundary><App /></Boundary></React.StrictMode>);
