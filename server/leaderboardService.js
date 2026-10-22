import { query } from './db.js';

// In-memory cache with 60s TTL
const leaderboardCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

export function invalidateLeaderboardCache() {
  leaderboardCache.clear();
}

/**
 * Clean and normalize text
 */
function clean(str) {
  return str === null || str === undefined ? '' : String(str).trim();
}

function round(val, decimals = 1) {
  const p = Math.pow(10, decimals);
  return Math.round((Number(val) || 0) * p) / p;
}

/**
 * 1. Fetch Filter Metadata (distinct batches, subjects, exam types)
 */
export async function getFiltersMeta() {
  const [batchesRes, subjectsRes, examTypesRes] = await Promise.all([
    query(`SELECT DISTINCT batch FROM students WHERE batch IS NOT NULL AND TRIM(batch) != '' ORDER BY batch ASC`),
    query(`SELECT DISTINCT subject_name FROM exam_results WHERE subject_name IS NOT NULL AND TRIM(subject_name) != '' ORDER BY subject_name ASC`),
    query(`SELECT DISTINCT exam_type FROM exam_results WHERE exam_type IS NOT NULL AND TRIM(exam_type) != '' ORDER BY exam_type ASC`)
  ]);

  return {
    batches: batchesRes.rows.map(r => r.batch).filter(Boolean),
    subjects: subjectsRes.rows.map(r => r.subject_name).filter(Boolean),
    examTypes: ['ALL', ...examTypesRes.rows.map(r => r.exam_type).filter(Boolean)]
  };
}

/**
 * 2. Get Comprehensive Leaderboard Data
 */
