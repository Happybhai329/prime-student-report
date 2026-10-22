import { query, getDbType, batchInsert, batchUpsert } from './db.js';
import {
  fetchRemoteEmployees,
  fetchRemoteStudents,
  fetchRemoteBatches,
  fetchRemoteAttendance,
  fetchRemoteHomework,
  fetchRemoteExamResults,
  fetchRemoteComplaints,
  appendRemoteComplaint
} from './googleSheets.js';

let isSyncing = false;
let lastSyncTime = null;
let lastSyncCounts = {};
let lastSyncError = null;

export function getSyncStatus() {
  return {
    isSyncing,
    lastSyncTime,
    lastSyncCounts,
    lastSyncError,
    dbType: getDbType()
  };
}

/**
 * Execute full inbound synchronization from all Google Spreadsheets
 */
export async function runFullInboundSync() {
  if (isSyncing) {
    console.log('[SyncEngine] Sync already in progress, skipping concurrent run.');
    return { status: 'already_running', lastSyncTime };
  }

  isSyncing = true;
  lastSyncError = null;
  const startTime = Date.now();
  console.log('[SyncEngine] Starting full inbound sync from Google Spreadsheets...');

  try {
    const isPg = getDbType() === 'postgres';

    // 1. Fetch from Google Sheets concurrently
    const [
      employees,
      students,
      batches,
      attendance,
      homework,
      examResults,
      complaints
    ] = await Promise.all([
      fetchRemoteEmployees().catch(err => { console.error('Error fetching employees:', err.message); return []; }),
      fetchRemoteStudents().catch(err => { console.error('Error fetching students:', err.message); return []; }),
      fetchRemoteBatches().catch(err => { console.error('Error fetching batches:', err.message); return []; }),
      fetchRemoteAttendance().catch(err => { console.error('Error fetching attendance:', err.message); return []; }),
      fetchRemoteHomework().catch(err => { console.error('Error fetching homework:', err.message); return []; }),
      fetchRemoteExamResults().catch(err => { console.error('Error fetching exam results:', err.message); return []; }),
      fetchRemoteComplaints().catch(err => { console.error('Error fetching complaints:', err.message); return []; })
    ]);

    console.log(`[SyncEngine] Fetched from Sheets: ${employees.length} employees, ${students.length} students, ${batches.length} batches, ${attendance.length} attendance, ${homework.length} homework, ${examResults.length} results, ${complaints.length} complaints.`);

    // 2. Fast Batch Upsert Employees
    console.log(`[SyncEngine] Ingesting ${employees.length} employees...`);
    await batchUpsert(
      'prime_employees',
      ['employee_id', 'name', 'department', 'role', 'email', 'contact', 'status'],
      'employee_id',
      ['name', 'department', 'role', 'email', 'contact', 'status'],
      employees.map(e => ({
        employee_id: e.employeeId,
        name: e.name,
        department: e.department,
        role: e.role,
        email: e.email,
        contact: e.contact,
        status: e.status
      })),
      200
    );

    // 3. Fast Batch Upsert Students
    console.log(`[SyncEngine] Ingesting ${students.length} students...`);
    await batchUpsert(
      'students',
      ['student_id', 'student_name', 'father_name', 'batch', 'batch_id', 'class_name', 'school', 'mobile', 'email', 'program', 'dob'],
      'student_id',
      ['student_name', 'father_name', 'batch', 'batch_id', 'class_name', 'school', 'mobile', 'email', 'program', 'dob'],
      students.map(s => ({
        student_id: s.studentId,
        student_name: s.studentName,
        father_name: s.fatherName,
        batch: s.batch,
        batch_id: s.batch,
        class_name: s.className,
        school: s.school,
        mobile: s.mobile,
        email: s.email,
        program: s.program,
        dob: s.dob
      })),
      200
    );

    // 4. Fast Batch Upsert Batches
    console.log(`[SyncEngine] Ingesting ${batches.length} batches...`);
    await batchUpsert(
      'batches',
      ['batch_name', 'batch_id', 'classroom', 'writing_class', 'actual_class', 'subjects_offered'],
      'batch_name',
      ['batch_id', 'classroom', 'writing_class', 'actual_class', 'subjects_offered'],
      batches.map(b => ({
        batch_name: b.batchName,
        batch_id: b.batchName,
        classroom: b.classRoom,
        writing_class: b.writingClass,
        actual_class: b.actualClass,
        subjects_offered: b.subjectsOffered
      })),
      100
    );

    // 5. Fast Batch Insert Attendance & Attendance Records
    if (attendance.length > 0) {
      console.log(`[SyncEngine] Ingesting ${attendance.length} attendance records...`);
      await query('DELETE FROM attendance');
      await query('DELETE FROM attendance_records');
      const attendanceData = attendance.map(a => ({
        student_id: a.studentId,
        date: a.date,
        batch: a.batch,
        batch_id: a.batch,
        presence_type: a.presenceType,
        teacher_id: a.teacherId,
        evaluator_id: a.teacherId,
        teacher_name: a.teacherName,
        call_reason: a.callReason
      }));
      await batchInsert(
        'attendance',
        ['student_id', 'date', 'batch', 'batch_id', 'presence_type', 'teacher_id', 'evaluator_id', 'teacher_name', 'call_reason'],
        attendanceData,
        1000
      );
      await batchInsert(
        'attendance_records',
        ['student_id', 'date', 'batch', 'batch_id', 'presence_type', 'teacher_id', 'evaluator_id', 'teacher_name', 'call_reason'],
        attendanceData,
        1000
      );
    }

    // 6. Fast Batch Insert Homework
    if (homework.length > 0) {
      console.log(`[SyncEngine] Ingesting ${homework.length} homework records...`);
      await query('DELETE FROM homework');
      await batchInsert(
        'homework',
        ['student_id', 'date', 'subject', 'status', 'final_status', 'duration_min', 'teacher_id', 'evaluator_id', 'teacher_name', 'start_time', 'end_time'],
        homework.map(h => ({
          student_id: h.studentId,
          date: h.date,
          subject: h.subject,
          status: h.status,
          final_status: h.finalStatus,
          duration_min: h.durationMin,
          teacher_id: h.teacherId,
          evaluator_id: h.teacherId,
          teacher_name: h.teacherName,
          start_time: h.startTime,
          end_time: h.endTime
        })),
        1000
      );
    }

    // 7. Fast Batch Insert Exam Results & Test Results
    if (examResults.length > 0) {
      console.log(`[SyncEngine] Ingesting ${examResults.length} exam result records...`);
      await query('DELETE FROM exam_results');
      await query('DELETE FROM test_results');
      const examData = examResults.map(r => {
        const rawObt = Number(r.subjectObtainedMarks) || 0;
        let rawMax = Number(r.subjectMaxMarks) || 0;
        if (rawMax <= 0 || rawObt > rawMax) {
          if (rawObt > 150) rawMax = 200;
          else if (rawObt > 100) rawMax = 150;
          else if (rawObt > 50) rawMax = 100;
          else if (rawObt > 30) rawMax = 50;
          else if (rawObt > 20) rawMax = 30;
          else if (rawMax <= 0) rawMax = 50;
          else rawMax = Math.ceil(rawObt / 10) * 10;
        }

        return {
          test_id: r.testId,
          exam_date: r.examDate,
          batch_name: r.batchName,
          batch_id: r.batchName,
          exam_type: r.examType,
          student_id: r.studentId,
          student_name: r.studentName,
          rank: r.rank,
          total_obtained_marks: r.totalObtainedMarks,
          exam_total_max_marks: r.examTotalMaxMarks,
          subject_name: r.subjectName,
          subject_obtained_marks: rawObt,
          subject_max_marks: rawMax
        };
      });
      await batchInsert(
        'exam_results',
        ['test_id', 'exam_date', 'batch_name', 'batch_id', 'exam_type', 'student_id', 'student_name', 'rank', 'total_obtained_marks', 'exam_total_max_marks', 'subject_name', 'subject_obtained_marks', 'subject_max_marks'],
        examData,
        1000
      );
      await batchInsert(
        'test_results',
        ['test_id', 'exam_date', 'batch_name', 'batch_id', 'exam_type', 'student_id', 'student_name', 'rank', 'total_obtained_marks', 'exam_total_max_marks', 'subject_name', 'subject_obtained_marks', 'subject_max_marks'],
        examData,
        1000
      );
    }

    // 8. Fast Batch Upsert Complaints
    if (complaints.length > 0) {
      console.log(`[SyncEngine] Ingesting ${complaints.length} complaints...`);
      await batchUpsert(
        'complaints',
        ['complaint_id', 'student_id', 'student_name', 'batch', 'batch_id', 'teacher_name', 'teacher_employee_id', 'evaluator_id', 'department', 'complaint_text', 'status', 'pdf_link', 'date', 'submitted_at'],
        'complaint_id',
        ['status', 'pdf_link', 'complaint_text'],
        complaints.map(c => ({
          complaint_id: c.complaintId || `CMP-${c.studentId}-${c.date || Date.now()}`,
          student_id: c.studentId,
          student_name: c.studentName,
          batch: c.batch,
          batch_id: c.batch,
          teacher_name: c.teacherName,
          teacher_employee_id: c.teacherEmployeeId,
          evaluator_id: c.teacherEmployeeId,
          department: c.department,
          complaint_text: c.complaintText,
          status: c.status,
          pdf_link: c.pdfLink,
          date: c.date,
          submitted_at: c.submittedAt
        })),
        100
      );
    }

    lastSyncTime = new Date().toISOString();
    lastSyncCounts = {
      employees: employees.length,
      students: students.length,
      batches: batches.length,
      attendance: attendance.length,
      homework: homework.length,
      examResults: examResults.length,
      complaints: complaints.length,
      durationMs: Date.now() - startTime
    };

    // Save sync timestamp in sync_meta
    const syncVal = JSON.stringify({ lastSyncTime, counts: lastSyncCounts });
    if (isPg) {
      await query(`
        INSERT INTO sync_meta (key, value, updated_at)
        VALUES ('last_inbound_sync', $1, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
      `, [syncVal]);
    } else {
      await query(`
        INSERT OR REPLACE INTO sync_meta (key, value, updated_at)
        VALUES ('last_inbound_sync', $1, CURRENT_TIMESTAMP);
      `, [syncVal]);
    }

    console.log(`[SyncEngine] Full sync completed successfully in ${lastSyncCounts.durationMs}ms.`);
    return { status: 'success', counts: lastSyncCounts, lastSyncTime };
  } catch (err) {
    lastSyncError = err.message;
    console.error('[SyncEngine] Sync failed:', err);
    return { status: 'error', error: err.message };
  } finally {
    isSyncing = false;
  }
}

