import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  GitBranch,
  Play,
  AlertTriangle,
  Clock,
  Plane,
  Users,
  ShieldAlert,
  TrendingDown,
  DollarSign
} from 'lucide-react';

export default function ScenariosPage() {
  const { hasRole } = useAuth();
  const [scenarios, setScenarios] = useState([]);
  const [resources, setResources] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simulation form
  const [scenarioType, setScenarioType] = useState('Resource Grounded');
  const [scenarioName, setScenarioName] = useState('Simulation: Unscheduled Aircraft Grounding');
  const [targetResourceId, setTargetResourceId] = useState('');
  const [targetStaffId, setTargetStaffId] = useState('');
  const [weatherAirfield, setWeatherAirfield] = useState('Airfield Alpha');
  const [description, setDescription] = useState('Stress test simulating unexpected hydraulic failure hold.');
  const [simulating, setSimulating] = useState(false);
  const [currentSimulation, setCurrentSimulation] = useState(null);

  const fetchScenarios = async () => {
    try {
      setLoading(true);
      const [scenRes, resRes, stfRes] = await Promise.all([
        api.get('/scenarios'),
        api.get('/resources?limit=50'),
        api.get('/staff')
      ]);
      if (scenRes.data.success) setScenarios(scenRes.data.data);
      if (resRes.data.success) {
        setResources(resRes.data.data);
        if (resRes.data.data.length > 0) setTargetResourceId(resRes.data.data[0].id);
      }
      if (stfRes.data.success) {
        setStaffList(stfRes.data.data);
        if (stfRes.data.data.length > 0) setTargetStaffId(stfRes.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load scenarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const handleSimulate = async (e) => {
    e.preventDefault();
    setSimulating(true);

    try {
      const params = {};
      if (scenarioType === 'Resource Grounded') {
        params.resource_id = targetResourceId;
        params.reason = description;
      } else if (scenarioType === 'Staff Sick / Unavailable') {
        params.staff_id = targetStaffId;
      } else if (scenarioType === 'Weather Grounding') {
        params.airfield = weatherAirfield;
        params.duration_hours = 8;
      }

      const res = await api.post('/scenarios/simulate', {
        scenario_name: scenarioName,
        scenario_type: scenarioType,
        description,
        params
      });

      if (res.data.success) {
        setCurrentSimulation(res.data.data);
        fetchScenarios();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
          What-If Scenario Simulation & Resiliency Sandbox
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Test operational resilience against unforeseen grounding events, crew shortages, and weather lockdowns without altering actual database schedules.
        </p>
      </div>

      {/* Simulator Form Card */}
      {hasRole(['Administrator', 'Planner']) && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #0284c7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8' }}>
            <GitBranch size={18} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Configure Stress Test Simulation</h3>
          </div>

          <form onSubmit={handleSimulate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="label">Simulation Title *</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Disruption Scenario Type *</label>
                <select
                  className="select"
                  value={scenarioType}
                  onChange={(e) => setScenarioType(e.target.value)}
                >
                  <option value="Resource Grounded">Aircraft Grounded (Technical Hold)</option>
                  <option value="Staff Sick / Unavailable">Crew Member Medically Grounded</option>
                  <option value="Weather Grounding">Severe Airfield Weather Closure</option>
                </select>
              </div>

              {scenarioType === 'Resource Grounded' && (
                <div>
                  <label className="label">Target Aircraft to Ground</label>
                  <select
                    className="select"
                    value={targetResourceId}
                    onChange={(e) => setTargetResourceId(e.target.value)}
                  >
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>{r.resource_name} ({r.registration_no})</option>
                    ))}
                  </select>
                </div>
              )}

              {scenarioType === 'Staff Sick / Unavailable' && (
                <div>
                  <label className="label">Unavailable Crew Member</label>
                  <select
                    className="select"
                    value={targetStaffId}
                    onChange={(e) => setTargetStaffId(e.target.value)}
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name} ({s.role_category})</option>
                    ))}
                  </select>
                </div>
              )}

              {scenarioType === 'Weather Grounding' && (
                <div>
                  <label className="label">Restricted Airfield Hub</label>
                  <input
                    type="text"
                    className="input"
                    value={weatherAirfield}
                    onChange={(e) => setWeatherAirfield(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="label">Hypothesis & Operational Scenario Description</label>
              <textarea
                className="textarea"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={simulating} className="btn btn-primary">
                <Play size={16} /> {simulating ? 'Simulating Dynamic Impact...' : 'Execute What-If Simulation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Simulation Results Box */}
      {currentSimulation && (
        <div className="card" style={{ border: '2px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Virtual Sandbox Results
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                {currentSimulation.scenario_name}
              </h3>
            </div>
            <button onClick={() => setCurrentSimulation(null)} className="btn btn-secondary btn-sm">
              Dismiss Simulation
            </button>
          </div>

          {/* Impact telemetry cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(13, 26, 45, 0.7)', border: '1px solid var(--border-color)' }}>
              <span className="label">New Conflicts Generated</span>
              <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#fb7185' }}>
                {currentSimulation.impact_summary?.new_conflicts_count || 0}
              </div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(13, 26, 45, 0.7)', border: '1px solid var(--border-color)' }}>
              <span className="label">Cascading Delay Hours</span>
              <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#fbbf24' }}>
                {currentSimulation.impact_summary?.estimated_cascading_delay_hours} hrs
              </div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(13, 26, 45, 0.7)', border: '1px solid var(--border-color)' }}>
              <span className="label">Fleet Utilisation Delta</span>
              <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#38bdf8' }}>
                {currentSimulation.impact_summary?.utilisation_delta_pct}%
              </div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(13, 26, 45, 0.7)', border: '1px solid var(--border-color)' }}>
              <span className="label">Disruption Cost Impact</span>
              <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#fb7185' }}>
                ₹{currentSimulation.impact_summary?.estimated_impact_cost?.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Virtual Conflict Warnings */}
          {currentSimulation.simulated_conflicts?.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fb7185', marginBottom: '0.5rem' }}>
                Cascading Sortie Collisions Induced By Scenario:
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {currentSimulation.simulated_conflicts.map((sc, idx) => (
                  <div key={idx} style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ fontWeight: 600, color: '#fb7185' }}>
                      Sortie: {sc.activity_code} — {sc.title}
                    </div>
                    <div style={{ color: '#e2e8f0', marginTop: 2 }}>{sc.details}</div>
                    <div style={{ color: '#38bdf8', fontSize: '0.75rem', marginTop: 2 }}>
                      <em>Mitigation: {sc.suggested_action}</em>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historical Simulation Logs */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Historical Scenario Stress Test Logs
        </h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Scenario Title</th>
                <th>Disruption Type</th>
                <th>Impact Severity</th>
                <th>New Conflicts</th>
                <th>Delay Hours</th>
                <th>Simulated By</th>
                <th>Executed At</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No scenario simulations logged yet.</td></tr>
              ) : (
                scenarios.map((sc) => (
                  <tr key={sc.id}>
                    <td style={{ fontWeight: 600 }}>{sc.scenario_name}</td>
                    <td style={{ color: '#fbbf24' }}>{sc.scenario_type}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: 600 }}>
                        {sc.impact_summary?.impact_level || 'Evaluated'}
                      </span>
                    </td>
                    <td>{sc.impact_summary?.new_conflicts_count ?? 0}</td>
                    <td>{sc.impact_summary?.estimated_cascading_delay_hours ?? 0} hrs</td>
                    <td>{sc.author_name || 'Planner'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sc.created_at?.slice(0, 16)}</td>
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
