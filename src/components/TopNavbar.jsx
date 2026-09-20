import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  LogOut,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';

export default function TopNavbar({
  teacher,
  onLogout,
  onBackToSearch,
  hasActiveStudent,
  onShowToast
}) {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncLabel, setLastSyncLabel] = useState('');

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/sync/status');
      if (res.ok) {
        const data = await res.json();
        setSyncing(Boolean(data.isSyncing));
        if (data.lastSyncTime) {
          const d = new Date(data.lastSyncTime);
          setLastSyncLabel(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    onShowToast?.('Synchronizing with Google Spreadsheets...', 'info');

    try {
      const res = await fetch('/api/sync/trigger', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        const d = new Date();
        setLastSyncLabel(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        onShowToast?.('Database successfully synchronized with Google Sheets!', 'success');
      } else {
        throw new Error(data.error || 'Sync encountered an issue');
      }
    } catch (err) {
      onShowToast?.(err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'TP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className="top-navbar">
      <div className="nav-brand">
        {hasActiveStudent && (
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={onBackToSearch}
            title="Back to Student Search"
            style={{ width: '42px', height: '42px' }}
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <img
          src="/tpc-logo.jpg"
          alt="The Prime Classes"
          className="tpc-logo"
        />

        <div className="brand-info">
          <span className="brand-title">The Prime Classes</span>
          <span className="brand-tagline">
            RIMC &bull; RMS &bull; SAINIK SCHOOL &bull; FOUNDATION
          </span>
        </div>
      </div>

      <div className="nav-actions">
        {/* Sync Status Button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleManualSync}
          disabled={syncing}
          title={lastSyncLabel ? `Last synchronized at ${lastSyncLabel}` : 'Sync with Google Sheets'}
          style={{ height: '40px', gap: '8px' }}
        >
          <RefreshCw
            size={15}
            style={{
              animation: syncing ? 'spin 0.9s linear infinite' : 'none',
              color: syncing ? 'var(--tpc-purple)' : 'var(--tpc-green)'
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 600 }}>
            {syncing ? 'Syncing...' : lastSyncLabel ? `Synced ${lastSyncLabel}` : 'Sync Data'}
          </span>
        </button>

        {/* Faculty Profile */}
        {teacher && (
          <div className="faculty-pill" title={`${teacher.name} — ${teacher.role || teacher.department}`}>
            <div className="faculty-avatar">
              {getInitials(teacher.name)}
            </div>
            <div className="faculty-meta">
              <span className="faculty-name">{teacher.name}</span>
              <span className="faculty-role">{teacher.role || teacher.department}</span>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={onLogout}
          title="Sign out of Dashboard"
          style={{ width: '42px', height: '42px' }}
        >
          <LogOut size={18} color="var(--danger)" />
        </button>
      </div>
    </header>
  );
}
