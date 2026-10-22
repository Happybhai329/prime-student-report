import dotenv from 'dotenv';
dotenv.config();
import { initDatabase, query } from '../server/db.js';
import { getExamMappingLookup, filterAndRecalculateExamResults } from '../server/subjectFilter.js';

async function main() {
  await initDatabase();
  const mapping = await getExamMappingLookup();
  console.log('Mapping keys in DB:', Object.keys(mapping));

  // Test with student Girraj Sharma (RIMC)
  const student = await query("SELECT student_id, student_name, batch FROM students WHERE student_id = '2603060003'");
  const batchRes = await query("SELECT subjects_offered FROM batches WHERE LOWER(batch_name) = LOWER($1)", [student.rows[0].batch]);
  let batchSubs = [];
  try { batchSubs = JSON.parse(batchRes.rows[0].subjects_offered); } catch { batchSubs = []; }

  const examRows = await query("SELECT * FROM exam_results WHERE student_id = '2603060003'");
  console.log(`Raw rows count: ${examRows.rows.length}`);

  const filtered = filterAndRecalculateExamResults({
    rawRows: examRows.rows,
    batchSubjects: batchSubs,
    examMapping: mapping
  });

  console.log('Filtered subjectWise:', filtered.subjectWise);
  console.log('Sample test rows:', filtered.testRows.slice(0, 3));
}

main().catch(console.error).finally(() => process.exit(0));
