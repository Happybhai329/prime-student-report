import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, ArrowUpRight, Sparkles, GraduationCap } from 'lucide-react';

function cleanMobile(raw) {
  if (!raw) return '-';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.join(', ');
  } catch {
    // fallback
  }
  return String(raw).replace(/[[\]"\\]/g, '').trim() || '-';
}

function getInitials(name) {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function StudentSearch({ onSelectStudent, onShowToast }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimerRef = useRef(null);
  const searchWrapRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/students/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSuggestions((data.results || []).slice(0, 5));
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Search fetch error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(debounceTimerRef.current);
  }, [query]);

  const handleSelect = (student) => {
    setShowSuggestions(false);
    onSelectStudent(student);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (results.length === 1) {
      handleSelect(results[0]);
    }
  };

  return (
    <section className="search-section" ref={searchWrapRef}>
      {/* Search Input Box */}
      <form onSubmit={handleFormSubmit} className="search-box-wrap">
        <Search className="search-icon-left" size={22} />
        <input
          type="text"
          className="search-input-main"
          placeholder="Search student by Name or ID (e.g. Shivang, 2603050002)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => {
              setQuery('');
              setResults([]);
              setSuggestions([]);
            }}
          >
            <X size={18} />
          </button>
        )}
      </form>

      {/* Auto-suggest dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggest-dropdown">
          {suggestions.map((s) => (
            <div
              key={s.studentId}
              className="suggest-item"
              onClick={() => handleSelect(s)}
            >
              <div className="suggest-primary">
                <span className="suggest-name">{s.studentName}</span>
                <span className="suggest-sub">
                  ID: {s.studentId} &bull; Batch: {s.batch || 'N/A'} &bull; Class: {s.className || 'N/A'}
                </span>
              </div>
              <ArrowUpRight size={17} color="var(--tpc-purple)" />
            </div>
          ))}
        </div>
      )}

      {/* Search Results Grid */}
      <div style={{ marginTop: '28px' }}>
        {loading && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div className="spinner spinner-dark" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600 }}>Searching The Prime Classes student database...</p>
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="glass" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <User size={42} color="var(--text-light)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>No matching students found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              No records found for "{query}". Check spelling or enter the exact 10-digit Student ID.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="results-grid">
            {results.map((student) => (
              <div key={student.studentId} className="dyn-item-card">
                <div className="card-top">
                  <div className="student-card-avatar">
                    {getInitials(student.studentName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="badge badge-primary" style={{ marginBottom: '6px' }}>
                      ID: {student.studentId}
                    </span>
                    <h3 className="card-title">{student.studentName}</h3>
                  </div>
                </div>

                <div className="card-meta-list">
                  <div className="card-meta-item">
                    <span className="card-meta-label">Father's Name</span>
                    <span className="card-meta-value">{student.fatherName || '-'}</span>
                  </div>
                  <div className="card-meta-item">
                    <span className="card-meta-label">Batch</span>
                    <span className="card-meta-value">{student.batch || '-'}</span>
                  </div>
                  <div className="card-meta-item">
                    <span className="card-meta-label">Class</span>
                    <span className="card-meta-value">{student.className ? `Class ${student.className}` : '-'}</span>
                  </div>
                  <div className="card-meta-item">
                    <span className="card-meta-label">Mobile</span>
                    <span className="card-meta-value">{cleanMobile(student.mobile)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', height: '42px', marginTop: '4px' }}
                  onClick={() => handleSelect(student)}
                >
                  <span>Open Student Report Card</span>
                  <ArrowUpRight size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {!query && (
          <div className="glass" style={{ textAlign: 'center', padding: '64px 28px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--tpc-purple-subtle)',
              color: 'var(--tpc-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: '1.5px solid var(--tpc-purple-border)'
            }}>
              <GraduationCap size={32} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>
              Search & Select a Student
            </h2>
            <p style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: 'var(--tpc-purple)',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginTop: '4px'
            }}>
              RIMC &bull; RMS &bull; SAINIK SCHOOL &bull; FOUNDATION
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', maxWidth: '480px', margin: '10px auto 0', lineHeight: 1.5 }}>
              Enter any Student ID or Name to generate their official academic progress report, complete with attendance trends, homework completion, subject rankings, and printable PDF cards.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
