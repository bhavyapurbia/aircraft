import React from 'react';

export default function KpiCard({ title, value, icon: Icon, subtitle, change, trend = 'neutral', color = 'cyan' }) {
  const colorMap = {
    cyan: { iconBg: 'rgba(2, 132, 199, 0.15)', iconColor: '#38bdf8', borderHover: '#0284c7' },
    emerald: { iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#34d399', borderHover: '#10b981' },
    amber: { iconBg: 'rgba(245, 158, 11, 0.15)', iconColor: '#fbbf24', borderHover: '#f59e0b' },
    rose: { iconBg: 'rgba(244, 63, 94, 0.15)', iconColor: '#fb7185', borderHover: '#f43f5e' }
  };

  const scheme = colorMap[color] || colorMap.cyan;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            padding: '0.5rem',
            borderRadius: '8px',
            background: scheme.iconBg,
            color: scheme.iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>
          {value !== undefined && value !== null ? value : '--'}
        </span>
        {change && (
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: trend === 'up' ? '#34d399' : trend === 'down' ? '#fb7185' : 'var(--text-muted)'
          }}>
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
