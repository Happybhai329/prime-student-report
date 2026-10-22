import dotenv from 'dotenv';
dotenv.config();
import { getSheetsApi } from '../server/googleSheets.js';

async function main() {
  const sheets = getSheetsApi();
  const spreadsheetId = process.env.ACADEMIC_DB_ID || '1DK4OpEdEDh2z_Ng9vIHbci41yBLSQ2m4ZXI7sqA7mJs';
  
  const examMappingRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'Exam_Mapping'`
  });
  console.log('=== ALL EXAM MAPPING ROWS ===');
  console.log(JSON.stringify(examMappingRes.data.values, null, 2));

  const batchesRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'Batches'`
  });
  console.log('=== ALL BATCHES ROWS ===');
  console.log(JSON.stringify(batchesRes.data.values, null, 2));
}

main().catch(console.error);
