import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import {
  Calendar,
  Clock,
  Plus,
  Filter,
  Eye,
  AlertTriangle,
  Plane,
  Users,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

export default function SchedulingPage() {
  const { hasRole } = useAuth();
  const [activities, setActivities] = useState([]);
  const [resources, setResources] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table', 'month', 'week'

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Schedule Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Logistics Cargo Supply',
    priority: 'Routine',
    start_time: '2026-10-15 08:00',
    end_time: '2026-10-15 13:00',
    resource_id: '',
    origin: 'Airfield Alpha',
    destination: 'Airfield Bravo',
    required_qualification: '',
    notes: '',
    staff_ids: []
  });
  const [preValidationConflicts, setPreValidationConflicts] = useState([]);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (resourceFilter) params.append('resource_id', resourceFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const [actRes, resRes, stfRes] = await Promise.all([
        api.get(`/activities?${params.toString()}`),
        api.get('/resources?limit=50'),
        api.get('/staff')
      ]);

      if (actRes.data.success) setActivities(actRes.data.data);
      if (resRes.data.success) setResources(resRes.data.data);
      if (stfRes.data.success) setStaffList(stfRes.data.data);
    } catch (err) {
      console.error('Failed to load scheduling data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, resourceFilter, categoryFilter]);

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      category: 'Logistics Cargo Supply',
      priority: 'Routine',
      start_time: '2026-10-15 08:00',
      end_time: '2026-10-15 13:00',
      resource_id: resources[0]?.id || '',
      origin: 'Airfield Alpha',
      destination: 'Airfield Bravo',
      required_qualification: '',
      notes: '',
      staff_ids: []
    });
    setPreValidationConflicts([]);
    setFormError('');
    setIsModalOpen(true);
  };

  // Run Conflict Validation dry-run
  const runPreValidation = async () => {
    try {
      setValidating(true);
      const res = await api.post('/activities/validate', formData);
      if (res.data.success) {
        setPreValidationConflicts(res.data.conflicts);
      }
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setValidating(false);
    }
  };

  const handleFormSubmit = async (e, forceSave = false) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      await api.post('/activities', {
        ...formData,
        force_save: forceSave
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.conflicts) {
        setPreValidationConflicts(err.response.data.conflicts);
        setFormError('Conflict Detected! Check warnings below before confirming.');
      } else {
        setFormError(err.response?.data?.message || 'Failed to schedule sortie.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    'Logistics Cargo Supply',
    'Personnel Transport',
    'Coastal Search & Rescue',
    'Routine Recon Patrol',
    'Medical Emergency Airlift',
    'Pilot Re-qualification Flight',
    'Rapid Disaster Response'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
            Flight Operations & Sortie Scheduling
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Dynamic mission calendar with automated constraint boundary checks and conflict prevention.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: 2 }}>
            <button
              onClick={() => setViewMode('table')}
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.35rem 0.65rem' }}
            >
              <List size={14} /> Table
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`btn btn-sm ${viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.35rem 0.65rem' }}
            >
              <CalendarDays size={14} /> Calendar
            </button>
          </div>

          {hasRole(['Administrator', 'Planner']) && (
            <button onClick={handleOpenCreate} className="btn btn-primary btn-sm">
              <Plus size={14} /> Schedule Sortie
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Filter size={16} /> Filters:
        </div>

        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: '160px' }}
        >
          <option value="">All Statuses</option>
          <option value="Scheduled">Scheduled</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Delayed">Delayed</option>
        </select>

        <select
          className="select"
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          style={{ width: '220px' }}
        >
          <option value="">All Assigned Aircraft</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>{r.resource_name} ({r.registration_no})</option>
          ))}
        </select>

        <select
          className="select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: '220px' }}
        >
          <option value="">All Mission Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Content View */}
      {loading ? (
        <LoadingSpinner text="Retrieving operational sortie calendar..." />
      ) : viewMode === 'table' ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Sortie Code</th>
                <th>Mission Title</th>
                <th>Category</th>
                <th>Assigned Aircraft</th>
                <th>Rostered Crew</th>
                <th>Departure & Arrival</th>
                <th>Duration</th>
                <th>Status / Conflicts</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No sorties found matching filter.</td></tr>
              ) : (
                activities.map((act) => (
                  <tr key={act.id} style={{ background: act.unresolved_conflicts_count > 0 ? 'rgba(244, 63, 94, 0.05)' : 'transparent' }}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#38bdf8' }}>
                      {act.activity_code}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{act.title}</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{act.origin} ➔ {act.destination}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{act.category}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{act.resource_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>{act.registration_no}</div>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {act.staff_names || <span style={{ color: '#fbbf24' }}>Unassigned</span>}
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>
                      <div>{act.start_time?.slice(0, 16)}</div>
                      <div style={{ color: 'var(--text-muted)' }}>➔ {act.end_time?.slice(11, 16)}</div>
                    </td>
                    <td>{act.estimated_duration_hours} hrs</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <StatusBadge status={act.status} />
                        {act.unresolved_conflicts_count > 0 && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: '0.68rem',
                            color: '#fb7185',
                            fontWeight: 700
                          }}>
                            <AlertTriangle size={11} /> {act.unresolved_conflicts_count} Conflict
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <NavLink to={`/activities/${act.id}`} className="btn btn-secondary btn-sm">
                        <Eye size={13} /> View
                      </NavLink>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Calendar View: Visual Timeline Cards grouped by date */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {activities.map((act) => (
            <div key={act.id} className="card" style={{
              borderLeft: act.unresolved_conflicts_count > 0 ? '4px solid #f43f5e' : '4px solid #0284c7',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#38bdf8' }}>
                  {act.activity_code}
                </span>
                <StatusBadge status={act.status} />
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{act.title}</h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {act.origin} ➔ {act.destination} ({act.estimated_duration_hours}h)
                </div>
              </div>

              <div style={{
                padding: '0.5rem',
                borderRadius: '6px',
                background: 'rgba(13, 26, 45, 0.6)',
                fontSize: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e2e8f0' }}>
                  <Plane size={13} color="#38bdf8" />
                  <span>{act.resource_name} ({act.registration_no})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                  <Clock size={13} />
                  <span>{act.start_time?.slice(0, 16)} - {act.end_time?.slice(11, 16)}</span>
                </div>
              </div>

              {act.unresolved_conflicts_count > 0 && (
                <div style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '4px',
                  background: 'rgba(244, 63, 94, 0.15)',
                  color: '#fb7185',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <AlertTriangle size={13} /> Schedule overlap / validation alert!
                </div>
              )}

              <div style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <NavLink to={`/activities/${act.id}`} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                  Inspect Sortie Details
                </NavLink>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Operational Flight Sortie"
        maxWidth="720px"
      >
        {formError && (
          <div style={{ padding: '0.75rem', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}

        {/* Real-time Conflict Warning Banner inside Modal */}
        {preValidationConflicts.length > 0 && (
          <div style={{
            padding: '0.85rem',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fb7185', fontWeight: 700, fontSize: '0.85rem' }}>
              <ShieldAlert size={16} /> Backend Conflict Engine Flagged {preValidationConflicts.length} Conflict(s):
            </div>
            {preValidationConflicts.map((c, i) => (
              <div key={i} style={{ fontSize: '0.75rem', color: '#fca5a5' }}>
                • <strong>{c.conflict_type}</strong>: {c.description} <em>({c.suggested_action})</em>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={(e) => handleFormSubmit(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Mission / Sortie Title *</label>
            <input
              type="text"
              className="input"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Northern Sector Medical Emergency Airlift"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label className="label">Category *</label>
              <select
                className="select"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority Level</label>
              <select
                className="select"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="Routine">Routine</option>
                <option value="High">High</option>
                <option value="Critical Urgent">Critical Urgent</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label className="label">Departure Date & Time *</label>
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
              <label className="label">Arrival Date & Time *</label>
              <input
                type="text"
                className="input"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                placeholder="YYYY-MM-DD HH:MM:SS"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label className="label">Assigned Aircraft Resource *</label>
              <select
                className="select"
                required
                value={formData.resource_id}
                onChange={(e) => setFormData({ ...formData, resource_id: e.target.value })}
              >
                <option value="">Select Aircraft</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.resource_name} ({r.registration_no}) - {r.status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Rostered Flight Crew</label>
              <select
                className="select"
                value={formData.staff_ids[0] || ''}
                onChange={(e) => setFormData({ ...formData, staff_ids: e.target.value ? [parseInt(e.target.value, 10)] : [] })}
              >
                <option value="">Select Commander / Pilot</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.role_category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label className="label">Departure Base (Origin)</label>
              <input
                type="text"
                className="input"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Arrival Airfield (Destination)</label>
              <input
                type="text"
                className="input"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Required Pilot / Crew Qualification (Optional)</label>
            <input
              type="text"
              className="input"
              value={formData.required_qualification}
              onChange={(e) => setFormData({ ...formData, required_qualification: e.target.value })}
              placeholder="e.g. Heavy Transport Type Rating (L-100 / C-130)"
            />
          </div>

          <div>
            <label className="label">Sortie Operational Notes</label>
            <textarea
              className="textarea"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Mission payload manifest, alternate diversions, clearance remarks..."
            />
          </div>

          {/* Conflict Check Button & Submit Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              onClick={runPreValidation}
              className="btn btn-secondary btn-sm"
              disabled={validating}
            >
              <ShieldAlert size={14} /> {validating ? 'Scanning Engine...' : 'Run Constraint Check'}
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              {preValidationConflicts.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => handleFormSubmit(e, true)}
                  className="btn btn-danger"
                  disabled={submitting}
                  title="Override constraint and force schedule"
                >
                  Force Save with Warning
                </button>
              )}
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? 'Validating & Saving...' : 'Save Scheduled Sortie'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
