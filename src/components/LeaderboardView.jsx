import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Award,
  Medal,
  Search,
  Filter,
  Calendar,
  Layers,
  BookOpen,
  UserCheck,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Sliders,
  RotateCcw,
  Users,
  Eye,
  Calculator,
  Flame,
  Star,
  Sparkles,
  ArrowUpRight,
  AlertTriangle
} from 'lucide-react';
import CalculationPreviewModal from './CalculationPreviewModal';

export default function LeaderboardView({ onSelectStudent, onShowToast }) {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return sessionStorage.getItem('tpc_lb_tab') || 'students';
    } catch {
      return 'students';
    }
  }); // 'students' | 'batches' | 'subjects'
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [filtersMeta, setFiltersMeta] = useState({ batches: [], subjects: [], examTypes: [] });

  // Filter states (persisted in sessionStorage)
  const [selectedBatch, setSelectedBatch] = useState(() => {
    try {
      return sessionStorage.getItem('tpc_lb_batch') || 'ALL';
    } catch {
      return 'ALL';
    }
  });
  const [selectedSubject, setSelectedSubject] = useState(() => {
    try {
      return sessionStorage.getItem('tpc_lb_subject') || 'ALL';
    } catch {
      return 'ALL';
    }
  });
  const [startDate, setStartDate] = useState(() => {
    try {
      return sessionStorage.getItem('tpc_lb_start_date') || '';
    } catch {
      return '';
    }
  });
  const [endDate, setEndDate] = useState(() => {
    try {
      return sessionStorage.getItem('tpc_lb_end_date') || '';
    } catch {
      return '';
    }
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      return sessionStorage.getItem('tpc_lb_search') || '';
    } catch {
      return '';
    }
  });

  // Sync filters to sessionStorage whenever they change
  useEffect(() => {
    try {
      sessionStorage.setItem('tpc_lb_tab', activeTab);
      sessionStorage.setItem('tpc_lb_batch', selectedBatch);
      sessionStorage.setItem('tpc_lb_subject', selectedSubject);
      sessionStorage.setItem('tpc_lb_start_date', startDate);
      sessionStorage.setItem('tpc_lb_end_date', endDate);
      sessionStorage.setItem('tpc_lb_search', searchQuery);
    } catch {
      // ignore
    }
  }, [activeTab, selectedBatch, selectedSubject, startDate, endDate, searchQuery]);

  // Threshold controls for Batch tab
  const [thresholdAtt, setThresholdAtt] = useState(75);
  const [thresholdHw, setThresholdHw] = useState(75);
  const [thresholdRes, setThresholdRes] = useState(75);
  const [selectedThresholdBatch, setSelectedThresholdBatch] = useState(null);

  // Calculation Modal State
  const [calcModalStudent, setCalcModalStudent] = useState(null);

  // 1. Fetch metadata on mount
  useEffect(() => {
    fetch('/api/filters/meta')
      .then(res => res.json())
      .then(data => {
        if (data.batches) setFiltersMeta(data);
      })
      .catch(err => console.error('Failed to load filter metadata:', err));
  }, []);

  // 2. Fetch Leaderboard Data on filter change
  const fetchLeaderboard = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedBatch !== 'ALL') params.append('batch', selectedBatch);
    if (selectedSubject !== 'ALL') params.append('subject', selectedSubject);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());

    fetch(`/api/leaderboard?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load leaderboard data.');
        return res.json();
      })
      .then(data => {
        setLeaderboardData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Leaderboard error:', err);
        onShowToast?.(err.message, 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeaderboard();
    }, 150);
    return () => clearTimeout(timer);
  }, [selectedBatch, selectedSubject, startDate, endDate, searchQuery]);

  const handleResetFilters = () => {
    setSelectedBatch('ALL');
    setSelectedSubject('ALL');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    try {
      sessionStorage.removeItem('tpc_lb_batch');
      sessionStorage.removeItem('tpc_lb_subject');
      sessionStorage.removeItem('tpc_lb_start_date');
      sessionStorage.removeItem('tpc_lb_end_date');
      sessionStorage.removeItem('tpc_lb_search');
    } catch {
      // ignore
    }
  };

  const handleOpenStudentReport = (student) => {
    if (!student) return;
    const sId = student.studentId || student.id;
    const foundIdx = studentsList.findIndex(s => s.studentId === sId);
    const assignedRank = student.rank || (foundIdx !== -1 ? foundIdx + 1 : 1);
    const overallScore = student.overallScore !== undefined
      ? student.overallScore
      : (foundIdx !== -1 ? studentsList[foundIdx]?.overallScore : 0);

    const rankingContext = {
      source: 'leaderboard',
      rank: assignedRank,
      totalStudents: studentsList.length,
      overallScore: Number(overallScore) || 0,
      batchFilter: selectedBatch,
      subjectFilter: selectedSubject,
      startDate: startDate || '',
      endDate: endDate || ''
    };

    onSelectStudent(student, rankingContext);
  };

  const studentsList = leaderboardData?.students || [];
  const batchList = leaderboardData?.batchRankings || [];
  const subjectList = leaderboardData?.subjectPerformance || [];
  const highlights = leaderboardData?.highlights || {};

  // Top 3 Podium
  const topThree = useMemo(() => {
    return studentsList.slice(0, 3);
  }, [studentsList]);

  return (
    <div className="leaderboard-container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(107, 33, 168, 0.08) 0%, rgba(22, 163, 74, 0.05) 50%, rgba(59, 130, 246, 0.05) 100%)',
        border: '1.5px solid var(--tpc-purple-border)',
        borderRadius: '24px',
        padding: '30px 32px',
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-glass)'
      }}>
        <div className="leaderboard-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800 }}>
                <Sparkles size={12} />
                THE PRIME CLASSES • PERFORMANCE HUB
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                {highlights.totalStudentsRanked || 0} Students Evaluated
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.7px', margin: 0 }}>
              Institutional Leaderboard & Rankings
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0', maxWidth: '640px' }}>
              Multi-dimensional evaluation system calculating real-time composite academic performance across Attendance (30%), Homework Consistency (30%), and Examination Mastery (40%).
            </p>
          </div>

          {/* Quick Highlight Stats Pills */}
          <div className="leaderboard-highlights-grid">
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '12px 18px',
              border: '1px solid var(--stroke)',
              boxShadow: 'var(--shadow-sm)',
              minWidth: '150px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#b45309' }}>
                <Trophy size={14} color="#d97706" />
                Top Performer
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {highlights.topPerformer?.name || '-'}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tpc-purple)' }}>
                Score: {highlights.topPerformer?.score || 0}
              </div>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '12px 18px',
              border: '1px solid var(--stroke)',
              boxShadow: 'var(--shadow-sm)',
              minWidth: '150px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--tpc-green)' }}>
                <CheckCircle2 size={14} color="var(--tpc-green)" />
                Top Attendance
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {highlights.bestAttendance?.name || '-'}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tpc-green)' }}>
                {highlights.bestAttendance?.attendancePct || 0}% Present
              </div>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '12px 18px',
              border: '1px solid var(--stroke)',
              boxShadow: 'var(--shadow-sm)',
              minWidth: '150px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#4338ca' }}>
                <Layers size={14} color="#6366f1" />
                Leading Batch
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {highlights.topBatch?.batchName || '-'}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4338ca' }}>
                Avg: {highlights.topBatch?.score || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Podium Showcase (Top 3 Performers) - Displayed when viewing All Batches */}
      {topThree.length >= 3 && !searchQuery && (
        <div className="podium-container">
          {/* #2 Silver */}
          <div
            className="podium-card silver-card"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
              border: '2px solid #cbd5e1',
              boxShadow: '0 8px 24px rgba(148, 163, 184, 0.15)'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{
                  background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Medal size={14} /> #2 SILVER
                </span>
                <span className="badge badge-surface" style={{ fontSize: '11px' }}>{topThree[1].batch}</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px' }}>
                {topThree[1].studentName}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                ID: {topThree[1].studentId}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', background: 'var(--surface)', padding: '10px', borderRadius: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Attendance</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--tpc-green)' }}>{topThree[1].attendance.percentage}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Homework</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#3b82f6' }}>{topThree[1].homework.score}/10</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Exam Result</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--tpc-purple)' }}>{topThree[1].result.percentage}%</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#475569' }}>
                {topThree[1].overallScore} <small style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>pts</small>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleOpenStudentReport(topThree[1])}
                style={{ fontSize: '12px', fontWeight: 700 }}
              >
                View Report
              </button>
            </div>
          </div>

          {/* #1 GOLD CHAMPION */}
          <div
            className="podium-card gold-card"
            style={{
              background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)',
              border: '2.5px solid #f59e0b',
              boxShadow: '0 12px 32px rgba(245, 158, 11, 0.22)'
            }}
          >
            <div style={{ position: 'absolute', top: '-14px', right: '24px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', borderRadius: '20px', padding: '4px 14px', fontSize: '11px', fontWeight: 900, letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)' }}>
              TOP PERFORMER
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)'
                }}>
                  <Trophy size={14} /> #1 GOLD
                </span>
                <span className="badge badge-purple" style={{ fontSize: '11px' }}>{topThree[0].batch}</span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 4px' }}>
                {topThree[0].studentName}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                ID: {topThree[0].studentId}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', background: '#fef3c7', padding: '12px', borderRadius: '14px', marginBottom: '16px', border: '1px solid #fde68a' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e' }}>Attendance</div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--tpc-green)' }}>{topThree[0].attendance.percentage}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e' }}>Homework</div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#2563eb' }}>{topThree[0].homework.score}/10</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e' }}>Exam Result</div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--tpc-purple)' }}>{topThree[0].result.percentage}%</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#b45309' }}>
                {topThree[0].overallScore} <small style={{ fontSize: '13px', fontWeight: 700, color: '#d97706' }}>pts</small>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => handleOpenStudentReport(topThree[0])}
                style={{ fontSize: '12px', fontWeight: 800, padding: '8px 16px', boxShadow: '0 4px 12px rgba(107, 33, 168, 0.25)' }}
              >
                View Report
              </button>
            </div>
          </div>

          {/* #3 Bronze */}
          <div
            className="podium-card bronze-card"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #fff7ed 100%)',
              border: '2px solid #fdba74',
              boxShadow: '0 8px 24px rgba(251, 146, 60, 0.15)'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{
                  background: 'linear-gradient(135deg, #fb923c 0%, #c2410c 100%)',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Award size={14} /> #3 BRONZE
                </span>
                <span className="badge badge-surface" style={{ fontSize: '11px' }}>{topThree[2].batch}</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px' }}>
                {topThree[2].studentName}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                ID: {topThree[2].studentId}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', background: 'var(--surface)', padding: '10px', borderRadius: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Attendance</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--tpc-green)' }}>{topThree[2].attendance.percentage}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Homework</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#3b82f6' }}>{topThree[2].homework.score}/10</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Exam Result</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--tpc-purple)' }}>{topThree[2].result.percentage}%</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#c2410c' }}>
                {topThree[2].overallScore} <small style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>pts</small>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleOpenStudentReport(topThree[2])}
                style={{ fontSize: '12px', fontWeight: 700 }}
              >
                View Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Tab Pills + Dynamic Filters */}
      <div className="glass" style={{ borderRadius: '20px', padding: '20px 24px', marginBottom: '24px' }}>
        {/* Navigation Switcher Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--stroke)', paddingBottom: '16px', marginBottom: '18px' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: activeTab === 'students' ? '1.5px solid var(--tpc-purple)' : '1px solid var(--stroke)',
              background: activeTab === 'students' ? 'var(--tpc-purple)' : 'white',
              color: activeTab === 'students' ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            <Trophy size={16} />
            <span>Student Rankings ({studentsList.length})</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'batches' ? 'active' : ''}`}
            onClick={() => setActiveTab('batches')}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: activeTab === 'batches' ? '1.5px solid var(--tpc-purple)' : '1px solid var(--stroke)',
              background: activeTab === 'batches' ? 'var(--tpc-purple)' : 'white',
              color: activeTab === 'batches' ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            <Layers size={16} />
            <span>Batch Performance ({batchList.length})</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
            onClick={() => setActiveTab('subjects')}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: activeTab === 'subjects' ? '1.5px solid var(--tpc-purple)' : '1px solid var(--stroke)',
              background: activeTab === 'subjects' ? 'var(--tpc-purple)' : 'white',
              color: activeTab === 'subjects' ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            <BookOpen size={16} />
            <span>Subject Analysis ({subjectList.length})</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="leaderboard-filters-wrap">
          {/* Batch Filter */}
          <div className="leaderboard-filter-item" style={{ flex: '1 1 200px', minWidth: '180px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Select Batch
            </label>
            <select
              className="form-select"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              style={{ width: '100%', fontSize: '13px', fontWeight: 600, padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--stroke)' }}
            >
              <option value="ALL">All Batches ({filtersMeta.batches.length})</option>
              {filtersMeta.batches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="leaderboard-filter-item" style={{ flex: '1 1 180px', minWidth: '160px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Subject Filter
            </label>
            <select
              className="form-select"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{ width: '100%', fontSize: '13px', fontWeight: 600, padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--stroke)' }}
            >
              <option value="ALL">All Subjects</option>
              {filtersMeta.subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Date Filter (From Date -> To Date) */}
          <div className="leaderboard-filter-item" style={{ flex: '1 1 320px', minWidth: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Date Filter
              </label>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--tpc-purple)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Clear (All Time)
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className={`btn btn-sm ${!startDate && !endDate ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setStartDate(''); setEndDate(''); }}
                style={{ fontSize: '11px', padding: '6px 12px', minHeight: '38px', height: '38px', whiteSpace: 'nowrap' }}
              >
                All Time
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  title="Start Date"
                  aria-label="Start Date"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: '38px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: startDate ? '1.5px solid var(--tpc-purple)' : '1px solid var(--stroke)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    background: startDate ? 'rgba(124, 58, 237, 0.04)' : 'white'
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  title="End Date"
                  aria-label="End Date"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: '38px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: endDate ? '1.5px solid var(--tpc-purple)' : '1px solid var(--stroke)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    background: endDate ? 'rgba(124, 58, 237, 0.04)' : 'white'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="leaderboard-filter-item" style={{ flex: '2 1 240px', minWidth: '220px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Search in Leaderboard
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Filter by Student Name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid var(--stroke)', fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Reset button */}
          {(selectedBatch !== 'ALL' || selectedSubject !== 'ALL' || startDate || endDate || searchQuery) && (
            <div style={{ alignSelf: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetFilters}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px' }}
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div className="spinner spinner-dark" style={{ width: '36px', height: '36px', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Aggregating Institutional Rankings...</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Calculating attendance rates, homework points, and test results from Supabase</p>
        </div>
      ) : (
        <>
          {/* TAB 1: STUDENT RANKINGS */}
          {activeTab === 'students' && (
            <div className="glass" style={{ borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--stroke)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    Student Rankings List
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Ranked by Overall Weighted Performance (Attendance 30% • Homework 30% • Exam Result 40%)
                  </p>
                </div>
                <span className="badge badge-surface" style={{ fontSize: '12px', fontWeight: 700 }}>
                  Showing {studentsList.length} Students
                </span>
              </div>

              {studentsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <Users size={36} color="var(--text-light)" style={{ margin: '0 auto 12px' }} />
                  <h4>No students match the current filters.</h4>
                  <p style={{ fontSize: '13px' }}>Try selecting "All Batches" or clearing your search term.</p>
                </div>
              ) : (
                <div className="table-responsive-touch">
                  <table className="results-table" style={{ fontSize: '13px', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '70px', textAlign: 'center' }}>Rank</th>
                        <th>Student Name & ID</th>
                        <th>Batch</th>
                        <th style={{ minWidth: '150px' }}>Attendance</th>
                        <th style={{ textAlign: 'center' }}>Homework</th>
                        <th style={{ textAlign: 'right' }}>Result %</th>
                        <th style={{ textAlign: 'right' }}>Overall Score</th>
                        <th style={{ textAlign: 'center', width: '160px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsList.map((s) => {
                        const isGold = s.rank === 1;
                        const isSilver = s.rank === 2;
                        const isBronze = s.rank === 3;

                        return (
                          <tr
                            key={s.studentId}
                            style={{
                              background: isGold ? 'rgba(254, 243, 199, 0.45)' : isSilver ? 'rgba(241, 245, 249, 0.55)' : isBronze ? 'rgba(254, 237, 213, 0.45)' : undefined
                            }}
                          >
                            {/* Rank Badge */}
                            <td style={{ textAlign: 'center' }}>
                              {isGold ? (
                                <span style={{ background: '#f59e0b', color: 'white', borderRadius: '8px', padding: '4px 8px', fontWeight: 900, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <Trophy size={12} /> #1
                                </span>
                              ) : isSilver ? (
                                <span style={{ background: '#64748b', color: 'white', borderRadius: '8px', padding: '4px 8px', fontWeight: 900, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <Medal size={12} /> #2
                                </span>
                              ) : isBronze ? (
                                <span style={{ background: '#ea580c', color: 'white', borderRadius: '8px', padding: '4px 8px', fontWeight: 900, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <Award size={12} /> #3
                                </span>
                              ) : (
                                <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>
                                  #{s.rank}
                                </span>
                              )}
                            </td>

                            {/* Name & ID */}
                            <td>
                              <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '13px' }}>
                                {s.studentName}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                ID: {s.studentId}
                              </div>
                            </td>

                            {/* Batch */}
                            <td>
                              <span className="badge badge-surface" style={{ fontSize: '11px', fontWeight: 600 }}>
                                {s.batch}
                              </span>
                            </td>

                            {/* Attendance */}
                            <td>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 700, color: 'var(--tpc-green)' }}>{s.attendance.percentage}%</span>
                                <span style={{ color: 'var(--text-muted)' }}>{s.attendance.presentDays}/{s.attendance.totalDays}d</span>
                              </div>
                              <div style={{ height: '6px', background: 'var(--surface)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${Math.min(s.attendance.percentage, 100)}%`,
                                  height: '100%',
                                  background: s.attendance.percentage >= 85 ? 'var(--tpc-green)' : s.attendance.percentage >= 70 ? '#f59e0b' : '#dc2626'
                                }} />
                              </div>
                            </td>

                            {/* Homework */}
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#2563eb' }}>
                                {s.homework.score}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/10</span>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                ({s.homework.percentage}%)
                              </div>
                            </td>

                            {/* Result % */}
                            <td style={{ textAlign: 'right' }}>
                              <span style={{
                                fontWeight: 800,
                                color: s.result.percentage >= 75 ? 'var(--success)' : s.result.percentage >= 50 ? 'var(--text-main)' : 'var(--danger)'
                              }}>
                                {s.result.percentage}%
                              </span>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                {s.result.testCount} tests
                              </div>
                            </td>

                            {/* Overall Score */}
                            <td style={{ textAlign: 'right' }}>
                              <span style={{
                                fontSize: '15px',
                                fontWeight: 900,
                                color: s.overallScore >= 80 ? 'var(--tpc-purple)' : s.overallScore >= 65 ? 'var(--tpc-green)' : 'var(--text-main)'
                              }}>
                                {s.overallScore}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '2px' }}>pts</span>
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  title="Inspect Calculations"
                                  onClick={() => setCalcModalStudent(s)}
                                  style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                                >
                                  <Calculator size={13} />
                                  <span>Audit</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  title="Open Student Report Card"
                                  onClick={() => handleOpenStudentReport(s)}
                                  style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700 }}
                                >
                                  <Eye size={13} />
                                  <span>Report</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BATCH PERFORMANCE & THRESHOLDS */}
          {activeTab === 'batches' && (
            <div className="glass" style={{ borderRadius: '20px', padding: '24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', borderBottom: '1px solid var(--stroke)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    Batch Performance & Dynamic Threshold Analysis
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Evaluate average scores across all classes and inspect students meeting institutional benchmarks.
                  </p>
                </div>

                {/* Threshold Slider Controls */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--surface)', padding: '10px 16px', borderRadius: '14px', border: '1px solid var(--stroke)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sliders size={15} color="var(--tpc-purple)" />
                    <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      KPI Thresholds:
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Overall:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={thresholdRes}
                      onChange={(e) => setThresholdRes(Number(e.target.value) || 0)}
                      style={{ width: '56px', padding: '3px 6px', borderRadius: '6px', border: '1px solid var(--stroke)', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>%</span>
                  </div>
                </div>
              </div>

              {/* Batches Table */}
              <div className="table-responsive-touch" style={{ marginBottom: '24px' }}>
                <table className="results-table" style={{ fontSize: '13px', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                      <th>Batch Name</th>
                      <th style={{ textAlign: 'center' }}>Enrolled Students</th>
                      <th style={{ textAlign: 'right' }}>Avg Attendance</th>
                      <th style={{ textAlign: 'right' }}>Avg Homework</th>
                      <th style={{ textAlign: 'right' }}>Avg Result</th>
                      <th style={{ textAlign: 'right' }}>Batch Score</th>
                      <th style={{ textAlign: 'center' }}>Students ≥ {thresholdRes}%</th>
                      <th style={{ textAlign: 'center' }}>Inspect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchList.map((b) => {
                      const qualified = (b.students || []).filter(s => s.overall >= thresholdRes);
                      const qualifiedPct = b.studentCount > 0 ? ((qualified.length / b.studentCount) * 100).toFixed(1) : 0;
                      const isSelected = selectedThresholdBatch?.batchName === b.batchName;

                      return (
                        <tr
                          key={b.batchName}
                          style={{
                            background: isSelected ? 'rgba(107, 33, 168, 0.06)' : undefined,
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedThresholdBatch(isSelected ? null : b)}
                        >
                          <td style={{ textAlign: 'center', fontWeight: 800 }}>#{b.rank}</td>
                          <td style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                            {b.batchName}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-surface" style={{ fontSize: '11px', fontWeight: 700 }}>
                              {b.studentCount} students
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--tpc-green)' }}>
                            {b.avgAttendance}%
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                            {b.avgHomeworkScore} / 10
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--tpc-purple)' }}>
                            {b.avgResult}%
                          </td>
                          <td style={{ textAlign: 'right', fontSize: '15px', fontWeight: 900, color: 'var(--tpc-purple)' }}>
                            {b.overallScore}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${qualified.length > 0 ? 'badge-green' : 'badge-surface'}`} style={{ fontSize: '11px' }}>
                              {qualified.length} / {b.studentCount} ({qualifiedPct}%)
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedThresholdBatch(isSelected ? null : b);
                              }}
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              {isSelected ? 'Hide' : 'Students'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Selected Batch Drilldown Drawer */}
              {selectedThresholdBatch && (
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  border: '1.5px solid var(--tpc-purple-border)',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                        {selectedThresholdBatch.batchName} — Student Roster
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        Showing all {selectedThresholdBatch.students.length} students sorted by score. Benchmark filter: ≥ {thresholdRes}%
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setSelectedThresholdBatch(null)}
                    >
                      Close Roster
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                    {selectedThresholdBatch.students.map((st, i) => {
                      const meets = st.overall >= thresholdRes;
                      return (
                        <div
                          key={st.id || i}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: meets ? 'var(--success-bg)' : 'var(--surface)',
                            border: meets ? '1px solid var(--success-border)' : '1px solid var(--stroke)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            const fullStudent = studentsList.find(x => x.studentId === st.id) || { studentId: st.id, studentName: st.name, batch: selectedThresholdBatch.batchName, overallScore: st.overall };
                            handleOpenStudentReport(fullStudent);
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)' }}>{st.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {st.id}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 900, fontSize: '14px', color: meets ? 'var(--success)' : 'var(--text-muted)' }}>
                              {st.overall}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Score</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUBJECT PERFORMANCE & ANALYSIS */}
          {activeTab === 'subjects' && (
            <div>
              {subjectList.length === 0 ? (
                <div className="glass" style={{ textAlign: 'center', padding: '60px 20px', borderRadius: '20px' }}>
                  <BookOpen size={36} color="var(--text-light)" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ fontSize: '16px', fontWeight: 700 }}>No subject performance data found</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Try selecting "All Batches" or clearing your timeline filters.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
                  {subjectList.map((subj) => (
                    <div
                      key={subj.subject}
                      className="glass"
                      style={{ borderRadius: '18px', padding: '22px', border: '1px solid var(--stroke)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span className="badge badge-purple" style={{ fontSize: '11px', fontWeight: 800 }}>
                            {subj.batchCount} Batches Evaluated
                          </span>
                          <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--tpc-purple)' }}>
                            {subj.overallAvg}%
                          </span>
                        </div>

                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 14px' }}>
                          {subj.subject}
                        </h3>

                        {/* Strong Batches */}
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--success)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={13} />
                            Top Performing Batches:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {(subj.strongBatches || []).map((sb, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 8px', background: 'var(--success-bg)', borderRadius: '6px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sb.batch}</span>
                                <span style={{ fontWeight: 800, color: 'var(--success)' }}>{sb.avgPct}%</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Focus Batches */}
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--danger)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={13} />
                            Batches Needing Focus:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {(subj.weakBatches || []).map((wb, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 8px', background: 'var(--danger-bg)', borderRadius: '6px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{wb.batch}</span>
                                <span style={{ fontWeight: 800, color: 'var(--danger)' }}>{wb.avgPct}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Calculation Audit Modal */}
      {calcModalStudent && (
        <CalculationPreviewModal
          isOpen={Boolean(calcModalStudent)}
          onClose={() => setCalcModalStudent(null)}
          studentId={calcModalStudent.studentId}
          studentName={calcModalStudent.studentName}
          batch={calcModalStudent.batch}
          onOpenReport={() => {
            handleOpenStudentReport(calcModalStudent);
            setCalcModalStudent(null);
          }}
          onDownloadPdf={() => {
            handleOpenStudentReport(calcModalStudent);
            setCalcModalStudent(null);
          }}
          downloadingPdf={false}
        />
      )}
    </div>
  );
}
