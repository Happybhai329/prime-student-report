import dotenv from 'dotenv';
dotenv.config();
import { initDatabase, query } from '../server/db.js';
import { getSheetsApi } from '../server/googleSheets.js';

async function main() {
  await initDatabase();
  const sheets = getSheetsApi();
  const spreadsheetId = process.env.ACADEMIC_DB_ID || '1DK4OpEdEDh2z_Ng9vIHbci41yBLSQ2m4ZXI7sqA7mJs';

  // 1. Fetch Exam_Mapping
  const mapRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'Exam_Mapping'` });
  const mapRows = mapRes.data.values || [];
  const examMap = {}; // { normalizedExamType: [normalizedSubjectNames] }
  mapRows.slice(1).forEach(r => {
    const examType = (r[0] || '').trim();
    const subject = (r[1] || '').trim();
    const subMax = Number(r[2]) || 0;
    const examMax = Number(r[3]) || 0;
    if (!examType || !subject) return;

    const normType = examType.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!examMap[normType]) examMap[normType] = [];
    examMap[normType].push({
      originalExamType: examType,
      originalSubject: subject,
      normSubject: subject.toLowerCase().replace(/[^a-z0-9]/g, ''),
      subMax,
      examMax
    });
  });

  console.log('Exam types in mapping:', Object.keys(examMap));

  // 2. Fetch Batches
  const batchRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'Batches'` });
  const batchRows = batchRes.data.values || [];
  const batchMap = {}; // { normalizedBatchName: [subjects] }
  batchRows.slice(1).forEach(r => {
    const batchName = (r[0] || '').trim();
    const subStr = (r[1] || '').trim();
    if (!batchName) return;
    const normBatch = batchName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const subjects = subStr.split(',').map(s => s.trim()).filter(Boolean);
    batchMap[normBatch] = {
      originalBatch: batchName,
      subjects,
      normSubjects: subjects.map(s => s.toLowerCase().replace(/[^a-z0-9]/g, ''))
    };
  });

  console.log('Batches in mapping:', Object.keys(batchMap).length);

  // 3. Check exam_results in DB
  const allExams = await query('SELECT test_id, exam_date, batch_name, exam_type, student_id, student_name, subject_name, subject_obtained_marks, subject_max_marks FROM exam_results');
  console.log('Total exam result rows in DB:', allExams.rows.length);

  let notInExamTypeCount = 0;
  let notInBatchCount = 0;
  let optionalZeroCount = 0;

  const sampleMismatch = [];

  allExams.rows.forEach(r => {
    const normType = (r.exam_type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normSub = (r.subject_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normBatch = (r.batch_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const validExamSubs = examMap[normType];
    const isSubjectInExamType = !validExamSubs || validExamSubs.some(s => s.normSubject === normSub || normSub.includes(s.normSubject) || s.normSubject.includes(normSub));

    const validBatch = batchMap[normBatch];
    const isSubjectInBatch = !validBatch || validBatch.normSubjects.some(s => s === normSub || normSub.includes(s) || s.includes(normSub));

    if (!isSubjectInExamType) {
      notInExamTypeCount++;
      if (sampleMismatch.length < 5) {
        sampleMismatch.push({ reason: 'not_in_exam_type', ...r });
      }
    }
    if (!isSubjectInBatch) {
      notInBatchCount++;
      if (sampleMismatch.length < 10) {
        sampleMismatch.push({ reason: 'not_in_batch', ...r });
      }
    }
  });

  console.log('Mismatch counts:');
  console.log('- Rows where subject is not in Exam_Mapping for that Exam_Type:', notInExamTypeCount);
  console.log('- Rows where subject is not in Batches for that Batch:', notInBatchCount);
  console.log('Sample mismatches:', sampleMismatch);
}

main().catch(console.error).finally(() => process.exit(0));
