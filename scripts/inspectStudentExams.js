import dotenv from 'dotenv';
dotenv.config();
import { initDatabase, query } from '../server/db.js';

async function main() {
  await initDatabase();

  // Let's see some students and their batches
  const students = await query('SELECT student_id, student_name, batch FROM students LIMIT 10');
  console.log('Students:', students.rows);

  // Let's see distinct subject names in exam_results
  const subjects = await query('SELECT DISTINCT subject_name FROM exam_results');
  console.log('All subjects in exam_results:', subjects.rows.map(r => r.subject_name));

  // Let's check a student in e.g. TPC-06 2026 evening or RIMC or TPC-09
  const rimcStudent = await query("SELECT student_id, student_name, batch FROM students WHERE batch ILIKE '%RIMC%' LIMIT 5");
  console.log('RIMC students:', rimcStudent.rows);

  if (rimcStudent.rows.length > 0) {
    const sId = rimcStudent.rows[0].student_id;
    const exams = await query('SELECT test_id, exam_date, batch_name, exam_type, subject_name, subject_obtained_marks, subject_max_marks FROM exam_results WHERE student_id = $1', [sId]);
    console.log(`Exams for RIMC student ${sId} (${rimcStudent.rows[0].batch}):`, exams.rows);
  }

  // Let's check student 2603050081 (Mahendra)
  const mahendra = await query("SELECT test_id, exam_date, batch_name, exam_type, subject_name, subject_obtained_marks, subject_max_marks FROM exam_results WHERE student_id = '2603050081'");
  console.log('Mahendra exams count:', mahendra.rows.length);
  const mSubjects = new Set(mahendra.rows.map(r => r.subject_name));
  console.log('Mahendra subjects:', Array.from(mSubjects));
  const mExamTypes = new Set(mahendra.rows.map(r => r.exam_type));
  console.log('Mahendra exam types:', Array.from(mExamTypes));
}

main().catch(console.error).finally(() => process.exit(0));
