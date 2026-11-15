import React, { useState, useMemo } from 'react';
import {
  CalendarCheck, BookOpenCheck, ArrowLeft, Download, Printer, Search,
  Users, AlertTriangle, CheckCircle2, TrendingUp, Layers, ChevronDown,
  ArrowUpRight, Clock, BookOpen, Sparkles, Filter
} from 'lucide-react';
import {
  generateBatchAttendanceReportPDF,
  generateBatchHomeworkReportPDF
} from './ReportPdfExports';

const DATE_PRESETS = [
  { label: 'All Time', days: 0 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 }
];

export default function BatchReportView({
  batchData,
  loading,
  batchesList = [],
  selectedBatch,
  onSelectBatch,
  reportMode = 'attendance', // 'attendance' | 'homework' | 'full'
  onReportModeChange,
  onBackToSearch,
  onSelectStudent,
  onDateFilterChange,
  startDate = '',
  endDate = '',
  onShowToast
}) {
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [activeDatePreset, setActiveDatePreset] = useState('All Time');
  const [exportingPdf, setExportingPdf] = useState(false);

  // Date Preset Handler
  const handlePresetClick = (preset) => {
    setActiveDatePreset(preset.label);
    if (preset.days === 0) {
      onDateFilterChange('', '');
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - preset.days);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    onDateFilterChange(startStr, endStr);
  };

  const handleCustomDateChange = (startVal, endVal) => {
    setActiveDatePreset('Custom');
    onDateFilterChange(startVal, endVal);
  };

  // PDF Export
  const handleDownloadPDF = async () => {
    if (!batchData) return;
    setExportingPdf(true);
    try {
      if (reportMode === 'homework') {
        await generateBatchHomeworkReportPDF(batchData);
      } else {
        await generateBatchAttendanceReportPDF(batchData);
      }
      onShowToast?.(`Batch ${reportMode === 'homework' ? 'Homework' : 'Attendance'} PDF downloaded!`, 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      onShowToast?.('Failed to generate PDF: ' + err.message, 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  // Filter students within the batch by search query
  const filteredAttendanceStudents = useMemo(() => {
    const list = batchData?.attendance?.students || [];
    if (!studentSearchQuery.trim()) return list;
    const q = studentSearchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        String(s.studentId).toLowerCase().includes(q)
    );
  }, [batchData, studentSearchQuery]);

  const filteredHomeworkStudents = useMemo(() => {
    const list = batchData?.homework?.students || [];
    if (!studentSearchQuery.trim()) return list;
    const q = studentSearchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        String(s.studentId).toLowerCase().includes(q)
    );
  }, [batchData, studentSearchQuery]);

  if (loading && !batchData) {
    return (
      <div style={{ textAlign: 'center', padding: '90px 24px', color: 'var(--text-muted)' }}>
        <div className="spinner spinner-dark" style={{ margin: '0 auto 16px', width: '36px', height: '36px' }} />
        <h3 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text-main)' }}>
          Generating Batch Performance Report...
        </h3>
        <p style={{ fontSize: '13.5px', marginTop: '6px' }}>
          Aggregating all student attendance sessions and homework records for {selectedBatch || 'this batch'}.
        </p>
      </div>
    );
  }

  if (!batchData) {
    return (
      <div className="glass" style={{ textAlign: 'center', padding: '60px 24px', maxWidth: '640px', margin: '40px auto' }}>
        <AlertTriangle size={44} color="#d97706" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>No batch data found</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginTop: '6px' }}>
          Could not load data for batch "{selectedBatch}". Please select a different batch.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: '16px' }}
          onClick={onBackToSearch}
        >
          <ArrowLeft size={16} />
          <span>Back to Batch Selection</span>
        </button>
      </div>
    );
  }

  const { batch, batchContext, enrolledCount, activeStudentCount, attendance, homework } = batchData;
  const attSummary = attendance?.summary || {};
  const hwSummary = homework?.summary || {};

  return (
    <div className="batch-report-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px 60px' }}>
      {/* 1. Top Navigation & Batch Switcher Bar */}
      <div className="batch-report-header glass" style={{
        padding: '16px 20px',
        borderRadius: '16px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onBackToSearch}
            style={{ fontWeight: 600, color: 'var(--text-main)' }}
          >
            <ArrowLeft size={17} />
            <span>Search / Batches</span>
          </button>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />

          {/* Batch Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              Batch:
            </span>
            <div style={{ position: 'relative' }}>
              <select
                className="select-custom"
                value={selectedBatch}
                onChange={(e) => onSelectBatch(e.target.value)}
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  padding: '8px 32px 8px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--tpc-purple-border)',
                  background: 'var(--tpc-purple-subtle)',
                  color: 'var(--tpc-purple-dark)',
                  cursor: 'pointer'
                }}
              >
                {batchesList.map((b) => (
                  <option key={b.batch} value={b.batch}>
                    {b.batch} ({b.studentCount} students)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="badge badge-primary" style={{ fontSize: '12px' }}>
            <Users size={13} style={{ marginRight: '4px' }} />
            {activeStudentCount || enrolledCount} Students
          </span>
        </div>

        {/* Action Buttons: PDF & Print */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleDownloadPDF}
            disabled={exportingPdf}
            style={{ height: '38px' }}
          >
            <Download size={15} />
            <span>{exportingPdf ? 'Exporting PDF...' : `Download ${reportMode === 'homework' ? 'Homework' : 'Attendance'} PDF`}</span>
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => window.print()}
            style={{ height: '38px' }}
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 2. Report Type Switcher Tabs (Attendance vs Homework vs Full) */}
      <div className="report-type-switcher-wrap" style={{ marginBottom: '18px' }}>
        <span className="report-type-label">Batch Report View</span>
        <div className="report-type-tabs" role="tablist">
          <button
            type="button"
            className={`report-type-tab ${reportMode === 'attendance' ? 'active' : ''}`}
            onClick={() => onReportModeChange('attendance')}
          >
            <CalendarCheck size={16} />
            <span className="report-type-tab-text">Batch Attendance Report</span>
          </button>

          <button
            type="button"
            className={`report-type-tab ${reportMode === 'homework' ? 'active' : ''}`}
            onClick={() => onReportModeChange('homework')}
          >
            <BookOpenCheck size={16} />
            <span className="report-type-tab-text">Batch Homework Report</span>
          </button>

          <button
            type="button"
            className={`report-type-tab ${reportMode === 'full' ? 'active' : ''}`}
            onClick={() => onReportModeChange('full')}
          >
            <Layers size={16} />
            <span className="report-type-tab-text">Full Batch Overview</span>
          </button>
        </div>
      </div>

      {/* 3. Date Filter Bar */}
      <div className="glass" style={{
        padding: '14px 18px',
        borderRadius: '14px',
        marginBottom: '22px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Filter size={16} color="var(--tpc-purple)" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginRight: '4px' }}>
            Date Range:
          </span>
          {DATE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`filter-chip ${activeDatePreset === p.label ? 'active' : ''}`}
              onClick={() => handlePresetClick(p)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Custom:</span>
          <input
            type="date"
            className="input-custom"
            value={startDate}
            onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
            style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px' }}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>to</span>
          <input
            type="date"
            className="input-custom"
            value={endDate}
            onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
            style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px' }}
          />
          {(startDate || endDate) && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => handlePresetClick(DATE_PRESETS[0])}
              style={{ fontSize: '11px', color: 'var(--danger)' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          ATTENDANCE REPORT MODE
         ======================================================== */}
      {(reportMode === 'attendance' || reportMode === 'full') && (
        <section style={{ marginBottom: reportMode === 'full' ? '36px' : '0' }}>
          {reportMode === 'full' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <CalendarCheck size={20} color="var(--tpc-purple)" />
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Batch Attendance Performance</h2>
            </div>
          )}

          {/* Attendance KPI Cards */}
          <div className="kpi-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom: '20px'
          }}>
            {/* Overall Rate */}
            <div className="dyn-item-card" style={{ padding: '16px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Batch Attendance
                </span>
                <TrendingUp size={16} color="var(--success)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: attSummary.rate >= 80 ? 'var(--success)' : attSummary.rate >= 70 ? 'var(--warning)' : 'var(--danger)' }}>
                {attSummary.rate}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Overall presence rate
              </div>
            </div>

            {/* Total Sessions */}
            <div className="dyn-item-card" style={{ padding: '16px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Sessions Held
                </span>
                <Clock size={16} color="var(--tpc-purple)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text-main)' }}>
                {attSummary.totalSessions || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Total academic days
              </div>
            </div>

            {/* Total Present */}
            <div className="dyn-item-card" style={{ padding: '16px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Present
                </span>
                <CheckCircle2 size={16} color="var(--success)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--success)' }}>
                {attSummary.present || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Verified student attendances
              </div>
            </div>

            {/* Total Absent */}
            <div className="dyn-item-card" style={{ padding: '16px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Absent
                </span>
                <AlertTriangle size={16} color="var(--danger)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--danger)' }}>
                {attSummary.absent || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Absences or leaves
              </div>
            </div>

            {/* Regular Students (>=85%) */}
            <div className="dyn-item-card" style={{ padding: '16px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Regular (≥85%)
                </span>
                <Sparkles size={16} color="var(--tpc-purple)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--tpc-purple)' }}>
                {attendance?.highAttendanceCount || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Consistent attendees
              </div>
            </div>

            {/* At-Risk Students (<75%) */}
            <div className="dyn-item-card" style={{ padding: '16px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  At-Risk (&lt;75%)
                </span>
                <AlertTriangle size={16} color="var(--warning)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--warning)' }}>
                {attendance?.atRiskCount || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Need follow-up
              </div>
            </div>
          </div>

          {/* At-Risk Banner if any */}
          {attendance?.atRiskCount > 0 && reportMode === 'attendance' && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                <strong>Attendance Alert:</strong> {attendance.atRiskCount} student(s) in this batch have attendance below the 75% institutional threshold. Filter or review them below to schedule parent follow-up.
              </div>
            </div>
          )}

          {/* Search within batch */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Student Attendance Roster ({filteredAttendanceStudents.length})
            </h3>
            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter student by name or ID..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)'
                }}
              />
            </div>
          </div>

          {/* Student Attendance Roster Table */}
          <div className="table-responsive glass" style={{ borderRadius: '14px', overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '48px', textAlign: 'center' }}>#</th>
                  <th>Student Name & ID</th>
                  <th>Class</th>
                  <th style={{ textAlign: 'center' }}>Sessions</th>
                  <th style={{ textAlign: 'center' }}>Present</th>
                  <th style={{ textAlign: 'center' }}>Absent</th>
                  <th style={{ textAlign: 'center' }}>Attendance %</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendanceStudents.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No students found matching "{studentSearchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredAttendanceStudents.map((s, idx) => {
                    const rate = s.attendance?.rate ?? 0;
                    const badgeClass = rate >= 85 ? 'badge-success' : rate >= 70 ? 'badge-warning' : 'badge-danger';
                    return (
                      <tr key={s.studentId}>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.studentName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {s.studentId}</div>
                        </td>
                        <td style={{ fontSize: '12.5px' }}>
                          {s.className && s.className !== '-' ? `Class ${s.className}` : '-'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {s.attendance?.total || 0}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
                          {s.attendance?.present || 0}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 600 }}>
                          {s.attendance?.absent || 0}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${badgeClass}`} style={{ fontWeight: 800, padding: '3px 8px' }}>
                            {rate}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => onSelectStudent(s, 'attendance')}
                            style={{ fontSize: '11px', gap: '4px' }}
                            title="Open full student report"
                          >
                            <span>View Report</span>
                            <ArrowUpRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================
          HOMEWORK REPORT MODE
         ======================================================== */}
      {(reportMode === 'homework' || reportMode === 'full') && (
        <section>
          {reportMode === 'full' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', marginTop: '16px' }}>
              <BookOpenCheck size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Batch Homework Performance</h2>
            </div>
          )}

          {/* Homework KPI Cards */}
          <div className="kpi-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom: '20px'
          }}>
            {/* Completion Rate */}
            <div className="dyn-item-card" style={{ padding: '16px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Batch Completion Rate
                </span>
                <CheckCircle2 size={16} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: hwSummary.rate >= 75 ? 'var(--success)' : hwSummary.rate >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                {hwSummary.rate}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Homework submitted & completed
              </div>
            </div>

            {/* Total Assignments */}
            <div className="dyn-item-card" style={{ padding: '16px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Tasks Given
                </span>
                <BookOpen size={16} color="var(--tpc-purple)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text-main)' }}>
                {hwSummary.totalAssignments || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Across all subjects
              </div>
            </div>

            {/* Completed */}
            <div className="dyn-item-card" style={{ padding: '16px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Completed Tasks
                </span>
                <CheckCircle2 size={16} color="var(--success)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--success)' }}>
                {hwSummary.completed || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Submitted & checked
              </div>
            </div>

            {/* Pending */}
            <div className="dyn-item-card" style={{ padding: '16px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Pending / Missing
                </span>
                <AlertTriangle size={16} color="var(--danger)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--danger)' }}>
                {hwSummary.pending || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Not done or incomplete
              </div>
            </div>

            {/* High Performers */}
            <div className="dyn-item-card" style={{ padding: '16px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  High Performers (≥80%)
                </span>
                <Sparkles size={16} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--primary)' }}>
                {homework?.highCompletionCount || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Diligent submitters
              </div>
            </div>
          </div>

          {/* Subject Breakdown Cards */}
          {homework?.subjects?.length > 0 && (
            <div className="glass" style={{ padding: '18px 20px', borderRadius: '14px', marginBottom: '22px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)' }}>
                Subject-Wise Homework Completion Rate
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
              }}>
                {homework.subjects.map((subj) => (
                  <div
                    key={subj.subject}
                    style={{
                      background: 'var(--bg-card)',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {subj.subject}
                      </span>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: subj.rate >= 75 ? 'var(--success)' : subj.rate >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                        {subj.rate}%
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(subj.rate, 100)}%`,
                          height: '100%',
                          background: subj.rate >= 75 ? 'var(--success)' : subj.rate >= 60 ? 'var(--warning)' : 'var(--danger)',
                          borderRadius: '3px',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      <span>Done: {subj.completed}</span>
                      <span>Total: {subj.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search within batch */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Student Homework Roster ({filteredHomeworkStudents.length})
            </h3>
            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter student by name or ID..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)'
                }}
              />
            </div>
          </div>

          {/* Student Homework Roster Table */}
          <div className="table-responsive glass" style={{ borderRadius: '14px', overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '48px', textAlign: 'center' }}>#</th>
                  <th>Student Name & ID</th>
                  <th>Class</th>
                  <th style={{ textAlign: 'center' }}>Total Tasks</th>
                  <th style={{ textAlign: 'center' }}>Completed</th>
                  <th style={{ textAlign: 'center' }}>Pending</th>
                  <th style={{ textAlign: 'center' }}>Completion %</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHomeworkStudents.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No students found matching "{studentSearchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredHomeworkStudents.map((s, idx) => {
                    const rate = s.homework?.rate ?? 0;
                    const badgeClass = rate >= 80 ? 'badge-success' : rate >= 60 ? 'badge-warning' : 'badge-danger';
                    return (
                      <tr key={s.studentId}>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.studentName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {s.studentId}</div>
                        </td>
                        <td style={{ fontSize: '12.5px' }}>
                          {s.className && s.className !== '-' ? `Class ${s.className}` : '-'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {s.homework?.total || 0}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
                          {s.homework?.completed || 0}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 600 }}>
                          {s.homework?.pending || 0}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${badgeClass}`} style={{ fontWeight: 800, padding: '3px 8px' }}>
                            {rate}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => onSelectStudent(s, 'homework')}
                            style={{ fontSize: '11px', gap: '4px' }}
                            title="Open full student report"
                          >
                            <span>View Report</span>
                            <ArrowUpRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
