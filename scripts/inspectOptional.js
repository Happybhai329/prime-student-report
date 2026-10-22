import dotenv from 'dotenv';
dotenv.config();
import { initDatabase, query } from '../server/db.js';

async function main() {
  await initDatabase();
  const res = await query(`
    SELECT student_id, student_name, subject_name, subject_obtained_marks, subject_max_marks 
    FROM exam_results 
    WHERE test_id = '260304' AND batch_name ILIKE '%TPC-01%'
    LIMIT 25
  `);
  console.log('Sample TPC-01 test 260304 rows:', res.rows);
}

main().catch(console.error).finally(() => process.exit(0));
