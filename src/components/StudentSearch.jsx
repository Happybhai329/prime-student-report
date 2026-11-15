import React, { useState, useEffect, useRef } from 'react';
import {
  Search, X, User, ArrowUpRight, GraduationCap, FileText, CalendarCheck,
  BookOpenCheck, Users, Layers, Sparkles, ChevronRight, Check
} from 'lucide-react';

// Report type toggle options — decides which report opens
const REPORT_MODES = [
  { key: 'full', label: 'Full Report', icon: FileText },
  { key: 'attendance', label: 'Attendance Report', icon: CalendarCheck },
  { key: 'homework', label: 'Homework Report', icon: BookOpenCheck }
];

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

export default function StudentSearch({
  onSelectStudent,
  onSelectBatch,
  batchesList = [],
  reportMode: externalReportMode,
  onReportModeChange,
  onShowToast
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [reportMode, setReportMode] = useState(externalReportMode || 'full'); // 'full' | 'attendance' | 'homework'
  const [searchScope, setSearchScope] = useState('student'); // 'student' | 'batch'
  const [chosenBatch, setChosenBatch] = useState('');

  const debounceTimerRef = useRef(null);
  const searchWrapRef = useRef(null);

  // Sync external reportMode if changed
  useEffect(() => {
    if (externalReportMode) {
      setReportMode(externalReportMode);
    }
  }, [externalReportMode]);

  // Set default chosen batch when batches load
  useEffect(() => {
    if (batchesList.length > 0 && !chosenBatch) {
      // Pick first active batch with students
      const firstValid = batchesList.find((b) => b.studentCount > 0) || batchesList[0];
      if (firstValid) setChosenBatch(firstValid.batch);
    }
  }, [batchesList, chosenBatch]);

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

  // Debounced student search
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

  const handleModeChange = (key) => {
    setReportMode(key);
    onReportModeChange?.(key);
  };

  const handleSelect = (student) => {
    setShowSuggestions(false);
    onSelectStudent(student, reportMode);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (results.length === 1) {
      handleSelect(results[0]);
    }
  };

  const handleOpenBatch = (batchName) => {
    const targetBatch = batchName || chosenBatch;
    if (!targetBatch) {
      onShowToast?.('Please select a batch first', 'error');
      return;
    }
    onSelectBatch?.(targetBatch, reportMode);
  };

  const popularBatches = batchesList.filter((b) => b.studentCount >= 10).slice(0, 6);

  return (
    <section className="search-section" ref={searchWrapRef}>
      {/* 1. Report Type Switcher */}
      <div className="report-type-switcher-wrap">
        <span className="report-type-label">Select Report Type</span>
        <div className="report-type-tabs" role="tablist" aria-label="Report Type">
          {REPORT_MODES.map((mode) => {
            const ModeIcon = mode.icon;
            const isActive = reportMode === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`report-type-tab ${isActive ? 'active' : ''}`}
                onClick={() => handleModeChange(mode.key)}
              >
                <ModeIcon size={16} />
                <span className="report-type-tab-text">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Scope Switcher: Individual Student vs Batch-Wise Report */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        maxWidth: '460px',
        background: 'rgba(241, 245, 249, 0.85)',
        padding: '4px',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)'
      }}>
        <button
          type="button"
          onClick={() => setSearchScope('student')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '9px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: searchScope === 'student' ? '#ffffff' : 'transparent',
            color: searchScope === 'student' ? 'var(--tpc-purple)' : 'var(--text-muted)',
            boxShadow: searchScope === 'student' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <User size={15} />
          <span>Search by Student</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchScope('batch')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '9px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: searchScope === 'batch' ? '#ffffff' : 'transparent',
            color: searchScope === 'batch' ? 'var(--tpc-purple)' : 'var(--text-muted)',
            boxShadow: searchScope === 'batch' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <Users size={15} />
          <span>Batch-Wise Reports</span>
          <span style={{
            fontSize: '10px',
            background: 'var(--tpc-purple-subtle)',
            color: 'var(--tpc-purple)',
            padding: '2px 6px',
            borderRadius: '10px',
            fontWeight: 800
          }}>
            New
          </span>
        </button>
      </div>

      {/* ========================================================
          A. STUDENT SEARCH MODE
         ======================================================== */}
      {searchScope === 'student' && (
        <>
          {/* Search Input Box */}
          <form onSubmit={handleFormSubmit} className="search-box-wrap">
            <Search className="search-icon-left" size={22} />
            <input
              type="text"
              className="search-input-main"
              placeholder={`Search student by Name or ID for ${reportMode === 'attendance' ? 'Attendance' : reportMode === 'homework' ? 'Homework' : 'Report Card'}...`}
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

          {/* Quick Batch Suggestions Row below search bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '10px',
            padding: '0 4px',
            fontSize: '12px',
            color: 'var(--text-muted)'
          }}>
            <span style={{ fontWeight: 600 }}>Or view by batch:</span>
            {popularBatches.slice(0, 4).map((b) => (
              <button
                key={b.batch}
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => handleOpenBatch(b.batch)}
                style={{
                  background: 'rgba(241, 245, 249, 0.9)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  color: 'var(--text-main)',
                  fontWeight: 600
                }}
              >
                {b.batch}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setSearchScope('batch')}
              style={{
                color: 'var(--tpc-purple)',
                fontWeight: 700,
                fontSize: '11.5px',
                padding: '3px 6px'
              }}
            >
              All Batches →
            </button>
          </div>

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
          <div style={{ marginTop: '24px' }}>
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
                  No records found for "{query}". Check spelling or enter the exact Student ID.
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
                      <span>
                        {reportMode === 'attendance'
                          ? 'Open Attendance Report'
                          : reportMode === 'homework'
                          ? 'Open Homework Report'
                          : 'Open Student Report Card'}
                      </span>
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!query && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                marginTop: '16px'
              }}>
                {/* Card 1: Individual Student Search */}
                <div className="glass" style={{ padding: '32px 24px', textAlign: 'center', borderRadius: '16px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--tpc-purple-subtle)',
                    color: 'var(--tpc-purple)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                    border: '1.5px solid var(--tpc-purple-border)'
                  }}>
                    <GraduationCap size={28} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Individual Student Reports
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '8px 0 16px', lineHeight: 1.5 }}>
                    Search by student name or 10-digit ID to view individual performance, date-filtered attendance trends, homework submission logs, and subject exam percentiles.
                  </p>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tpc-purple)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    RIMC &bull; RMS &bull; SAINIK SCHOOL
                  </span>
                </div>

                {/* Card 2: Batch-Wise Reporting */}
                <div className="glass" style={{
                  padding: '32px 24px',
                  textAlign: 'center',
                  borderRadius: '16px',
                  border: '1.5px solid var(--tpc-purple-border)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(243,232,255,0.3) 100%)'
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(37, 99, 235, 0.1)',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                    border: '1.5px solid rgba(37, 99, 235, 0.2)'
                  }}>
                    <Users size={28} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Batch-Wise Reports
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '8px 0 16px', lineHeight: 1.5 }}>
                    View complete batch attendance percentages, presence breakdowns, homework completion rates, and full student rosters with instant PDF export.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setSearchScope('batch')}
                    style={{ margin: '0 auto' }}
                  >
                    <Users size={15} />
                    <span>Explore Batch Reports</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================
          B. BATCH-WISE REPORT SELECTION MODE
         ======================================================== */}
      {searchScope === 'batch' && (
        <div className="glass" style={{
          padding: '32px 28px',
          borderRadius: '18px',
          maxWidth: '680px',
          margin: '0 auto',
          border: '1.5px solid var(--tpc-purple-border)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'var(--tpc-purple-subtle)',
              color: 'var(--tpc-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              border: '1.5px solid var(--tpc-purple-border)'
            }}>
              <Users size={26} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
              Select Batch for {reportMode === 'attendance' ? 'Attendance' : reportMode === 'homework' ? 'Homework' : 'Institutional'} Report
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginTop: '4px' }}>
              Choose any class or batch to generate a comprehensive batch report with student rosters, presence breakdowns, and printable PDFs.
            </p>
          </div>

          {/* Batch Selector Dropdown */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Select Academic Batch ({batchesList.length} Batches Available):
            </label>
            <select
              className="select-custom"
              value={chosenBatch}
              onChange={(e) => setChosenBatch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14.5px',
                fontWeight: 700,
                borderRadius: '10px',
                border: '1.5px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Choose a Batch --</option>
              {batchesList.map((b) => (
                <option key={b.batch} value={b.batch}>
                  {b.batch} ({b.studentCount} Students)
                </option>
              ))}
            </select>
          </div>

          {/* Popular Batches Quick Select Chips */}
          <div style={{ marginBottom: '24px' }}>
            <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Quick Select Active Batches:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {popularBatches.map((b) => {
                const isSelected = chosenBatch === b.batch;
                return (
                  <button
                    key={b.batch}
                    type="button"
                    onClick={() => setChosenBatch(b.batch)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: isSelected ? 800 : 600,
                      border: isSelected ? '1.5px solid var(--tpc-purple)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--tpc-purple-subtle)' : 'var(--bg-card)',
                      color: isSelected ? 'var(--tpc-purple)' : 'var(--text-main)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSelected && <Check size={12} />}
                    <span>{b.batch}</span>
                    <span style={{ fontSize: '10.5px', opacity: 0.7 }}>({b.studentCount})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action Button */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 2, height: '46px', fontSize: '14px', fontWeight: 700 }}
              onClick={() => handleOpenBatch(chosenBatch)}
              disabled={!chosenBatch}
            >
              <span>
                {reportMode === 'attendance'
                  ? 'Generate Batch Attendance Report'
                  : reportMode === 'homework'
                  ? 'Generate Batch Homework Report'
                  : 'Open Full Batch Overview'}
              </span>
              <ArrowUpRight size={17} />
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1, height: '46px', fontSize: '13px' }}
              onClick={() => setSearchScope('student')}
            >
              <span>Back to Student Search</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
