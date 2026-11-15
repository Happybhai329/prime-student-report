import React, { useState, useEffect } from 'react';
import { FileText, Trophy } from 'lucide-react';
import TopNavbar from './components/TopNavbar';
import LoginView from './components/LoginView';
import StudentSearch from './components/StudentSearch';
import ReportView from './components/ReportView';
import BatchReportView from './components/BatchReportView';
import LeaderboardView from './components/LeaderboardView';

export default function App() {
  const [teacher, setTeacher] = useState(() => {
    try {
      const saved = localStorage.getItem('prime_faculty_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState('report'); // 'report' | 'leaderboard'
  const [batchesList, setBatchesList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchContext, setBatchContext] = useState(null); // Return to batch after inspecting student
  const [leaderboardContext, setLeaderboardContext] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [batchReportData, setBatchReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingBatchReport, setLoadingBatchReport] = useState(false);
  const [reportMode, setReportMode] = useState('full'); // 'full' | 'attendance' | 'homework'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [toasts, setToasts] = useState([]);

  // Toast notification helper
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Preload batches list on mount
  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await fetch('/api/batches');
        if (res.ok) {
          const data = await res.json();
          if (data.batches) setBatchesList(data.batches);
        }
      } catch (err) {
        console.error('Failed to load batches:', err);
      }
    }
    loadBatches();
  }, []);

  const handleLoginSuccess = (faculty) => {
    setTeacher(faculty);
    localStorage.setItem('prime_faculty_session', JSON.stringify(faculty));
    showToast(`Welcome back, ${faculty.name}!`, 'success');
  };

  const handleLogout = () => {
    setTeacher(null);
    setSelectedStudent(null);
    setSelectedBatch(null);
    setBatchContext(null);
    setReportData(null);
    setBatchReportData(null);
    localStorage.removeItem('prime_faculty_session');
    showToast('Signed out successfully.', 'info');
  };

  // Fetch Student Report
  const fetchReport = async (studentId, start = startDate, end = endDate) => {
    if (!studentId) return;
    setLoadingReport(true);

    try {
      const params = new URLSearchParams();
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const url = `/api/students/${encodeURIComponent(studentId)}/report?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch student report');
      }

      setReportData(data);
    } catch (err) {
      console.error('Fetch report error:', err);
      showToast(err.message, 'error');
    } finally {
      setLoadingReport(false);
    }
  };

  // Fetch Batch Report
  const fetchBatchReport = async (batchName, start = startDate, end = endDate) => {
    if (!batchName) return;
    setLoadingBatchReport(true);

    try {
      const params = new URLSearchParams();
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const url = `/api/batches/${encodeURIComponent(batchName)}/report?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch batch report');
      }

      setBatchReportData(data);
    } catch (err) {
      console.error('Fetch batch report error:', err);
      showToast(err.message, 'error');
    } finally {
      setLoadingBatchReport(false);
    }
  };

  const handleSelectStudent = (student, mode = 'full') => {
    setSelectedStudent(student);
    setSelectedBatch(null);
    setBatchContext(null);
    setLeaderboardContext(null);
    setReportMode(mode);
    setStartDate('');
    setEndDate('');
    fetchReport(student.studentId, '', '');
  };

  const handleSelectBatch = (batchName, mode = reportMode) => {
    setSelectedBatch(batchName);
    setSelectedStudent(null);
    setBatchContext(null);
    setLeaderboardContext(null);
    setReportMode(mode === 'full' ? 'attendance' : mode);
    fetchBatchReport(batchName, startDate, endDate);
  };

  const handleSelectStudentFromBatch = (student, mode = reportMode) => {
    const studentObj = {
      studentId: student.studentId,
      studentName: student.studentName,
      batch: student.batch || selectedBatch,
      className: student.className
    };
    setBatchContext({ batch: selectedBatch, mode: reportMode });
    setSelectedStudent(studentObj);
    setLeaderboardContext(null);
    setReportMode(mode);
    fetchReport(studentObj.studentId, startDate, endDate);
  };

  const handleReportModeChange = (mode) => {
    setReportMode(mode);
  };

  const handleDateFilterChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    if (selectedStudent) {
      fetchReport(selectedStudent.studentId, start, end);
    }
  };

  const handleBatchDateFilterChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    if (selectedBatch) {
      fetchBatchReport(selectedBatch, start, end);
    }
  };

  const handleBackToSearch = () => {
    setSelectedStudent(null);
    setSelectedBatch(null);
    setBatchContext(null);
    setLeaderboardContext(null);
    setReportData(null);
    setBatchReportData(null);
    setStartDate('');
    setEndDate('');
    setCurrentView('report');
  };

  const handleBackToLeaderboard = () => {
    setSelectedStudent(null);
    setSelectedBatch(null);
    setBatchContext(null);
    setLeaderboardContext(null);
    setReportData(null);
    setBatchReportData(null);
    setStartDate('');
    setEndDate('');
    setCurrentView('leaderboard');
  };

  const handleBackNavigation = () => {
    if (leaderboardContext) {
      handleBackToLeaderboard();
    } else if (batchContext) {
      // User came from Batch view into individual student — return to Batch view
      setSelectedStudent(null);
      setReportData(null);
      setLeaderboardContext(null);
      setReportMode(batchContext.mode || 'attendance');
      setBatchContext(null);
    } else if (selectedBatch) {
      // User is in Batch view — return to Search
      setSelectedBatch(null);
      setBatchReportData(null);
      setSelectedStudent(null);
      setReportData(null);
    } else {
      handleBackToSearch();
    }
  };

  const handleSelectStudentFromLeaderboard = (student, context = null) => {
    const studentObj = {
      studentId: student.studentId || student.id,
      studentName: student.name || student.studentName,
      batch: student.batch || student.batchName
    };
    setSelectedStudent(studentObj);
    setSelectedBatch(null);
    setBatchContext(null);
    setLeaderboardContext(context);
    setCurrentView('report');
    setReportMode('full');
    const start = context?.startDate || '';
    const end = context?.endDate || '';
    setStartDate(start);
    setEndDate(end);
    fetchReport(studentObj.studentId, start, end);
  };

  if (!teacher) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Sticky Header */}
      <TopNavbar
        teacher={teacher}
        onLogout={handleLogout}
        onBackToSearch={handleBackNavigation}
        hasActiveStudent={Boolean(selectedStudent || selectedBatch)}
        isFromLeaderboard={Boolean(leaderboardContext)}
        onShowToast={showToast}
        currentView={currentView}
        onViewChange={(view) => {
          if (view === 'report' && currentView !== 'report') {
            // Keep current report or search
          }
          setCurrentView(view);
        }}
      />

      {/* Main Content Area */}
      <main className="app-body">
        {/* Persistent Leaderboard DOM to preserve filters, search query, scroll position, and data */}
        <div style={{ display: currentView === 'leaderboard' ? 'block' : 'none' }}>
          <LeaderboardView
            onSelectStudent={handleSelectStudentFromLeaderboard}
            onShowToast={showToast}
          />
        </div>

        {currentView === 'report' && (
          !selectedStudent && !selectedBatch ? (
            <StudentSearch
              onSelectStudent={handleSelectStudent}
              onSelectBatch={handleSelectBatch}
              batchesList={batchesList}
              reportMode={reportMode}
              onReportModeChange={handleReportModeChange}
              onShowToast={showToast}
            />
          ) : selectedBatch && !selectedStudent ? (
            <BatchReportView
              batchData={batchReportData}
              loading={loadingBatchReport}
              batchesList={batchesList}
              selectedBatch={selectedBatch}
              onSelectBatch={handleSelectBatch}
              reportMode={reportMode}
              onReportModeChange={handleReportModeChange}
              onBackToSearch={() => {
                setSelectedBatch(null);
                setBatchReportData(null);
              }}
              onSelectStudent={handleSelectStudentFromBatch}
              onDateFilterChange={handleBatchDateFilterChange}
              startDate={startDate}
              endDate={endDate}
              onShowToast={showToast}
            />
          ) : loadingReport && !reportData ? (
            <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-muted)' }}>
              <div className="spinner spinner-dark" style={{ margin: '0 auto 16px', width: '32px', height: '32px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                {reportMode === 'attendance'
                  ? 'Loading Attendance Report...'
                  : reportMode === 'homework'
                  ? 'Loading Homework Report...'
                  : 'Loading Comprehensive Report...'}
              </h3>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>
                {reportMode === 'attendance'
                  ? 'Calculating day-wise attendance, presence breakdown, and monthly trends'
                  : reportMode === 'homework'
                  ? 'Calculating homework completion, subject stats, and durations'
                  : 'Calculating attendance, exam rankings, and homework stats'}
              </p>
            </div>
          ) : (
            <ReportView
              reportData={reportData}
              teacher={teacher}
              onDateFilterChange={handleDateFilterChange}
              onShowToast={showToast}
              onRefreshReport={() => fetchReport(selectedStudent.studentId, startDate, endDate)}
              leaderboardContext={leaderboardContext}
              onBackToLeaderboard={handleBackToLeaderboard}
              reportMode={reportMode}
              onReportModeChange={handleReportModeChange}
            />
          )
        )}
      </main>

      {/* Toast Notification Stack */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (< 768px) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`mobile-nav-item ${currentView === 'report' ? 'active' : ''}`}
          onClick={() => setCurrentView('report')}
        >
          <div className="mobile-nav-icon-wrap">
            <FileText size={20} />
            {Boolean(selectedStudent || selectedBatch) && <span className="mobile-nav-dot" title="Active report loaded" />}
          </div>
          <span className="mobile-nav-label">Reports</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${currentView === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('leaderboard')}
        >
          <div className="mobile-nav-icon-wrap">
            <Trophy size={20} />
            <span className="mobile-nav-live-pill">Live</span>
          </div>
          <span className="mobile-nav-label">Leaderboard</span>
        </button>
      </nav>
    </div>
  );
}