export async function getLeaderboardData({
  batch = 'ALL',
  subject = 'ALL',
  startDate = '',
  endDate = '',
  search = '',
  languageMode = 'AUTO'
} = {}) {
  const cacheKey = JSON.stringify({ batch, subject, startDate, endDate, search, languageMode });
  const cached = leaderboardCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  // --- Step 1: Base Students ---
  let studentSql = `
    SELECT student_id, student_name, batch, class_name, mobile, program, dob
    FROM students
    WHERE 1=1
  `;
  const studentParams = [];

  if (batch && batch !== 'ALL') {
    studentParams.push(batch);
    studentSql += ` AND LOWER(TRIM(batch)) = LOWER(TRIM($${studentParams.length}))`;
  }

  if (search && search.trim()) {
    studentParams.push(`%${search.trim().toLowerCase()}%`);
    studentSql += ` AND (LOWER(student_name) LIKE $${studentParams.length} OR LOWER(student_id) LIKE $${studentParams.length})`;
  }

  studentSql += ` ORDER BY student_name ASC`;
  const studentsRes = await query(studentSql, studentParams);
  const students = studentsRes.rows;

  if (students.length === 0) {
    const emptyResult = {
      students: [],
      batchRankings: [],
      subjectPerformance: [],
      teacherPerformance: [],
      highlights: {
        topPerformer: null,
        bestAttendance: null,
        topBatch: null,
        totalStudentsRanked: 0
      }
    };
    return emptyResult;
  }

  const studentIds = students.map(s => s.student_id);

  // --- Step 2: Attendance Aggregation ---
  let attSql = `
    SELECT 
      student_id,
      COUNT(*) as total_days,
      COUNT(CASE WHEN LOWER(presence_type) LIKE '%present%' OR LOWER(presence_type) = 'p' THEN 1 END) as present_days,
      COUNT(CASE WHEN LOWER(presence_type) LIKE '%absent%' OR LOWER(presence_type) = 'a' THEN 1 END) as absent_days
    FROM attendance
    WHERE student_id = ANY($1)
  `;
  const attParams = [studentIds];

  if (startDate) {
    attParams.push(startDate);
    attSql += ` AND date >= $${attParams.length}`;
  }
  if (endDate) {
    attParams.push(endDate);
    attSql += ` AND date <= $${attParams.length}`;
  }
  attSql += ` GROUP BY student_id`;

  const attRes = await query(attSql, attParams);
  const attMap = new Map();
  attRes.rows.forEach(r => {
    const total = Number(r.total_days) || 0;
    const present = Number(r.present_days) || 0;
    const absent = Number(r.absent_days) || 0;
    const pct = total > 0 ? round((present / total) * 100, 1) : 0;
    attMap.set(r.student_id, { totalDays: total, presentDays: present, absentDays: absent, percentage: pct });
  });

  // --- Step 3: Homework Aggregation ---
  let hwSql = `
    SELECT 
      student_id,
      COUNT(*) as total_hw,
      SUM(
        CASE 
          WHEN UPPER(final_status) = 'COMPLETE' THEN 10
          WHEN UPPER(final_status) = 'PARTIALLY COMPLETE' THEN 7
          WHEN UPPER(final_status) = 'HALF COMPLETE' THEN 5
          WHEN UPPER(final_status) = 'INCOMPLETE' THEN 2
          WHEN UPPER(final_status) = 'HW COPY FORGET' THEN 1
          WHEN UPPER(final_status) = 'ABSENT' THEN 0
          ELSE 5
        END
      ) as total_points,
      COUNT(CASE WHEN UPPER(final_status) = 'COMPLETE' THEN 1 END) as count_complete,
      COUNT(CASE WHEN UPPER(final_status) = 'PARTIALLY COMPLETE' THEN 1 END) as count_partially,
      COUNT(CASE WHEN UPPER(final_status) = 'HALF COMPLETE' THEN 1 END) as count_half,
      COUNT(CASE WHEN UPPER(final_status) = 'INCOMPLETE' THEN 1 END) as count_incomplete,
      COUNT(CASE WHEN UPPER(final_status) = 'HW COPY FORGET' THEN 1 END) as count_copy_forget,
      COUNT(CASE WHEN UPPER(final_status) = 'ABSENT' THEN 1 END) as count_absent
    FROM homework
    WHERE student_id = ANY($1)
  `;
  const hwParams = [studentIds];

  if (startDate) {
    hwParams.push(startDate);
    hwSql += ` AND date >= $${hwParams.length}`;
  }
  if (endDate) {
    hwParams.push(endDate);
    hwSql += ` AND date <= $${hwParams.length}`;
  }
  hwSql += ` GROUP BY student_id`;

  const hwRes = await query(hwSql, hwParams);
  const hwMap = new Map();
  hwRes.rows.forEach(r => {
    const total = Number(r.total_hw) || 0;
    const points = Number(r.total_points) || 0;
    const avgScore = total > 0 ? round(points / total, 1) : 0;
    const hwPct = round((avgScore / 10) * 100, 1);
    hwMap.set(r.student_id, {
      totalHw: total,
      totalPoints: points,
      avgScore,
      percentage: hwPct,
      counts: {
        complete: Number(r.count_complete) || 0,
        partiallyComplete: Number(r.count_partially) || 0,
        halfComplete: Number(r.count_half) || 0,
        incomplete: Number(r.count_incomplete) || 0,
        copyForget: Number(r.count_copy_forget) || 0,
        absent: Number(r.count_absent) || 0
      }
    });
  });

  // --- Step 4: Exam Results Aggregation ---
  let examSql = `
    SELECT 
      student_id,
      COUNT(*) as test_count,
      ROUND(AVG((total_obtained_marks / NULLIF(exam_total_max_marks, 0)) * 100)::numeric, 1) as avg_res_pct,
      SUM(total_obtained_marks) as sum_obtained,
      SUM(exam_total_max_marks) as sum_max
    FROM (
      SELECT DISTINCT test_id, student_id, total_obtained_marks, exam_total_max_marks, exam_date, subject_name
      FROM exam_results
      WHERE exam_total_max_marks > 0 AND total_obtained_marks IS NOT NULL AND student_id = ANY($1)
  `;
  const examParams = [studentIds];

  if (startDate) {
    examParams.push(startDate);
    examSql += ` AND exam_date >= $${examParams.length}`;
  }
  if (endDate) {
    examParams.push(endDate);
    examSql += ` AND exam_date <= $${examParams.length}`;
  }
  if (subject && subject !== 'ALL') {
    examParams.push(subject);
    examSql += ` AND LOWER(TRIM(subject_name)) = LOWER(TRIM($${examParams.length}))`;
  }

  examSql += `
    ) distinct_tests
    GROUP BY student_id
  `;

  const examRes = await query(examSql, examParams);
  const examMap = new Map();
  examRes.rows.forEach(r => {
    examMap.set(r.student_id, {
      testCount: Number(r.test_count) || 0,
      avgPercentage: Number(r.avg_res_pct) || 0,
      sumObtained: Number(r.sum_obtained) || 0,
      sumMax: Number(r.sum_max) || 0
    });
  });

  // --- Step 5: Build Student Rankings ---
  const rankedStudents = [];
  const batchStatsMap = new Map();

  students.forEach(s => {
    const att = attMap.get(s.student_id) || { totalDays: 0, presentDays: 0, percentage: 0 };
    const hw = hwMap.get(s.student_id) || { totalHw: 0, avgScore: 0, percentage: 0, counts: {} };
    const ex = examMap.get(s.student_id) || { testCount: 0, avgPercentage: 0, sumObtained: 0, sumMax: 0 };

    // Standard institutional formula: (Att% * 0.3) + (HW% * 0.3) + (Result% * 0.4)
    const overall = round(
      (att.percentage * 0.30) + 
      (hw.percentage * 0.30) + 
      (ex.avgPercentage * 0.40),
      1
    );

    // Only include students who have recorded activity
    if (att.totalDays > 0 || hw.totalHw > 0 || ex.testCount > 0) {
      const studentObj = {
        studentId: s.student_id,
        studentName: s.student_name,
        batch: s.batch || '-',
        className: s.class_name || '-',
        mobile: s.mobile || '-',
        attendance: {
          presentDays: att.presentDays,
          totalDays: att.totalDays,
          percentage: att.percentage
        },
        homework: {
          score: hw.avgScore, // out of 10
          percentage: hw.percentage,
          total: hw.totalHw,
          counts: hw.counts || {}
        },
        result: {
          testCount: ex.testCount,
          percentage: ex.avgPercentage,
          totalObtained: ex.sumObtained,
          totalMax: ex.sumMax
        },
        overallScore: overall
      };

      rankedStudents.push(studentObj);

      // Accumulate batch stats
      const bName = s.batch || 'Unassigned';
      if (!batchStatsMap.has(bName)) {
        batchStatsMap.set(bName, {
          batchName: bName,
          count: 0,
          overallSum: 0,
          attSum: 0,
          hwSum: 0,
          resSum: 0,
          totalObtainedMarks: 0,
          totalMaxMarks: 0,
          students: []
        });
      }
      const bStat = batchStatsMap.get(bName);
      bStat.count += 1;
      bStat.overallSum += overall;
      bStat.attSum += att.percentage;
      bStat.hwSum += hw.percentage;
      bStat.resSum += ex.avgPercentage;
      bStat.totalObtainedMarks += ex.sumObtained;
      bStat.totalMaxMarks += ex.sumMax;
      bStat.students.push({
        id: s.student_id,
        name: s.student_name,
        overall,
        attendance: att.percentage,
        homework: hw.percentage,
        result: ex.avgPercentage
      });
    }
  });

  // Sort students descending by overall score
  rankedStudents.sort((a, b) => b.overallScore - a.overallScore);
  rankedStudents.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  // --- Step 6: Build Batch Rankings ---
  const batchRankings = [];
  batchStatsMap.forEach(b => {
    if (b.count > 0) {
      const avgOverall = round(b.overallSum / b.count, 1);
      const avgAtt = round(b.attSum / b.count, 1);
      const avgHwPct = round(b.hwSum / b.count, 1);
      const avgHwScore = round((avgHwPct / 100) * 10, 1);
      const avgRes = round(b.resSum / b.count, 1);

      batchRankings.push({
        batchName: b.batchName,
        studentCount: b.count,
        overallScore: avgOverall,
        avgAttendance: avgAtt,
        avgHomeworkScore: avgHwScore,
        avgHomeworkPct: avgHwPct,
        avgResult: avgRes,
        totalMarks: round(b.totalMaxMarks, 1),
        students: b.students.sort((x, y) => y.overall - x.overall)
      });
    }
  });

  batchRankings.sort((a, b) => b.overallScore - a.overallScore);
  batchRankings.forEach((b, idx) => {
    b.rank = idx + 1;
  });

  // --- Step 7: Subject Performance ---
  let subjSql = `
    SELECT 
      subject_name,
      batch_name,
      ROUND(AVG(LEAST(100, (subject_obtained_marks / NULLIF(subject_max_marks, 0)) * 100))::numeric, 1) as avg_pct,
      ROUND(AVG(subject_obtained_marks)::numeric, 1) as avg_obtained,
      ROUND(AVG(subject_max_marks)::numeric, 1) as avg_max,
      COUNT(DISTINCT student_id) as student_count
    FROM exam_results
    WHERE subject_max_marks > 0 AND subject_obtained_marks IS NOT NULL AND subject_name IS NOT NULL
  `;
  const subjParams = [];
  if (startDate) {
    subjParams.push(startDate);
    subjSql += ` AND exam_date >= $${subjParams.length}`;
  }
  if (endDate) {
    subjParams.push(endDate);
    subjSql += ` AND exam_date <= $${subjParams.length}`;
  }
  if (batch && batch !== 'ALL') {
    subjParams.push(batch);
    subjSql += ` AND LOWER(TRIM(batch_name)) = LOWER(TRIM($${subjParams.length}))`;
  }
  subjSql += ` GROUP BY subject_name, batch_name ORDER BY subject_name, avg_pct DESC`;

  const subjRes = await query(subjSql, subjParams);
  const subjGroupMap = new Map();

  subjRes.rows.forEach(r => {
    const sName = r.subject_name;
    if (!subjGroupMap.has(sName)) {
      subjGroupMap.set(sName, {
        subject: sName,
        batches: []
      });
    }
    subjGroupMap.get(sName).batches.push({
      batch: r.batch_name || 'General',
      avgPct: Number(r.avg_pct) || 0,
      avgObtained: Number(r.avg_obtained) || 0,
      avgMax: Number(r.avg_max) || 0,
      studentCount: Number(r.student_count) || 0
    });
  });

  const subjectPerformance = [];
  subjGroupMap.forEach((val, subjectName) => {
    const batches = val.batches.slice().sort((a, b) => b.avgPct - a.avgPct);
    const count = batches.length;
    const overallAvg = count > 0 ? round(batches.reduce((sum, b) => sum + b.avgPct, 0) / count, 1) : 0;

    subjectPerformance.push({
      subject: subjectName,
      overallAvg,
      batchCount: count,
      strongBatches: batches.slice(0, 3),
      weakBatches: batches.slice(-3).reverse()
    });
  });
  subjectPerformance.sort((a, b) => b.overallAvg - a.overallAvg);

  // --- Step 8: Top Highlights ---
  const topPerformer = rankedStudents.length > 0 ? {
    id: rankedStudents[0].studentId,
    name: rankedStudents[0].studentName,
    batch: rankedStudents[0].batch,
    score: rankedStudents[0].overallScore,
    attendance: rankedStudents[0].attendance.percentage,
    homework: rankedStudents[0].homework.score,
    result: rankedStudents[0].result.percentage
  } : null;

  const topAttStudent = rankedStudents.slice().sort((a, b) => b.attendance.percentage - a.attendance.percentage)[0];
  const bestAttendance = topAttStudent ? {
    id: topAttStudent.studentId,
    name: topAttStudent.studentName,
    batch: topAttStudent.batch,
    attendancePct: topAttStudent.attendance.percentage
  } : null;

  const topBatch = batchRankings.length > 0 ? {
    batchName: batchRankings[0].batchName,
    score: batchRankings[0].overallScore,
    studentCount: batchRankings[0].studentCount
  } : null;

  const resultData = {
    students: rankedStudents,
    batchRankings,
    subjectPerformance,
    highlights: {
      topPerformer,
      bestAttendance,
      topBatch,
      totalStudentsRanked: rankedStudents.length
    }
  };

  leaderboardCache.set(cacheKey, { timestamp: Date.now(), data: resultData });
  return resultData;
}

