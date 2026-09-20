import { google } from 'googleapis';

const EMPLOYEE_SPREADSHEET_ID = process.env.EMPLOYEE_DB_ID || '1AxdiOpaij8Lnx0TV5iMhgVlADfN0LeXzwOdmbzmrlGA';
const ACADEMIC_SPREADSHEET_ID = process.env.ACADEMIC_DB_ID || '1DK4OpEdEDh2z_Ng9vIHbci41yBLSQ2m4ZXI7sqA7mJs';
const TEACHER_APP_SPREADSHEET_ID = process.env.TEACHER_APP_DB_ID || '1IR48k48Koil2lHv_coP8yBmLYUcGBOy_9xgdd9t6YR8';

const FINAL_RESULTS_FIELD_ALIASES = {
  testid: ['Test ID', 'TestId', 'testid'],
  examdate: ['Exam Date', 'ExamDate', 'Date', 'examdate'],
  batchname: ['Batch Name', 'Batch', 'batchname'],
  examtype: ['Exam Type', 'Type', 'examtype'],
  studentid: ['Student ID', 'StudentId', 'StudentsID', 'studentid', 'studentsid'],
  studentname: ['Student Name', 'studentname'],
  rank: ['Rank', 'rank'],
  totalobtainedmarks: ['Total Obtained Marks', 'Marks Obtained', 'Total Marks Obtained', 'totalobtainedmarks'],
  examtotalmaxmarks: ['Exam Total Max Marks', 'Exam Max Marks', 'Total Max Marks', 'examtotalmaxmarks'],
  subjectname: ['Subject Name', 'Subject', 'subjectname'],
  subjectobtainedmarks: ['Subject Obtained Marks', 'Subject Marks', 'Obtained Marks', 'subjectobtainedmarks'],
  subjectmaxmarks: ['Subject Max Marks', 'Subject Total Marks', 'Max Marks', 'subjectmaxmarks']
};

let sheetsClient = null;

function getAuthClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google Service Account credentials in environment variables.');
  }

  // Handle escaped \n characters in private key
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return auth;
}

export function getSheetsApi() {
  if (!sheetsClient) {
    const auth = getAuthClient();
    sheetsClient = google.sheets({ version: 'v4', auth });
  }
  return sheetsClient;
}

export function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function cleanText(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

export function normalizeComparable(value) {
  return cleanText(value).toLowerCase();
}

export function getValue(record, aliases) {
  for (let index = 0; index < aliases.length; index += 1) {
    const alias = normalizeHeader(aliases[index]);
    if (Object.prototype.hasOwnProperty.call(record, alias) && cleanText(record[alias]) !== '') {
      return record[alias];
    }
  }
  return '';
}

export function mapRecordFields(record, fieldAliases) {
  const mappedRecord = {};
  Object.keys(fieldAliases).forEach((fieldName) => {
    mappedRecord[fieldName] = getValue(record, fieldAliases[fieldName]);
  });
  Object.keys(record).forEach((fieldName) => {
    if (!Object.prototype.hasOwnProperty.call(mappedRecord, fieldName)) {
      mappedRecord[fieldName] = record[fieldName];
    }
  });
  return mappedRecord;
}

/**
 * Fetch raw sheet data and shape into normalized objects
 */
export async function getSheetRecords(spreadsheetId, sheetName) {
  const sheets = getSheetsApi();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'`,
    valueRenderOption: 'FORMATTED_VALUE'
  });

  const values = res.data.values || [];
  if (!values.length) return [];

  const headers = values[0].map(h => normalizeHeader(h));
  const rows = values.slice(1);

  const records = rows
    .filter(row => row && row.some(cell => cleanText(cell) !== ''))
    .map(row => {
      const record = {};
      headers.forEach((header, idx) => {
        if (header) {
          record[header] = cleanText(row[idx]);
        }
      });
      return record;
    });

  return records;
}

/**
 * 1. Fetch Remote Employees
 */
