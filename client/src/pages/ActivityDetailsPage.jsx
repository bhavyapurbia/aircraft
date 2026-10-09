import React, { useState, useEffect } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Calendar,
  ArrowLeft,
  Plane,
  Users,
  AlertTriangle,
  Clock,
  DollarSign,
  MapPin,
  CheckCircle,
  Trash2
} from 'lucide-react';

export default function ActivityDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/activities/${id}`);
      if (res.data.success) {
        setActivity(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load activity details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to cancel and remove sortie "${activity.activity_code}"?`)) {
      return;
    }
    try {
      await api.delete(`/activities/${id}`);
      navigate('/scheduling');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete activity.');
    }
  };

  if (loading) return <LoadingSpinner text="Retrieving sortie dispatch manifest..." />;
  if (!activity) return <div className="card">Sortie record not found.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/scheduling')} className="btn btn-secondary btn-sm">
            <ArrowLeft size={16} /> Back to Schedules
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
                {activity.title}
              </h1>
              <StatusBadge status={activity.status} />
            </div>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              Sortie ID: {activity.activity_code} // Priority: {activity.priority}
            </span>
          </div>
        </div>

        {hasRole(['Administrator', 'Planner']) && (
          <button onClick={handleDelete} className="btn btn-danger btn-sm">
            <Trash2 size={14} /> Cancel & Delete Sortie
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <span className="label">Routing</span>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#f8fafc' }}>
            {activity.origin} ➔ {activity.destination}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration: {activity.estimated_duration_hours} flight hours</span>
        </div>
        <div className="card">
          <span className="label">Scheduled Window</span>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#38bdf8' }}>
            {activity.start_time?.slice(0, 16)}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Until: {activity.end_time?.slice(0, 16)}</span>
        </div>
        <div className="card">
          <span className="label">Assigned Aircraft</span>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#f8fafc' }}>{activity.resource_name}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Tail: {activity.registration_no} ({activity.model})
          </span>
        </div>
        <div className="card">
          <span className="label">Estimated Operating Cost</span>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#34d399' }}>
            ₹{parseFloat(activity.estimated_cost).toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calculated from hourly aircraft rate</span>
        </div>
      </div>

      {/* Active Conflicts Box if any */}
      {activity.conflicts && activity.conflicts.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #f43f5e', background: 'rgba(244, 63, 94, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fb7185', fontWeight: 700, marginBottom: '0.5rem' }}>
            <AlertTriangle size={18} /> Active Constraints & Collisions Detected
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activity.conflicts.map((c) => (
              <div key={c.id} style={{ fontSize: '0.825rem', color: '#fca5a5' }}>
                • <strong>{c.conflict_type}</strong>: {c.description}
                <div style={{ color: '#e2e8f0', marginTop: 2, fontSize: '0.78rem' }}>
                  <em>Suggested Action: {c.suggested_action}</em>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crew and Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Assigned Mission Crew</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activity.assigned_staff?.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No crew assigned to this sortie.</div>
            ) : (
              activity.assigned_staff?.map((s) => (
                <div key={s.id} style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  background: 'rgba(13, 26, 45, 0.6)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.full_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.role_category}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 500 }}>
                    {s.role_in_activity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Mission Configuration Notes</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
            {activity.notes || 'No operational dispatch notes entered.'}
          </p>
          {activity.required_qualification && (
            <div style={{ marginTop: '1rem', padding: '0.65rem', borderRadius: '6px', background: 'rgba(18, 35, 60, 0.5)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
              <span className="label">Mandatory Pilot Qualification:</span>
              <div style={{ color: '#38bdf8', fontWeight: 600 }}>{activity.required_qualification}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
