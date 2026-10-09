import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plane, Shield, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('planner');
  const [password, setPassword] = useState('Planner@12345');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isExpired = new URLSearchParams(location.search).get('expired');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || 'Invalid credentials');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication service unreachable.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 20%, #102a4e 0%, #060d17 70%)',
      padding: '1.5rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '2.25rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(2, 132, 199, 0.5)',
            marginBottom: '1rem'
          }}>
            <Plane size={30} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.04em', color: '#f8fafc' }}>
            AIR POWER
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600, letterSpacing: '0.08em', marginTop: '0.2rem' }}>
            DYNAMIC AIR OPERATIONS & RESOURCE OPTIMISATION
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '0.35rem' }}>
            Aviation Fleet Management & Tactical Resource Optimisation
          </p>
        </div>

        {isExpired && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            color: '#fbbf24',
            fontSize: '0.8rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            Your previous security session has expired. Please sign in again.
          </div>
        )}

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '8px',
            color: '#fb7185',
            fontSize: '0.8rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label className="label">Operator Username / Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. planner or admin"
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div>
            <label className="label">Access Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
          >
            {loading ? 'Authenticating Operator...' : 'Authenticate & Enter Console'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Quick Access Roles */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.65rem' }}>
            Quick Operator Access Credentials:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('admin', 'Admin@12345')}
              style={{ fontSize: '0.72rem', flexDirection: 'column', gap: '2px', padding: '0.45rem' }}
            >
              <strong>Admin</strong>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>All Rights</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('planner', 'Planner@12345')}
              style={{ fontSize: '0.72rem', flexDirection: 'column', gap: '2px', padding: '0.45rem' }}
            >
              <strong>Planner</strong>
              <span style={{ fontSize: '0.65rem', color: '#38bdf8' }}>Scheduling</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('viewer', 'Viewer@12345')}
              style={{ fontSize: '0.72rem', flexDirection: 'column', gap: '2px', padding: '0.45rem' }}
            >
              <strong>Viewer</strong>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Read Only</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
