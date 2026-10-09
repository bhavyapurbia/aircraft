import React from 'react';
import { NavLink } from 'react-router-dom';
import { Plane, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div className="card" style={{ maxWidth: '480px', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Plane size={48} color="#38bdf8" />
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
          404 // Off Flight Plan
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          The requested system terminal address or navigational waypoint does not exist in the active operational database.
        </p>
        <NavLink to="/" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
          <ArrowLeft size={16} /> Return to Flight Command
        </NavLink>
      </div>
    </div>
  );
}
