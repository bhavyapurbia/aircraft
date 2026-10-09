import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import KpiCard from '../components/KpiCard';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Plane,
  Calendar,
  AlertTriangle,
  Users,
  Activity,
  Wrench,
  Clock,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  Zap,
  TrendingUp,
  Cpu
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [sumRes, anaRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/analytics')
      ]);
      if (sumRes.data.success) setData(sumRes.data);
      if (anaRes.data.success) setAnalytics(anaRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner text="Connecting to Air Operations Registry..." />;

  const kpis = data?.kpis || {};
  const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        padding: '1.25rem 1.5rem',
        borderRadius: '10px',
        border: '1px solid var(--border-color)'
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
            Air Operations Command Dashboard
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Real-time fleet readiness, active sortie schedule conflicts, and AI-enabled resource allocation.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={fetchData}
            className="btn btn-secondary btn-sm"
            disabled={refreshing}
            title="Refresh Live Telemetry"
          >
            <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <NavLink to="/optimisation" className="btn btn-primary btn-sm">
            <Cpu size={14} />
            Launch Optimiser
          </NavLink>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem'
      }}>
        <KpiCard
          title="Fleet Assets"
          value={kpis.total_resources}
          icon={Plane}
          subtitle={`${kpis.available_resources} ready for deployment`}
          color="cyan"
        />
        <KpiCard
          title="Fleet Utilisation"
          value={`${kpis.utilisation_percentage}%`}
          icon={Activity}
          subtitle={`${kpis.scheduled_resources} aircraft active on sorties`}
          change="+4.2% vs target"
          trend="up"
          color="emerald"
        />
        <KpiCard
          title="Active Conflicts"
          value={kpis.active_conflicts}
          icon={AlertTriangle}
          subtitle={`${kpis.critical_conflicts} critical overlaps`}
          color={kpis.active_conflicts > 0 ? 'rose' : 'emerald'}
        />
        <KpiCard
          title="Upcoming Sorties"
          value={kpis.upcoming_activities}
          icon={Calendar}
          subtitle={`${kpis.completed_activities} historical completed`}
          color="cyan"
        />
        <KpiCard
          title="Under Maintenance"
          value={kpis.maintenance_resources}
          icon={Wrench}
          subtitle="Mandatory A/B check cycles"
          color="amber"
        />
        <KpiCard
          title="Crew Readiness"
          value={kpis.active_staff}
          icon={Users}
          subtitle={`${kpis.on_duty_staff} currently logged on-duty`}
          color="emerald"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Chart 1: Utilisation Timeline */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Fleet Flight Hours Timeline</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily aggregated operational flight sorties</p>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>Logged Hours</span>
          </div>

          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.utilisation_timeline || []}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#0d1a2d', borderColor: '#1e3a5f', borderRadius: 8, color: '#f8fafc', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="flight_hours" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Readiness */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Resource Availability by Role</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available vs Scheduled vs Maintenance assets</p>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Fleet Registry</span>
          </div>

          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.availability_by_category || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="category" stroke="#64748b" fontSize={10} tickFormatter={(val) => val.split(' ')[0]} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#0d1a2d', borderColor: '#1e3a5f', borderRadius: 8, color: '#f8fafc', fontSize: 12 }}
                />
                <Bar dataKey="available" name="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scheduled" name="Scheduled" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="maintenance" name="Maintenance" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Active Conflicts and Recent Audit Telemetry */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Active Conflicts Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} color="#fb7185" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Unresolved Planning Conflicts</h3>
            </div>
            <NavLink to="/conflicts" style={{ fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Open Conflict Centre <ArrowRight size={14} />
            </NavLink>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {data?.recent_notifications?.filter(n => n.type === 'CONFLICT_ALERT').length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                All current schedules are validated. No hard constraints violated.
              </div>
            ) : (
              data?.recent_notifications?.map((notif) => (
                <div key={notif.id} style={{
                  padding: '0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(244, 63, 94, 0.08)',
                  border: '1px solid rgba(244, 63, 94, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fb7185' }}>
                      {notif.title}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>
                      {notif.created_at?.slice(11, 16)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {notif.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Operational Audit Activity */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="#38bdf8" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent System Audit Log</h3>
            </div>
            <NavLink to="/audit-logs" style={{ fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Full Audit Trail <ArrowRight size={14} />
            </NavLink>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {data?.recent_activity?.slice(0, 5).map((log) => (
              <div key={log.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                background: 'rgba(13, 26, 45, 0.6)',
                border: '1px solid var(--border-color)',
                fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: log.outcome === 'SUCCESS' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                    color: log.outcome === 'SUCCESS' ? '#34d399' : '#fb7185'
                  }}>
                    {log.action}
                  </span>
                  <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
                    {log.username}
                  </span>
                  <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>
                    {log.details || log.entity_type}
                  </span>
                </div>
                <span style={{ color: 'var(--text-faint)', fontSize: '0.7rem' }}>
                  {log.timestamp?.slice(11, 16)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
