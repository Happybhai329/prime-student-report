import { jsPDF } from 'jspdf';
import autoTablePlugin from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const autoTable = typeof autoTablePlugin === 'function' 
  ? autoTablePlugin 
  : (typeof autoTablePlugin.default === 'function' 
      ? autoTablePlugin.default 
      : (typeof autoTablePlugin.default?.default === 'function' 
          ? autoTablePlugin.default.default 
          : autoTablePlugin.applyPlugin));

/**
 * Generate high-resolution, branded official Institutional PDF Report Card buffer
 * @param {Object} reportBundle - Full student report data
 * @param {Object} teacher - Active faculty details
 * @returns {Buffer} PDF binary buffer
 */
export function generateStudentReportPDF(reportBundle, teacher = {}, options = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  const profile = reportBundle.profile || {};
  const attendance = reportBundle.attendance || { summary: {}, rows: [] };
  const homework = reportBundle.homework || { summary: {}, rows: [] };
  const results = reportBundle.results || { summary: {}, subjectWise: [], rows: [] };
  const complaints = reportBundle.complaints || { summary: {}, rows: [] };
  const filterLabel = (reportBundle.filters && reportBundle.filters.label) || 'Full History';
  const selectedExamType = (options.examType || reportBundle.selectedExamType || 'ALL').trim();

  const allExamRows = results.rows || [];
  const targetExamRows = selectedExamType === 'ALL'
    ? allExamRows
    : allExamRows.filter(r => (r.examType || '').trim() === selectedExamType);

  const count = targetExamRows.length;
  const pcts = targetExamRows.map(r => Number(r.percentage) || 0);
  const marks = targetExamRows.map(r => Number(r.totalObtainedMarks) || 0);
  const maxs = targetExamRows.map(r => Number(r.examTotalMaxMarks) || 0);
  const uniqueMaxs = new Set(maxs.filter(m => m > 0));

  const avgPercentage = count ? Number((pcts.reduce((a, b) => a + b, 0) / count).toFixed(1)) : 0;
  const highestPercentage = count ? Math.max(...pcts) : 0;
  const lowestPercentage = count ? Math.min(...pcts) : 0;

  const avgMarks = count ? Number((marks.reduce((a, b) => a + b, 0) / count).toFixed(1)) : 0;
  const referenceMax = uniqueMaxs.size === 1 ? Array.from(uniqueMaxs)[0] : (maxs.length ? Number((maxs.reduce((a, b) => a + b, 0) / count).toFixed(1)) : 0);
  const highestScore = count ? Math.max(...marks) : 0;
  const lowestScore = count ? Math.min(...marks) : 0;

  let currentY = margin;

  // --- Top Decorative Brand Accent Bands ---
  doc.setFillColor(107, 33, 168); // #6b21a8 TPC Purple
  doc.rect(0, 0, pageWidth, 7, 'F');
  doc.setFillColor(22, 163, 74); // #16a34a TPC Green
  doc.rect(0, 7, pageWidth, 3, 'F');

  // --- Official Logo Embedding ---
  const logoPath = path.join(__dirname, 'assets/tpc-logo.jpg');
  let hasLogo = false;
  const logoSize = 54;

  if (fs.existsSync(logoPath)) {
    try {
      const logoBase64 = fs.readFileSync(logoPath).toString('base64');
      doc.addImage(`data:image/jpeg;base64,${logoBase64}`, 'JPEG', margin, currentY, logoSize, logoSize);
      hasLogo = true;
    } catch (e) {
      console.warn('Could not read logo image:', e.message);
    }
  }

  // --- Header & Institutional Typography ---
  const textStartX = hasLogo ? margin + logoSize + 14 : margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text('THE PRIME CLASSES', textStartX, currentY + 16);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(107, 33, 168);
  doc.text('RIMC  |  RMS  |  SAINIK SCHOOL  |  FOUNDATION', textStartX, currentY + 31);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('OFFICIAL STUDENT ACADEMIC & DISCIPLINARY REPORT CARD', textStartX, currentY + 46);

  currentY += 66;

  // --- Metadata Banner Box ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 22, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const facultyName = teacher.name ? `${teacher.name} (${teacher.employeeId || 'Faculty'})` : 'Academic Evaluation Cell';
  doc.text(
    `Issued Date: ${genDate}    |    Issued By: ${facultyName}    |    Report Period: ${filterLabel}`,
    pageWidth / 2,
    currentY + 14,
    { align: 'center' }
  );

  currentY += 30;

  // Section Header Helper
  function addSectionHeader(title) {
    if (currentY > pageHeight - 75) {
      doc.addPage();
      currentY = margin;
    }
    doc.setFillColor(245, 243, 255); // #f5f3ff
    doc.setDrawColor(221, 214, 254);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 20, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(107, 33, 168);
    doc.text(title.toUpperCase(), margin + 10, currentY + 14);
    currentY += 26;
  }

  // --- Section 1: Student Profile & Academic Details ---
  addSectionHeader('1. Student Identity & Academic Profile');

  const profileRows = [
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
      { content: 'Contact Mobile:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
      String(profile.mobile || '-').replace(/[[\]"\\]/g, ''),
      { content: 'Program Stream:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
      profile.program || 'RIMC / Sainik School Foundation'
    ]
  ];

  if (profile.batchContext) {
    profileRows.push([
      { content: 'Classroom / Subs:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
      `${profile.batchContext.classRoom || '-'} | ${(profile.batchContext.subjectsOffered || []).join(', ') || '-'}`,
      { content: 'Writing / Actual:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
      `${profile.batchContext.writingClass || '-'} / ${profile.batchContext.actualClass || '-'}`
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    body: profileRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 155 },
      2: { cellWidth: 100 },
      3: { cellWidth: 155 }
    }
  });

  currentY = doc.lastAutoTable.finalY + 14;

  // --- Section 2: Executive Performance Summary ---
  addSectionHeader('2. Key Performance Indicators');

  const attSummary = attendance.summary || {};
  const hwSummary = homework.summary || {};
  const resSummary = results.summary || {};

  const kpiData = [
    [
      'Overall Attendance',
      `${attSummary.attendancePercentage || 0}%`,
      `Present: ${attSummary.present || 0} / Total Classes: ${attSummary.totalClasses || 0}`
    ],
    [
      'Homework Completion Rate',
      `${hwSummary.completionRate || 0}%`,
      `Completed: ${hwSummary.completedHomework || 0} / Total Tasks: ${hwSummary.totalHomework || 0}`
    ]
  ];

  if (selectedExamType === 'ALL') {
    kpiData.push([
      'Overall Academic Performance',
      `${avgPercentage}%`,
      `Simple Average of Percentages across ${count} exams (all exam types)`
    ]);
    kpiData.push([
      'Percentage Extremes (High / Low)',
      `${highestPercentage}% / ${lowestPercentage}%`,
      `Highest: ${highestPercentage}% | Lowest: ${lowestPercentage}%`
    ]);
  } else {
    kpiData.push([
      `Average Score (${selectedExamType})`,
      referenceMax > 0 ? `${avgMarks} / ${referenceMax}` : `${avgMarks}`,
      `Average %: ${avgPercentage}% across ${count} exams`
    ]);
    kpiData.push([
      'Score Extremes (High / Low)',
      referenceMax > 0 ? `${highestScore} / ${lowestScore}` : `${highestScore} / ${lowestScore}`,
      `Highest: ${highestScore} (${highestPercentage}%) | Lowest: ${lowestScore} (${lowestPercentage}%)`
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Key Indicator', 'Score / Status', 'Details & Context']],
    body: kpiData,
    theme: 'grid',
    headStyles: { fillColor: [107, 33, 168], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 135, fontStyle: 'bold' },
      1: { cellWidth: 90, fontStyle: 'bold', halign: 'center' },
      2: { cellWidth: 285 }
    }
  });

  currentY = doc.lastAutoTable.finalY + 14;

  // --- Section 3: Subject-Wise Strength & Weakness Analysis ---
  const subjectSectionTitle = selectedExamType === 'ALL'
    ? '3. Subject-Wise Strength & Weakness Analysis'
    : `3. Subject-Wise Strength & Weakness Analysis (${selectedExamType})`;
  addSectionHeader(subjectSectionTitle);

  let activeSubjectWise = results.subjectWise || [];
  if (selectedExamType !== 'ALL') {
    const subMap = {};
    targetExamRows.forEach(test => {
      (test.subjects || []).forEach(s => {
        if (!s.subjectName) return;
        if (!subMap[s.subjectName]) {
          subMap[s.subjectName] = { obtained: 0, maxMarks: 0, count: 0 };
        }
        subMap[s.subjectName].obtained += Number(s.subjectObtainedMarks) || 0;
        subMap[s.subjectName].maxMarks += Number(s.subjectMaxMarks) || 0;
        subMap[s.subjectName].count += 1;
      });
    });
    if (Object.keys(subMap).length > 0) {
      activeSubjectWise = Object.keys(subMap).map(subName => {
        const stats = subMap[subName];
        const pct = stats.maxMarks > 0 ? Number(((stats.obtained / stats.maxMarks) * 100).toFixed(1)) : 0;
        let status = 'Average';
        if (pct >= 80) status = 'Strong';
        else if (pct < 50) status = 'Weak';
        return {
          subjectName: subName,
          averageObtainedMarks: Number((stats.obtained / stats.count).toFixed(1)),
          averageMaxMarks: Number((stats.maxMarks / stats.count).toFixed(1)),
          percentage: pct,
          status
        };
      });
    }
  }

  const subjectRows = activeSubjectWise.map(row => {
    let statusColor = [217, 119, 6]; // Amber
    if (row.percentage >= 80) {
      statusColor = [22, 163, 74]; // Green
    } else if (row.percentage < 50) {
      statusColor = [220, 38, 38]; // Red
    }

    return [
      row.subjectName,
      String(row.averageObtainedMarks),
      String(row.averageMaxMarks),
      `${row.percentage}%`,
      {
        content: row.status,
        styles: { fontStyle: 'bold', textColor: statusColor, halign: 'center' }
      }
    ];
  });

  if (subjectRows.length === 0) {
    subjectRows.push(['No subject test data recorded', '-', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Subject Name', 'Avg Obtained', 'Avg Max Marks', 'Percentage (%)', 'Assessment Status']],
    body: subjectRows,
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 4, halign: 'center' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 150 },
      1: { cellWidth: 90 },
      2: { cellWidth: 90 },
      3: { cellWidth: 90 },
      4: { cellWidth: 90 }
    }
  });

  currentY = doc.lastAutoTable.finalY + 14;

  // Check page break for next sections
  if (currentY > pageHeight - 120) {
    doc.addPage();
    currentY = margin;
  }

  // --- Section 4: Detailed Exam Records ---
  const examSectionTitle = selectedExamType === 'ALL'
    ? '4. Detailed Examination History'
    : `4. Detailed Examination History (${selectedExamType})`;
  addSectionHeader(examSectionTitle);

  const examRows = (targetExamRows || []).slice(0, 15).map(r => [
    r.examDate || '-',
    r.testId || '-',
    r.examType || '-',
    String(r.totalObtainedMarks || 0),
    String(r.examTotalMaxMarks || 0),
    `${r.percentage || 0}%`,
    r.rank ? `#${r.rank}` : '-'
  ]);

  if (examRows.length === 0) {
    examRows.push(['No exams recorded', '-', '-', '-', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Date', 'Test ID', 'Exam Type', 'Marks', 'Max Marks', '%', 'Rank']],
    body: examRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3.5, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 75 },
      1: { cellWidth: 110, halign: 'left' },
      2: { cellWidth: 110, halign: 'left' },
      3: { cellWidth: 55 },
      4: { cellWidth: 55 },
      5: { cellWidth: 55 },
      6: { cellWidth: 50 }
    }
  });

  currentY = doc.lastAutoTable.finalY + 14;

  // Check page break for complaints
  if (currentY > pageHeight - 100) {
    doc.addPage();
    currentY = margin;
  }

  // --- Section 5: Complaints & Remarks ---
  addSectionHeader(`5. Faculty Feedback & Disciplinary Remarks (${complaints.summary.complaintCount || 0})`);

  const complaintRows = (complaints.rows || []).slice(0, 8).map(c => [
    c.date || '-',
    c.teacherName || '-',
    c.status || 'Pending',
    c.complaintText || '-'
  ]);

  if (complaintRows.length === 0) {
    complaintRows.push(['No disciplinary observations or remarks on record.', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Date', 'Faculty Name', 'Status', 'Feedback / Observation Details']],
    body: complaintRows,
    theme: 'striped',
    headStyles: { fillColor: [148, 163, 184], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 75 },
      1: { cellWidth: 110 },
      2: { cellWidth: 70, halign: 'center' },
      3: { cellWidth: 255 }
    }
  });

  currentY = doc.lastAutoTable.finalY + 24;



  // Footer on all pages
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

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
