import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  CheckCircle,
  Clock,
  Plane,
  Users,
  Wrench,
  ArrowRight,
  Cpu
} from 'lucide-react';

export default function ConflictsPage() {
  const { hasRole } = useAuth();
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [statusFilter, setStatusFilter] = useState('0'); // '0' unresolved, '1' resolved, 'all'
  const [severityFilter, setSeverityFilter] = useState('');

  const fetchConflicts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ is_resolved: statusFilter });
      if (severityFilter) params.append('severity', severityFilter);

      const res = await api.get(`/conflicts?${params.toString()}`);
      if (res.data.success) {
        setConflicts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load conflicts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, [statusFilter, severityFilter]);

  const handleScanSystem = async () => {
    try {
      setScanning(true);
      const res = await api.post('/conflicts/scan');
      alert(res.data.message);
      fetchConflicts();
    } catch (err) {
      alert(err.response?.data?.message || 'Conflict scan failed.');
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.patch(`/conflicts/${id}/resolve`);
      fetchConflicts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark conflict resolved.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
            Operational Conflict & Constraint Centre
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time validation engine detecting aircraft collisions, maintenance overlaps, qualification breaches, and duty limits.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NavLink to="/optimisation" className="btn btn-secondary btn-sm">
            <Cpu size={14} /> Open Optimiser
          </NavLink>
          {hasRole(['Administrator', 'Planner']) && (
            <button onClick={handleScanSystem} disabled={scanning} className="btn btn-primary btn-sm">
              <RefreshCw size={14} className={scanning ? 'spin-icon' : ''} />
              {scanning ? 'Scanning System...' : 'Trigger Full System Re-Scan'}
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className={`btn btn-sm ${statusFilter === '0' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setStatusFilter('0')}
        >
          Unresolved Conflicts
        </button>
        <button
          className={`btn btn-sm ${statusFilter === '1' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setStatusFilter('1')}
        >
          Resolved Archive
        </button>
        <button
          className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setStatusFilter('all')}
        >
          All
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <select
            className="select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ width: '180px', padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
          >
            <option value="">All Severities</option>
            <option value="Critical Error">Critical Error</option>
            <option value="Constraint Breach">Constraint Breach</option>
            <option value="Warning">Warning</option>
          </select>
        </div>
      </div>

      {/* Conflicts List */}
      {loading ? (
        <LoadingSpinner text="Running operational constraint algorithms..." />
      ) : conflicts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <CheckCircle size={40} color="#10b981" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
            No Schedule Conflicts Detected!
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            All active flight sorties comply with aircraft availability, maintenance windows, duty regulations, and qualification rules.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {conflicts.map((c) => (
            <div key={c.id} className="card" style={{
              borderLeft: c.severity === 'Constraint Breach' || c.severity === 'Critical Error'
                ? '5px solid #f43f5e'
                : '5px solid #f59e0b',
              background: c.is_resolved ? 'rgba(13, 26, 45, 0.4)' : 'var(--bg-card)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: c.severity === 'Constraint Breach' || c.severity === 'Critical Error' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: c.severity === 'Constraint Breach' || c.severity === 'Critical Error' ? '#fb7185' : '#fbbf24',
                    border: '1px solid currentColor'
                  }}>
                    {c.conflict_type}
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                    Impacts: {c.activity_code} ({c.activity_title})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Detected: {c.detected_at?.slice(0, 16)}
                  </span>
                  {!c.is_resolved && hasRole(['Administrator', 'Planner']) && (
                    <button
                      onClick={() => handleResolve(c.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', color: '#34d399' }}
                    >
                      <CheckCircle size={13} /> Mark Resolved
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                borderRadius: '6px',
                background: 'rgba(8, 15, 26, 0.6)',
                fontSize: '0.85rem',
                color: '#e2e8f0',
                lineHeight: 1.5
              }}>
                {c.description}
              </div>

              {/* Corrective Action */}
              <div style={{
                marginTop: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#38bdf8'
              }}>
                <strong>Recommended Corrective Action:</strong>
                <span>{c.suggested_action}</span>
              </div>

              {/* Navigation links */}
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
                <NavLink to={`/activities/${c.activity_id}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                  Inspect Conflicted Activity ➔
                </NavLink>
                {c.conflicting_activity_id && (
                  <NavLink to={`/activities/${c.conflicting_activity_id}`} style={{ color: '#fb7185', textDecoration: 'none' }}>
                    Inspect Colliding Sortie ({c.conflicting_activity_code}) ➔
                  </NavLink>
                )}
                <NavLink to="/optimisation" style={{ marginLeft: 'auto', color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>
                  Resolve via Optimisation Engine ➔
                </NavLink>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
