import { query } from './db.js';

// Cache for batch reports (TTL: 60 seconds)
const batchReportCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

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
  const m1 = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m1) {
    return Number(m1[1]) * 10000 + Number(m1[2]) * 100 + Number(m1[3]);
  }
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

function isPresent(val) {
  return /(present|attend|late|p$|p\s)/i.test(normalizeComparable(val));
}

function isAbsent(val) {
  return /(absent|leave|miss|a$|a\s)/i.test(normalizeComparable(val));
}

function isCompletedHw(val) {
  return /(complete|completed|done|submitted|checked|resolved)/i.test(normalizeComparable(val));
}

function isPendingHw(val) {
  return /(pending|incomplete|due|missing|notdone|open|absent|forget)/i.test(normalizeComparable(val));
}

/**
 * Get distinct list of batches with student counts
 */
export async function getBatchesList() {
  const res = await query(`
    SELECT 
      b.batch,
      COUNT(DISTINCT s.student_id) as student_count
    FROM (
      SELECT DISTINCT batch FROM students WHERE batch IS NOT NULL AND TRIM(batch) != ''
      UNION
      SELECT DISTINCT batch FROM attendance WHERE batch IS NOT NULL AND TRIM(batch) != ''
      UNION
      SELECT DISTINCT batch FROM homework WHERE batch IS NOT NULL AND TRIM(batch) != ''
    ) b
    LEFT JOIN students s ON LOWER(TRIM(s.batch)) = LOWER(TRIM(b.batch))
    GROUP BY b.batch
    ORDER BY student_count DESC, b.batch ASC
  `);

  return res.rows.map(r => ({
    batch: r.batch,
    studentCount: parseInt(r.student_count || 0, 10)
  }));
}

/**
 * Get detailed Batch Report for Attendance, Homework, and Students
 */
