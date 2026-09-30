import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, ApiError } from '../lib/api';
import { Badge } from '../components/Badge';
import listStyles from '../components/ResourceListPage.module.css';

interface QcSample {
  id: string;
  productionBatchId: string;
  sampledAt: string;
}

interface QcResult {
  id: string;
  qcParameterId: string;
  measuredValue: string;
  passed: boolean | null;
}

interface ProductionBatch {
  id: string;
  batchNumber: string;
  status: string;
}

interface QcParameterOption {
  id: string;
  code: string;
  name: string;
}

export function QualityPage() {
  const [samples, setSamples] = useState<QcSample[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [qcParameters, setQcParameters] = useState<QcParameterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [batchId, setBatchId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [results, setResults] = useState<QcResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [paramId, setParamId] = useState('');
  const [measuredValue, setMeasuredValue] = useState('');
  const [resultError, setResultError] = useState<string | null>(null);
  const [submittingResult, setSubmittingResult] = useState(false);

  async function loadSamples() {
    setLoading(true);
    setLoadError(null);
    try {
      setSamples(await apiGet<QcSample[]>('/qc-samples'));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSamples();
    apiGet<ProductionBatch[]>('/production-batches')
      .then((data) => setBatches(data.filter((b) => b.status === 'COMPLETED' || b.status === 'ON_HOLD')))
      .catch(() => {});
    apiGet<QcParameterOption[]>('/qc-parameters')
      .then(setQcParameters)
      .catch(() => {});
  }, []);

  async function loadResults(sampleId: string) {
    setResultsLoading(true);
    try {
      setResults(await apiGet<QcResult[]>(`/qc-samples/${sampleId}/results`));
    } catch {
      setResults([]);
    } finally {
      setResultsLoading(false);
    }
  }

  function selectSample(id: string) {
    if (id === selectedSampleId) {
      setSelectedSampleId(null);
      return;
    }
    setSelectedSampleId(id);
    loadResults(id);
  }

  async function handleCreateSample(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await apiPost('/qc-samples', { productionBatchId: batchId });
      setBatchId('');
      setShowForm(false);
      await loadSamples();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  }

  async function handleAddResult(e: FormEvent) {
    e.preventDefault();
    if (!selectedSampleId) return;
    setSubmittingResult(true);
    setResultError(null);
    try {
      await apiPost(`/qc-samples/${selectedSampleId}/results`, {
        qcParameterId: paramId,
        measuredValue: Number(measuredValue),
      });
      setParamId('');
      setMeasuredValue('');
      await loadResults(selectedSampleId);
    } catch (err) {
      setResultError(err instanceof ApiError ? err.message : 'Failed to record result');
    } finally {
      setSubmittingResult(false);
    }
  }

  return (
    <section>
      <div className={listStyles.header}>
        <div>
          <h1>Quality</h1>
          <p className={listStyles.description}>
            An out-of-spec result (checked against Master Data's QC specs for the batch's product grade) automatically puts
            the batch ON_HOLD. Manage the parameter catalog under Master Data → QC Parameters.
          </p>
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)} className={listStyles.newButton}>
          {showForm ? 'Cancel' : '+ New Sample'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateSample} className={listStyles.form}>
          <label className={listStyles.formField}>
            Production Batch (must be COMPLETED or ON_HOLD)
            <select required value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">— select —</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} ({b.status})
                </option>
              ))}
            </select>
          </label>
          {createError && (
            <p role="alert" className={listStyles.formError}>
              {createError}
            </p>
          )}
          <button type="submit" disabled={creating}>
            {creating ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}

      {loading && <p>Loading…</p>}
      {loadError && (
        <p role="alert" className={listStyles.formError}>
          {loadError}
        </p>
      )}
      {!loading && !loadError && (
        <table className={listStyles.table}>
          <thead>
            <tr>
              <th>Sample</th>
              <th>Production Batch</th>
              <th>Sampled At</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s) => (
              <tr key={s.id}>
                <td>{s.id.slice(0, 8)}</td>
                <td>{s.productionBatchId.slice(0, 8)}</td>
                <td>{new Date(s.sampledAt).toLocaleString()}</td>
                <td>
                  <button type="button" onClick={() => selectSample(s.id)}>
                    {s.id === selectedSampleId ? 'Hide' : 'Results'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedSampleId && (
        <div className={listStyles.form} style={{ display: 'block', marginTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>QC Results</h2>
          {resultsLoading && <p>Loading…</p>}
          {!resultsLoading && results.length === 0 && <p>No results yet.</p>}
          {!resultsLoading && results.length > 0 && (
            <table className={listStyles.table}>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Measured</th>
                  <th>Passed</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const param = qcParameters.find((p) => p.id === r.qcParameterId);
                  return (
                    <tr key={r.id}>
                      <td>{param ? `${param.code} — ${param.name}` : r.qcParameterId.slice(0, 8)}</td>
                      <td>{r.measuredValue}</td>
                      <td>{r.passed === null ? '—' : <Badge value={r.passed ? 'PASS' : 'FAIL'} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <form onSubmit={handleAddResult} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <select required value={paramId} onChange={(e) => setParamId(e.target.value)}>
              <option value="">— select parameter —</option>
              {qcParameters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              placeholder="Measured value"
              required
              value={measuredValue}
              onChange={(e) => setMeasuredValue(e.target.value)}
            />
            <button type="submit" disabled={submittingResult}>
              {submittingResult ? 'Saving…' : 'Add Result'}
            </button>
          </form>
          {resultError && (
            <p role="alert" className={listStyles.formError}>
              {resultError}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