/**
 * 3. Detailed Itemized Calculation Preview for a Student
 */
export async function getStudentCalculations(studentId, { startDate = '', endDate = '', examType = 'ALL', subject = 'ALL' } = {}) {
  // 1. Student profile
  const sRes = await query(
    `SELECT student_id, student_name, father_name, batch, class_name, mobile, email, program, dob 
     FROM students 
     WHERE LOWER(TRIM(student_id)) = LOWER(TRIM($1))`,
    [studentId]
  );
  if (!sRes.rows.length) {
    throw new Error(`Student not found for ID: ${studentId}`);
  }
  const student = sRes.rows[0];

  // 2. Attendance records & counts
  let attSql = `
    SELECT date, presence_type, teacher_name, call_reason
    FROM attendance
    WHERE LOWER(TRIM(student_id)) = LOWER(TRIM($1))
  `;
  const attParams = [studentId];
  if (startDate) {
    attParams.push(startDate);
    attSql += ` AND date >= $${attParams.length}`;
  }
  if (endDate) {
    attParams.push(endDate);
    attSql += ` AND date <= $${attParams.length}`;
  }
  attSql += ` ORDER BY date DESC`;

  const attRes = await query(attSql, attParams);
  const totalDays = attRes.rows.length;
  const presentDays = attRes.rows.filter(r => /present|p$/i.test(clean(r.presence_type))).length;
  const absentDays = attRes.rows.filter(r => /absent|a$/i.test(clean(r.presence_type))).length;
  const otherDays = totalDays - presentDays - absentDays;
  const attendancePct = totalDays > 0 ? round((presentDays / totalDays) * 100, 1) : 0;
  const attendanceWeightedPoints = round(attendancePct * 0.30, 2);

  // 3. Homework records & points
  let hwSql = `
    SELECT date, subject, final_status, duration_min, teacher_name
    FROM homework
    WHERE LOWER(TRIM(student_id)) = LOWER(TRIM($1))
  `;
  const hwParams = [studentId];
  if (startDate) {
    hwParams.push(startDate);
    hwSql += ` AND date >= $${hwParams.length}`;
  }
  if (endDate) {
    hwParams.push(endDate);
    hwSql += ` AND date <= $${hwParams.length}`;
  }
  hwSql += ` ORDER BY date DESC`;

  const hwRes = await query(hwSql, hwParams);
  const totalHw = hwRes.rows.length;

  const hwCounts = {
    complete: 0,
    partiallyComplete: 0,
    halfComplete: 0,
    incomplete: 0,
    copyForget: 0,
    absent: 0
  };
  let totalHwPoints = 0;

  hwRes.rows.forEach(r => {
    const st = clean(r.final_status).toUpperCase();
    if (st === 'COMPLETE') {
      hwCounts.complete += 1;
      totalHwPoints += 10;
    } else if (st === 'PARTIALLY COMPLETE') {
      hwCounts.partiallyComplete += 1;
      totalHwPoints += 7;
    } else if (st === 'HALF COMPLETE') {
      hwCounts.halfComplete += 1;
      totalHwPoints += 5;
    } else if (st === 'INCOMPLETE') {
      hwCounts.incomplete += 1;
      totalHwPoints += 2;
    } else if (st === 'HW COPY FORGET') {
      hwCounts.copyForget += 1;
      totalHwPoints += 1;
    } else if (st === 'ABSENT') {
      hwCounts.absent += 1;
      totalHwPoints += 0;
    } else {
      totalHwPoints += 5;
    }
  });

  const avgHwScore = totalHw > 0 ? round(totalHwPoints / totalHw, 1) : 0; // out of 10
  const homeworkPct = round((avgHwScore / 10) * 100, 1);
  const homeworkWeightedPoints = round(homeworkPct * 0.30, 2);

  // 4. Exam results list
  let examSql = `
    SELECT 
      test_id,
      exam_date,
      batch_name,
      exam_type,
      rank,
      total_obtained_marks,
      exam_total_max_marks,
      subject_name,
      subject_obtained_marks,
      subject_max_marks
    FROM exam_results
    WHERE LOWER(TRIM(student_id)) = LOWER(TRIM($1))
  `;
  const examParams = [studentId];
  if (startDate) {
    examParams.push(startDate);
    examSql += ` AND exam_date >= $${examParams.length}`;
  }
  if (endDate) {
    examParams.push(endDate);
    examSql += ` AND exam_date <= $${examParams.length}`;
  }
  if (examType && examType !== 'ALL') {
    examParams.push(examType);
    examSql += ` AND LOWER(TRIM(exam_type)) = LOWER(TRIM($${examParams.length}))`;
  }
  if (subject && subject !== 'ALL') {
    examParams.push(subject);
    examSql += ` AND LOWER(TRIM(subject_name)) = LOWER(TRIM($${examParams.length}))`;
  }
  examSql += ` ORDER BY exam_date DESC, test_id ASC`;

  const examRes = await query(examSql, examParams);

  // Group by test_id
  const testMap = new Map();
  const subjectMap = new Map();

  examRes.rows.forEach(r => {
    const tId = r.test_id || r.exam_date || 'Unknown';
    if (!testMap.has(tId)) {
      testMap.set(tId, {
        testId: tId,
        examDate: r.exam_date || '-',
        examType: r.exam_type || 'General',
        rank: r.rank || null,
        totalObtained: Number(r.total_obtained_marks) || 0,
        totalMax: Number(r.exam_total_max_marks) || 0,
        percentage: r.exam_total_max_marks > 0 ? round((r.total_obtained_marks / r.exam_total_max_marks) * 100, 1) : 0,
        subjects: []
      });
    }

    if (r.subject_name) {
      const rawObt = Number(r.subject_obtained_marks) || 0;
      let rawMax = Number(r.subject_max_marks) || 0;
      if (rawMax <= 0 || rawObt > rawMax) {
        if (rawObt > 150) rawMax = 200;
        else if (rawObt > 100) rawMax = 150;
        else if (rawObt > 50) rawMax = 100;
        else if (rawObt > 30) rawMax = 50;
        else if (rawObt > 20) rawMax = 30;
        else if (rawMax <= 0) rawMax = 50;
        else rawMax = Math.ceil(rawObt / 10) * 10;
      }
      const subObt = rawObt;
      const subMax = rawMax;
      testMap.get(tId).subjects.push({
        subjectName: r.subject_name,
        obtained: subObt,
        maxMarks: subMax,
        percentage: subMax > 0 ? Math.min(100, Math.max(0, round((subObt / subMax) * 100, 1))) : 0
      });

      if (!subjectMap.has(r.subject_name)) {
        subjectMap.set(r.subject_name, {
          subjectName: r.subject_name,
          sumObtained: 0,
          sumMax: 0,
          count: 0
        });
      }
      const sEntry = subjectMap.get(r.subject_name);
      sEntry.sumObtained += subObt;
      sEntry.sumMax += subMax;
      sEntry.count += 1;
    }
  });

  const testList = Array.from(testMap.values());
  const testCount = testList.length;
  const examPercentages = testList.map(t => t.percentage);
  const avgResultPct = testCount > 0 ? round(examPercentages.reduce((a, b) => a + b, 0) / testCount, 1) : 0;
  const resultWeightedPoints = round(avgResultPct * 0.40, 2);

  // Subject Wise Summary
  const subjectBreakdown = Array.from(subjectMap.values()).map(s => {
    const pct = s.sumMax > 0 ? round((s.sumObtained / s.sumMax) * 100, 1) : 0;
    let tag = 'Average';
    if (pct >= 80) tag = 'Dominant / Strong';
    else if (pct >= 65) tag = 'Good';
    else if (pct < 50) tag = 'Needs Focus / Weak';

    return {
      subject: s.subjectName,
      avgObtained: round(s.sumObtained / s.count, 1),
      avgMax: round(s.sumMax / s.count, 1),
      avgPercentage: pct,
      testCount: s.count,
      status: tag
    };
  }).sort((a, b) => b.avgPercentage - a.avgPercentage);

  const strongestSubject = subjectBreakdown.length > 0 ? subjectBreakdown[0] : null;
  const weakestSubject = subjectBreakdown.length > 0 ? subjectBreakdown[subjectBreakdown.length - 1] : null;

  // 5. Overall Weighted Composite Score
  const overallCompositeScore = round(attendanceWeightedPoints + homeworkWeightedPoints + resultWeightedPoints, 1);

  // 6. Complaints count
  const compRes = await query(
    `SELECT complaint_id, date, complaint_text, status, teacher_name, pdf_link
     FROM complaints 
     WHERE LOWER(TRIM(student_id)) = LOWER(TRIM($1))
     ORDER BY date DESC`,
    [studentId]
  );

  return {
    student: {
      id: student.student_id,
      name: student.student_name,
      fatherName: student.father_name,
      batch: student.batch,
      className: student.class_name,
      mobile: student.mobile,
      program: student.program
    },
    compositeScore: {
      overall: overallCompositeScore,
      formula: `(Attendance% × 0.30) + (Homework% × 0.30) + (Result% × 0.40)`,
      breakdown: {
        attendance: {
          percentage: attendancePct,
          weight: '30%',
          weightedPoints: attendanceWeightedPoints,
          rawCount: `${presentDays} / ${totalDays} classes`
        },
        homework: {
          percentage: homeworkPct,
          avgScoreOutOf10: avgHwScore,
          weight: '30%',
          weightedPoints: homeworkWeightedPoints,
          rawCount: `${totalHw} homework tasks assigned`
        },
        result: {
          percentage: avgResultPct,
          weight: '40%',
          weightedPoints: resultWeightedPoints,
          rawCount: `${testCount} tests evaluated`
        }
      }
    },
    attendance: {
      present: presentDays,
      absent: absentDays,
      other: otherDays,
      total: totalDays,
      percentage: attendancePct
    },
    homework: {
      total: totalHw,
      totalPoints: totalHwPoints,
      avgScoreOutOf10: avgHwScore,
      percentage: homeworkPct,
      counts: hwCounts
    },
    exams: {
      testCount,
      avgPercentage: avgResultPct,
      tests: testList
    },
    subjects: {
      list: subjectBreakdown,
      strongest: strongestSubject ? `${strongestSubject.subject} (${strongestSubject.avgPercentage}%)` : '-',
      weakest: weakestSubject ? `${weakestSubject.subject} (${weakestSubject.avgPercentage}%)` : '-'
    },
    complaints: compRes.rows.map(r => ({
      id: r.complaint_id,
      date: r.date,
      text: r.complaint_text,
      status: r.status,
      teacher: r.teacher_name,
      pdf: r.pdf_link
    }))
  };
}
