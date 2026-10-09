import React from 'react';

export default function StatusBadge({ status, type = 'status' }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase();
  let badgeClass = 'badge-info';

  if (['available', 'active', 'valid', 'success', 'completed'].some(s => normalized.includes(s))) {
    badgeClass = 'badge-available';
  } else if (['scheduled', 'in progress', 'info', 'routine'].some(s => normalized.includes(s))) {
    badgeClass = 'badge-scheduled';
  } else if (['under maintenance', 'warning', 'expiring soon', 'high'].some(s => normalized.includes(s))) {
    badgeClass = 'badge-maintenance';
  } else if (['unavailable', 'danger', 'expired', 'critical', 'constraint breach', 'delayed'].some(s => normalized.includes(s))) {
    badgeClass = 'badge-unavailable';
  } else if (['archived', 'cancelled', 'draft'].some(s => normalized.includes(s))) {
    badgeClass = 'badge-archived';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}></span>
      {status}
    </span>
  );
}
