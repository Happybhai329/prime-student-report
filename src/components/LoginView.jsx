import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId.trim()) {
      setError('Please enter your Employee ID.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employeeId.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      onLoginSuccess(data.employee);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'linear-gradient(135deg, #f5f3ff 0%, #f8fafc 45%, #f0fdf4 100%)'
    }}>
      <div className="glass" style={{
        width: '100%',
        maxWidth: '490px',
        padding: '40px 36px',
        display: 'flex',
        flexDirection: 'column',
        gap: '26px',
        textAlign: 'center',
        border: '1.5px solid var(--tpc-purple-border)',
        boxShadow: '0 20px 40px -15px rgba(107, 33, 168, 0.15)'
      }}>
        {/* Official Logo */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img
            src="/tpc-logo.jpg"
            alt="The Prime Classes"
            className="tpc-logo-lg"
          />
        </div>

        <div>
          <span className="badge badge-primary" style={{ marginBottom: '10px' }}>
            Faculty & Academic Portal
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px', letterSpacing: '-0.5px' }}>
            The Prime Classes
          </h1>
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--tpc-purple)',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            marginTop: '4px'
          }}>
            RIMC &bull; RMS &bull; SAINIK SCHOOL &bull; FOUNDATION
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Sign in with your Employee ID to generate student report cards and track performance
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--danger)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="empId">
              Faculty / Employee ID
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="empId"
                type="text"
                className="form-input"
                placeholder="e.g. TPC2585AB"
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value.toUpperCase());
                  if (error) setError('');
                }}
                disabled={loading}
                autoFocus
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: '50px', fontSize: '15px', fontWeight: 700 }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '18px', height: '18px' }} />
                <span>Verifying Faculty Credentials...</span>
              </>
            ) : (
              <>
                <span>Access Dashboard</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{
          padding: '12px 18px',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          border: '1px solid var(--stroke)'
        }}>
          <ShieldCheck size={16} color="var(--tpc-green)" />
          <span>Active Faculty Authorization Required</span>
        </div>
      </div>
    </div>
  );
}
