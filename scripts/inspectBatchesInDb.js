import dotenv from 'dotenv';
dotenv.config();
import { initDatabase, query } from '../server/db.js';

async function main() {
  await initDatabase();
  const res = await query('SELECT batch_name, subjects_offered FROM batches LIMIT 15');
  console.log('Batches in DB:', res.rows);
}

main().catch(console.error).finally(() => process.exit(0));
