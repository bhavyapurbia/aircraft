import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  Plane,
  Clock,
  DollarSign,
  Wrench,
  Users
} from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('utilisation');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState('');

  const fetchReport = async () => {
    try {
      setLoading(true);
      let endpoint = '/reports/utilisation';
      if (reportType === 'maintenance') endpoint = '/reports/maintenance';
      if (reportType === 'conflicts') endpoint = '/reports/conflicts';
      if (reportType === 'staff') endpoint = '/reports/staff-workload';

      const res = await api.get(endpoint);
      if (res.data.success) {
        setData(res.data.data);
        setGeneratedAt(res.data.generated_at);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    window.open(`/api/reports/export/csv?report_type=${reportType}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
            Operational Analytics & Formal Audit Reports
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Mission flight readiness metrics, airframe maintenance logs, and crew duty audit reporting.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={handlePrint} className="btn btn-secondary btn-sm">
            <Printer size={14} /> Print Report
          </button>
          <button onClick={handleExportCSV} className="btn btn-primary btn-sm">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} className="no-print">
        <button
          className={`btn btn-sm ${reportType === 'utilisation' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setReportType('utilisation')}
        >
          Fleet Utilisation & Flight Hours
        </button>
        <button
          className={`btn btn-sm ${reportType === 'maintenance' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setReportType('maintenance')}
        >
          Maintenance Inspection Log
        </button>
        <button
          className={`btn btn-sm ${reportType === 'conflicts' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setReportType('conflicts')}
        >
          Operational Conflict Audit
        </button>
        <button
          className={`btn btn-sm ${reportType === 'staff' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setReportType('staff')}
        >
          Crew Workload & Duty Summary
        </button>
      </div>

      {/* Formal Printable Document Header */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #0284c7' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            CIVILIAN AIR OPERATIONS // REPORT REF: AIRPOWER-AUDIT-2026
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: 2 }}>
            {reportType === 'utilisation' && 'Aircraft Fleet Utilisation & Operational Flight Hours Report'}
            {reportType === 'maintenance' && 'Comprehensive Airframe Maintenance Audit & Release Record'}
            {reportType === 'conflicts' && 'Safety Constraints & Schedule Conflict Historical Analysis'}
            {reportType === 'staff' && 'Operational Flight Crew Roster & Duty Limit Compliance Audit'}
          </h2>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div>Generated At: {generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString()}</div>
          <div>Status: Verified by Operations Command</div>
        </div>
      </div>

      {/* Content Table */}
      {loading ? (
        <LoadingSpinner text="Compiling formal report data..." />
      ) : (
        <div className="table-container">
          {reportType === 'utilisation' && (
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Aircraft Name</th>
                  <th>Category</th>
                  <th>Registration</th>
                  <th>Status</th>
                  <th>Sorties Flown</th>
                  <th>Period Flight Hours</th>
                  <th>Airframe Hours</th>
                  <th>Operating Cost (INR)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.resource_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{r.resource_code}</td>
                    <td style={{ fontWeight: 600 }}>{r.resource_name}</td>
                    <td>{r.category}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.registration_no}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{r.sorties_count}</td>
                    <td style={{ fontWeight: 600 }}>{r.total_flight_hours} hrs</td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.cumulative_airframe_hours} hrs</td>
                    <td style={{ color: '#34d399' }}>₹{parseFloat(r.total_operational_cost).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'maintenance' && (
            <table className="table">
              <thead>
                <tr>
                  <th>Job Code</th>
                  <th>Aircraft</th>
                  <th>Registration</th>
                  <th>Type</th>
                  <th>Start Window</th>
                  <th>Expected RTS</th>
                  <th>Technician</th>
                  <th>Cost Est.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{m.maintenance_code}</td>
                    <td style={{ fontWeight: 600 }}>{m.resource_name}</td>
                    <td>{m.registration_no}</td>
                    <td style={{ color: '#fbbf24', fontWeight: 500 }}>{m.maintenance_type}</td>
                    <td>{m.start_time?.slice(0, 16)}</td>
                    <td>{m.expected_completion?.slice(0, 16)}</td>
                    <td>{m.assigned_technician}</td>
                    <td>₹{parseFloat(m.cost_estimate).toLocaleString()}</td>
                    <td><StatusBadge status={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'conflicts' && (
            <table className="table">
              <thead>
                <tr>
                  <th>Conflict ID</th>
                  <th>Sortie Code</th>
                  <th>Sortie Title</th>
                  <th>Aircraft</th>
                  <th>Violation Type</th>
                  <th>Severity</th>
                  <th>Detected At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>#{c.id}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{c.activity_code}</td>
                    <td style={{ fontWeight: 500 }}>{c.activity_title}</td>
                    <td>{c.resource_name}</td>
                    <td style={{ color: '#fb7185', fontWeight: 600 }}>{c.conflict_type}</td>
                    <td><StatusBadge status={c.severity} /></td>
                    <td style={{ fontSize: '0.75rem' }}>{c.detected_at?.slice(0, 16)}</td>
                    <td>{c.is_resolved ? <span style={{ color: '#34d399' }}>Resolved</span> : <span style={{ color: '#fb7185' }}>Active</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'staff' && (
            <table className="table">
              <thead>
                <tr>
                  <th>Staff Code</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Logged Today</th>
                  <th>Max Allowed</th>
                  <th>Missions Assigned</th>
                  <th>Total Mission Flight Hours</th>
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s.staff_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{s.staff_code}</td>
                    <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                    <td>{s.role_category}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>{s.current_duty_hours} hrs</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.max_daily_duty_hours} hrs</td>
                    <td>{s.total_missions_assigned}</td>
                    <td style={{ fontWeight: 600, color: '#38bdf8' }}>{s.total_logged_mission_hours} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
