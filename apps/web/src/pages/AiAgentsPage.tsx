import { Info } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import { ActionButton } from '../components/ActionButton';
import { Badge } from '../components/Badge';
import { EmptyState, InlineError, PageHeader, TableSkeleton } from '../components/ui';
import { when } from '../lib/format';
import { ApiError, apiGet, apiPost } from '../lib/api';
import tableStyles from '../components/ResourceListPage.module.css';
import styles from './AiAgents.module.css';

interface Agent { id: string; code: string; name: string; purpose: string; permissionLevel: string; analyzerKey: string | null; status: string }
interface Run { id: string; agentId: string; status: string; summary: string | null; findingCount: number; startedAt: string; error: string | null }
interface Finding { id: string; agentId: string; severity: string; title: string; detail: string; entityType: string | null; status: string; createdAt: string }

const STATUSES = ['PROPOSED', 'ACKNOWLEDGED', 'DISMISSED'] as const;

export function AiAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>('PROPOSED');
  const [error, setError] = useState<string | null>(null);

  const loadFindings = useCallback(async () => {
    try {
      setFindings(await apiGet<Finding[]>(`/ai-findings?status=${filter}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load findings');
    }
  }, [filter]);

  const loadRuns = useCallback(() => {
    apiGet<Run[]>('/ai-runs').then(setRuns).catch(() => {});
  }, []);

  useEffect(() => {
    apiGet<Agent[]>('/ai-agents').then(setAgents).catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load agents'));
    loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    // Every setState inside load() happens after an await, not synchronously in this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    loadFindings();
  }, [loadFindings]);

  const lastRun = (agentId: string) => runs.find((r) => r.agentId === agentId);
  const agentCode = (id: string) => agents.find((a) => a.id === id)?.code ?? '—';
  const implemented = agents.filter((a) => a.analyzerKey).length;

  function refresh() {
    loadRuns();
    loadFindings();
  }

  return (
    <section>
      <PageHeader title="AI Agents" description="Operational analyzers that watch live data and propose findings for a human to act on." />

      <div className={styles.notice} role="note">
        <Info size={18} weight="fill" aria-hidden="true" />
        <p>
          <b>No language model is connected yet.</b> {implemented} of {agents.length || 12} agents are deterministic, rule-based analyzers; the rest are specified but can’t run.
          Everything an agent produces is a <i>proposal</i> — it never changes business data. A person acknowledges or dismisses each finding.
        </p>
      </div>

      {error && <InlineError>{error}</InlineError>}

      <div className={styles.grid}>
        {agents.map((a) => {
          const run = lastRun(a.id);
          const live = Boolean(a.analyzerKey);
          return (
            <article key={a.id} className={`${styles.card} ${live ? '' : styles.dim}`}>
              <div className={styles.cardTop}>
                <span className={styles.code}>{a.code}</span>
                <Badge value={live ? a.permissionLevel : 'NOT IMPLEMENTED'} />
              </div>
              <h2>{a.name}</h2>
              <p className={styles.purpose}>{a.purpose}</p>
              <div className={styles.cardFoot}>
                {live ? (
                  <ActionButton label="Run analysis" tone="primary" run={() => apiPost(`/ai-agents/${a.id}/run`)} onDone={refresh} />
                ) : (
                  <span className="muted">Needs an LLM or planner</span>
                )}
                {run && (
                  <span className={styles.lastRun} title={run.error ?? run.summary ?? ''}>
                    {run.status === 'FAILED' ? <Badge value="FAILED" /> : null} {when(run.startedAt)} · {run.findingCount} new
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className={styles.findingsHead}>
        <h2>Findings</h2>
        <div className={styles.segment} role="tablist" aria-label="Finding status">
          {STATUSES.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={filter === s} className={filter === s ? styles.segActive : styles.seg} onClick={() => (setFindings(null), setFilter(s))}>
              {s.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {!findings && <TableSkeleton rows={3} cols={4} />}
      {findings && findings.length === 0 && (
        <EmptyState
          title={filter === 'PROPOSED' ? 'Nothing waiting for a decision' : `No ${filter.toLowerCase()} findings`}
          hint={filter === 'PROPOSED' ? 'Run an analyzer above. Conditions already awaiting a decision aren’t proposed twice.' : undefined}
        />
      )}
      {findings && findings.length > 0 && (
        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Finding</th>
                <th>Agent</th>
                <th>Raised</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr key={f.id}>
                  <td><Badge value={f.severity} /></td>
                  <td>
                    <div className={styles.findingTitle}>{f.title}</div>
                    <div className={styles.findingDetail}>{f.detail}</div>
                  </td>
                  <td className={tableStyles.mono}>{agentCode(f.agentId)}</td>
                  <td className="muted">{when(f.createdAt)}</td>
                  <td className={tableStyles.actions}>
                    {f.status === 'PROPOSED' && (
                      <div className={tableStyles.actionRow}>
                        <ActionButton label="Acknowledge" run={() => apiPost(`/ai-findings/${f.id}/acknowledge`)} onDone={refresh} />
                        <ActionButton label="Dismiss" tone="danger" run={() => apiPost(`/ai-findings/${f.id}/dismiss`)} onDone={refresh} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
