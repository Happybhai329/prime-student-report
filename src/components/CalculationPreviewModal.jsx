import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calculator,
  Download,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  Percent,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  Info,
  FileText,
  UserCheck,
  CheckCircle,
  HelpCircle,
  Star,
  ExternalLink
} from 'lucide-react';

export default function CalculationPreviewModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  batch,
  onOpenReport,
  onDownloadPdf,
  downloadingPdf
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('subjects'); // 'subjects' | 'tests' | 'attendance-hw' | 'formula' | 'remarks'

  useEffect(() => {
    if (!isOpen || !studentId) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    fetch(`/api/students/${encodeURIComponent(studentId)}/calculations`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load calculation details.');
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, studentId]);

  // Compute weak subjects list matching D:\prime\student full report prime
  const weakSubjectsList = useMemo(() => {
    if (!data?.subjects?.list) return [];
    return data.subjects.list
      .filter((s) => s.avgPercentage < 50 || s.status.includes('Weak') || s.status.includes('Focus'))
      .map((s) => `${s.subject} (${s.avgPercentage}%)`);
  }, [data]);

  if (!isOpen) return null;

  const composite = data?.compositeScore;
  const attBreakdown = composite?.breakdown?.attendance;
  const hwBreakdown = composite?.breakdown?.homework;
  const resBreakdown = composite?.breakdown?.result;
  const student = data?.student;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container calculation-modal glass"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '920px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '24px',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--stroke)',
            background: 'linear-gradient(135deg, rgba(250, 245, 255, 0.9) 0%, rgba(240, 253, 244, 0.8) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, var(--tpc-purple) 0%, #4338ca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 14px rgba(107, 33, 168, 0.25)',
                flexShrink: 0
              }}
            >
              <Award size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Student Performance &amp; Test Result Audit
                </h3>
                <span className="badge badge-purple" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  Pre-Download Audit
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
                Viewing verified exam calculations &amp; subject analytics for{' '}
                <strong>{studentName || student?.name}</strong> (ID: {studentId}) &bull;{' '}
                {batch || student?.batch}
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div
                className="spinner spinner-dark"
                style={{ width: '36px', height: '36px', margin: '0 auto 16px' }}
              />
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                Aggregating Examination, Attendance &amp; Homework Data...
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Calculating exact subject percentages, test rankings, and verified metrics
              </p>
            </div>
          ) : error ? (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Executive Overview Row: Student Identity + 5 KPI Cards (Matching D:\prime\student full report prime) */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1.5px solid var(--stroke)',
                  borderRadius: '18px',
                  padding: '18px 22px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Top Row: Student Meta details */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderBottom: '1px solid var(--stroke)',
                    paddingBottom: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--tpc-purple), var(--tpc-green))',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {(student?.name || studentName || 'S').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {student?.name || studentName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        ID: <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{studentId}</span> &bull;{' '}
                        Batch: <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{batch || student?.batch}</span>
                        {student?.mobile && (
                          <> &bull; Mobile: <span style={{ fontWeight: 600 }}>{student.mobile}</span></>
                        )}
                        {student?.fatherName && (
                          <> &bull; Father: <span style={{ fontWeight: 600 }}>{student.fatherName}</span></>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Overall Composite Score Pill */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: 'linear-gradient(135deg, rgba(107, 33, 168, 0.08) 0%, rgba(22, 163, 74, 0.08) 100%)',
                      border: '1.5px solid var(--tpc-purple-border)',
                      padding: '8px 16px',
                      borderRadius: '12px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--tpc-purple)' }}>
                        Overall Score
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>
                        {composite?.overall || 0}
                        <small style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}> /100</small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5 KPI Metric Chips (Matching D:\prime\student full report prime) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '12px'
                  }}
                >
                  {/* KPI 1: Attendance */}
                  <div
                    style={{
                      background: 'var(--surface)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      border: '1px solid var(--stroke)'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                      Attendance
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--tpc-green)' }}>
                      {data?.attendance?.percentage || 0}%
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {data?.attendance?.present || 0} / {data?.attendance?.total || 0} days
                    </div>
                  </div>

                  {/* KPI 2: Homework */}
                  <div
                    style={{
                      background: 'var(--surface)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      border: '1px solid var(--stroke)'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                      Homework
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>
                      {data?.homework?.avgScoreOutOf10 || 0}
                      <small style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/10</small>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {data?.homework?.percentage || 0}% completion
                    </div>
                  </div>

                  {/* KPI 3: Result % */}
                  <div
                    style={{
                      background: 'var(--surface)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      border: '1px solid var(--stroke)'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                      Result %
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--tpc-purple)' }}>
                      {data?.exams?.avgPercentage || 0}%
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {data?.exams?.testCount || 0} tests evaluated
                    </div>
                  </div>

                  {/* KPI 4: Strongest Subject */}
                  <div
                    style={{
                      background: 'var(--surface)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      border: '1px solid var(--stroke)'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                      Top Subject
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: 'var(--tpc-green)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={data?.subjects?.strongest || '-'}
                    >
                      {data?.subjects?.strongest || '-'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Highest Average</div>
                  </div>

                  {/* KPI 5: Complaints */}
                  <div
                    style={{
                      background: 'var(--surface)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      border: '1px solid var(--stroke)'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                      Complaints
                    </div>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: (data?.complaints?.length || 0) > 0 ? '#d97706' : 'var(--text-muted)'
                      }}
                    >
                      {data?.complaints?.length || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Disciplinary remarks</div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  borderBottom: '1.5px solid var(--stroke)',
                  overflowX: 'auto',
                  paddingBottom: '2px'
                }}
              >
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
                  onClick={() => setActiveTab('subjects')}
                  style={{
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'subjects' ? '2.5px solid var(--tpc-purple)' : '2.5px solid transparent',
                    color: activeTab === 'subjects' ? 'var(--tpc-purple)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <BookOpen size={15} />
                  <span>Subject Analytics &amp; Results ({data?.subjects?.list?.length || 0})</span>
                </button>

                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tests')}
                  style={{
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'tests' ? '2.5px solid var(--tpc-purple)' : '2.5px solid transparent',
                    color: activeTab === 'tests' ? 'var(--tpc-purple)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <TrendingUp size={15} />
                  <span>Evaluated Tests ({data?.exams?.tests?.length || 0})</span>
                </button>

                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'attendance-hw' ? 'active' : ''}`}
                  onClick={() => setActiveTab('attendance-hw')}
                  style={{
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'attendance-hw' ? '2.5px solid var(--tpc-purple)' : '2.5px solid transparent',
                    color: activeTab === 'attendance-hw' ? 'var(--tpc-purple)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <UserCheck size={15} />
                  <span>Attendance &amp; Homework</span>
                </button>

                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'remarks' ? 'active' : ''}`}
                  onClick={() => setActiveTab('remarks')}
                  style={{
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'remarks' ? '2.5px solid var(--tpc-purple)' : '2.5px solid transparent',
                    color: activeTab === 'remarks' ? 'var(--tpc-purple)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <ShieldAlert size={15} />
                  <span>Remarks ({data?.complaints?.length || 0})</span>
                </button>

                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'formula' ? 'active' : ''}`}
                  onClick={() => setActiveTab('formula')}
                  style={{
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'formula' ? '2.5px solid var(--tpc-purple)' : '2.5px solid transparent',
                    color: activeTab === 'formula' ? 'var(--tpc-purple)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Calculator size={15} />
                  <span>Evaluation Formula</span>
                </button>
              </div>

              {/* TAB 1: SUBJECT ANALYTICS & RESULTS (Core Feature from D:\prime\student full report prime) */}
              {activeTab === 'subjects' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Strengths & Weaknesses Callout Strip */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: '12px'
                    }}
                  >
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#f0fdf4',
                        border: '1.5px solid #bbf7d0',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: '#dcfce7',
                          color: '#16a34a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Award size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                          Strongest Subject
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#14532d' }}>
                          {data?.subjects?.strongest || 'None recorded'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#fff1f2',
                        border: '1.5px solid #fecdd3',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: '#ffe4e6',
                          color: '#e11d48',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#9f1239', textTransform: 'uppercase' }}>
                          Weakest Subject
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#881337' }}>
                          {data?.subjects?.weakest || 'None recorded'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weak Subjects Focus List (if any) */}
                  {weakSubjectsList.length > 0 && (
                    <div
                      style={{
                        padding: '12px 18px',
                        background: '#fffbeb',
                        border: '1.5px solid #fde68a',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <AlertTriangle size={15} /> Focus Needed Areas (&lt;50%):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {weakSubjectsList.map((ws, i) => (
                          <span
                            key={i}
                            className="badge badge-danger"
                            style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700 }}
                          >
                            {ws}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subject-Wise Performance Table (Exact Match to D:\prime\student full report prime) */}
                  <div className="table-responsive-touch" style={{ borderRadius: '14px', border: '1px solid var(--stroke)', overflow: 'hidden' }}>
                    <table className="results-table" style={{ fontSize: '12.5px', margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th style={{ textAlign: 'right' }}>Avg Marks (Obtained / Max)</th>
                          <th style={{ textAlign: 'right' }}>Avg %</th>
                          <th style={{ minWidth: '130px' }}>Mastery Level</th>
                          <th style={{ textAlign: 'center' }}>Tests</th>
                          <th>Classification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.subjects?.list || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                              No subject examinations recorded for this student.
                            </td>
                          </tr>
                        ) : (
                          (data?.subjects?.list || []).map((s, idx) => {
                            const isStrong = s.avgPercentage >= 75;
                            const isWeak = s.avgPercentage < 50;
                            const barColor = isStrong ? 'var(--tpc-green)' : isWeak ? '#e11d48' : '#3b82f6';

                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: 800, color: 'var(--text-main)' }}>{s.subject}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                  {s.avgObtained} / <span style={{ color: 'var(--text-muted)' }}>{s.avgMax}</span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      color: isStrong ? 'var(--tpc-green)' : isWeak ? '#e11d48' : '#2563eb'
                                    }}
                                  >
                                    {s.avgPercentage}%
                                  </span>
                                </td>
                                <td>
                                  <div
                                    style={{
                                      height: '8px',
                                      width: '100%',
                                      background: '#f1f5f9',
                                      borderRadius: '4px',
                                      overflow: 'hidden'
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${Math.min(s.avgPercentage, 100)}%`,
                                        height: '100%',
                                        background: barColor,
                                        borderRadius: '4px'
                                      }}
                                    />
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{s.testCount}</td>
                                <td>
                                  <span
                                    className={`badge ${
                                      isStrong
                                        ? 'badge-green'
                                        : isWeak
                                        ? 'badge-danger'
                                        : 'badge-purple'
                                    }`}
                                    style={{ fontSize: '10.5px' }}
                                  >
                                    {s.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: EVALUATED TESTS HISTORY */}
              {activeTab === 'tests' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Detailed log of all {data?.exams?.tests?.length || 0} examination papers evaluated for this student:
                  </div>
                  <div className="table-responsive-touch" style={{ borderRadius: '14px', border: '1px solid var(--stroke)', overflow: 'hidden' }}>
                    <table className="results-table" style={{ fontSize: '12px', margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Test ID</th>
                          <th>Exam Type</th>
                          <th style={{ textAlign: 'center' }}>Rank</th>
                          <th style={{ textAlign: 'right' }}>Obtained</th>
                          <th style={{ textAlign: 'right' }}>Max</th>
                          <th style={{ textAlign: 'right' }}>Score %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.exams?.tests || []).length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                              No test records available.
                            </td>
                          </tr>
                        ) : (
                          (data?.exams?.tests || []).map((t, idx) => (
                            <tr key={idx}>
                              <td style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{t.examDate}</td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.testId}</td>
                              <td>
                                <span className="badge badge-surface" style={{ fontSize: '10px' }}>
                                  {t.examType}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {t.rank ? (
                                  <span className="badge badge-purple" style={{ fontSize: '10px', fontWeight: 800 }}>
                                    #{t.rank}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 800 }}>{t.totalObtained}</td>
                              <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{t.totalMax}</td>
                              <td style={{ textAlign: 'right' }}>
                                <span
                                  style={{
                                    fontWeight: 800,
                                    color:
                                      t.percentage >= 75
                                        ? 'var(--success)'
                                        : t.percentage >= 50
                                        ? 'var(--text-main)'
                                        : 'var(--danger)'
                                  }}
                                >
                                  {t.percentage}%
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: ATTENDANCE & HOMEWORK BREAKDOWN */}
              {activeTab === 'attendance-hw' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {/* Attendance Section */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid var(--stroke)',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserCheck size={16} color="var(--tpc-green)" /> Attendance Section
                      </span>
                      <span className="badge badge-green" style={{ fontSize: '11px' }}>
                        {data?.attendance?.percentage || 0}%
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                      <div style={{ padding: '8px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--stroke)' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--tpc-green)' }}>
                          {data?.attendance?.present || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Present Days</div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--stroke)' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#e11d48' }}>
                          {data?.attendance?.absent || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Absent Days</div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--stroke)' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                          {data?.attendance?.total || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Recorded</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                        <span>Attendance Ratio</span>
                        <span>{data?.attendance?.percentage || 0}%</span>
                      </div>
                      <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(data?.attendance?.percentage || 0, 100)}%`,
                            height: '100%',
                            background: 'var(--tpc-green)',
                            borderRadius: '4px'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Homework Section */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid var(--stroke)',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BookOpen size={16} color="#3b82f6" /> Homework Section
                      </span>
                      <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '11px' }}>
                        {data?.homework?.avgScoreOutOf10 || 0} / 10
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center', fontSize: '11px' }}>
                      <div style={{ padding: '6px 4px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--stroke)' }}>
                        <div style={{ fontWeight: 800, color: 'var(--success)' }}>{data?.homework?.counts?.complete || 0}</div>
                        <div style={{ color: 'var(--text-muted)' }}>Complete</div>
                      </div>
                      <div style={{ padding: '6px 4px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--stroke)' }}>
                        <div style={{ fontWeight: 800, color: '#0284c7' }}>{data?.homework?.counts?.partiallyComplete || 0}</div>
                        <div style={{ color: 'var(--text-muted)' }}>Partial</div>
                      </div>
                      <div style={{ padding: '6px 4px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--stroke)' }}>
                        <div style={{ fontWeight: 800, color: '#d97706' }}>{data?.homework?.counts?.halfComplete || 0}</div>
                        <div style={{ color: 'var(--text-muted)' }}>Half</div>
                      </div>
                      <div style={{ padding: '6px 4px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--stroke)' }}>
                        <div style={{ fontWeight: 800, color: '#ea580c' }}>{data?.homework?.counts?.incomplete || 0}</div>
                        <div style={{ color: 'var(--text-muted)' }}>Incomplete</div>
                      </div>
                      <div style={{ padding: '6px 4px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--stroke)' }}>
                        <div style={{ fontWeight: 800, color: '#dc2626' }}>{data?.homework?.counts?.copyForget || 0}</div>
                        <div style={{ color: 'var(--text-muted)' }}>Copy Forget</div>
                      </div>
                      <div style={{ padding: '6px 4px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--stroke)' }}>
                        <div style={{ fontWeight: 800, color: '#4b5563' }}>{data?.homework?.counts?.absent || 0}</div>
                        <div style={{ color: 'var(--text-muted)' }}>Absent</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                        <span>Completion Rate</span>
                        <span>{data?.homework?.percentage || 0}%</span>
                      </div>
                      <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(data?.homework?.percentage || 0, 100)}%`,
                            height: '100%',
                            background: '#3b82f6',
                            borderRadius: '4px'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: REMARKS / DISCIPLINE */}
              {activeTab === 'remarks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Disciplinary remarks and observations submitted by faculty:
                  </div>
                  {(data?.complaints || []).length === 0 ? (
                    <div
                      style={{
                        padding: '36px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        borderRadius: '14px',
                        border: '1px solid var(--stroke)'
                      }}
                    >
                      <CheckCircle2 size={32} color="var(--tpc-green)" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>
                        Clean Disciplinary Record
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        No disciplinary complaints or adverse remarks recorded for this student.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {data.complaints.map((c, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '14px 18px',
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid var(--stroke)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                              {c.teacher || 'Faculty'} &bull; <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{c.date}</span>
                            </div>
                            <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                              {c.status || 'Pending'}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                            {c.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: FORMULA & WEIGHTAGE DETAILS */}
              {activeTab === 'formula' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(107, 33, 168, 0.05) 0%, rgba(22, 163, 74, 0.05) 100%)',
                      border: '1.5px solid var(--tpc-purple-border)',
                      borderRadius: '16px',
                      padding: '18px 22px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <Sparkles size={16} color="var(--tpc-purple)" />
                      <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--tpc-purple)' }}>
                        Institutional Evaluation Formula
                      </span>
                    </div>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                      Overall Score = (Attendance % &times; 0.30) + (Homework % &times; 0.30) + (Exam Result % &times; 0.40)
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      Non-academic consistency (attendance &amp; homework) accounts for 60% of the standing index, while academic examination mastery accounts for 40%.
                    </div>
                  </div>

                  {/* Weight contribution breakdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div style={{ padding: '14px', background: 'white', border: '1px solid var(--stroke)', borderRadius: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--tpc-green)', marginBottom: '4px' }}>
                        Attendance (30% Weight)
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                        +{attBreakdown?.weightedPoints || 0} pts
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        from {attBreakdown?.percentage || 0}% attendance
                      </div>
                    </div>

                    <div style={{ padding: '14px', background: 'white', border: '1px solid var(--stroke)', borderRadius: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', marginBottom: '4px' }}>
                        Homework (30% Weight)
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                        +{hwBreakdown?.weightedPoints || 0} pts
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        from {hwBreakdown?.percentage || 0}% rate ({hwBreakdown?.avgScoreOutOf10 || 0}/10)
                      </div>
                    </div>

                    <div style={{ padding: '14px', background: 'white', border: '1px solid var(--stroke)', borderRadius: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--tpc-purple)', marginBottom: '4px' }}>
                        Examination (40% Weight)
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                        +{resBreakdown?.weightedPoints || 0} pts
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        from {resBreakdown?.percentage || 0}% exam average
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer (Action Buttons) */}
        <div
          className="modal-footer"
          style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--stroke)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ fontSize: '13px', fontWeight: 600 }}
          >
            Close Audit
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {onOpenReport && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onOpenReport}
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: 'var(--tpc-purple-border)',
                  color: 'var(--tpc-purple)'
                }}
                title="Open comprehensive interactive report page for this student"
              >
                <FileText size={15} />
                <span>Open Full Report</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onDownloadPdf?.()}
              disabled={downloadingPdf || loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}
            >
              {downloadingPdf ? (
                <>
                  <div className="spinner spinner-white" style={{ width: '15px', height: '15px' }} />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Download Official PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
