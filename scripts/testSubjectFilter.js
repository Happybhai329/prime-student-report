import dotenv from 'dotenv';
dotenv.config();
import { initDatabase, query } from '../server/db.js';
import { getSheetsApi } from '../server/googleSheets.js';

function norm(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function getBaseSubject(subjectName) {
  const s = String(subjectName || '').toUpperCase().trim();
  if (s.includes('HINDI') && s.includes('READING')) return 'READING';
  if (s.includes('READING')) return 'READING';
  if (s.includes('HINDI')) return 'HINDI';
  if (s.includes('ENGLISH')) return 'ENGLISH';
  if (s.includes('MATH')) return 'MATHEMATICS';
  if (s.includes('REASON')) return 'REASONING';
  if (s.includes('SCIENCE')) return 'SCIENCE';
  if (s.includes('SOCIAL') || s.includes('SST')) return 'SOCIAL STUDIES';
  if (s.includes('GENERAL') || s.includes('GK')) return 'GENERAL KNOWLEDGE';
  return s;
}

function isSubjectAllowedInBatch(subjectName, batchSubjects) {
  if (!batchSubjects || batchSubjects.length === 0) return true;
  const base = getBaseSubject(subjectName);
  const normBase = norm(base);
  return batchSubjects.some(bs => {
    const bBase = getBaseSubject(bs);
    return norm(bBase) === normBase || norm(bs).includes(normBase) || normBase.includes(norm(bBase));
  });
}

function isSubjectAllowedInExamType(subjectName, examType, examMapping) {
  if (!examType || examType === 'ALL' || !examMapping) return true;
  const normType = norm(examType);
  const validForType = examMapping[normType];
  if (!validForType || validForType.length === 0) return true; // if not in mapping, don't restrict

  const base = getBaseSubject(subjectName);
  const normBase = norm(base);

  return validForType.some(mappedSub => {
    const mBase = getBaseSubject(mappedSub.subjectName);
    return norm(mBase) === normBase || norm(mappedSub.subjectName).includes(normBase) || normBase.includes(norm(mBase));
  });
}

async function main() {
  await initDatabase();
  const sheets = getSheetsApi();
  const spreadsheetId = process.env.ACADEMIC_DB_ID || '1DK4OpEdEDh2z_Ng9vIHbci41yBLSQ2m4ZXI7sqA7mJs';

  // 1. Load Exam_Mapping
  const mapRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'Exam_Mapping'` });
  const mapRows = mapRes.data.values || [];
  const examMapping = {};
  mapRows.slice(1).forEach(r => {
    const examType = (r[0] || '').trim();
    const subjectName = (r[1] || '').trim();
    const subMax = Number(r[2]) || 0;
    const examMax = Number(r[3]) || 0;
    if (!examType || !subjectName) return;
    const key = norm(examType);
    if (!examMapping[key]) examMapping[key] = [];
    examMapping[key].push({ examType, subjectName, subMax, examMax });
  });

  // 2. Load Batches
  const batchDb = await query('SELECT batch_name, subjects_offered FROM batches');
  const batchMap = {};
  batchDb.rows.forEach(b => {
    let subs = [];
    try { subs = JSON.parse(b.subjects_offered || '[]'); } catch { subs = (b.subjects_offered || '').split(','); }
    batchMap[norm(b.batch_name)] = subs.map(s => s.trim()).filter(Boolean);
  });

  // 3. Test on specific students:
  // Case A: RIMC student 2603060003
  // Case B: Senior pre Foundation student 2504600036
  // Case C: Pre foundation student 2603030010
  // Case D: Mahendra 2603050081
  const testStudentIds = ['2603060003', '2504600036', '2603030010', '2603050081'];

  for (const sId of testStudentIds) {
    const sRes = await query('SELECT student_id, student_name, batch FROM students WHERE student_id = $1', [sId]);
    if (!sRes.rows.length) continue;
    const st = sRes.rows[0];
    const batchSubs = batchMap[norm(st.batch)] || [];

    const examRows = await query('SELECT test_id, exam_date, exam_type, batch_name, subject_name, subject_obtained_marks, subject_max_marks FROM exam_results WHERE student_id = $1', [sId]);
    
    const beforeSubs = Array.from(new Set(examRows.rows.map(r => r.subject_name)));
    
    // Filter rows
    const afterRows = examRows.rows.filter(r => {
      // Check batch
      const inBatch = isSubjectAllowedInBatch(r.subject_name, batchSubs);
      if (!inBatch) return false;

      // Check exam type
      const inExam = isSubjectAllowedInExamType(r.subject_name, r.exam_type, examMapping);
      if (!inExam) return false;

      // Check optional zero
      if (r.subject_name.toUpperCase().includes('(OPTIONAL)')) {
        // if obtained is 0, check if student took another language with > 0 in same test
        const testSame = examRows.rows.filter(o => o.test_id === r.test_id);
        const hasOtherLangScore = testSame.some(o => 
          o.subject_name.toUpperCase().includes('(OPTIONAL)') && 
          o.subject_name !== r.subject_name && 
          Number(o.subject_obtained_marks) > 0
        );
        if (Number(r.subject_obtained_marks) === 0 && hasOtherLangScore) {
          return false;
        }
      }

      return true;
    });

    const afterSubs = Array.from(new Set(afterRows.map(r => r.subject_name)));

    console.log(`\n=== Student: ${st.student_name} (${st.student_id}) ===`);
    console.log(`Batch: ${st.batch}`);
    console.log(`Batch Subjects Allowed:`, batchSubs);
    console.log(`BEFORE Subject Count: ${beforeSubs.length} ->`, beforeSubs);
    console.log(`AFTER Subject Count: ${afterSubs.length} ->`, afterSubs);
    console.log(`BEFORE Total Rows: ${examRows.rows.length} | AFTER Total Rows: ${afterRows.length}`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
