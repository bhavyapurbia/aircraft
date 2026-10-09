import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div className="card" style={{ maxWidth: '480px', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid #f43f5e' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(244, 63, 94, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ShieldAlert size={32} color="#fb7185" />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc' }}>
          Access Denied // Insufficient Role Clearance
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Your current authenticated operator account does not possess sufficient clearance permissions to execute or inspect this module.
        </p>
        <NavLink to="/" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
          <ArrowLeft size={16} /> Return to Operations Dashboard
        </NavLink>
      </div>
    </div>
  );
}
