import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDatabase, query, getDbType } from './db.js';
import { runFullInboundSync, startPeriodicSync, getSyncStatus, submitStudentComplaint } from './syncEngine.js';
import { generateStudentReportPDF } from './pdfGenerator.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (!req.path.startsWith('/health')) {
      console.log(`${req.method} ${req.path} ${res.statusCode} - ${Date.now() - start}ms`);
    }
  });
  next();
});

// --- Date & Parsing Utility Functions ---
function cleanText(val) {
  return val === null || val === undefined ? '' : String(val).trim();
}

function normalizeComparable(val) {
  return cleanText(val).toLowerCase();
}

function round(val, decimals = 1) {
  const p = Math.pow(10, decimals);
  return Math.round((Number(val) || 0) * p) / p;
}

function parseDateKey(val) {
  if (!val) return 0;
  const str = String(val).trim();
  // Check YYYY-MM-DD
  const m1 = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m1) {
    return Number(m1[1]) * 10000 + Number(m1[2]) * 100 + Number(m1[3]);
  }
  // Check DD MMM YYYY or DD/MM/YYYY
  const dateObj = new Date(str);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.getFullYear() * 10000 + (dateObj.getMonth() + 1) * 100 + dateObj.getDate();
  }
  return 0;
}

function isDateInRange(val, startKey, endKey) {
  if (!startKey && !endKey) return true;
  const k = parseDateKey(val);
  if (!k) return true;
  if (startKey && k < startKey) return false;
  if (endKey && k > endKey) return false;
  return true;
}

// Attendance regex
function isPresent(val) {
  return /(present|attend|late|p$|p\s)/i.test(normalizeComparable(val));
}
function isAbsent(val) {
  return /(absent|leave|miss|a$|a\s)/i.test(normalizeComparable(val));
}

// Homework regex
function isCompletedHw(val) {
  return /(complete|completed|done|submitted|checked|resolved)/i.test(normalizeComparable(val));
}
function isPendingHw(val) {
  return /(pending|incomplete|due|missing|notdone|open)/i.test(normalizeComparable(val));
}

// --- API Endpoints ---

/**
 * 1. Health Check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    db: getDbType(),
    sync: getSyncStatus()
  });
});

/**
 * 2. Faculty Authentication (Employee ID)
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const rawId = cleanText(req.body.employeeId);
    if (!rawId) {
      return res.status(400).json({ error: 'EmployeeID is required.' });
    }

    // Check prime_employees first, then fallback to employees if available
    let rows = [];
    try {
      const res = await query(
        'SELECT employee_id, name, department, role, email, contact, status FROM prime_employees WHERE LOWER(employee_id) = LOWER($1)',
        [rawId]
      );
      rows = res.rows;
    } catch {
      // ignore
    }

    if (!rows.length) {
      try {
        const res = await query(
          'SELECT "employeeId" as employee_id, name, department, role, contact, status FROM employees WHERE LOWER("employeeId") = LOWER($1) OR LOWER(emp_id) = LOWER($1)',
          [rawId]
        );
        rows = res.rows;
      } catch {
        // ignore
      }
    }

    if (!rows.length) {
      return res.status(404).json({ error: `EmployeeID "${rawId}" not found in faculty records.` });
    }

    const emp = rows[0];
    if (normalizeComparable(emp.status) !== 'active') {
      return res.status(403).json({ error: 'This employee account is not active. Please contact administrator.' });
    }

    return res.json({
      success: true,
      employee: {
        employeeId: emp.employee_id,
        name: emp.name || 'Faculty Member',
        department: emp.department || 'Academic',
        role: emp.role || 'Teacher',
        email: emp.email || '',
        contact: emp.contact || ''
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Authentication error.' });
  }
});

/**
 * 3. Student Search (Sub-50ms fuzzy matching by ID or Name)
 */
