import React, { useState, useRef } from 'react';
import {
  Download,
  Calendar,
  CheckCircle,
  Award,
  TrendingUp,
  Percent,
  BookOpen,
  Filter,
  PlusCircle,
  FileCheck,
  Building2,
  ShieldAlert
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTablePlugin from 'jspdf-autotable';

import {
  AttendanceChart,
  HomeworkChart,
  SubjectWiseChart,
  PerformanceTrendChart
} from './AnalyticsCharts';
import ComplaintsModal from './ComplaintsModal';

const runAutoTable = (doc, options) => {
  if (typeof doc.autoTable === 'function') {
    doc.autoTable(options);
  } else if (typeof autoTablePlugin === 'function') {
    autoTablePlugin(doc, options);
  } else if (typeof autoTablePlugin?.default === 'function') {
    autoTablePlugin.default(doc, options);
  }
};

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

export default function ReportView({
  reportData,
  teacher,
  onDateFilterChange,
  onShowToast,
  onRefreshReport
}) {
  const [activeRange, setActiveRange] = useState('all'); // 'all' | '30d' | '90d' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Chart references for capturing canvas images
  const attChartRef = useRef(null);
  const hwChartRef = useRef(null);
  const subjChartRef = useRef(null);
  const trendChartRef = useRef(null);

  if (!reportData) return null;

  const { profile, attendance, homework, results, complaints, filters } = reportData;

  // Preset Date Handlers
  const handlePreset = (preset) => {
    setActiveRange(preset);
    if (preset === 'all') {
      onDateFilterChange('', '');
    } else if (preset === '30d') {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      onDateFilterChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
    } else if (preset === '90d') {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 90);
      onDateFilterChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
    }
  };

  const handleCustomFilter = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      onShowToast?.('Select both start and end date', 'error');
      return;
    }
    if (customStart > customEnd) {
      onShowToast?.('Start date cannot be after end date', 'error');
      return;
    }
    setActiveRange('custom');
    onDateFilterChange(customStart, customEnd);
  };

  // Helper to load image as base64
  const loadImageDataUri = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  // High-Resolution Official Institutional PDF Report Card Generator
  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    onShowToast?.('Preparing Official Institutional Report Card PDF...', 'info');

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;
      let currentY = margin;

      // Decorative Institutional Header Bands
      doc.setFillColor(107, 33, 168); // #6b21a8 Royal Purple
      doc.rect(0, 0, pageWidth, 7, 'F');
      doc.setFillColor(22, 163, 74); // #16a34a Vibrant Green
      doc.rect(0, 7, pageWidth, 3, 'F');

      // 1. Embed Official Logo
      const logoDataUri = await loadImageDataUri('/tpc-logo.jpg');
      const logoWidth = 56;
      const logoHeight = 56;

      if (logoDataUri) {
        doc.addImage(logoDataUri, 'JPEG', margin, currentY, logoWidth, logoHeight);
      }

      // 2. Institutional Title & Accreditations
      const textStartX = logoDataUri ? margin + logoWidth + 14 : margin;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(21);
      doc.setTextColor(15, 23, 42); // Dark slate
      doc.text('THE PRIME CLASSES', textStartX, currentY + 16);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(107, 33, 168); // TPC Purple
      doc.text('RIMC  |  RMS  |  SAINIK SCHOOL  |  FOUNDATION', textStartX, currentY + 31);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('OFFICIAL STUDENT ACADEMIC & DISCIPLINARY REPORT CARD', textStartX, currentY + 47);

      currentY += 66;

      // Metadata Banner Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 22, 3, 3, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const teacherInfo = teacher?.name ? `${teacher.name} (${teacher.employeeId || 'Faculty'})` : 'Academic Staff';
      doc.text(
        `Issued Date: ${todayStr}    |    Issued By: ${teacherInfo}    |    Scope: ${filters?.label || 'Full Academic History'}`,
        pageWidth / 2,
        currentY + 14,
        { align: 'center' }
      );

      currentY += 30;

      const addHeading = (title) => {
        if (currentY > pageHeight - 75) {
          doc.addPage();
          currentY = margin;
        }
        doc.setFillColor(245, 243, 255); // #f5f3ff subtle purple
        doc.setDrawColor(221, 214, 254);
        doc.roundedRect(margin, currentY, pageWidth - margin * 2, 20, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(107, 33, 168);
        doc.text(title.toUpperCase(), margin + 10, currentY + 14);
        currentY += 26;
      };

      // --- 1. Student Identity Details ---
      addHeading('1. Student Identity & Batch Profile');
      const profRows = [
        [
          { content: 'Student Name:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
          profile.studentName || 'N/A',
          { content: 'Student ID:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
          profile.studentId || 'N/A'
        ],
        [
          { content: "Father's Name:", styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
          profile.fatherName || 'N/A',
          { content: 'Enrolled Batch:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
          profile.batch || 'N/A'
        ],
        [
          { content: 'Class / Standard:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
          profile.className ? `Class ${profile.className}` : 'N/A',
          { content: 'School / Center:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
          profile.school || 'The Prime Classes'
        ],
        [
          { content: 'Mobile Contact:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
          cleanMobile(profile.mobile),
          { content: 'Program Stream:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
          profile.program || 'RIMC / Sainik School Foundation'
        ]
      ];

      if (profile.batchContext) {
        profRows.push([
          { content: 'Classroom / Subs:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
          `${profile.batchContext.classRoom || '-'} | ${(profile.batchContext.subjectsOffered || []).join(', ') || '-'}`,
          { content: 'Writing / Actual:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
          `${profile.batchContext.writingClass || '-'} / ${profile.batchContext.actualClass || '-'}`
        ]);
      }

      runAutoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        body: profRows,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3.5 },
        columnStyles: {
          0: { cellWidth: 105 },
          1: { cellWidth: 155 },
          2: { cellWidth: 105 },
          3: { cellWidth: 155 }
        }
      });
      currentY = doc.lastAutoTable.finalY + 14;

      // --- 2. Key Performance Highlights ---
      addHeading('2. Performance Highlights & Summary');
      runAutoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Key Indicator', 'Score / Status', 'Details & Context']],
        body: [
          ['Overall Attendance', `${attendance.summary.attendancePercentage || 0}%`, `Present: ${attendance.summary.present || 0} / Total Classes: ${attendance.summary.totalClasses || 0}`],
          ['Homework Completion Rate', `${homework.summary.completionRate || 0}%`, `Completed: ${homework.summary.completedHomework || 0} / Total Tasks: ${homework.summary.totalHomework || 0}`],
          ['Average Examination Score', `${results.summary.averageMarks || 0}`, `Average %: ${results.summary.averagePercentage || 0}% across ${results.summary.totalTests || 0} tests`],
          ['Score Extremes (High / Low)', `${results.summary.highestScore || 0} / ${results.summary.lowestScore || 0}`, `Highest Marks Achieved: ${results.summary.highestScore || 0}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [107, 33, 168], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 145 }, 1: { fontStyle: 'bold', halign: 'center', cellWidth: 95 } }
      });
      currentY = doc.lastAutoTable.finalY + 12;

      // Embedded Chart Visualizations
      try {
        if (attChartRef.current && hwChartRef.current) {
          const attImg = attChartRef.current.toBase64Image();
          const hwImg = hwChartRef.current.toBase64Image();
          if (currentY + 125 > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
          }
          doc.addImage(attImg, 'PNG', margin + 15, currentY, 225, 115);
          doc.addImage(hwImg, 'PNG', margin + 265, currentY, 225, 115);
          currentY += 125;
        }
      } catch (err) {
        console.warn('Could not export chart snapshot:', err);
      }

      // --- 3. Subject-Wise Strength & Weakness Analysis ---
      if (currentY > pageHeight - 120) {
        doc.addPage();
        currentY = margin;
      }
      addHeading('3. Subject-Wise Strength & Weakness Analysis');

      const subjectRows = (results.subjectWise || []).map((row) => {
        let statusColor = [217, 119, 6]; // Amber
        if (row.percentage >= 80) statusColor = [22, 163, 74]; // Green
        else if (row.percentage < 50) statusColor = [220, 38, 38]; // Red

        return [
          row.subjectName,
          String(row.averageObtainedMarks),
          String(row.averageMaxMarks),
          `${row.percentage}%`,
          { content: row.status, styles: { fontStyle: 'bold', textColor: statusColor, halign: 'center' } }
        ];
      });

      runAutoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Subject Name', 'Avg Obtained', 'Avg Max Marks', 'Percentage (%)', 'Assessment Status']],
        body: subjectRows.length ? subjectRows : [['No subject examination records found', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 4, halign: 'center' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 155 } }
      });
      currentY = doc.lastAutoTable.finalY + 12;

      // --- 4. Detailed Exam Records ---
      if (currentY > pageHeight - 120) {
        doc.addPage();
        currentY = margin;
      }
      addHeading('4. Detailed Examination History');
      const examRows = (results.rows || []).slice(0, 12).map((r) => [
        r.examDate || '-',
        r.testId || '-',
        r.examType || '-',
        String(r.totalObtainedMarks || 0),
        String(r.examTotalMaxMarks || 0),
        `${r.percentage || 0}%`,
        r.rank ? `#${r.rank}` : '-'
      ]);

      runAutoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Date', 'Test ID', 'Exam Type', 'Marks', 'Max Marks', '%', 'Rank']],
        body: examRows.length ? examRows : [['No exam records on file', '-', '-', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3.5, halign: 'center' },
        columnStyles: { 0: { cellWidth: 75 }, 1: { cellWidth: 110, halign: 'left' }, 2: { cellWidth: 110, halign: 'left' } }
      });
      currentY = doc.lastAutoTable.finalY + 12;

      // --- 5. Faculty Remarks & Disciplinary Feedback ---
      if (currentY > pageHeight - 90) {
        doc.addPage();
        currentY = margin;
      }
      addHeading(`5. Faculty Observations & Remarks (${complaints.summary.complaintCount || 0})`);
      const compRows = (complaints.rows || []).slice(0, 6).map((c) => [
        c.date || '-',
        c.teacherName || '-',
        c.status || 'Pending',
        c.complaintText || '-'
      ]);

      runAutoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Date', 'Faculty Name', 'Status', 'Observation / Feedback']],
        body: compRows.length ? compRows : [['No disciplinary remarks recorded for this period.', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [148, 163, 184], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3.5 },
        columnStyles: { 0: { cellWidth: 75 }, 1: { cellWidth: 110 }, 2: { cellWidth: 70, halign: 'center' } }
      });
      currentY = doc.lastAutoTable.finalY + 24;

      // --- 6. Institutional Signatures Block ---
      if (currentY > pageHeight - 70) {
        doc.addPage();
        currentY = margin + 20;
      }

      const sigY = currentY + 18;
      doc.setDrawColor(148, 163, 184);
      doc.setLineDashPattern([2, 2], 0);

      // Line 1: Class Teacher
      doc.line(margin + 20, sigY, margin + 140, sigY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Class Teacher', margin + 80, sigY + 12, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('The Prime Classes', margin + 80, sigY + 22, { align: 'center' });

      // Line 2: Academic Coordinator
      doc.line(pageWidth / 2 - 60, sigY, pageWidth / 2 + 60, sigY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Academic Coordinator', pageWidth / 2, sigY + 12, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('The Prime Classes', pageWidth / 2, sigY + 22, { align: 'center' });

      // Line 3: Principal / Director
      doc.line(pageWidth - margin - 140, sigY, pageWidth - margin - 20, sigY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Director / Principal', pageWidth - margin - 80, sigY + 12, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Official Seal & Signature', pageWidth - margin - 80, sigY + 22, { align: 'center' });

      doc.setLineDashPattern([], 0); // reset dash pattern

      // Footer with page numbering
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `The Prime Classes — Official Student Performance Report Card  |  Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 16,
          { align: 'center' }
        );
      }

      const fileName = `The_Prime_Classes_Report_${profile.studentName.replace(/[^a-zA-Z0-9]/g, '_')}_${profile.studentId}.pdf`;
      doc.save(fileName);
      onShowToast?.('Official PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      onShowToast?.('Failed to generate PDF: ' + err.message, 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {/* Institutional Header & Action Bar */}
      <section className="glass" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="report-institution-header">
          <div className="institution-brand-block">
            <img
              src="/tpc-logo.jpg"
              alt="The Prime Classes"
              className="tpc-logo-report"
            />
            <div className="institution-details">
              <h1 className="institution-name">The Prime Classes</h1>
              <span className="institution-tagline">
                RIMC &bull; RMS &bull; SAINIK SCHOOL &bull; FOUNDATION
              </span>
              <span className="institution-report-type">
                Student Academic & Disciplinary Progress Report Card
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowComplaintModal(true)}
            >
              <PlusCircle size={16} />
              <span>Record Remark</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              style={{ fontWeight: 700 }}
            >
              {downloadingPdf ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  <span>Generating Official PDF...</span>
                </>
              ) : (
                <>
                  <Download size={17} />
                  <span>Download Official PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Scope Banner */}
        <div style={{
          padding: '12px 28px',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '12px',
          color: 'var(--text-muted)'
        }}>
          <div>
            Viewing Student: <strong style={{ color: 'var(--text-main)' }}>{profile.studentName}</strong> (ID: {profile.studentId})
          </div>
          <div>
            Report Scope: <strong>{filters?.label || 'Full History'}</strong>
          </div>
        </div>
      </section>

      {/* Date Range Filter Bar */}
      <section className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--tpc-purple)" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Filter Period:</span>
          <div className="filter-chips">
            <button
              type="button"
              className={`chip-btn ${activeRange === 'all' ? 'active' : ''}`}
              onClick={() => handlePreset('all')}
            >
              All Time
            </button>
            <button
              type="button"
              className={`chip-btn ${activeRange === '30d' ? 'active' : ''}`}
              onClick={() => handlePreset('30d')}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              className={`chip-btn ${activeRange === '90d' ? 'active' : ''}`}
              onClick={() => handlePreset('90d')}
            >
              Last 90 Days
            </button>
          </div>
        </div>

        <form onSubmit={handleCustomFilter} className="date-range-form">
          <input
            type="date"
            className="date-input"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>to</span>
          <input
            type="date"
            className="date-input"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary btn-sm" style={{ height: '40px', fontWeight: 700 }}>
            Apply Filter
          </button>
        </form>
      </section>

      {/* Key Performance Metric Cards */}
      <section className="kpi-grid">
        {/* Attendance */}
        <div className="stat-card accent-success">
          <div className="stat-header">
            <span className="stat-label">Attendance Rate</span>
            <div className="stat-icon" style={{ color: 'var(--tpc-green)', background: 'var(--success-bg)' }}>
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="stat-value">{attendance.summary.attendancePercentage || 0}%</div>
          <div className="stat-footer">
            {attendance.summary.present || 0} Present / {attendance.summary.totalClasses || 0} Total Classes
          </div>
        </div>

        {/* Homework */}
        <div className="stat-card accent-warning">
          <div className="stat-header">
            <span className="stat-label">Homework Completion</span>
            <div className="stat-icon" style={{ color: 'var(--warning)', background: 'var(--warning-bg)' }}>
              <BookOpen size={20} />
            </div>
          </div>
          <div className="stat-value">{homework.summary.completionRate || 0}%</div>
          <div className="stat-footer">
            {homework.summary.completedHomework || 0} Completed / {homework.summary.totalHomework || 0} Assignments
          </div>
        </div>

        {/* Average Marks */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Average Score</span>
            <div className="stat-icon" style={{ color: 'var(--tpc-purple)', background: 'var(--tpc-purple-subtle)' }}>
              <Award size={20} />
            </div>
          </div>
          <div className="stat-value">{results.summary.averageMarks || 0}</div>
          <div className="stat-footer">
            Across {results.summary.totalTests || 0} tests (High: {results.summary.highestScore || 0})
          </div>
        </div>

        {/* Average Percentage */}
        <div className="stat-card accent-secondary">
          <div className="stat-header">
            <span className="stat-label">Average Percentage</span>
            <div className="stat-icon" style={{ color: '#0284c7', background: '#e0f2fe' }}>
              <Percent size={20} />
            </div>
          </div>
          <div className="stat-value">{results.summary.averagePercentage || 0}%</div>
          <div className="stat-footer">
            Disciplinary Observations: {complaints.summary.complaintCount || 0}
          </div>
        </div>
      </section>

      {/* Student Profile Identity Card */}
      <section className="profile-card glass">
        <div className="profile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="student-card-avatar" style={{ width: '52px', height: '52px', fontSize: '18px' }}>
              {getInitials(profile.studentName)}
            </div>
            <div>
              <h2 className="profile-main-title">{profile.studentName}</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Student ID: <strong>{profile.studentId}</strong> &bull; Batch: <strong>{profile.batch || 'N/A'}</strong>
              </p>
            </div>
          </div>
          <span className="badge badge-primary">{profile.program || 'Defense Foundation Program'}</span>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Full Name</span>
            <span className="detail-value">{profile.studentName || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Father's Name</span>
            <span className="detail-value">{profile.fatherName || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Batch Code</span>
            <span className="detail-value">{profile.batch || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Current Standard</span>
            <span className="detail-value">{profile.className ? `Class ${profile.className}` : '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">School / Center</span>
            <span className="detail-value">{profile.school || 'The Prime Classes'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Parent Contact</span>
            <span className="detail-value">{cleanMobile(profile.mobile)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Date of Birth</span>
            <span className="detail-value">{profile.dob || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Email ID</span>
            <span className="detail-value">{profile.email || '-'}</span>
          </div>
        </div>

        {profile.batchContext && (
          <div style={{ marginTop: '6px', paddingTop: '16px', borderTop: '1px solid var(--stroke)' }}>
            <span className="form-label" style={{ display: 'block', marginBottom: '10px' }}>
              Batch Academic Context & Subjects
            </span>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Classroom</span>
                <span className="detail-value">{profile.batchContext.classRoom || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Writing Class</span>
                <span className="detail-value">{profile.batchContext.writingClass || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Actual Class</span>
                <span className="detail-value">{profile.batchContext.actualClass || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Curriculum Subjects</span>
                <span className="detail-value">
                  {(profile.batchContext.subjectsOffered || []).join(', ') || '-'}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Attendance & Homework Visual Analytics */}
      <section className="analytics-grid">
        {/* Attendance Card */}
        <article className="chart-card">
          <div className="chart-head">
            <h3 className="chart-title">Attendance Distribution</h3>
            <span className="badge badge-strong">
              {attendance.summary.attendancePercentage || 0}% Present
            </span>
          </div>

          <div className="chart-frame">
            <AttendanceChart
              ref={attChartRef}
              labels={attendance.chart.labels}
              data={attendance.chart.data}
            />
          </div>

          <div className="table-wrap" style={{ maxHeight: '220px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Faculty</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {attendance.rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No attendance records found for this period
                    </td>
                  </tr>
                ) : (
                  attendance.rows.slice(0, 15).map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.date}</td>
                      <td>
                        <span
                          className={`badge ${
                            /(present|attend|late|p$)/i.test(row.presenceType)
                              ? 'badge-strong'
                              : /(absent|leave|miss|a$)/i.test(row.presenceType)
                              ? 'badge-weak'
                              : 'badge-neutral'
                          }`}
                        >
                          {row.presenceType}
                        </span>
                      </td>
                      <td>{row.teacherName}</td>
                      <td>{row.callReason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Homework Card */}
        <article className="chart-card">
          <div className="chart-head">
            <h3 className="chart-title">Homework & Task Completion</h3>
            <span className="badge badge-primary">
              {homework.summary.completionRate || 0}% Completion
            </span>
          </div>

          <div className="chart-frame">
            <HomeworkChart
              ref={hwChartRef}
              labels={homework.chart.labels}
              data={homework.chart.data}
            />
          </div>

          <div className="table-wrap" style={{ maxHeight: '220px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {homework.rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No homework records found for this period
                    </td>
                  </tr>
                ) : (
                  homework.rows.slice(0, 15).map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.date}</td>
                      <td style={{ fontWeight: 700 }}>{row.subject}</td>
                      <td>
                        <span
                          className={`badge ${
                            /(complete|done|submitted)/i.test(row.finalStatus || row.status)
                              ? 'badge-strong'
                              : /(pending|due|missing)/i.test(row.finalStatus || row.status)
                              ? 'badge-weak'
                              : 'badge-average'
                          }`}
                        >
                          {row.finalStatus || row.status}
                        </span>
                      </td>
                      <td>{row.durationMin ? `${row.durationMin} min` : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {/* Subject-Wise Strength & Weakness Analysis */}
      <section className="chart-card">
        <div className="chart-head">
          <div>
            <h3 className="chart-title">Subject-Wise Strength & Weakness Analysis</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Standard Classification: Strong (&ge; 80%), Average (50% - 79%), Weak (&lt; 50%)
            </p>
          </div>
        </div>

        <div className="chart-frame" style={{ height: '260px' }}>
          <SubjectWiseChart ref={subjChartRef} subjectWise={results.subjectWise} />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Avg Obtained</th>
                <th>Avg Max Marks</th>
                <th>Percentage (%)</th>
                <th>Performance Status</th>
              </tr>
            </thead>
            <tbody>
              {results.subjectWise.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No subject examination data recorded
                  </td>
                </tr>
              ) : (
                results.subjectWise.map((sub, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{sub.subjectName}</td>
                    <td>{sub.averageObtainedMarks}</td>
                    <td>{sub.averageMaxMarks}</td>
                    <td style={{ fontWeight: 700 }}>{sub.percentage}%</td>
                    <td>
                      <span
                        className={`badge ${
                          sub.status === 'Strong'
                            ? 'badge-strong'
                            : sub.status === 'Weak'
                            ? 'badge-weak'
                            : 'badge-average'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Examination Performance Trend & History */}
      <section className="chart-card">
        <div className="chart-head">
          <h3 className="chart-title">Examination Performance History & Trend</h3>
          <span className="badge badge-neutral">Total Tests: {results.summary.totalTests || 0}</span>
        </div>

        <div className="chart-frame" style={{ height: '260px' }}>
          <PerformanceTrendChart ref={trendChartRef} trend={results.trend} />
        </div>

        <div className="table-wrap" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Exam Date</th>
                <th>Test ID</th>
                <th>Exam Type</th>
                <th>Marks Obtained</th>
                <th>Max Marks</th>
                <th>Percentage</th>
                <th>Rank</th>
              </tr>
            </thead>
            <tbody>
              {results.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No exam records found for this student
                  </td>
                </tr>
              ) : (
                results.rows.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.examDate}</td>
                    <td style={{ fontWeight: 600 }}>{row.testId}</td>
                    <td>{row.examType}</td>
                    <td style={{ fontWeight: 800 }}>{row.totalObtainedMarks}</td>
                    <td>{row.examTotalMaxMarks}</td>
                    <td style={{ fontWeight: 700 }}>{row.percentage}%</td>
                    <td>{row.rank ? `#${row.rank}` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Disciplinary Observations & Remarks */}
      <section className="chart-card">
        <div className="chart-head">
          <div>
            <h3 className="chart-title">Faculty Observations & Remarks</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Feedback and academic remarks logged by faculty members
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowComplaintModal(true)}
          >
            <PlusCircle size={14} />
            <span>Add Remark</span>
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Incident Date</th>
                <th>Faculty Name</th>
                <th>Department</th>
                <th>Status</th>
                <th>Remark / Observation Details</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {complaints.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    No disciplinary observations or remarks recorded for this student.
                  </td>
                </tr>
              ) : (
                complaints.rows.map((comp, idx) => (
                  <tr key={idx}>
                    <td>{comp.date}</td>
                    <td style={{ fontWeight: 700 }}>{comp.teacherName}</td>
                    <td>{comp.department}</td>
                    <td>
                      <span className="badge badge-neutral">{comp.status}</span>
                    </td>
                    <td style={{ whiteSpace: 'normal', minWidth: '260px' }}>{comp.complaintText}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{comp.submittedAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Official Signatures Block (For Institutional Credibility) */}
      <section className="glass" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <FileCheck size={18} color="var(--tpc-purple)" />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
            Official Institutional Verification
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          This document is generated by The Prime Classes Academic Performance & Evaluation Cell. Valid without physical signature when verified via the faculty portal.
        </p>

        <div className="official-signature-block">
          <div className="signature-item">
            <div className="signature-line" />
            <span className="signature-title">Class Teacher Signature</span>
            <span className="signature-subtitle">The Prime Classes</span>
          </div>
          <div className="signature-item">
            <div className="signature-line" />
            <span className="signature-title">Academic Coordinator</span>
            <span className="signature-subtitle">Evaluation Cell</span>
          </div>
          <div className="signature-item">
            <div className="signature-line" />
            <span className="signature-title">Director / Principal</span>
            <span className="signature-subtitle">The Prime Classes</span>
          </div>
        </div>
      </section>

      {/* Complaints Submission Modal */}
      <ComplaintsModal
        isOpen={showComplaintModal}
        onClose={() => setShowComplaintModal(false)}
        student={profile}
        teacher={teacher}
        onShowToast={onShowToast}
        onComplaintSubmitted={() => {
          onRefreshReport?.();
        }}
      />
    </div>
  );
}