/**
 * Submit Complaint and trigger asynchronous background Google Sheets append
 */
export async function submitStudentComplaint(complaintData) {
  const complaintId = `CMP-${Date.now()}`;
  const nowStr = new Date().toISOString();
  const dateStr = complaintData.date || nowStr.split('T')[0];

  const fullComplaint = {
    complaintId,
    studentId: complaintData.studentId,
    studentName: complaintData.studentName || '',
    batch: complaintData.batch || '',
    teacherName: complaintData.teacherName || '',
    teacherEmployeeId: complaintData.teacherEmployeeId || '',
    department: complaintData.department || '',
    complaintText: complaintData.complaintText || '',
    status: complaintData.status || 'Pending',
    pdfLink: complaintData.pdfLink || '',
    date: dateStr,
    submittedAt: nowStr
  };

  const isPg = getDbType() === 'postgres';
  if (isPg) {
    await query(`
      INSERT INTO complaints (complaint_id, student_id, student_name, batch, teacher_name, teacher_employee_id, department, complaint_text, status, pdf_link, date, submitted_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      fullComplaint.complaintId,
      fullComplaint.studentId,
      fullComplaint.studentName,
      fullComplaint.batch,
      fullComplaint.teacherName,
      fullComplaint.teacherEmployeeId,
      fullComplaint.department,
      fullComplaint.complaintText,
      fullComplaint.status,
      fullComplaint.pdfLink,
      fullComplaint.date,
      fullComplaint.submittedAt
    ]);
  } else {
    await query(`
      INSERT INTO complaints (complaint_id, student_id, student_name, batch, teacher_name, teacher_employee_id, department, complaint_text, status, pdf_link, date, submitted_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      fullComplaint.complaintId,
      fullComplaint.studentId,
      fullComplaint.studentName,
      fullComplaint.batch,
      fullComplaint.teacherName,
      fullComplaint.teacherEmployeeId,
      fullComplaint.department,
      fullComplaint.complaintText,
      fullComplaint.status,
      fullComplaint.pdfLink,
      fullComplaint.date,
      fullComplaint.submittedAt
    ]);
  }

  // Asynchronously sync out to Google Sheets in background
  appendRemoteComplaint(fullComplaint)
    .then(() => console.log(`[SyncEngine] Complaint ${complaintId} synced to Google Sheets.`))
    .catch(err => console.error(`[SyncEngine] Failed to sync complaint ${complaintId} to Google Sheets:`, err.message));

  return fullComplaint;
}

/**
 * Schedule automated periodic background sync every 15 minutes
 */
export function startPeriodicSync(intervalMinutes = 15) {
  const ms = intervalMinutes * 60 * 1000;
  console.log(`[SyncEngine] Periodic sync registered every ${intervalMinutes} minutes.`);
  setInterval(() => {
    runFullInboundSync().catch(err => console.error('[SyncEngine] Background sync error:', err.message));
  }, ms);
}
