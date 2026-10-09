import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { Bell, CheckCheck, AlertTriangle, Info, Clock } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/all/read');
      fetchNotifs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
            Operational Notifications & Safety Broadcasts
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time automated warnings regarding scheduling collisions, aircraft groundings, and expiring crew licenses.
          </p>
        </div>

        <button onClick={handleMarkAllRead} className="btn btn-secondary btn-sm">
          <CheckCheck size={14} /> Mark All as Read
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Retrieving operational alerts..." />
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No notifications recorded in your inbox.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map((n) => (
            <div key={n.id} className="card" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderLeft: n.severity === 'Urgent' ? '4px solid #f43f5e' : (n.severity === 'Warning' ? '4px solid #f59e0b' : '4px solid #0284c7'),
              opacity: n.is_read ? 0.75 : 1
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: n.severity === 'Urgent' ? '#fb7185' : '#f8fafc' }}>
                    {n.title}
                  </span>
                  <StatusBadge status={n.severity} />
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                  {n.message}
                </p>
              </div>

              <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                {n.created_at?.slice(0, 16)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