export async function fetchRemoteEmployees() {
  const records = await getSheetRecords(EMPLOYEE_SPREADSHEET_ID, 'Employees');
  return records.map(r => {
    const employeeId = getValue(r, ['employeeid']);
    const status = getValue(r, ['status']);
    const name = getValue(r, ['name']);
    const department = [
      getValue(r, ['department']),
      getValue(r, ['subdepartment']),
      getValue(r, ['otherdepartment'])
    ].filter(Boolean).join(' / ') || 'N/A';
    const role = [
      getValue(r, ['role']),
      getValue(r, ['otherrole'])
    ].filter(Boolean).join(' / ') || 'N/A';
    const email = getValue(r, ['email']) || 'N/A';
    const contact = getValue(r, ['contact']) || '';

    return {
      employeeId,
      status: normalizeComparable(status),
      name,
      department,
      role,
      email,
      contact
    };
  }).filter(e => Boolean(e.employeeId));
}

/**
 * 2. Fetch Remote Students
 */
export async function fetchRemoteStudents() {
  const records = await getSheetRecords(ACADEMIC_SPREADSHEET_ID, 'students_database');
  return records.map(r => ({
    studentId: getValue(r, ['studentsid', 'studentid']),
    studentName: getValue(r, ['studentname']),
    fatherName: getValue(r, ['fathersname', 'fathername']),
    batch: getValue(r, ['batch']),
    className: getValue(r, ['class']),
    school: getValue(r, ['presentschool']),
    mobile: getValue(r, ['mobilenumbers']),
    email: getValue(r, ['email']),
    program: getValue(r, ['program']),
    dob: getValue(r, ['dob'])
  })).filter(s => Boolean(s.studentId));
}

/**
 * 3. Fetch Remote Batches
 */
export async function fetchRemoteBatches() {
  const records = await getSheetRecords(ACADEMIC_SPREADSHEET_ID, 'Batches');
  const subjectLabels = {
    mathematics: 'Mathematics',
    reasoning: 'Reasoning',
    generalknowledge: 'General Knowledge',
    english: 'English',
    hindi: 'Hindi'
  };

  return records.map(r => {
    const batchName = getValue(r, ['batches', 'batch']);
    const classRoom = getValue(r, ['classroom']);
    const writingClass = getValue(r, ['writingclass']);
    const actualClass = getValue(r, ['actualclass']);

    const subjectsOffered = [];
    Object.keys(subjectLabels).forEach(key => {
      const val = normalizeComparable(getValue(r, [key]));
      if (val !== '' && !/^(0|false|no|n\/a|-)$/.test(val)) {
        subjectsOffered.push(subjectLabels[key]);
      }
    });

    const genericSubject = getValue(r, ['subject']);
    if (genericSubject) {
      genericSubject.split(/[,|]/)
        .map(s => cleanText(s))
        .filter(Boolean)
        .forEach(s => {
          if (!subjectsOffered.includes(s)) subjectsOffered.push(s);
        });
    }

    return {
      batchName,
      classRoom: classRoom || '-',
      writingClass: writingClass || '-',
      actualClass: actualClass || '-',
      subjectsOffered: JSON.stringify(subjectsOffered)
    };
  }).filter(b => Boolean(b.batchName));
}

/**
 * 4. Fetch Remote Attendance
 */
export async function fetchRemoteAttendance() {
  const records = await getSheetRecords(TEACHER_APP_SPREADSHEET_ID, "Student'sAttendenceData");
  return records.map(r => ({
    studentId: getValue(r, ['studentsid', 'studentid']),
    date: getValue(r, ['date']),
    batch: getValue(r, ['batch']),
    presenceType: getValue(r, ['presencetype']),
    teacherId: getValue(r, ['teacherid']),
    teacherName: getValue(r, ['teachername']),
    callReason: getValue(r, ['callreason'])
  })).filter(a => Boolean(a.studentId));
}

/**
 * 5. Fetch Remote Homework
 */
