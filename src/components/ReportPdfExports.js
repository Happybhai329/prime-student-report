import { jsPDF } from 'jspdf';
import autoTablePlugin from 'jspdf-autotable';

const runAutoTable = (doc, options) => {
  if (typeof doc.autoTable === 'function') {
    doc.autoTable(options);
  } else if (typeof autoTablePlugin === 'function') {
    autoTablePlugin(doc, options);
  } else if (typeof autoTablePlugin?.default === 'function') {
    autoTablePlugin.default(doc, options);
  }
};

const loadImageDataUri = (url) => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ATT_PRESENT_RE = /(present|attend|late|p$|p\s)/i;
const ATT_ABSENT_RE = /(absent|leave|miss|a$|a\s)/i;
const HW_COMPLETED_RE = /(complete|completed|done|submitted|checked|resolved)/i;
const HW_PENDING_RE = /(pending|incomplete|due|missing|notdone|open)/i;

/**
 * Common Institutional Header renderer for Official PDFs
 */
async function drawInstitutionalHeader(doc, documentTitle, scopeLabel) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  let currentY = margin;

  // Decorative Institutional Header Bands
  doc.setFillColor(107, 33, 168); // #6b21a8 Royal Purple
  doc.rect(0, 0, pageWidth, 7, 'F');
  doc.setFillColor(22, 163, 74); // #16a34a Vibrant Green
  doc.rect(0, 7, pageWidth, 3, 'F');

  // 1. Embed Official Logo
  const logoDataUri = await loadImageDataUri('/tpc-logo.jpg');
  const logoWidth = 54;
  const logoHeight = 54;

  if (logoDataUri) {
    try {
      doc.addImage(logoDataUri, 'JPEG', margin, currentY, logoWidth, logoHeight);
    } catch {
      // ignore image fail
    }
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

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(documentTitle.toUpperCase(), textStartX, currentY + 47);

  currentY += 66;

  // Metadata Banner Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 22, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(
    `Issued Date: ${todayStr}    |    Institution: The Prime Classes    |    Scope: ${scopeLabel || 'Full History'}`,
    pageWidth / 2,
    currentY + 14,
    { align: 'center' }
  );

  currentY += 30;
  return currentY;
}

/**
 * Common Section Heading Box
 */
function createSectionHeaderAdder(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  return (title, currentY) => {
    let y = currentY;
    if (y > pageHeight - 80) {
      doc.addPage();
      y = margin;
    }
    doc.setFillColor(245, 243, 255); // #f5f3ff subtle purple
    doc.setDrawColor(221, 214, 254);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(107, 33, 168);
    doc.text(title.toUpperCase(), margin + 10, y + 14);
    return y + 26;
  };
}

/**
 * Common Student Identity Table
 */
