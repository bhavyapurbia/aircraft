import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Cpu,
  Play,
  CheckCircle,
  Sliders,
  TrendingUp,
  DollarSign,
  Clock,
  ShieldCheck,
  ArrowRight,
  Zap
} from 'lucide-react';

export default function OptimisationPage() {
  const { hasRole } = useAuth();
  const [weights, setWeights] = useState({
    reduceDelays: 35,
    improveUtilisation: 25,
    reduceOperatingCosts: 20,
    balanceWorkload: 10,
    reduceIdleTime: 10
  });

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [applying, setApplying] = useState(false);
  const [historyRuns, setHistoryRuns] = useState([]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/optimisation/runs');
      if (res.data.success) {
        setHistoryRuns(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRunOptimisation = async () => {
    setRunning(true);
    try {
      const payloadWeights = {
        reduceDelays: weights.reduceDelays / 100,
        improveUtilisation: weights.improveUtilisation / 100,
        reduceOperatingCosts: weights.reduceOperatingCosts / 100,
        balanceWorkload: weights.balanceWorkload / 100,
        reduceIdleTime: weights.reduceIdleTime / 100
      };

      const res = await api.post('/optimisation/run', { weights: payloadWeights });
      if (res.data.success) {
        setResult(res.data.data);
        fetchHistory();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Optimisation algorithm failed.');
    } finally {
      setRunning(false);
    }
  };

  const handleApplyRecommendations = async () => {
    if (!result?.run_id) return;
    if (!window.confirm(`Commit ${result.proposed_changes.length} schedule optimisations into live database?`)) return;

    setApplying(true);
    try {
      const res = await api.post(`/optimisation/runs/${result.run_id}/apply`);
      alert(res.data.message);
      setResult(null);
      fetchHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply optimisation recommendations.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
          Resource Optimisation & Scheduling Heuristic Engine
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Mathematical and heuristic schedule generation. Resolves overlapping sorties, honors mandatory maintenance windows, and optimizes fleet operating costs.
        </p>
      </div>

      {/* Configuration Sliders & Control Box */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} color="#38bdf8" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Multi-Objective Optimisation Weights</h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Total Weight: {weights.reduceDelays + weights.improveUtilisation + weights.reduceOperatingCosts + weights.balanceWorkload + weights.reduceIdleTime}%
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
              <span style={{ color: '#e2e8f0' }}>Delay Mitigation</span>
              <strong style={{ color: '#38bdf8' }}>{weights.reduceDelays}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.reduceDelays}
              onChange={(e) => setWeights({ ...weights, reduceDelays: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: '#0284c7' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
              <span style={{ color: '#e2e8f0' }}>Fleet Utilisation</span>
              <strong style={{ color: '#10b981' }}>{weights.improveUtilisation}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.improveUtilisation}
              onChange={(e) => setWeights({ ...weights, improveUtilisation: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: '#10b981' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
              <span style={{ color: '#e2e8f0' }}>Operating Cost Savings</span>
              <strong style={{ color: '#f59e0b' }}>{weights.reduceOperatingCosts}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.reduceOperatingCosts}
              onChange={(e) => setWeights({ ...weights, reduceOperatingCosts: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: '#f59e0b' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
              <span style={{ color: '#e2e8f0' }}>Crew Workload Balance</span>
              <strong style={{ color: '#8b5cf6' }}>{weights.balanceWorkload}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.balanceWorkload}
              onChange={(e) => setWeights({ ...weights, balanceWorkload: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: '#8b5cf6' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
              <span style={{ color: '#e2e8f0' }}>Turnaround Idle Reduction</span>
              <strong style={{ color: '#ec4899' }}>{weights.reduceIdleTime}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.reduceIdleTime}
              onChange={(e) => setWeights({ ...weights, reduceIdleTime: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: '#ec4899' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={handleRunOptimisation}
            disabled={running}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
          >
            <Play size={16} /> {running ? 'Executing Algorithm Solver...' : 'Run Scheduling Optimisation Engine'}
          </button>
        </div>
      </div>

      {/* Optimisation Result Display */}
      {result && (
        <div className="card" style={{ border: '2px solid #0284c7', background: 'rgba(2, 132, 199, 0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={20} color="#10b981" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                  Optimisation Feasible Solution Found
                </h3>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                Run Code: {result.run_code} // Solver Execution Time: {result.execution_time_ms}ms
              </span>
            </div>

            {hasRole(['Administrator', 'Planner']) && result.proposed_changes?.length > 0 && (
              <button
                onClick={handleApplyRecommendations}
                disabled={applying}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
              >
                <Zap size={16} /> {applying ? 'Applying Changes...' : 'Apply Recommended Plan to Live Schedule'}
              </button>
            )}
          </div>

          {/* Metrics summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(13, 26, 45, 0.7)', border: '1px solid var(--border-color)' }}>
              <span className="label">Evaluated Sorties</span>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#f8fafc' }}>{result.total_evaluated}</div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(13, 26, 45, 0.7)', border: '1px solid var(--border-color)' }}>
              <span className="label">Conflicts Avoided</span>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#34d399' }}>{result.conflicts_avoided}</div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(13, 26, 45, 0.7)', border: '1px solid var(--border-color)' }}>
              <span className="label">Utilisation Gain</span>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#38bdf8' }}>+{result.utilisation_improvement_pct}%</div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(13, 26, 45, 0.7)', border: '1px solid var(--border-color)' }}>
              <span className="label">Est. Cost Optimized</span>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#fbbf24' }}>₹{parseFloat(result.cost_saved_estimate).toLocaleString()}</div>
            </div>
          </div>

          {/* Explanation Banner */}
          <div style={{ padding: '0.85rem', borderRadius: '6px', background: 'rgba(8, 15, 26, 0.6)', borderLeft: '4px solid #38bdf8', fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
            <strong>Algorithmic Rationale:</strong> {result.explanation_summary}
          </div>

          {/* Before & After Comparison Table */}
          <div style={{ marginTop: '0.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Proposed Schedule Modifications (Before vs After)
            </h4>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sortie Code</th>
                    <th>Baseline Schedule</th>
                    <th>Proposed Optimized Schedule</th>
                    <th>Score Delta</th>
                    <th>Mathematical Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {result.proposed_changes?.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No changes required; schedule was already optimal.</td></tr>
                  ) : (
                    result.proposed_changes?.map((ch, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }}>
                          {ch.activity_code}
                        </td>
                        <td>
                          <div style={{ color: '#fb7185', textDecoration: 'line-through', fontSize: '0.8rem' }}>
                            {ch.original_start_time?.slice(0, 16)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Cost: ₹{ch.original_cost?.toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <div style={{ color: '#34d399', fontWeight: 600, fontSize: '0.8rem' }}>
                            {ch.proposed_start_time?.slice(0, 16)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                            Aircraft: {ch.proposed_resource_name} (₹{ch.proposed_cost?.toLocaleString()})
                          </div>
                        </td>
                        <td>
                          <span style={{ color: '#34d399', fontWeight: 700 }}>+{ch.score_delta}</span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#e2e8f0', maxWidth: '350px' }}>
                          {ch.change_reason}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Historical Optimisation Runs Table */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Historical Optimisation Run Audit
        </h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Run Code</th>
                <th>Initiator</th>
                <th>Sorties Evaluated</th>
                <th>Conflicts Avoided</th>
                <th>Utilisation Gain</th>
                <th>Execution Time</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {historyRuns.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No historical optimisation runs found.</td></tr>
              ) : (
                historyRuns.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#38bdf8' }}>{r.run_code}</td>
                    <td>{r.initiator_name || 'Planner'}</td>
                    <td>{r.total_activities_evaluated}</td>
                    <td>{r.conflicts_avoided} avoided</td>
                    <td style={{ color: '#34d399' }}>+{r.utilisation_improvement_pct}%</td>
                    <td>{r.execution_time_ms} ms</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.created_at?.slice(0, 16)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
