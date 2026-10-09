import React, { useState, useEffect } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Plane,
  ArrowLeft,
  Wrench,
  Clock,
  Calendar,
  AlertCircle,
  Shield,
  FileText,
  MapPin,
  DollarSign
} from 'lucide-react';

export default function ResourceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/resources/${id}`);
      if (res.data.success) {
        setResource(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load resource details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/resources/${id}/status`, { status: newStatus });
      fetchDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  if (loading) return <LoadingSpinner text="Reading aircraft flight telemetry..." />;
  if (!resource) return <div className="card">Aircraft record not found.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/resources')} className="btn btn-secondary btn-sm">
            <ArrowLeft size={16} /> Back to Fleet
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
                {resource.resource_name}
              </h1>
              <StatusBadge status={resource.status} />
            </div>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              {resource.registration_no} // {resource.resource_code}
            </span>
          </div>
        </div>

        {hasRole(['Administrator', 'Planner']) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Status:</span>
            {['Available', 'Scheduled', 'Under Maintenance', 'Unavailable'].map((st) => (
              <button
                key={st}
                className={`btn btn-sm ${resource.status === st ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleStatusChange(st)}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <span className="label">Operational Category</span>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#f8fafc' }}>{resource.category}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Airframe: {resource.model}</span>
        </div>
        <div className="card">
          <span className="label">Operating Cost</span>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#34d399' }}>₹{parseFloat(resource.hourly_cost).toLocaleString()} / hr</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Base: {resource.base_location}</span>
        </div>
        <div className="card">
          <span className="label">Payload & Passengers</span>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#38bdf8' }}>{resource.capacity_pax} Pax / {resource.payload_capacity_kg} kg</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Airframe Hours: {resource.total_flight_hours} hrs</span>
        </div>
        <div className="card">
          <span className="label">Maintenance Schedule</span>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#fbbf24' }}>{resource.next_scheduled_maintenance || 'Nominal'}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last Overhaul: {resource.last_maintenance_date || 'N/A'}</span>
        </div>
      </div>

      {/* Operational Notes */}
      {resource.notes && (
        <div className="card" style={{ borderLeft: '4px solid #0284c7' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.35rem' }}>
            Mission Configuration & Operating Restrictions
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
            {resource.notes}
          </p>
        </div>
      )}

      {/* Sorties and Maintenance History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.25rem' }}>
        {/* Recent Sorties */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Assigned Sorties & Missions</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total: {resource.recent_activities?.length || 0}</span>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Departure</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {resource.recent_activities?.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No sorties recorded</td></tr>
                ) : (
                  resource.recent_activities?.map((act) => (
                    <tr key={act.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#38bdf8' }}>{act.activity_code}</td>
                      <td style={{ fontWeight: 500 }}>{act.title}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{act.start_time?.slice(0, 16)}</td>
                      <td><StatusBadge status={act.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance Logs */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Maintenance Servicing Records</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cycles: {resource.maintenance_records?.length || 0}</span>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Start</th>
                  <th>Tech Lead</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {resource.maintenance_records?.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No maintenance entries</td></tr>
                ) : (
                  resource.maintenance_records?.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600, color: '#fbbf24' }}>{m.maintenance_type}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.start_time?.slice(0, 16)}</td>
                      <td style={{ fontSize: '0.8rem' }}>{m.assigned_technician}</td>
                      <td><StatusBadge status={m.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
