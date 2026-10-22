import dotenv from 'dotenv';
dotenv.config();
import { initDatabase, query } from '../server/db.js';

async function main() {
  await initDatabase();
  const res = await query("SELECT * FROM exam_results WHERE student_id = '2603060003' AND test_id = '260401'");
  console.log('260401 rows:', res.rows.map(r => ({ sub: r.subject_name, obt: r.subject_obtained_marks, max: r.subject_max_marks, batch: r.batch_name })));
}

main().catch(console.error).finally(() => process.exit(0));
