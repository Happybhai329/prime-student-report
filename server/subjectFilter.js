import { query } from './db.js';

let cachedExamMapping = null;
let lastMappingFetch = 0;
const MAPPING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function normalizeText(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Returns canonical base subject name (e.g. "ENGLISH(OPTIONAL)" -> "ENGLISH")
 */
export function getBaseSubject(subjectName) {
  const s = String(subjectName || '').toUpperCase().trim();
  if (s.includes('HINDI') && s.includes('READING')) return 'READING';
  if (s.includes('READING')) return 'READING';
  if (s.includes('HINDI')) return 'HINDI';
  if (s.includes('ENGLISH')) return 'ENGLISH';
  if (s.includes('MATH')) return 'MATHEMATICS';
  if (s.includes('REASON')) return 'REASONING';
  if (s.includes('SCIENCE')) return 'SCIENCE';
  if (s.includes('SOCIAL') || s.includes('SST')) return 'SOCIAL STUDIES';
  if (s.includes('GENERAL') || s.includes('GK')) return 'GENERAL KNOWLEDGE';
  return s;
}

/**
 * Check if a subject is offered in the student's batch
 */
export function isSubjectAllowedInBatch(subjectName, batchSubjects) {
  if (!batchSubjects || !Array.isArray(batchSubjects) || batchSubjects.length === 0) {
    return true; // No batch restriction known
  }
  const base = getBaseSubject(subjectName);
  const normBase = normalizeText(base);

  return batchSubjects.some(bs => {
    const bBase = getBaseSubject(bs);
    const normBBase = normalizeText(bBase);
    return normBBase === normBase || normalizeText(bs).includes(normBase) || normBase.includes(normBBase);
  });
}

/**
 * Check if a subject belongs to the exam type according to Exam_Mapping
 */
export function isSubjectAllowedInExamType(subjectName, examType, examMapping) {
  if (!examType || examType === 'ALL' || !examMapping) {
    return true;
  }
  const normType = normalizeText(examType);
  const validForType = examMapping[normType];
  if (!validForType || validForType.length === 0) {
    return true; // If exam type is not mapped, do not arbitrarily reject
  }

  const base = getBaseSubject(subjectName);
  const normBase = normalizeText(base);

  return validForType.some(mappedSub => {
    const mBase = getBaseSubject(mappedSub.subjectName);
    const normMBase = normalizeText(mBase);
    return normMBase === normBase || normalizeText(mappedSub.subjectName).includes(normBase) || normBase.includes(normMBase);
  });
}

/**
 * Find mapped max marks for a given exam type and subject
 */
export function getMappedSubjectMaxMarks(subjectName, examType, examMapping) {
  if (!examType || !examMapping) return null;
  const normType = normalizeText(examType);
  const validForType = examMapping[normType];
  if (!validForType || validForType.length === 0) return null;

  const base = getBaseSubject(subjectName);
  const normBase = normalizeText(base);

  const found = validForType.find(m => {
    const mBase = getBaseSubject(m.subjectName);
    return normalizeText(mBase) === normBase;
  });

  return found && found.subMax > 0 ? found.subMax : null;
}

/**
 * Load and cache exam_mapping table as a lookup dictionary
 */
export async function getExamMappingLookup() {
  const now = Date.now();
  if (cachedExamMapping && (now - lastMappingFetch < MAPPING_CACHE_TTL)) {
    return cachedExamMapping;
  }

  try {
    const res = await query('SELECT exam_type, subject_name, subject_max_marks, exam_total_max_marks FROM exam_mapping');
    const mapping = {};
    res.rows.forEach(r => {
      const examType = (r.exam_type || '').trim();
      const subjectName = (r.subject_name || '').trim();
      const subMax = Number(r.subject_max_marks) || 0;
      const examMax = Number(r.exam_total_max_marks) || 0;
      if (!examType || !subjectName) return;

      const key = normalizeText(examType);
      if (!mapping[key]) mapping[key] = [];
      mapping[key].push({ examType, subjectName, subMax, examMax });
    });

    cachedExamMapping = mapping;
    lastMappingFetch = now;
    return cachedExamMapping;
  } catch (err) {
    console.error('[SubjectFilter] Failed to load exam mapping from DB:', err.message);
    return cachedExamMapping || {};
  }
}

/**
 * Invalidate exam mapping cache (e.g. after inbound sync)
 */
export function invalidateExamMappingCache() {
  cachedExamMapping = null;
  lastMappingFetch = 0;
}

/**
 * Filter and recalculate student exam results
 * 
 * @param {Object} options
 * @param {Array} options.rawRows - Raw rows from exam_results
 * @param {Array} options.batchSubjects - Array of subjects offered in student's batch
 * @param {Object} options.examMapping - Exam mapping lookup dictionary
 * @returns {Object} { filteredRows, testsByKey, testRows, subjectMap, subjectWise }
 */
export function filterAndRecalculateExamResults({ rawRows = [], batchSubjects = [], examMapping = {} }) {
  if (!rawRows || rawRows.length === 0) {
    return {
      filteredRows: [],
      testsByKey: {},
      testRows: [],
      subjectMap: {},
      subjectWise: []
    };
  }

  // 1. Deduplicate identical rows (handling Google Sheet duplicate row entries)
  const seenKey = new Set();
  const dedupedRows = [];
  rawRows.forEach(r => {
    const key = `${r.test_id || ''}::${r.exam_date || ''}::${r.subject_name || ''}::${r.subject_obtained_marks || 0}`;
    if (!seenKey.has(key)) {
      seenKey.add(key);
      dedupedRows.push(r);
    }
  });

  // 2. Identify optional language activity
  const optionalLanguageScores = {
    HINDI: 0,
    ENGLISH: 0
  };

  dedupedRows.forEach(r => {
    const sName = (r.subject_name || '').toUpperCase();
    const obt = Number(r.subject_obtained_marks) || 0;
    if (sName.includes('OPTIONAL')) {
      if (sName.includes('HINDI')) optionalLanguageScores.HINDI += obt;
      if (sName.includes('ENGLISH')) optionalLanguageScores.ENGLISH += obt;
    }
  });

  // 3. Filter rows based on:
  //    - Rule A: Batch curriculum (isSubjectAllowedInBatch)
  //    - Rule B: Exam type definition (isSubjectAllowedInExamType)
  //    - Rule C: Optional language selection
  const filteredRows = dedupedRows.filter(r => {
    const sName = r.subject_name || '';
    if (!sName) return false;

    // Rule A: Batch filter
    if (!isSubjectAllowedInBatch(sName, batchSubjects)) {
      return false;
    }

    // Rule B: Exam Type filter
    if (!isSubjectAllowedInExamType(sName, r.exam_type, examMapping)) {
      return false;
    }

    // Rule C: Optional Language Filter
    if (sName.toUpperCase().includes('(OPTIONAL)')) {
      const obt = Number(r.subject_obtained_marks) || 0;
      if (obt === 0) {
        // If other optional language in SAME test had > 0 marks, student did not choose this one
        const testId = r.test_id;
        const sameTestRows = dedupedRows.filter(o => o.test_id === testId);
        const hasOtherAttempted = sameTestRows.some(o => 
          (o.subject_name || '').toUpperCase().includes('(OPTIONAL)') && 
          o.subject_name !== r.subject_name && 
          Number(o.subject_obtained_marks) > 0
        );
        if (hasOtherAttempted) {
          return false;
        }

        // If student NEVER scored in this optional language across tests, but did in the other:
        const base = getBaseSubject(sName);
        if (base === 'HINDI' && optionalLanguageScores.HINDI === 0 && optionalLanguageScores.ENGLISH > 0) {
          return false;
        }
        if (base === 'ENGLISH' && optionalLanguageScores.ENGLISH === 0 && optionalLanguageScores.HINDI > 0) {
          return false;
        }
      }
    }

    return true;
  });

  // 4. Group by test and calculate test totals and subject statistics
  const testsByKey = {};
  const subjectMap = {};

  filteredRows.forEach(r => {
    const testKey = [r.test_id, r.exam_date, r.exam_type, r.batch_name].map(s => String(s || '').trim()).join('::');
    const subject = r.subject_name || 'Unknown Subject';
    const rawObt = Number(r.subject_obtained_marks) || 0;
    
    // Check authoritative max marks from Exam_Mapping first
    let mappedMax = getMappedSubjectMaxMarks(subject, r.exam_type, examMapping);
    let rawMax = mappedMax || Number(r.subject_max_marks) || 0;

    // Sanitize any remaining corrupt max marks
    if (rawMax <= 0 || rawObt > rawMax) {
      if (rawObt > 150) rawMax = 200;
      else if (rawObt > 100) rawMax = 150;
      else if (rawObt > 50) rawMax = 100;
      else if (rawObt > 30) rawMax = 50;
      else if (rawObt > 20) rawMax = 30;
      else if (rawMax <= 0) rawMax = 50;
      else rawMax = Math.ceil(rawObt / 10) * 10;
    }

    if (!testsByKey[testKey]) {
      testsByKey[testKey] = {
        testId: r.test_id || testKey,
        examDate: r.exam_date || '-',
        examType: (r.exam_type || '-').trim(),
        batchName: r.batch_name || '-',
        rank: Number(r.rank) || null,
        subjects: [],
        calculatedObtained: 0,
        calculatedMax: 0
      };
    }

    testsByKey[testKey].subjects.push({
      subjectName: subject,
      subjectObtainedMarks: rawObt,
      subjectMaxMarks: rawMax
    });

    testsByKey[testKey].calculatedObtained += rawObt;
    testsByKey[testKey].calculatedMax += rawMax;

    if (!subjectMap[subject]) {
      subjectMap[subject] = { obtained: 0, maxMarks: 0, count: 0, pcts: [] };
    }
    subjectMap[subject].obtained += rawObt;
    subjectMap[subject].maxMarks += rawMax;
    subjectMap[subject].count += 1;
    const testSubPct = rawMax > 0 ? Math.min(100, Math.max(0, (rawObt / rawMax) * 100)) : 0;
    subjectMap[subject].pcts.push(testSubPct);
  });

  // 5. Build sanitized test rows
  const testRows = Object.values(testsByKey).map(test => {
    const totalObtained = test.calculatedObtained;
    const totalMax = test.calculatedMax;
    const percentage = totalMax > 0
      ? Number(Math.min(100, Math.max(0, (totalObtained / totalMax) * 100)).toFixed(1))
      : 0;

    return {
      testId: test.testId,
      examDate: test.examDate,
      examType: test.examType,
      batchName: test.batchName,
      totalObtainedMarks: totalObtained,
      examTotalMaxMarks: totalMax,
      percentage,
      rank: test.rank,
      subjects: test.subjects
    };
  });

  // 6. Build sanitized subjectWise array
  const subjectWise = Object.keys(subjectMap).map(subName => {
    const stats = subjectMap[subName];
    const avgPct = stats.pcts && stats.pcts.length
      ? Number((stats.pcts.reduce((a, b) => a + b, 0) / stats.pcts.length).toFixed(1))
      : (stats.maxMarks ? Number(Math.min(100, (stats.obtained / stats.maxMarks) * 100).toFixed(1)) : 0);
    const percentage = Math.min(100, Math.max(0, avgPct));
    let status = 'Average';
    if (percentage >= 80) status = 'Strong';
    else if (percentage < 50) status = 'Weak';

    return {
      subjectName: subName,
      averageObtainedMarks: Number((stats.obtained / stats.count).toFixed(1)),
      averageMaxMarks: Number((stats.maxMarks / stats.count).toFixed(1)),
      percentage,
      status
    };
  }).sort((a, b) => b.percentage - a.percentage);

  return {
    filteredRows,
    testsByKey,
    testRows,
    subjectMap,
    subjectWise
  };
}
