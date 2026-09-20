import React, { useState, useEffect } from 'react';
import TopNavbar from './components/TopNavbar';
import LoginView from './components/LoginView';
import StudentSearch from './components/StudentSearch';
import ReportView from './components/ReportView';

export default function App() {
  const [teacher, setTeacher] = useState(() => {
    try {
      const saved = localStorage.getItem('prime_faculty_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
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

  const handleLoginSuccess = (faculty) => {
    setTeacher(faculty);
    localStorage.setItem('prime_faculty_session', JSON.stringify(faculty));
    showToast(`Welcome back, ${faculty.name}!`, 'success');
  };

  const handleLogout = () => {
    setTeacher(null);
    setSelectedStudent(null);
    setReportData(null);
    localStorage.removeItem('prime_faculty_session');
    showToast('Signed out successfully.', 'info');
  };

  // Fetch Report when student or date filter changes
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

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setStartDate('');
    setEndDate('');
    fetchReport(student.studentId, '', '');
  };

  const handleDateFilterChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    if (selectedStudent) {
      fetchReport(selectedStudent.studentId, start, end);
    }
  };

  const handleBackToSearch = () => {
    setSelectedStudent(null);
    setReportData(null);
    setStartDate('');
    setEndDate('');
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
        onBackToSearch={handleBackToSearch}
        hasActiveStudent={Boolean(selectedStudent)}
        onShowToast={showToast}
      />

      {/* Main Content Area */}
      <main className="app-body">
        {!selectedStudent ? (
          <StudentSearch
            onSelectStudent={handleSelectStudent}
            onShowToast={showToast}
          />
        ) : loadingReport && !reportData ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-muted)' }}>
            <div className="spinner spinner-dark" style={{ margin: '0 auto 16px', width: '32px', height: '32px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Loading Comprehensive Report...</h3>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Calculating attendance, exam rankings, and homework stats</p>
          </div>
        ) : (
          <ReportView
            reportData={reportData}
            teacher={teacher}
            onDateFilterChange={handleDateFilterChange}
            onShowToast={showToast}
            onRefreshReport={() => fetchReport(selectedStudent.studentId, startDate, endDate)}
          />
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
    </div>
  );
}