app.get('/api/students/search', async (req, res) => {
  try {
    const q = cleanText(req.query.q);
    if (!q) {
      return res.json({ query: '', results: [] });
    }

    const lowerQ = `%${q.toLowerCase()}%`;
    const exactQ = q.toLowerCase();

    const { rows } = await query(`
      SELECT student_id, student_name, father_name, batch, class_name, school, mobile, program, dob
      FROM students
      WHERE LOWER(student_id) LIKE $1 OR LOWER(student_name) LIKE $1
      ORDER BY
        CASE
          WHEN LOWER(student_id) = $2 THEN 1
          WHEN LOWER(student_name) = $2 THEN 2
          WHEN LOWER(student_id) LIKE $3 THEN 3
          ELSE 4
        END,
        student_name ASC
      LIMIT 25
    `, [lowerQ, exactQ, `${exactQ}%`]);

    const results = rows.map(r => ({
      studentId: r.student_id,
      studentName: r.student_name,
      fatherName: r.father_name,
      batch: r.batch,
      className: r.class_name,
      school: r.school,
      mobile: r.mobile,
      program: r.program,
      dob: r.dob
    }));

    res.json({ query: q, results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. Complete Student Report Bundle
 */
app.get('/api/students/:id/report', async (req, res) => {
  try {
    const studentId = cleanText(req.params.id);
    const startDate = cleanText(req.query.startDate);
    const endDate = cleanText(req.query.endDate);

    const startKey = startDate ? parseDateKey(startDate) : 0;
    const endKey = endDate ? parseDateKey(endDate) : 0;

    // 1. Fetch Student Profile
    const studentRes = await query(
      'SELECT * FROM students WHERE LOWER(student_id) = LOWER($1)',
      [studentId]
    );

    if (!studentRes.rows.length) {
      return res.status(404).json({ error: `Student not found for ID: ${studentId}` });
    }

    const studentRecord = studentRes.rows[0];

    // 2. Fetch Batch Context
    let batchContext = null;
    if (studentRecord.batch) {
      const batchRes = await query(
        'SELECT * FROM batches WHERE LOWER(batch_name) = LOWER($1)',
        [studentRecord.batch]
      );
      if (batchRes.rows.length) {
        const b = batchRes.rows[0];
        let subjects = [];
        try {
          subjects = JSON.parse(b.subjects_offered || '[]');
        } catch {
          subjects = (b.subjects_offered || '').split(',').map(s => s.trim()).filter(Boolean);
        }
        batchContext = {
          batchName: b.batch_name,
          classRoom: b.classroom || '-',
          writingClass: b.writing_class || '-',
          actualClass: b.actual_class || '-',
          subjectsOffered: subjects
        };
      }
    }

    const profile = {
      studentId: studentRecord.student_id,
      studentName: studentRecord.student_name,
      fatherName: studentRecord.father_name || '-',
      batch: studentRecord.batch || '-',
      className: studentRecord.class_name || '-',
      school: studentRecord.school || '-',
      mobile: studentRecord.mobile || '-',
      email: studentRecord.email || '-',
      program: studentRecord.program || '-',
      dob: studentRecord.dob || '-',
      batchContext
    };

    // 3. Attendance
    const attRes = await query(
      'SELECT date, batch, presence_type, teacher_id, teacher_name, call_reason FROM attendance WHERE LOWER(student_id) = LOWER($1)',
      [studentId]
    );

    const filteredAtt = attRes.rows.filter(r => isDateInRange(r.date, startKey, endKey));
    filteredAtt.sort((a, b) => parseDateKey(b.date) - parseDateKey(a.date));

    const totalClasses = filteredAtt.length;
    const present = filteredAtt.filter(r => isPresent(r.presence_type)).length;
    const absent = filteredAtt.filter(r => isAbsent(r.presence_type)).length;
    const otherAtt = Math.max(totalClasses - present - absent, 0);
    const attendancePercentage = totalClasses ? round((present / totalClasses) * 100, 1) : 0;

    const attendance = {
      summary: {
        totalClasses,
        present,
        absent,
        other: otherAtt,
        attendancePercentage
      },
      chart: {
        labels: ['Present', 'Absent', 'Other'],
        data: [present, absent, otherAtt]
      },
      rows: filteredAtt.map(r => ({
        date: r.date || '-',
        batch: r.batch || '-',
        presenceType: r.presence_type || '-',
        teacherId: r.teacher_id || '-',
        teacherName: r.teacher_name || '-',
        callReason: r.call_reason || '-'
      }))
    };

    // 4. Homework
    const hwRes = await query(
      'SELECT date, subject, status, final_status, duration_min, teacher_id, teacher_name, start_time, end_time FROM homework WHERE LOWER(student_id) = LOWER($1)',
      [studentId]
    );

    const filteredHw = hwRes.rows.filter(r => isDateInRange(r.date, startKey, endKey));
    filteredHw.sort((a, b) => parseDateKey(b.date) - parseDateKey(a.date));

    const totalHomework = filteredHw.length;
    const completedHomework = filteredHw.filter(r => isCompletedHw(r.final_status || r.status)).length;
    const pendingHomework = filteredHw.filter(r => isPendingHw(r.final_status || r.status)).length;
    const otherHw = Math.max(totalHomework - completedHomework - pendingHomework, 0);
    const completionRate = totalHomework ? round((completedHomework / totalHomework) * 100, 1) : 0;

    const validDurations = filteredHw.map(r => Number(r.duration_min) || 0).filter(v => v > 0);
    const averageCompletionTime = validDurations.length
      ? round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length, 1)
      : 0;

    const homework = {
      summary: {
        totalHomework,
        completedHomework,
        pendingHomework,
        other: otherHw,
        completionRate,
        averageCompletionTime
      },
      chart: {
        labels: ['Completed', 'Pending', 'Other'],
        data: [completedHomework, pendingHomework, otherHw]
      },
      rows: filteredHw.map(r => ({
        date: r.date || '-',
        subject: r.subject || '-',
        status: r.status || '-',
        finalStatus: r.final_status || '-',
        durationMin: r.duration_min || 0,
        teacherId: r.teacher_id || '-',
        teacherName: r.teacher_name || '-',
        startTime: r.start_time || '',
        endTime: r.end_time || ''
      }))
    };

    // 5. Exam Results
    const examRes = await query(
      'SELECT test_id, exam_date, batch_name, exam_type, student_id, rank, total_obtained_marks, exam_total_max_marks, subject_name, subject_obtained_marks, subject_max_marks FROM exam_results WHERE LOWER(student_id) = LOWER($1)',
      [studentId]
    );

    const filteredExams = examRes.rows.filter(r => isDateInRange(r.exam_date, startKey, endKey));

    const testsByKey = {};
    const subjectMap = {};

    filteredExams.forEach(r => {
      const testKey = [r.test_id, r.exam_date, r.exam_type, r.batch_name].map(s => cleanText(s)).join('::');
      const subject = r.subject_name || 'Unknown Subject';
      const obtained = Number(r.subject_obtained_marks) || 0;
      const maxMarks = Number(r.subject_max_marks) || 0;
      const totalObtained = Number(r.total_obtained_marks) || 0;
      const totalMax = Number(r.exam_total_max_marks) || 0;
      const rank = Number(r.rank) || null;

      if (!testsByKey[testKey]) {
        testsByKey[testKey] = {
          testId: r.test_id || testKey,
          examDate: r.exam_date || '-',
          examType: r.exam_type || '-',
          batchName: r.batch_name || '-',
          totalObtained,
          totalMax,
          rank,
          subjects: []
        };
      }

      if (!testsByKey[testKey].totalObtained && totalObtained) testsByKey[testKey].totalObtained = totalObtained;
      if (!testsByKey[testKey].totalMax && totalMax) testsByKey[testKey].totalMax = totalMax;
      if (!testsByKey[testKey].rank && rank) testsByKey[testKey].rank = rank;

      testsByKey[testKey].subjects.push({
        subjectName: subject,
        subjectObtainedMarks: obtained,
        subjectMaxMarks: maxMarks
      });

      if (!subjectMap[subject]) {
        subjectMap[subject] = { obtained: 0, maxMarks: 0, count: 0 };
      }
      subjectMap[subject].obtained += obtained;
      subjectMap[subject].maxMarks += maxMarks;
      subjectMap[subject].count += 1;
    });

    const testRows = Object.values(testsByKey).map(test => ({
      testId: test.testId,
      examDate: test.examDate,
      examType: test.examType,
      batchName: test.batchName,
      totalObtainedMarks: test.totalObtained || 0,
      examTotalMaxMarks: test.totalMax || 0,
      percentage: test.totalMax ? round((test.totalObtained / test.totalMax) * 100, 1) : 0,
      rank: test.rank,
      subjects: test.subjects
    }));

    testRows.sort((a, b) => parseDateKey(a.examDate) - parseDateKey(b.examDate));

    const totalTests = testRows.length;
    const allMarks = testRows.map(r => r.totalObtainedMarks || 0);
    const averageMarks = allMarks.length ? round(allMarks.reduce((a, b) => a + b, 0) / allMarks.length, 1) : 0;
    const highestScore = allMarks.length ? Math.max(...allMarks) : 0;
    const lowestScore = allMarks.length ? Math.min(...allMarks) : 0;

    const allPercentages = testRows.map(r => r.percentage || 0);
    const averagePercentage = allPercentages.length
      ? round(allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length, 1)
      : 0;

    const subjectWise = Object.keys(subjectMap).map(subName => {
      const stats = subjectMap[subName];
      const percentage = stats.maxMarks ? round((stats.obtained / stats.maxMarks) * 100, 1) : 0;
      let status = 'Average';
      if (percentage >= 80) status = 'Strong';
      else if (percentage < 50) status = 'Weak';

      return {
        subjectName: subName,
        averageObtainedMarks: round(stats.obtained / stats.count, 1),
        averageMaxMarks: round(stats.maxMarks / stats.count, 1),
        percentage,
        status
      };
    });

    const trend = testRows.map(r => ({
      label: r.examDate !== '-' ? r.examDate : r.testId,
      marks: r.totalObtainedMarks || 0,
      maxMarks: r.examTotalMaxMarks || 0,
      percentage: r.percentage || 0,
      rank: r.rank || null
    }));

    const results = {
      summary: {
        totalTests,
        averageMarks,
        averagePercentage,
        highestScore,
        lowestScore
      },
      subjectWise,
      trend,
      rows: testRows
    };

    // 6. Complaints
    const compRes = await query(
      'SELECT complaint_id, date, teacher_name, teacher_employee_id, department, student_name, student_id, batch, complaint_text, status, pdf_link, submitted_at FROM complaints WHERE LOWER(student_id) = LOWER($1)',
      [studentId]
    );

    const filteredComplaints = compRes.rows.filter(r => isDateInRange(r.date, startKey, endKey));
    filteredComplaints.sort((a, b) => parseDateKey(b.date) - parseDateKey(a.date));

    const complaints = {
      summary: {
        complaintCount: filteredComplaints.length
      },
      rows: filteredComplaints.map(c => ({
        complaintId: c.complaint_id,
        date: c.date || '-',
        teacherName: c.teacher_name || '-',
        teacherEmployeeId: c.teacher_employee_id || '-',
        department: c.department || '-',
        studentName: c.student_name || '-',
        studentId: c.student_id || '-',
        batch: c.batch || '-',
        complaintText: c.complaint_text || '-',
        status: c.status || '-',
        pdfLink: c.pdf_link || '',
        submittedAt: c.submitted_at || '-'
      }))
    };

    const filters = {
      isFiltered: Boolean(startKey && endKey),
      label: (startKey && endKey) ? `${startDate} to ${endDate}` : 'Full History',
      startDate,
      endDate
    };

    res.json({
      generatedAt: new Date().toISOString(),
      filters,
      profile,
      attendance,
      homework,
      results,
      complaints
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5. Submit Complaint (Outbox Sync)
 */
app.post('/api/students/:id/complaint', async (req, res) => {
  try {
    const studentId = cleanText(req.params.id);
    const { complaintText, teacherName, teacherEmployeeId, department, status, batch, studentName, date } = req.body;

    if (!complaintText || !complaintText.trim()) {
      return res.status(400).json({ error: 'Complaint text is required.' });
    }

    const complaint = await submitStudentComplaint({
      studentId,
      studentName,
      batch,
      teacherName,
      teacherEmployeeId,
      department,
      complaintText,
      status: status || 'Pending',
      date
    });

    res.json({ success: true, complaint });
  } catch (err) {
    console.error('Complaint submit error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 6. Generate & Stream Branded PDF Report Card
 */
app.post('/api/students/:id/pdf', async (req, res) => {
  try {
    const studentId = cleanText(req.params.id);
    const { reportBundle, teacher } = req.body;

    let bundle = reportBundle;
    if (!bundle) {
      // If client did not supply bundle, fetch it internally
      const mockReq = { params: { id: studentId }, query: {} };
      let fetchedData = null;
      // We can directly call the report logic:
      const studentRes = await query('SELECT * FROM students WHERE LOWER(student_id) = LOWER($1)', [studentId]);
      if (!studentRes.rows.length) {
        return res.status(404).json({ error: 'Student not found.' });
      }
      return res.status(400).json({ error: 'Please supply reportBundle in request body.' });
    }

    const pdfBuffer = generateStudentReportPDF(bundle, teacher || {});
    const filename = `The_Prime_Student_Report_${studentId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF Generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 7. Sync Status & Trigger
 */
app.get('/api/sync/status', (req, res) => {
  res.json(getSyncStatus());
});

app.post('/api/sync/trigger', async (req, res) => {
  try {
    const result = await runFullInboundSync();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Static Frontend Serving for Render Unified Deployment ---
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  console.log(`Serving static production build from ${distPath}`);
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// --- Server Bootstrap ---
async function startServer() {
  try {
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`The Prime Classes Dashboard server listening on port ${PORT}`);
      console.log(`Database Mode: ${getDbType()}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start background sync automatically
    startPeriodicSync(15);

    // Run initial sync asynchronously (non-blocking)
    setTimeout(() => {
      console.log('Initiating initial Google Sheets inbound sync in background...');
      runFullInboundSync().catch(err => console.error('Initial sync notice:', err.message));
    }, 1000);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