function renderStudentIdentityTable(doc, profile, startY) {
  const margin = 36;
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

  runAutoTable(doc, {
    startY,
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

  return doc.lastAutoTable.finalY + 14;
}

/**
 * Common Institutional Closing Message Card
 */
function renderInstitutionalSignoff(doc, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const boxWidth = pageWidth - margin * 2;
  const msgBoxHeight = 74;

  let currentY = startY;
  if (currentY > pageHeight - msgBoxHeight - 35) {
    doc.addPage();
    currentY = margin + 12;
  }

  doc.setFillColor(250, 245, 255);
  doc.setDrawColor(216, 180, 254);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, currentY, boxWidth, msgBoxHeight, 3, 3, 'FD');

  doc.setFillColor(107, 33, 168);
  doc.roundedRect(margin, currentY, 4, msgBoxHeight, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 33, 168);
  doc.text('INSTITUTIONAL COMMITMENT & MENTORSHIP', margin + 14, currentY + 14);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.4);
  doc.setTextColor(51, 65, 85);
  const primeMsg =
    "At The Prime Classes, consistent attendance and diligent homework completion form the twin pillars of academic discipline. We remain deeply committed to mentoring your ward with structured routines and individual guidance to ensure steadfast character and competitive excellence in all national defense entrance exams.";

  const splitLines = doc.splitTextToSize(primeMsg, boxWidth - 26);
  doc.text(splitLines, margin + 14, currentY + 24);

  const signY = currentY + 24 + (splitLines.length * 8.5) + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('— Team The Prime Classes', margin + 14, signY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Mentoring Champions for RIMC • RMS • Sainik School • Foundation', margin + 14, signY + 8);

  return signY + 16;
}

/**
 * Common Footer with Page Numbers
 */
function renderPageFooters(doc, reportTitle) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `The Prime Classes — ${reportTitle}  |  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 14,
      { align: 'center' }
    );
  }
}

// ============================================================================
// 1. DEDICATED OFFICIAL ATTENDANCE REPORT PDF
// ============================================================================
export async function generateAttendanceReportPDF({ reportData, chartImage = null }) {
  if (!reportData) return;
  const { profile, attendance, filters } = reportData;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const addHeading = createSectionHeaderAdder(doc);

  let currentY = await drawInstitutionalHeader(
    doc,
    'Official Student Attendance Report',
    filters?.label || 'Full History'
  );

  // 1. Student Identity Details
  currentY = addHeading('1. Student Identity & Batch Profile', currentY);
  currentY = renderStudentIdentityTable(doc, profile, currentY);

  // 2. Attendance Summary Highlights
  currentY = addHeading('2. Attendance Rate & Class Statistics', currentY);
  const summary = attendance?.summary || {};
  const kpiRows = [
    [
      'Attendance Percentage',
      `${summary.attendancePercentage || 0}%`,
      summary.attendancePercentage >= 85 ? 'Outstanding Consistency' : summary.attendancePercentage >= 75 ? 'Good Attendance' : 'Requires Focus & Regularity'
    ],
    ['Classes Present', `${summary.present || 0} Sessions`, 'Classroom sessions physically/digitally attended'],
    ['Classes Absent', `${summary.absent || 0} Sessions`, 'Unexcused / recorded absent dates'],
    ['Leave / Late / Other', `${summary.other || 0} Sessions`, 'Approved medical leaves, sports duty, or recorded late marks'],
    ['Total Working Sessions', `${summary.totalClasses || 0} Sessions`, 'Total academic sessions conducted in evaluated timeframe']
  ];

  runAutoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Attendance Metric', 'Value', 'Institutional Context']],
    body: kpiRows,
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 140 }, 1: { fontStyle: 'bold', halign: 'center', cellWidth: 100 } }
  });
  currentY = doc.lastAutoTable.finalY + 14;

  // Chart snapshot if present
  if (chartImage) {
    try {
      if (currentY + 120 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }
      doc.addImage(chartImage, 'PNG', pageWidth / 2 - 110, currentY, 220, 110);
      currentY += 120;
    } catch {
      // ignore
    }
  }

  // 3. Month-Wise Attendance Breakdown Table
  const rows = attendance?.rows || [];
  const monthMap = {};
  rows.forEach((r) => {
    const dateStr = String(r.date || '');
    const m = dateStr.match(/^(\d{4})[-/](\d{1,2})/);
    const label = m ? `${MONTH_NAMES[Number(m[2]) - 1] || 'Unknown'} ${m[1]}` : 'Unknown';
    if (!monthMap[label]) {
      monthMap[label] = { sortKey: m ? Number(m[1]) * 100 + Number(m[2]) : 0, present: 0, absent: 0, total: 0 };
    }
    monthMap[label].total += 1;
    if (ATT_PRESENT_RE.test(r.presenceType || '')) monthMap[label].present += 1;
    if (ATT_ABSENT_RE.test(r.presenceType || '')) monthMap[label].absent += 1;
  });

  const monthlyList = Object.keys(monthMap)
    .map((label) => {
      const b = monthMap[label];
      const other = Math.max(b.total - b.present - b.absent, 0);
      return {
        month: label,
        sortKey: b.sortKey,
        present: b.present,
        absent: b.absent,
        other,
        total: b.total,
        percentage: b.total ? Number(((b.present / b.total) * 100).toFixed(1)) : 0
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey);

  if (monthlyList.length > 0) {
    currentY = addHeading('3. Monthly Attendance Progression', currentY);
    const monthlyRows = monthlyList.map((m) => [
      m.month,
      `${m.percentage}%`,
      String(m.present),
      String(m.absent),
      String(m.other),
      String(m.total)
    ]);

    runAutoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Month', 'Attendance Rate', 'Present', 'Absent', 'Other/Leave', 'Total Days']],
      body: monthlyRows,
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3.5, halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 120 }, 1: { fontStyle: 'bold', textColor: [22, 163, 74] } }
    });
    currentY = doc.lastAutoTable.finalY + 14;
  }

  // 4. Detailed Day-by-Day Attendance Log
  currentY = addHeading('4. Complete Day-Wise Attendance Register', currentY);
  const attLogRows = (rows || []).slice(0, 50).map((r) => {
    let statusColor = [71, 85, 105];
    if (ATT_PRESENT_RE.test(r.presenceType)) statusColor = [22, 163, 74];
    else if (ATT_ABSENT_RE.test(r.presenceType)) statusColor = [220, 38, 38];

    return [
      r.date || '-',
      r.batch || profile.batch || '-',
      { content: r.presenceType || '-', styles: { fontStyle: 'bold', textColor: statusColor, halign: 'center' } },
      r.teacherName || '-',
      r.callReason || '-'
    ];
  });

  runAutoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Date', 'Batch', 'Presence Status', 'Faculty', 'Remarks / Contact Notes']],
    body: attLogRows.length ? attLogRows : [['No attendance records for selected period.', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.8, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 85 }, 2: { cellWidth: 80 }, 3: { cellWidth: 100 } }
  });
  currentY = doc.lastAutoTable.finalY + 16;

  // 5. Sign-off and message
  currentY = renderInstitutionalSignoff(doc, currentY);

  // 6. Page footers
  renderPageFooters(doc, 'Official Student Attendance Report');

  const fileName = `The_Prime_Classes_Attendance_Report_${profile.studentName.replace(/[^a-zA-Z0-9]/g, '_')}_${profile.studentId}.pdf`;
  doc.save(fileName);
}

// ============================================================================
// 2. DEDICATED OFFICIAL HOMEWORK REPORT PDF
// ============================================================================
export async function generateHomeworkReportPDF({ reportData, chartImage = null }) {
  if (!reportData) return;
  const { profile, homework, filters } = reportData;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const addHeading = createSectionHeaderAdder(doc);

  let currentY = await drawInstitutionalHeader(
    doc,
    'Official Student Homework Completion Report',
    filters?.label || 'Full History'
  );

  // 1. Student Identity Details
  currentY = addHeading('1. Student Identity & Batch Profile', currentY);
  currentY = renderStudentIdentityTable(doc, profile, currentY);

  // 2. Homework Summary Highlights
  currentY = addHeading('2. Homework Completion & Study Statistics', currentY);
  const summary = homework?.summary || {};
  const kpiRows = [
    [
      'Overall Completion Rate',
      `${summary.completionRate || 0}%`,
      summary.completionRate >= 85 ? 'Exemplary Work Ethic' : summary.completionRate >= 70 ? 'Satisfactory Submission' : 'Requires Homework Follow-Up'
    ],
    ['Completed / Submitted', `${summary.completedHomework || 0} Tasks`, 'Assignments finished and verified by faculty'],
    ['Pending / Incomplete', `${summary.pendingHomework || 0} Tasks`, 'Tasks overdue or marked incomplete'],
    ['Other / Partial', `${summary.other || 0} Tasks`, 'Assignments under review or partial credit'],
    ['Average Daily Duration', `${summary.averageCompletionTime || 0} min`, 'Average time spent per homework assignment'],
    ['Total Assigned Tasks', `${summary.totalHomework || 0} Tasks`, 'Total assignments issued in evaluated timeframe']
  ];

  runAutoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Homework Metric', 'Value', 'Institutional Context']],
    body: kpiRows,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 140 }, 1: { fontStyle: 'bold', halign: 'center', cellWidth: 100 } }
  });
  currentY = doc.lastAutoTable.finalY + 14;

  // Chart snapshot if present
  if (chartImage) {
    try {
      if (currentY + 120 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }
      doc.addImage(chartImage, 'PNG', pageWidth / 2 - 110, currentY, 220, 110);
      currentY += 120;
    } catch {
      // ignore
    }
  }

  // 3. Subject-Wise Homework Breakdown Table
  const rows = homework?.rows || [];
  const subMap = {};
  rows.forEach((r) => {
    const subject = r.subject || 'Unspecified';
    if (!subMap[subject]) {
      subMap[subject] = { total: 0, completed: 0, pending: 0, durations: [] };
    }
    const statusStr = r.finalStatus || r.status || '';
    subMap[subject].total += 1;
    if (HW_COMPLETED_RE.test(statusStr)) subMap[subject].completed += 1;
    if (HW_PENDING_RE.test(statusStr)) subMap[subject].pending += 1;
    const dur = Number(r.durationMin) || 0;
    if (dur > 0) subMap[subject].durations.push(dur);
  });

  const subjectList = Object.keys(subMap)
    .map((subject) => {
      const s = subMap[subject];
      const other = Math.max(s.total - s.completed - s.pending, 0);
      return {
        subject,
        total: s.total,
        completed: s.completed,
        pending: s.pending,
        other,
        averageDuration: s.durations.length
          ? Number((s.durations.reduce((a, b) => a + b, 0) / s.durations.length).toFixed(1))
          : 0,
        completionRate: s.total ? Number(((s.completed / s.total) * 100).toFixed(1)) : 0
      };
    })
    .sort((a, b) => b.total - a.total);

  if (subjectList.length > 0) {
    currentY = addHeading('3. Subject-Wise Homework Completion Breakdown', currentY);
    const subTableRows = subjectList.map((s) => [
      s.subject,
      `${s.completionRate}%`,
      String(s.completed),
      String(s.pending),
      s.averageDuration ? `${s.averageDuration} min` : '-',
      String(s.total)
    ]);

    runAutoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Subject', 'Completion %', 'Done', 'Pending', 'Avg Time', 'Total Tasks']],
      body: subTableRows,
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3.5, halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 140 }, 1: { fontStyle: 'bold', textColor: [37, 99, 235] } }
    });
    currentY = doc.lastAutoTable.finalY + 14;
  }

  // 4. Detailed Day-by-Day Homework Task Log
  currentY = addHeading('4. Complete Homework Submission Register', currentY);
  const hwLogRows = (rows || []).slice(0, 50).map((r) => {
    const statusStr = r.finalStatus || r.status || '-';
    let statusColor = [71, 85, 105];
    if (HW_COMPLETED_RE.test(statusStr)) statusColor = [22, 163, 74];
    else if (HW_PENDING_RE.test(statusStr)) statusColor = [220, 38, 38];

    return [
      r.date || '-',
      r.subject || '-',
      { content: statusStr, styles: { fontStyle: 'bold', textColor: statusColor, halign: 'center' } },
      r.durationMin ? `${r.durationMin} min` : '-',
      r.teacherName || '-'
    ];
  });

  runAutoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Date', 'Subject', 'Submission Status', 'Duration', 'Faculty In-Charge']],
    body: hwLogRows.length ? hwLogRows : [['No homework assignments for selected period.', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.8, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 120, fontStyle: 'bold' }, 2: { cellWidth: 90 }, 3: { cellWidth: 70, halign: 'center' } }
  });
  currentY = doc.lastAutoTable.finalY + 16;

  // 5. Sign-off and message
  currentY = renderInstitutionalSignoff(doc, currentY);

  // 6. Page footers
  renderPageFooters(doc, 'Official Student Homework Report');

  const fileName = `The_Prime_Classes_Homework_Report_${profile.studentName.replace(/[^a-zA-Z0-9]/g, '_')}_${profile.studentId}.pdf`;
  doc.save(fileName);
}