export async function fetchRemoteHomework() {
  const records = await getSheetRecords(TEACHER_APP_SPREADSHEET_ID, 'Homework_data');
  return records.map(r => {
    const rawDuration = cleanText(getValue(r, ['durationmin'])).replace(/,/g, '');
    const durationMin = parseFloat(rawDuration) || 0;
    return {
      studentId: getValue(r, ['studentid', 'studentsid']),
      date: getValue(r, ['date']),
      subject: getValue(r, ['subject']),
      status: getValue(r, ['status']),
      finalStatus: getValue(r, ['finalstatus']),
      durationMin,
      teacherId: getValue(r, ['teacherid']),
      teacherName: getValue(r, ['teachername']),
      startTime: getValue(r, ['starttime']),
      endTime: getValue(r, ['endtime'])
    };
  }).filter(h => Boolean(h.studentId));
}

/**
 * 6. Fetch Remote Exam Results
 */
export async function fetchRemoteExamResults() {
  const rawRecords = await getSheetRecords(ACADEMIC_SPREADSHEET_ID, 'Final_Results');
  return rawRecords.map(r => {
    const mapped = mapRecordFields(r, FINAL_RESULTS_FIELD_ALIASES);
    const parseNum = (val) => {
      const clean = cleanText(val).replace(/,/g, '');
      const n = parseFloat(clean.replace(/[^\d.-]/g, ''));
      return isNaN(n) ? 0 : n;
    };

    return {
      testId: mapped.testid || '',
      examDate: mapped.examdate || '',
      batchName: mapped.batchname || '',
      examType: mapped.examtype || '',
      studentId: mapped.studentid || '',
      studentName: mapped.studentname || '',
      rank: parseNum(mapped.rank),
      totalObtainedMarks: parseNum(mapped.totalobtainedmarks),
      examTotalMaxMarks: parseNum(mapped.examtotalmaxmarks),
      subjectName: mapped.subjectname || 'Unknown Subject',
      subjectObtainedMarks: parseNum(mapped.subjectobtainedmarks),
      subjectMaxMarks: parseNum(mapped.subjectmaxmarks)
    };
  }).filter(res => Boolean(res.studentId));
}

/**
 * 7. Fetch Remote Complaints
 */
export async function fetchRemoteComplaints() {
  const records = await getSheetRecords(ACADEMIC_SPREADSHEET_ID, 'StudentComplaints');
  return records.map(r => ({
    complaintId: getValue(r, ['complaintid']),
    date: getValue(r, ['date', 'submittedat']),
    teacherName: getValue(r, ['teachername']),
    teacherEmployeeId: getValue(r, ['teacheremployeeid']),
    department: getValue(r, ['department']),
    studentName: getValue(r, ['studentname']),
    studentId: getValue(r, ['studentid']),
    batch: getValue(r, ['batch']),
    complaintText: getValue(r, ['complainttext']),
    status: getValue(r, ['status']) || 'Pending',
    pdfLink: getValue(r, ['pdflink']),
    submittedAt: getValue(r, ['submittedat', 'date'])
  })).filter(c => Boolean(c.complaintId || c.studentId));
}

/**
 * Append a new complaint row into Google Sheets (Academic DB -> StudentComplaints)
 */
export async function appendRemoteComplaint(complaint) {
  const sheets = getSheetsApi();
  const row = [
    complaint.complaintId || `CMP-${Date.now()}`,
    complaint.date || new Date().toISOString().split('T')[0],
    complaint.teacherName || '',
    complaint.teacherEmployeeId || '',
    complaint.department || '',
    complaint.studentName || '',
    complaint.studentId || '',
    complaint.batch || '',
    complaint.complaintText || '',
    complaint.status || 'Pending',
    complaint.pdfLink || '',
    complaint.submittedAt || new Date().toISOString()
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: ACADEMIC_SPREADSHEET_ID,
    range: `'StudentComplaints'!A:L`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row]
    }
  });

  return { success: true };
}
