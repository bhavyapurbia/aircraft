import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import {
  Wrench,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plane,
  User,
  DollarSign
} from 'lucide-react';

export default function MaintenancePage() {
  const { hasRole } = useAuth();
  const [maintenance, setMaintenance] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    resource_id: '',
    maintenance_type: 'A-Check Routine',
    start_time: '2026-10-18 08:00',
    expected_completion: '2026-10-20 18:00',
    assigned_technician: 'Fleet Maintenance Wing Alpha',
    cost_estimate: 8500,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchMaintenance = async () => {
    try {
      setLoading(true);
      const [mRes, rRes] = await Promise.all([
        api.get(`/maintenance${statusFilter ? `?status=${statusFilter}` : ''}`),
        api.get('/resources?limit=50')
      ]);
      if (mRes.data.success) setMaintenance(mRes.data.data);
      if (rRes.data.success) setResources(rRes.data.data);
    } catch (err) {
      console.error('Failed to load maintenance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenance();
  }, [statusFilter]);

  const handleOpenAdd = () => {
    setFormData({
      resource_id: resources[0]?.id || '',
      maintenance_type: 'A-Check Routine',
      start_time: '2026-10-18 08:00',
      expected_completion: '2026-10-20 18:00',
      assigned_technician: 'Fleet Maintenance Wing Alpha',
      cost_estimate: 8500,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/maintenance', formData);
      setIsModalOpen(false);
      fetchMaintenance();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create maintenance task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/maintenance/${id}`, { status });
      fetchMaintenance();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update maintenance status');
    }
  };

  const maintTypes = [
    'A-Check Routine',
    'B-Check Intermediate',
    'C-Check Heavy Structural',
    'Avionics Overhaul',
    'Engine Diagnostic & Servicing',
    'Unscheduled Repair'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
            Aircraft Maintenance & Technical Servicing
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Mandatory airworthiness inspection tracking. Scheduled maintenance automatically locks out sortie bookings.
          </p>
        </div>

        {hasRole(['Administrator', 'Planner']) && (
          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
            <Plus size={14} /> Schedule Maintenance Task
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['', 'In Progress', 'Scheduled', 'Overdue', 'Completed'].map((st) => (
          <button
            key={st}
            className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(st)}
          >
            {st || 'All Maintenance'}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Retrieving technical inspection logs..." />
      ) : maintenance.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No maintenance tasks found matching selection.
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Job Code</th>
                <th>Target Aircraft</th>
                <th>Inspection Category</th>
                <th>Window Start</th>
                <th>Expected Release</th>
                <th>Lead Technician</th>
                <th>Cost Est.</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {maintenance.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#38bdf8' }}>
                    {m.maintenance_code}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.resource_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {m.registration_no}
                    </div>
                  </td>
                  <td style={{ fontWeight: 500, color: '#fbbf24' }}>
                    {m.maintenance_type}
                  </td>
                  <td style={{ fontSize: '0.78rem' }}>{m.start_time?.slice(0, 16)}</td>
                  <td style={{ fontSize: '0.78rem' }}>{m.expected_completion?.slice(0, 16)}</td>
                  <td style={{ fontSize: '0.8rem' }}>{m.assigned_technician}</td>
                  <td>₹{parseFloat(m.cost_estimate).toLocaleString()}</td>
                  <td><StatusBadge status={m.status} /></td>
                  <td>
                    {hasRole(['Administrator', 'Planner']) && (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {m.status === 'Scheduled' && (
                          <button
                            onClick={() => handleStatusChange(m.id, 'In Progress')}
                            className="btn btn-secondary btn-sm"
                            title="Start Servicing (Grounds Aircraft)"
                          >
                            Start
                          </button>
                        )}
                        {m.status === 'In Progress' && (
                          <button
                            onClick={() => handleStatusChange(m.id, 'Completed')}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#34d399' }}
                            title="Sign Off Maintenance (Restores Aircraft to Available)"
                          >
                            Sign Off
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule Maintenance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Aircraft Maintenance Window"
        maxWidth="650px"
      >
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Target Aircraft *</label>
            <select
              className="select"
              required
              value={formData.resource_id}
              onChange={(e) => setFormData({ ...formData, resource_id: e.target.value })}
            >
              <option value="">Select Aircraft</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.resource_name} ({r.registration_no}) - Current: {r.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Maintenance Category *</label>
            <select
              className="select"
              required
              value={formData.maintenance_type}
              onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
            >
              {maintTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label className="label">Inspection Start *</label>
              <input
                type="text"
                className="input"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                placeholder="YYYY-MM-DD HH:MM:SS"
              />
            </div>
            <div>
              <label className="label">Expected Return to Service *</label>
              <input
                type="text"
                className="input"
                required
                value={formData.expected_completion}
                onChange={(e) => setFormData({ ...formData, expected_completion: e.target.value })}
                placeholder="YYYY-MM-DD HH:MM:SS"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label className="label">Assigned Lead Technician / Team *</label>
              <input
                type="text"
                className="input"
                required
                value={formData.assigned_technician}
                onChange={(e) => setFormData({ ...formData, assigned_technician: e.target.value })}
                placeholder="e.g. Chief Tech Sharma"
              />
            </div>
            <div>
              <label className="label">Estimated Servicing Cost (₹)</label>
              <input
                type="number"
                className="input"
                value={formData.cost_estimate}
                onChange={(e) => setFormData({ ...formData, cost_estimate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="label">Servicing Details & Work Order Scope</label>
            <textarea
              className="textarea"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Replacement parts, avionics firmware, mandatory regulatory bulletins..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Registering...' : 'Confirm Maintenance Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
