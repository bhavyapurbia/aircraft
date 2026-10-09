import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Settings, Save, Shield, Sliders, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data.success) {
        setSettings(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (key, val) => {
    setSavingKey(key);
    try {
      await api.post('/settings', { setting_key: key, setting_value: val });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2500);
      fetchSettings();
    } catch (e) {
      alert('Failed to update setting');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <LoadingSpinner text="Loading system parameters..." />;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
          Application & Operations Engine Configuration
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Manage global turnaround thresholds, maximum pilot duty limits, and optimisation algorithm modes.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {settings.map((s) => (
          <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ maxWidth: '480px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
                {s.setting_key}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {s.description || 'System operational parameter'}
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Category: {s.category}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="text"
                defaultValue={s.setting_value}
                id={`setting-${s.setting_key}`}
                className="input"
                style={{ width: '180px', padding: '0.4rem 0.65rem' }}
              />
              <button
                onClick={() => {
                  const inputVal = document.getElementById(`setting-${s.setting_key}`).value;
                  handleUpdate(s.setting_key, inputVal);
                }}
                disabled={savingKey === s.setting_key}
                className="btn btn-secondary btn-sm"
              >
                {savingKey === s.setting_key ? 'Saving...' : <Save size={14} />}
              </button>
              {savedKey === s.setting_key && (
                <CheckCircle size={16} color="#34d399" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
