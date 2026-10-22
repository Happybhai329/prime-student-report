import React, { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';

export default function CalculationPreviewModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  batch,
  onDownloadPdf,
  downloadingPdf
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'tests' | 'subjects'

  useEffect(() => {
    if (!isOpen || !studentId) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    fetch(`/api/students/${encodeURIComponent(studentId)}/calculations`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load calculation details.');
        return res.json();
      })
      .then(json => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const composite = data?.compositeScore;
  const attBreakdown = composite?.breakdown?.attendance;
  const hwBreakdown = composite?.breakdown?.homework;
  const resBreakdown = composite?.breakdown?.result;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container calculation-modal glass"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '880px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '20px 28px', borderBottom: '1px solid var(--stroke)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--tpc-purple) 0%, #4338ca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(107, 33, 168, 0.25)'
            }}>
              <Calculator size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Academic Audit & Calculation Breakdown
                </h3>
                <span className="badge badge-purple" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  Pre-Download Audit
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Viewing verified weightages & score mechanics for <strong>{studentName || data?.student?.name}</strong> (ID: {studentId}) • {batch || data?.student?.batch}
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
              <div className="spinner spinner-dark" style={{ width: '36px', height: '36px', margin: '0 auto 16px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Aggregating Raw Examination & Attendance Data...</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Calculating exact marks fractions, point weights, and subject averages</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Formula Callout Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(107, 33, 168, 0.05) 0%, rgba(22, 163, 74, 0.05) 100%)',
                border: '1px solid var(--tpc-purple-border)',
                borderRadius: '16px',
                padding: '18px 22px',
                marginBottom: '24px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Sparkles size={16} color="var(--tpc-purple)" />
                    <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--tpc-purple)' }}>
                      Institutional Evaluation Formula
                    </span>
                  </div>
                  <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Overall Score = (Attendance % × 0.30) + (Homework % × 0.30) + (Exam Result % × 0.40)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Weights are applied equally to non-academic consistency (60%) and academic test mastery (40%).
                  </div>
                </div>

                <div style={{
                  background: 'white',
                  borderRadius: '14px',
                  padding: '12px 20px',
                  textAlign: 'center',
                  boxShadow: '0 4px 16px rgba(107, 33, 168, 0.1)',
                  border: '1.5px solid var(--tpc-purple-border)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Composite Index
                  </div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 900,
                    letterSpacing: '-1px',
                    background: 'linear-gradient(135deg, var(--tpc-purple) 0%, var(--tpc-green) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {composite?.overall || 0}
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-muted)', WebkitTextFillColor: 'var(--text-muted)' }}>
                      /100
                    </span>
                  </div>
                </div>
              </div>

              {/* Three Metric Breakdown Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* 1. Attendance Card */}
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '18px',
                  border: '1px solid var(--stroke)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ height: '4px', background: 'var(--tpc-green)', position: 'absolute', top: 0, left: 0, right: 0 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>Attendance</span>
                    <span className="badge badge-green" style={{ fontSize: '11px' }}>30% Weight</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {attBreakdown?.percentage || 0}%
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tpc-green)' }}>
                      ➔ +{attBreakdown?.weightedPoints || 0} pts
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Raw: {attBreakdown?.rawCount}
                  </div>
                  <div style={{ marginTop: '10px', height: '6px', background: 'var(--surface)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(attBreakdown?.percentage || 0, 100)}%`, height: '100%', background: 'var(--tpc-green)' }} />
                  </div>
                </div>

                {/* 2. Homework Card */}
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '18px',
                  border: '1px solid var(--stroke)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ height: '4px', background: '#3b82f6', position: 'absolute', top: 0, left: 0, right: 0 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>Homework</span>
                    <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '11px' }}>30% Weight</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {hwBreakdown?.avgScoreOutOf10 || 0}<small style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/10</small>
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                      ➔ +{hwBreakdown?.weightedPoints || 0} pts
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Rate: {hwBreakdown?.percentage || 0}% • {hwBreakdown?.rawCount}
                  </div>
                  <div style={{ marginTop: '10px', height: '6px', background: 'var(--surface)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(hwBreakdown?.percentage || 0, 100)}%`, height: '100%', background: '#3b82f6' }} />
                  </div>
                </div>

                {/* 3. Examination Card */}
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '18px',
                  border: '1px solid var(--stroke)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ height: '4px', background: 'var(--tpc-purple)', position: 'absolute', top: 0, left: 0, right: 0 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>Examination</span>
                    <span className="badge badge-purple" style={{ fontSize: '11px' }}>40% Weight</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {resBreakdown?.percentage || 0}%
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tpc-purple)' }}>
                      ➔ +{resBreakdown?.weightedPoints || 0} pts
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Raw: {resBreakdown?.rawCount}
                  </div>
                  <div style={{ marginTop: '10px', height: '6px', background: 'var(--surface)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(resBreakdown?.percentage || 0, 100)}%`, height: '100%', background: 'var(--tpc-purple)' }} />
                  </div>
                </div>
              </div>

              {/* Sub-Tabs Navigation */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--stroke)', marginBottom: '18px' }}>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                  onClick={() => setActiveTab('summary')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'summary' ? '2.5px solid var(--tpc-purple)' : '2.5px solid transparent',
                    color: activeTab === 'summary' ? 'var(--tpc-purple)' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  Calculation Summary
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tests')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'tests' ? '2.5px solid var(--tpc-purple)' : '2.5px solid transparent',
                    color: activeTab === 'tests' ? 'var(--tpc-purple)' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  Evaluated Tests ({data?.exams?.tests?.length || 0})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
                  onClick={() => setActiveTab('subjects')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'subjects' ? '2.5px solid var(--tpc-purple)' : '2.5px solid transparent',
                    color: activeTab === 'subjects' ? 'var(--tpc-purple)' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  Subject Analytics ({data?.subjects?.list?.length || 0})
                </button>
              </div>

              {/* Tab 1: Summary Details */}
              {activeTab === 'summary' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                    {/* Strengths & Weaknesses Box */}
                    <div className="surface" style={{ padding: '16px', borderRadius: '12px' }}>
                      <h5 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Award size={16} color="var(--tpc-green)" />
                        Subject Strengths & Focus Areas
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--success-bg)', borderRadius: '8px', border: '1px solid var(--success-border)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--success)' }}>Strongest Subject:</span>
                          <span style={{ fontWeight: 800, color: 'var(--success)' }}>{data?.subjects?.strongest}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--danger-bg)', borderRadius: '8px', border: '1px solid var(--danger-border)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Focus Subject:</span>
                          <span style={{ fontWeight: 800, color: 'var(--danger)' }}>{data?.subjects?.weakest}</span>
                        </div>
                      </div>
                    </div>

                    {/* Homework Submission Details */}
                    <div className="surface" style={{ padding: '16px', borderRadius: '12px' }}>
                      <h5 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BookOpen size={16} color="#3b82f6" />
                        Homework Scoring Scale
                      </h5>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '11px', textAlign: 'center' }}>
                        <div style={{ padding: '6px 4px', background: 'white', borderRadius: '6px', border: '1px solid var(--stroke)' }}>
                          <div style={{ fontWeight: 800, color: 'var(--success)' }}>{data?.homework?.counts?.complete || 0}</div>
                          <div style={{ color: 'var(--text-muted)' }}>Complete (10pt)</div>
                        </div>
                        <div style={{ padding: '6px 4px', background: 'white', borderRadius: '6px', border: '1px solid var(--stroke)' }}>
                          <div style={{ fontWeight: 800, color: '#0284c7' }}>{data?.homework?.counts?.partiallyComplete || 0}</div>
                          <div style={{ color: 'var(--text-muted)' }}>Partial (7pt)</div>
                        </div>
                        <div style={{ padding: '6px 4px', background: 'white', borderRadius: '6px', border: '1px solid var(--stroke)' }}>
                          <div style={{ fontWeight: 800, color: '#d97706' }}>{data?.homework?.counts?.halfComplete || 0}</div>
                          <div style={{ color: 'var(--text-muted)' }}>Half (5pt)</div>
                        </div>
                        <div style={{ padding: '6px 4px', background: 'white', borderRadius: '6px', border: '1px solid var(--stroke)' }}>
                          <div style={{ fontWeight: 800, color: '#ea580c' }}>{data?.homework?.counts?.incomplete || 0}</div>
                          <div style={{ color: 'var(--text-muted)' }}>Incomplete (2pt)</div>
                        </div>
                        <div style={{ padding: '6px 4px', background: 'white', borderRadius: '6px', border: '1px solid var(--stroke)' }}>
                          <div style={{ fontWeight: 800, color: '#dc2626' }}>{data?.homework?.counts?.copyForget || 0}</div>
                          <div style={{ color: 'var(--text-muted)' }}>Copy Forget (1pt)</div>
                        </div>
                        <div style={{ padding: '6px 4px', background: 'white', borderRadius: '6px', border: '1px solid var(--stroke)' }}>
                          <div style={{ fontWeight: 800, color: '#4b5563' }}>{data?.homework?.counts?.absent || 0}</div>
                          <div style={{ color: 'var(--text-muted)' }}>Absent (0pt)</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Disciplinary Summary */}
                  {data?.complaints && data.complaints.length > 0 && (
                    <div style={{ padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                        <ShieldAlert size={16} />
                        <span>Active Disciplinary Notes ({data.complaints.length})</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#92400e' }}>
                        This student has {data.complaints.length} disciplinary note(s) on file recorded by faculty.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Test Breakdown Table */}
              {activeTab === 'tests' && (
                <div className="table-responsive-touch">
                  <table className="results-table" style={{ fontSize: '12px' }}>
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
                      {(data?.exams?.tests || []).map((t, idx) => (
                        <tr key={idx}>
                          <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{t.examDate}</td>
                          <td style={{ fontFamily: 'monospace' }}>{t.testId}</td>
                          <td><span className="badge badge-surface" style={{ fontSize: '10px' }}>{t.examType}</span></td>
                          <td style={{ textAlign: 'center' }}>
                            {t.rank ? <span className="badge badge-purple" style={{ fontSize: '10px' }}>#{t.rank}</span> : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{t.totalObtained}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{t.totalMax}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{
                              fontWeight: 800,
                              color: t.percentage >= 75 ? 'var(--success)' : t.percentage >= 50 ? 'var(--text-main)' : 'var(--danger)'
                            }}>
                              {t.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Subject Breakdown Table */}
              {activeTab === 'subjects' && (
                <div className="table-responsive-touch">
                  <table className="results-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Subject Name</th>
                        <th style={{ textAlign: 'right' }}>Avg Marks</th>
                        <th style={{ textAlign: 'right' }}>Avg Max</th>
                        <th style={{ textAlign: 'right' }}>Average %</th>
                        <th style={{ textAlign: 'center' }}>Tests</th>
                        <th>Classification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.subjects?.list || []).map((s, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.subject}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.avgObtained}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{s.avgMax}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--tpc-purple)' }}>{s.avgPercentage}%</td>
                          <td style={{ textAlign: 'center' }}>{s.testCount}</td>
                          <td>
                            <span className={`badge ${
                              s.status.includes('Strong') ? 'badge-green' :
                              s.status.includes('Good') ? 'badge-purple' :
                              s.status.includes('Weak') ? 'badge-danger' : 'badge-surface'
                            }`} style={{ fontSize: '10px' }}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ padding: '16px 28px', borderTop: '1px solid var(--stroke)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ fontSize: '13px', fontWeight: 600 }}
          >
            Close Audit
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onDownloadPdf?.();
            }}
            disabled={downloadingPdf || loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}
          >
            {downloadingPdf ? (
              <>
                <div className="spinner spinner-white" style={{ width: '16px', height: '16px' }} />
                <span>Generating High-Res PDF...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Confirm & Download Official PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
