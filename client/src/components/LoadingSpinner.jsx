import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Loading operational telemetry...' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem',
      gap: '1rem',
      color: 'var(--text-muted)'
    }}>
      <Loader2 size={32} className="spin-icon" style={{ animation: 'spin 1s linear infinite', color: '#38bdf8' }} />
      <span style={{ fontSize: '0.875rem', letterSpacing: '0.025em' }}>{text}</span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
