import dotenv from 'dotenv';
dotenv.config();
import { getSheetsApi } from '../server/googleSheets.js';

async function main() {
  const sheets = getSheetsApi();
  const spreadsheetId = process.env.ACADEMIC_DB_ID || '1DK4OpEdEDh2z_Ng9vIHbci41yBLSQ2m4ZXI7sqA7mJs';
  
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  console.log('Sheets in Academic DB:');
  meta.data.sheets.forEach(s => {
    console.log(`- ${s.properties.title} (id: ${s.properties.sheetId})`);
  });

  // Get Exam_Mapping data
  const examMappingRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'Exam_Mapping'`
  });
  console.log('\nExam_Mapping rows count:', examMappingRes.data.values?.length);
  console.log('Exam_Mapping sample rows:', examMappingRes.data.values?.slice(0, 15));

  // Get Batches data
  const batchesRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'Batches'`
  });
  console.log('\nBatches rows count:', batchesRes.data.values?.length);
  console.log('Batches sample rows:', batchesRes.data.values?.slice(0, 10));
}

main().catch(console.error);
