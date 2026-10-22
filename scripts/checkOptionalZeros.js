import dotenv from 'dotenv';
dotenv.config();
import { initDatabase, query } from '../server/db.js';

async function main() {
  await initDatabase();
  const res = await query(`
    SELECT student_id, student_name, batch_name, subject_name, subject_obtained_marks, subject_max_marks 
    FROM exam_results 
    WHERE subject_name ILIKE '%OPTIONAL%' AND subject_obtained_marks = 0
    LIMIT 20
  `);
  console.log('Sample optional zero rows:', res.rows);
}

main().catch(console.error).finally(() => process.exit(0));
