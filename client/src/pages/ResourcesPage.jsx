import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import {
  Plane,
  Plus,
  Download,
  Search,
  Filter,
  Eye,
  Edit2,
  Archive,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';

export default function ResourcesPage() {
  const { hasRole } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [sortBy, setSortBy] = useState('id');
  const [order, setOrder] = useState('ASC');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState({
    resource_name: '',
    category: 'Transport Cargo',
    model: '',
    registration_no: '',
    status: 'Available',
    capacity_pax: 0,
    payload_capacity_kg: 0,
    base_location: 'Airfield Alpha (Western Hub)',
    hourly_cost: 1500,
    next_scheduled_maintenance: '',
    notes: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search,
        status: statusFilter,
        category: categoryFilter,
        sortBy,
        order
      });
      const res = await api.get(`/resources?${params.toString()}`);
      if (res.data.success) {
        setResources(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [pagination.page, statusFilter, categoryFilter, sortBy, order]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchResources();
  };

  const handleOpenAdd = () => {
    setEditingResource(null);
    setFormData({
      resource_name: '',
      category: 'Transport Cargo',
      model: '',
      registration_no: '',
      status: 'Available',
      capacity_pax: 0,
      payload_capacity_kg: 0,
      base_location: 'Airfield Alpha (Western Hub)',
      hourly_cost: 1500,
      next_scheduled_maintenance: '',
      notes: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (res) => {
    setEditingResource(res);
    setFormData({
      resource_name: res.resource_name,
      category: res.category,
      model: res.model,
      registration_no: res.registration_no,
      status: res.status,
      capacity_pax: res.capacity_pax,
      payload_capacity_kg: res.payload_capacity_kg,
      base_location: res.base_location,
      hourly_cost: res.hourly_cost,
      next_scheduled_maintenance: res.next_scheduled_maintenance || '',
      notes: res.notes || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (editingResource) {
        await api.put(`/resources/${editingResource.id}`, formData);
      } else {
        await api.post('/resources', formData);
      }
      setIsModalOpen(false);
      fetchResources();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save resource record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id, name) => {
    if (!window.confirm(`Are you sure you want to archive resource "${name}"? Archived assets cannot be assigned to flights.`)) {
      return;
    }
    try {
      await api.delete(`/resources/${id}`);
      fetchResources();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive resource.');
    }
  };

  const handleExportCSV = () => {
    window.open('/api/resources/export/csv', '_blank');
  };

  const categories = [
    'Transport Cargo',
    'Air Ambulance',
    'Surveillance & Recon',
    'Multi-Role Utility',
    'Executive Transport',
    'Training Flight',
    'Search & Rescue'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>Fleet Resource Registry</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Manage civilian aviation assets, airworthiness status, payload profiles, and maintenance intervals.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
            <Download size={14} /> Export CSV
          </button>
          {hasRole(['Administrator', 'Planner']) && (
            <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
              <Plus size={14} /> Register Aircraft
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              className="input"
              placeholder="Search by code, registration, name or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.4rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            style={{ width: '160px' }}
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Unavailable">Unavailable</option>
          </select>

          <select
            className="select"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            style={{ width: '180px' }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Retrieving fleet inventory..." />
      ) : resources.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No resources matched the filter parameters.
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => { setSortBy('resource_code'); setOrder(order === 'ASC' ? 'DESC' : 'ASC'); }} style={{ cursor: 'pointer' }}>
                  Code <ArrowUpDown size={12} style={{ verticalAlign: 'middle' }} />
                </th>
                <th>Aircraft Name</th>
                <th>Role / Category</th>
                <th>Model</th>
                <th>Registration</th>
                <th>Status</th>
                <th>Base Station</th>
                <th>Rate (₹/hr)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((res) => (
                <tr key={res.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#38bdf8' }}>
                    {res.resource_code}
                  </td>
                  <td style={{ fontWeight: 600 }}>{res.resource_name}</td>
                  <td>{res.category}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{res.model}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{res.registration_no}</td>
                  <td>
                    <StatusBadge status={res.status} />
                  </td>
                  <td>{res.base_location?.split(' ')[0]}</td>
                  <td>₹{parseFloat(res.hourly_cost).toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <NavLink to={`/resources/${res.id}`} className="btn btn-secondary btn-sm" title="Inspect Telemetry">
                        <Eye size={13} />
                      </NavLink>
                      {hasRole(['Administrator', 'Planner']) && (
                        <button onClick={() => handleOpenEdit(res)} className="btn btn-secondary btn-sm" title="Edit Parameters">
                          <Edit2 size={13} />
                        </button>
                      )}
                      {hasRole(['Administrator']) && (
                        <button onClick={() => handleArchive(res.id, res.resource_name)} className="btn btn-danger btn-sm" title="Archive Asset">
                          <Archive size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}>
            <span>Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total items)</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingResource ? `Edit Aircraft Parameters: ${editingResource.resource_code}` : 'Register New Fleet Asset'}
        maxWidth="680px"
      >
        {formError && (
          <div style={{ padding: '0.65rem', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label className="label">Resource Display Name *</label>
              <input
                type="text"
                className="input"
                required
                value={formData.resource_name}
                onChange={(e) => setFormData({ ...formData, resource_name: e.target.value })}
                placeholder="e.g. Skylifter Cargo Gamma"
              />
            </div>
            <div>
              <label className="label">Operational Category *</label>
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label className="label">Manufacturer & Model *</label>
              <input
                type="text"
                className="input"
                required
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g. Lockheed L-100-30"
              />
            </div>
            <div>
              <label className="label">Registration Code / Tail No *</label>
              <input
                type="text"
                className="input"
                required
                value={formData.registration_no}
                onChange={(e) => setFormData({ ...formData, registration_no: e.target.value })}
                placeholder="e.g. VT-XCA-909"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div>
              <label className="label">Airworthiness Status</label>
              <select
                className="select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Available">Available</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Unavailable">Unavailable</option>
              </select>
            </div>
            <div>
              <label className="label">Pax Capacity</label>
              <input
                type="number"
                className="input"
                value={formData.capacity_pax}
                onChange={(e) => setFormData({ ...formData, capacity_pax: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div>
              <label className="label">Payload (kg)</label>
              <input
                type="number"
                className="input"
                value={formData.payload_capacity_kg}
                onChange={(e) => setFormData({ ...formData, payload_capacity_kg: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label className="label">Base Airfield Location</label>
              <input
                type="text"
                className="input"
                value={formData.base_location}
                onChange={(e) => setFormData({ ...formData, base_location: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Operating Cost (₹ / hour)</label>
              <input
                type="number"
                className="input"
                value={formData.hourly_cost}
                onChange={(e) => setFormData({ ...formData, hourly_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="label">Operational Notes & Clearance Specs</label>
            <textarea
              className="textarea"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Avionics specs, short-field takeoff capabilities, oxygen certification..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Saving...' : editingResource ? 'Save Modifications' : 'Register Aircraft'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
