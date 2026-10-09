import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import {
  Users,
  Plus,
  Award,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  MapPin,
  Archive,
  Edit2
} from 'lucide-react';

export default function StaffPage() {
  const { hasRole } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role_category: 'Captain / Chief Pilot',
    max_daily_duty_hours: 10,
    base_location: 'Airfield Alpha (Western Hub)',
    qualification_name: 'Multi-Engine Instrument Rating',
    qualification_expiry: '2027-01-01'
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/staff${roleFilter ? `?role_category=${roleFilter}` : ''}`);
      if (res.data.success) {
        setStaff(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [roleFilter]);

  const handleOpenAdd = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      role_category: 'Captain / Chief Pilot',
      max_daily_duty_hours: 10,
      base_location: 'Airfield Alpha (Western Hub)',
      qualification_name: 'Multi-Engine Instrument Rating',
      qualification_expiry: '2027-01-01'
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/staff', {
        ...formData,
        qualifications: formData.qualification_name ? [
          {
            qualification_name: formData.qualification_name,
            expiry_date: formData.qualification_expiry,
            status: 'Valid'
          }
        ] : []
      });
      setIsModalOpen(false);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register crew member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id, name) => {
    if (!window.confirm(`Archive staff member "${name}" from operational roster?`)) return;
    try {
      await api.delete(`/staff/${id}`);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive staff');
    }
  };

  const roleCategories = [
    'Captain / Chief Pilot',
    'First Officer',
    'Avionics Specialist',
    'Flight Engineer',
    'Operations Controller',
    'Medical Evac Specialist'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
            Flight Operations Crew & Qualifications
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Track pilot certifications, medical clearances, and regulatory duty cycle limits.
          </p>
        </div>

        {hasRole(['Administrator']) && (
          <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add Crew Member
          </button>
        )}
      </div>

      {/* Role Category Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${roleFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setRoleFilter('')}
        >
          All Crew Roles
        </button>
        {roleCategories.map((r) => (
          <button
            key={r}
            className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setRoleFilter(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <LoadingSpinner text="Retrieving crew roster & certifications..." />
      ) : staff.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No staff members found for selected role.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {staff.map((member) => (
            <div key={member.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>
                    {member.full_name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 500 }}>
                    {member.role_category}
                  </span>
                </div>
                <StatusBadge status={member.status} />
              </div>

              {/* Duty Hours & Base */}
              <div style={{
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                background: 'rgba(13, 26, 45, 0.6)',
                fontSize: '0.78rem',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                  <Clock size={13} />
                  <span>Duty Today: <strong style={{ color: '#e2e8f0' }}>{member.current_duty_hours}h / {member.max_daily_duty_hours}h max</strong></span>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  Base: {member.base_location?.split(' ')[0]}
                </div>
              </div>

              {/* Qualifications Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Certified Qualifications:
                </span>
                {member.qualifications?.length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>None on file</span>
                ) : (
                  member.qualifications?.map((q) => (
                    <div key={q.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '4px',
                      background: q.status === 'Expired' ? 'rgba(244, 63, 94, 0.12)' : (q.status === 'Expiring Soon' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.08)'),
                      border: `1px solid ${q.status === 'Expired' ? 'rgba(244, 63, 94, 0.3)' : (q.status === 'Expiring Soon' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.2)')}`
                    }}>
                      <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{q.qualification_name}</span>
                      <span style={{ fontSize: '0.7rem', color: q.status === 'Expired' ? '#fb7185' : (q.status === 'Expiring Soon' ? '#fbbf24' : '#34d399') }}>
                        Exp: {q.expiry_date}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Contact and Actions Footer */}
              <div style={{
                marginTop: 'auto',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}>
                <div>{member.phone || member.email}</div>
                {hasRole(['Administrator']) && (
                  <button
                    onClick={() => handleArchive(member.id, member.full_name)}
                    className="btn btn-danger btn-sm"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Operational Crew Member"
        maxWidth="600px"
      >
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Full Name & Rank *</label>
            <input
              type="text"
              className="input"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g. Capt. Rajesh Nair"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label className="label">Official Email *</label>
              <input
                type="email"
                className="input"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rajesh.nair@airpower.local"
              />
            </div>
            <div>
              <label className="label">Contact Phone</label>
              <input
                type="text"
                className="input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98110 00000"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label className="label">Role Category *</label>
              <select
                className="select"
                required
                value={formData.role_category}
                onChange={(e) => setFormData({ ...formData, role_category: e.target.value })}
              >
                {roleCategories.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Max Daily Duty Hours</label>
              <input
                type="number"
                className="input"
                value={formData.max_daily_duty_hours}
                onChange={(e) => setFormData({ ...formData, max_daily_duty_hours: parseFloat(e.target.value) || 10 })}
              />
            </div>
          </div>

          <div>
            <label className="label">Primary Type Rating / Qualification</label>
            <input
              type="text"
              className="input"
              value={formData.qualification_name}
              onChange={(e) => setFormData({ ...formData, qualification_name: e.target.value })}
              placeholder="e.g. Heavy Transport Type Rating (L-100 / C-130)"
            />
          </div>

          <div>
            <label className="label">Qualification Expiry Date</label>
            <input
              type="date"
              className="input"
              value={formData.qualification_expiry}
              onChange={(e) => setFormData({ ...formData, qualification_expiry: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Registering...' : 'Add Crew Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
