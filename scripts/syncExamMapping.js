import dotenv from 'dotenv';
dotenv.config();
import { initDatabase, query, batchInsert } from '../server/db.js';
import { fetchRemoteExamMapping } from '../server/googleSheets.js';

async function main() {
  await initDatabase();
  console.log('Fetching Exam_Mapping from Google Sheets...');
  const mappings = await fetchRemoteExamMapping();
  console.log(`Fetched ${mappings.length} mappings from sheet.`);

  await query('DELETE FROM exam_mapping');
  await batchInsert(
    'exam_mapping',
    ['exam_type', 'subject_name', 'subject_max_marks', 'exam_total_max_marks'],
    mappings.map(m => ({
      exam_type: m.examType,
      subject_name: m.subjectName,
      subject_max_marks: m.subjectMaxMarks,
      exam_total_max_marks: m.examTotalMaxMarks
    })),
    100
  );

  const res = await query('SELECT COUNT(*) as count FROM exam_mapping');
  console.log(`Successfully populated exam_mapping in PostgreSQL! Total rows in DB: ${res.rows[0].count}`);

  const sample = await query('SELECT exam_type, subject_name, subject_max_marks, exam_total_max_marks FROM exam_mapping LIMIT 10');
  console.log('Sample rows in DB:', sample.rows);
}

main().catch(console.error).finally(() => process.exit(0));
