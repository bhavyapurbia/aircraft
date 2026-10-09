import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Plane,
  LayoutDashboard,
  Calendar,
  Wrench,
  Users,
  AlertTriangle,
  Cpu,
  GitBranch,
  BarChart3,
  Bell,
  ShieldCheck,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  Radio,
  FileText
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeConflictCount, setActiveConflictCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  useEffect(() => {
    async function fetchHeaderTelemetry() {
      try {
        const notifRes = await api.get('/notifications');
        if (notifRes.data.success) {
          setUnreadCount(notifRes.data.unread_count);
          setNotifications(notifRes.data.data.slice(0, 5));
        }

        const conflictRes = await api.get('/conflicts?is_resolved=0');
        if (conflictRes.data.success) {
          setActiveConflictCount(conflictRes.data.data.length);
        }
      } catch (e) {
        // Handle polling failure silently
      }
    }

    fetchHeaderTelemetry();
    const interval = setInterval(fetchHeaderTelemetry, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, [location.pathname]);

  const navItems = [
    { to: '/', label: 'Operations Dashboard', icon: LayoutDashboard },
    { to: '/resources', label: 'Fleet Assets', icon: Plane },
    { to: '/scheduling', label: 'Sorties & Calendar', icon: Calendar },
    { to: '/maintenance', label: 'Maintenance Registry', icon: Wrench },
    { to: '/staff', label: 'Crew & Certifications', icon: Users },
    { 
      to: '/conflicts', 
      label: 'Conflict Centre', 
      icon: AlertTriangle,
      badge: activeConflictCount > 0 ? activeConflictCount : null,
      badgeColor: 'rose'
    },
    { to: '/optimisation', label: 'Optimisation Engine', icon: Cpu },
    { to: '/scenarios', label: 'What-If Simulations', icon: GitBranch },
    { to: '/reports', label: 'Analytics & Reports', icon: BarChart3 }
  ];

  if (hasRole(['Administrator'])) {
    navItems.push({ to: '/audit-logs', label: 'System Audit Logs', icon: ShieldCheck });
    navItems.push({ to: '/settings', label: 'System Settings', icon: Settings });
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar Desktop */}
      <aside style={{
        width: '260px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }} className="no-print">
        {/* Brand Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(2, 132, 199, 0.4)'
          }}>
            <Plane size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.05em', color: '#f8fafc' }}>
              AIR POWER
            </div>
            <div style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 600, letterSpacing: '0.08em' }}>
              OPERATIONS PLATFORM
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '1rem 0.75rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  color: isActive ? '#38bdf8' : 'var(--text-muted)',
                  background: isActive ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '9999px',
                    background: 'rgba(244, 63, 94, 0.2)',
                    color: '#fb7185',
                    border: '1px solid rgba(244, 63, 94, 0.4)'
                  }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border-color)',
          background: 'rgba(8, 15, 26, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Radio size={14} color="#34d399" style={{ animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Civilian Air Ops Registry
            </span>
          </div>
          <div style={{ fontSize: '0.675rem', color: '#64748b' }}>
            Live Operations Command
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{
          height: '64px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }} className="no-print">
          {/* Left Title / Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: activeConflictCount > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: activeConflictCount > 0 ? '#fb7185' : '#34d399',
              border: `1px solid ${activeConflictCount > 0 ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
              {activeConflictCount > 0 ? `${activeConflictCount} Active Conflicts Detected` : 'Fleet Operational Status: Nominal'}
            </div>
          </div>

          {/* Right Profile & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#f43f5e',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  width: '320px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  padding: '0.75rem',
                  zIndex: 50
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Operational Alerts</span>
                    <NavLink to="/notifications" onClick={() => setShowNotifMenu(false)} style={{ fontSize: '0.75rem', color: '#38bdf8' }}>View All</NavLink>
                  </div>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {notifications.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>No unread notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} style={{ padding: '0.5rem', borderRadius: '4px', background: 'rgba(18, 35, 60, 0.4)', fontSize: '0.78rem' }}>
                          <div style={{ fontWeight: 600, color: n.severity === 'Urgent' ? '#fb7185' : '#38bdf8' }}>{n.title}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill */}
            <NavLink
              to="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                textDecoration: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(18, 35, 60, 0.6)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)'
              }}
            >
              <div style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: '#fff'
              }}>
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.2 }}>
                  {user?.full_name?.split(' ')[0] || user?.username}
                </div>
                <div style={{ fontSize: '0.675rem', color: '#38bdf8' }}>
                  {user?.role_name}
                </div>
              </div>
            </NavLink>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fb7185',
                cursor: 'pointer'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main style={{ flex: 1, padding: '1.75rem', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