export async function getBatchReport(batchName, { startDate = '', endDate = '' } = {}) {
  const cleanBatch = cleanText(batchName);
  if (!cleanBatch) {
    throw new Error('Batch name is required');
  }

  const startKey = parseDateKey(startDate);
  const endKey = parseDateKey(endDate);
  const cacheKey = `${cleanBatch.toLowerCase()}_${startKey}_${endKey}`;

  const cached = batchReportCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  // 1. Fetch Students in batch, Batch Context, Attendance, and Homework in parallel
  const [studentsRes, batchInfoRes, attRes, hwRes] = await Promise.all([
    query(`
      SELECT student_id, student_name, batch, class_name, mobile, father_name, school, program 
      FROM students 
      WHERE LOWER(TRIM(batch)) = LOWER(TRIM($1))
      ORDER BY student_name ASC
    `, [cleanBatch]),
    query(`
      SELECT batch_name, classroom, writing_class, actual_class, subjects_offered 
      FROM batches 
      WHERE LOWER(TRIM(batch_name)) = LOWER(TRIM($1))
    `, [cleanBatch]),
    query(`
      SELECT student_id, date, batch, presence_type, teacher_name, call_reason 
      FROM attendance 
      WHERE LOWER(TRIM(batch)) = LOWER(TRIM($1))
    `, [cleanBatch]),
    query(`
      SELECT student_id, date, batch, subject, status, final_status, duration_min, teacher_name 
      FROM homework 
      WHERE LOWER(TRIM(batch)) = LOWER(TRIM($1))
    `, [cleanBatch])
  ]);

  // 2. Build student registry map
  const studentMap = new Map();
  for (const s of studentsRes.rows) {
    studentMap.set(s.student_id, {
      studentId: s.student_id,
      studentName: s.student_name,
      batch: s.batch,
      className: s.class_name || '-',
      mobile: s.mobile || '-',
      fatherName: s.father_name || '-',
      attendance: {
        total: 0,
        present: 0,
        absent: 0,
        other: 0,
        rate: 0
      },
      homework: {
        total: 0,
        completed: 0,
        pending: 0,
        other: 0,
        rate: 0,
        totalDurationMin: 0
      }
    });
  }

  // If there are attendance or homework records for students not yet in studentsRes (e.g. transfer),
  // fetch their names from the students table to avoid "Unknown"
  const missingStudentIds = new Set();
  for (const a of attRes.rows) {
    if (a.student_id && !studentMap.has(a.student_id)) missingStudentIds.add(a.student_id);
  }
  for (const h of hwRes.rows) {
    if (h.student_id && !studentMap.has(h.student_id)) missingStudentIds.add(h.student_id);
  }

  if (missingStudentIds.size > 0) {
    const ids = Array.from(missingStudentIds);
    const missingRes = await query(`
      SELECT student_id, student_name, batch, class_name, mobile, father_name 
      FROM students 
      WHERE student_id = ANY($1)
    `, [ids]);
    for (const s of missingRes.rows) {
      studentMap.set(s.student_id, {
        studentId: s.student_id,
        studentName: s.student_name,
        batch: s.batch || cleanBatch,
        className: s.class_name || '-',
        mobile: s.mobile || '-',
        fatherName: s.father_name || '-',
        attendance: { total: 0, present: 0, absent: 0, other: 0, rate: 0 },
        homework: { total: 0, completed: 0, pending: 0, other: 0, rate: 0, totalDurationMin: 0 }
      });
    }
  }

  // 3. Process Attendance Records with date filter
  let totalAttRecords = 0;
  let totalAttPresent = 0;
  let totalAttAbsent = 0;
  let totalAttOther = 0;
  const attDateSet = new Set();

  for (const a of attRes.rows) {
    if (!isDateInRange(a.date, startKey, endKey)) continue;

    totalAttRecords++;
    if (a.date) attDateSet.add(a.date);

    let s = studentMap.get(a.student_id);
    if (!s) {
      s = {
        studentId: a.student_id,
        studentName: `Student ${a.student_id}`,
        batch: cleanBatch,
        className: '-',
        mobile: '-',
        fatherName: '-',
        attendance: { total: 0, present: 0, absent: 0, other: 0, rate: 0 },
        homework: { total: 0, completed: 0, pending: 0, other: 0, rate: 0, totalDurationMin: 0 }
      };
      studentMap.set(a.student_id, s);
    }

    s.attendance.total++;
    if (isPresent(a.presence_type)) {
      totalAttPresent++;
      s.attendance.present++;
    } else if (isAbsent(a.presence_type)) {
      totalAttAbsent++;
      s.attendance.absent++;
    } else {
      totalAttOther++;
      s.attendance.other++;
    }
  }

  // 4. Process Homework Records with date filter
  let totalHwRecords = 0;
  let totalHwCompleted = 0;
  let totalHwPending = 0;
  let totalHwOther = 0;
  const hwDateSet = new Set();
  const subjectMap = new Map();

  for (const h of hwRes.rows) {
    if (!isDateInRange(h.date, startKey, endKey)) continue;

    totalHwRecords++;
    if (h.date) hwDateSet.add(h.date);

    let s = studentMap.get(h.student_id);
    if (!s) {
      s = {
        studentId: h.student_id,
        studentName: `Student ${h.student_id}`,
        batch: cleanBatch,
        className: '-',
        mobile: '-',
        fatherName: '-',
        attendance: { total: 0, present: 0, absent: 0, other: 0, rate: 0 },
        homework: { total: 0, completed: 0, pending: 0, other: 0, rate: 0, totalDurationMin: 0 }
      };
      studentMap.set(h.student_id, s);
    }

    s.homework.total++;
    const statusVal = h.final_status || h.status || '';
    const isComp = isCompletedHw(statusVal);
    const isPend = isPendingHw(statusVal);

    if (isComp) {
      totalHwCompleted++;
      s.homework.completed++;
    } else if (isPend) {
      totalHwPending++;
      s.homework.pending++;
    } else {
      totalHwOther++;
      s.homework.other++;
    }

    if (h.duration_min && Number(h.duration_min) > 0) {
      s.homework.totalDurationMin += Number(h.duration_min);
    }

    // Subject breakdown
    const subjName = cleanText(h.subject) || 'GENERAL';
    if (!subjectMap.has(subjName)) {
      subjectMap.set(subjName, { subject: subjName, total: 0, completed: 0, pending: 0, rate: 0 });
    }
    const subj = subjectMap.get(subjName);
    subj.total++;
    if (isComp) subj.completed++;
    else if (isPend) subj.pending++;
  }

  // Calculate subject rates
  const subjects = Array.from(subjectMap.values()).map(subj => ({
    ...subj,
    rate: subj.total ? round((subj.completed / subj.total) * 100, 1) : 0
  })).sort((a, b) => b.total - a.total);

  // 5. Calculate student rates and sort lists
  const allStudents = Array.from(studentMap.values()).map(s => {
    const attRate = s.attendance.total ? round((s.attendance.present / s.attendance.total) * 100, 1) : 0;
    const hwRate = s.homework.total ? round((s.homework.completed / s.homework.total) * 100, 1) : 0;
    const avgDuration = s.homework.completed ? round(s.homework.totalDurationMin / s.homework.completed, 1) : 0;
    return {
      ...s,
      attendance: {
        ...s.attendance,
        rate: attRate
      },
      homework: {
        ...s.homework,
        rate: hwRate,
        avgDuration
      }
    };
  });

  // Students sorted by Attendance Rate (descending)
  const attendanceStudents = [...allStudents].sort((a, b) => {
    if (b.attendance.rate !== a.attendance.rate) return b.attendance.rate - a.attendance.rate;
    return b.attendance.present - a.attendance.present;
  });

  // Students sorted by Homework Completion Rate (descending)
  const homeworkStudents = [...allStudents].sort((a, b) => {
    if (b.homework.rate !== a.homework.rate) return b.homework.rate - a.homework.rate;
    return b.homework.completed - a.homework.completed;
  });

  // Overall calculations
  const overallAttendanceRate = totalAttRecords ? round((totalAttPresent / totalAttRecords) * 100, 1) : 0;
  const overallHomeworkRate = totalHwRecords ? round((totalHwCompleted / totalHwRecords) * 100, 1) : 0;

  // At-risk students (< 75% attendance) and high achievers (>= 85%)
  const highAttendanceStudents = attendanceStudents.filter(s => s.attendance.total > 0 && s.attendance.rate >= 85);
  const atRiskAttendanceStudents = attendanceStudents.filter(s => s.attendance.total > 0 && s.attendance.rate < 75);

  const highHomeworkStudents = homeworkStudents.filter(s => s.homework.total > 0 && s.homework.rate >= 80);
  const atRiskHomeworkStudents = homeworkStudents.filter(s => s.homework.total > 0 && s.homework.rate < 60);

  // Batch Context
  let batchContext = null;
  if (batchInfoRes.rows.length) {
    const b = batchInfoRes.rows[0];
    let offered = [];
    try {
      offered = JSON.parse(b.subjects_offered || '[]');
    } catch {
      offered = (b.subjects_offered || '').split(',').map(x => x.trim()).filter(Boolean);
    }
    batchContext = {
      batchName: b.batch_name,
      classRoom: b.classroom || '-',
      writingClass: b.writing_class || '-',
      actualClass: b.actual_class || '-',
      subjectsOffered: offered
    };
  }

  const data = {
    batch: cleanBatch,
    batchContext,
    enrolledCount: studentsRes.rows.length,
    activeStudentCount: allStudents.length,
    dateRange: {
      startDate: startDate || '',
      endDate: endDate || ''
    },
    attendance: {
      summary: {
        totalRecords: totalAttRecords,
        totalSessions: attDateSet.size,
        present: totalAttPresent,
        absent: totalAttAbsent,
        other: totalAttOther,
        rate: overallAttendanceRate
      },
      chart: {
        labels: ['Present', 'Absent', 'Other'],
        data: [totalAttPresent, totalAttAbsent, totalAttOther]
      },
      highAttendanceCount: highAttendanceStudents.length,
      atRiskCount: atRiskAttendanceStudents.length,
      topStudents: highAttendanceStudents.slice(0, 5),
      atRiskStudents: atRiskAttendanceStudents,
      students: attendanceStudents
    },
    homework: {
      summary: {
        totalAssignments: totalHwRecords,
        totalDates: hwDateSet.size,
        completed: totalHwCompleted,
        pending: totalHwPending,
        other: totalHwOther,
        rate: overallHomeworkRate
      },
      chart: {
        labels: ['Completed', 'Pending', 'Other'],
        data: [totalHwCompleted, totalHwPending, totalHwOther]
      },
      subjects,
      highCompletionCount: highHomeworkStudents.length,
      atRiskCount: atRiskHomeworkStudents.length,
      topStudents: highHomeworkStudents.slice(0, 5),
      atRiskStudents: atRiskHomeworkStudents,
      students: homeworkStudents
    }
  };

  batchReportCache.set(cacheKey, { timestamp: Date.now(), data });
  return data;
}

export function invalidateBatchReportCache() {
  batchReportCache.clear();
}
