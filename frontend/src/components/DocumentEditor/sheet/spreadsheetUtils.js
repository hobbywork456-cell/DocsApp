// Utility functions and formula engine for Spreadsheet Editor
//
// The engine is a small Excel-compatible pipeline: tokenize -> parse (precedence climbing) -> evaluate.
// It supports operators (+ - * / ^ & % and comparisons), cell references (A1, $A$1, Sheet2!B3),
// ranges (A1:C9), nested function calls and ~70 common Excel functions.

// Convert column index (0-based) to letter: 0 -> A, 1 -> B, 25 -> Z, 26 -> AA
export const getColLetter = (index) => {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Convert column letter to index: 'A' -> 0, 'B' -> 1, 'AA' -> 26
export const getColIndex = (letter) => {
  let index = 0;
  const upper = letter.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
};

// 'B3' -> { col: 1, row: 3 }
export const parseCoord = (coord) => {
  const m = /^\$?([A-Z]+)\$?([0-9]+)$/i.exec(coord.trim());
  if (!m) return null;
  return { col: getColIndex(m[1]), row: parseInt(m[2], 10) };
};

export const toCoord = (row, col) => `${getColLetter(col)}${row}`;

// Expand cell range string like 'A1:C3' into array of cell coordinates ['A1', 'A2', 'A3', 'B1', ...]
export const expandRange = (rangeStr) => {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return [rangeStr.trim().toUpperCase()];
  const a = parseCoord(parts[0]);
  const b = parseCoord(parts[1]);
  if (!a || !b) return [];
  const coords = [];
  for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
    for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
      coords.push(toCoord(r, c));
    }
  }
  return coords;
};

// ─────────────────────────────────────────────────────────────
// Errors & coercion
// ─────────────────────────────────────────────────────────────

class FormulaError {
  constructor(code) {
    this.code = code;
  }
  toString() {
    return this.code;
  }
}
const ERR = (code) => new FormulaError(code);
const isErr = (v) => v instanceof FormulaError;
const ERROR_CODES = ['#DIV/0!', '#VALUE!', '#NAME?', '#REF!', '#N/A', '#NUM!', '#CIRC!', '#ERROR!', '#NULL!'];

// Range values are carried as { rows: [[...], ...] } so lookups keep their 2D shape
const isRange = (v) => v !== null && typeof v === 'object' && Array.isArray(v.rows);
const flatten = (args) => {
  const out = [];
  args.forEach((a) => {
    if (isRange(a)) a.rows.forEach((row) => row.forEach((v) => out.push(v)));
    else out.push(a);
  });
  return out;
};
const firstValue = (v) => (isRange(v) ? (v.rows[0] ? v.rows[0][0] : null) : v);

const toNumber = (v) => {
  v = firstValue(v);
  if (isErr(v)) return v;
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = String(v).trim().replace(/,/g, '');
  if (/%$/.test(s) && !isNaN(Number(s.slice(0, -1)))) return Number(s.slice(0, -1)) / 100;
  const n = Number(s);
  return s !== '' && !isNaN(n) ? n : ERR('#VALUE!');
};
const toText = (v) => {
  v = firstValue(v);
  if (isErr(v)) return v;
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(cleanNumber(v));
  return String(v);
};
const toBool = (v) => {
  v = firstValue(v);
  if (isErr(v)) return v;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === null || v === '') return false;
  const s = String(v).toUpperCase();
  if (s === 'TRUE') return true;
  if (s === 'FALSE') return false;
  return ERR('#VALUE!');
};
// Strip floating point noise: 0.1 + 0.2 -> 0.3
const cleanNumber = (n) => (Number.isFinite(n) ? Number(n.toPrecision(15)) : n);

// Numbers only (used by SUM/AVERAGE etc.: text and blanks in ranges are ignored like Excel)
const numbersOf = (args) => {
  const nums = [];
  for (const a of args) {
    if (isRange(a)) {
      for (const row of a.rows) for (const v of row) {
        if (isErr(v)) return v;
        if (typeof v === 'number') nums.push(v);
      }
    } else {
      if (a === null || a === '') continue;
      const n = toNumber(a);
      if (isErr(n)) return n;
      nums.push(n);
    }
  }
  return nums;
};

// ─────────────────────────────────────────────────────────────
// Dates (Excel serial numbers: days since 1899-12-30)
// ─────────────────────────────────────────────────────────────

const EPOCH = Date.UTC(1899, 11, 30);
export const dateToSerial = (d) => (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000
  + (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
export const serialToDate = (serial) => {
  const ms = EPOCH + Math.round(serial * 86400000);
  const u = new Date(ms);
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), u.getUTCHours(), u.getUTCMinutes(), u.getUTCSeconds());
};

// ─────────────────────────────────────────────────────────────
// Criteria matching for SUMIF / COUNTIF / AVERAGEIF(S)
// ─────────────────────────────────────────────────────────────

const makeCriteria = (crit) => {
  if (typeof crit === 'number' || typeof crit === 'boolean') {
    return (v) => (typeof v === 'string' ? toNumber(v) === Number(crit) : v === crit);
  }
  const s = toText(crit);
  const m = /^(<=|>=|<>|=|<|>)?(.*)$/.exec(s);
  const op = m[1] || '=';
  const operand = m[2];
  const num = operand !== '' && !isNaN(Number(operand)) ? Number(operand) : null;

  if (num !== null) {
    return (v) => {
      if (v === null || v === '') return op === '<>';
      const n = typeof v === 'number' ? v : (isNaN(Number(v)) ? null : Number(v));
      if (n === null) return op === '<>';
      switch (op) {
        case '<': return n < num;
        case '>': return n > num;
        case '<=': return n <= num;
        case '>=': return n >= num;
        case '<>': return n !== num;
        default: return n === num;
      }
    };
  }
  // Text criteria with * and ? wildcards, case-insensitive
  const pattern = new RegExp('^' + operand.toLowerCase().replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  return (v) => {
    const t = v === null ? '' : toText(v).toLowerCase();
    if (op === '<>') return !pattern.test(t);
    if (op === '=') return pattern.test(t);
    return op === '<' ? t < operand.toLowerCase() : op === '>' ? t > operand.toLowerCase()
      : op === '<=' ? t <= operand.toLowerCase() : t >= operand.toLowerCase();
  };
};

// ─────────────────────────────────────────────────────────────
// Function library
// ─────────────────────────────────────────────────────────────

const numFn = (fn) => (args) => {
  const ns = args.map(toNumber);
  const e = ns.find(isErr);
  return e || fn(...ns);
};
const roundTo = (n, digits, mode) => {
  const f = Math.pow(10, digits);
  const x = n * f;
  const r = mode === 'up' ? Math.sign(x) * Math.ceil(Math.abs(x) - 1e-9)
    : mode === 'down' ? Math.sign(x) * Math.floor(Math.abs(x) + 1e-9)
    : Math.sign(x) * Math.round(Math.abs(x) + 1e-9);
  return r / f;
};
const lookupEquals = (a, b) => {
  if (typeof a === 'string' || typeof b === 'string') return toText(a).toLowerCase() === toText(b).toLowerCase();
  return a === b;
};

const FUNCTIONS = {
  // Math & statistics
  SUM: (args) => { const n = numbersOf(args); return isErr(n) ? n : n.reduce((a, b) => a + b, 0); },
  AVERAGE: (args) => { const n = numbersOf(args); return isErr(n) ? n : n.length ? n.reduce((a, b) => a + b, 0) / n.length : ERR('#DIV/0!'); },
  MIN: (args) => { const n = numbersOf(args); return isErr(n) ? n : n.length ? Math.min(...n) : 0; },
  MAX: (args) => { const n = numbersOf(args); return isErr(n) ? n : n.length ? Math.max(...n) : 0; },
  PRODUCT: (args) => { const n = numbersOf(args); return isErr(n) ? n : n.reduce((a, b) => a * b, 1); },
  MEDIAN: (args) => {
    const n = numbersOf(args);
    if (isErr(n)) return n;
    if (!n.length) return ERR('#NUM!');
    const s = [...n].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  },
  STDEV: (args) => {
    const n = numbersOf(args);
    if (isErr(n)) return n;
    if (n.length < 2) return ERR('#DIV/0!');
    const mean = n.reduce((a, b) => a + b, 0) / n.length;
    return Math.sqrt(n.reduce((a, b) => a + (b - mean) ** 2, 0) / (n.length - 1));
  },
  COUNT: (args) => flatten(args).filter((v) => typeof v === 'number').length,
  COUNTA: (args) => flatten(args).filter((v) => v !== null && v !== '').length,
  COUNTBLANK: (args) => flatten(args).filter((v) => v === null || v === '').length,
  ABS: numFn(Math.abs),
  SQRT: numFn((n) => (n < 0 ? ERR('#NUM!') : Math.sqrt(n))),
  POWER: numFn((a, b) => Math.pow(a, b)),
  EXP: numFn(Math.exp),
  LN: numFn((n) => (n <= 0 ? ERR('#NUM!') : Math.log(n))),
  LOG10: numFn((n) => (n <= 0 ? ERR('#NUM!') : Math.log10(n))),
  MOD: numFn((a, b) => (b === 0 ? ERR('#DIV/0!') : a - b * Math.floor(a / b))),
  INT: numFn(Math.floor),
  ROUND: numFn((n, d = 0) => roundTo(n, d)),
  ROUNDUP: numFn((n, d = 0) => roundTo(n, d, 'up')),
  ROUNDDOWN: numFn((n, d = 0) => roundTo(n, d, 'down')),
  TRUNC: numFn((n, d = 0) => roundTo(n, d, 'down')),
  CEILING: numFn((n, s = 1) => (s === 0 ? 0 : Math.ceil(n / s) * s)),
  FLOOR: numFn((n, s = 1) => (s === 0 ? ERR('#DIV/0!') : Math.floor(n / s) * s)),
  SIGN: numFn(Math.sign),
  PI: () => Math.PI,
  RAND: () => Math.random(),
  RANDBETWEEN: numFn((a, b) => Math.floor(Math.random() * (Math.floor(b) - Math.ceil(a) + 1)) + Math.ceil(a)),

  // Logical (IF / IFERROR / IFS are lazy and handled by the evaluator)
  AND: (args) => { const vs = flatten(args).filter((v) => v !== null && v !== ''); const bs = vs.map(toBool); return bs.find(isErr) || bs.every(Boolean); },
  OR: (args) => { const vs = flatten(args).filter((v) => v !== null && v !== ''); const bs = vs.map(toBool); return bs.find(isErr) || bs.some(Boolean); },
  XOR: (args) => { const bs = flatten(args).filter((v) => v !== null && v !== '').map(toBool); return bs.find(isErr) || bs.filter(Boolean).length % 2 === 1; },
  NOT: ([a]) => { const b = toBool(a); return isErr(b) ? b : !b; },
  TRUE: () => true,
  FALSE: () => false,

  // Text
  CONCAT: (args) => { const ts = flatten(args).map(toText); return ts.find(isErr) || ts.join(''); },
  CONCATENATE: (args) => { const ts = flatten(args).map(toText); return ts.find(isErr) || ts.join(''); },
  TEXTJOIN: ([delim, ignoreEmpty, ...rest]) => {
    const d = toText(delim);
    const skip = toBool(ignoreEmpty);
    const ts = flatten(rest).filter((v) => !(skip && (v === null || v === ''))).map(toText);
    return ts.find(isErr) || ts.join(d);
  },
  LEN: ([a]) => { const t = toText(a); return isErr(t) ? t : t.length; },
  UPPER: ([a]) => { const t = toText(a); return isErr(t) ? t : t.toUpperCase(); },
  LOWER: ([a]) => { const t = toText(a); return isErr(t) ? t : t.toLowerCase(); },
  PROPER: ([a]) => { const t = toText(a); return isErr(t) ? t : t.toLowerCase().replace(/(^|[^a-z])([a-z])/g, (m, p, c) => p + c.toUpperCase()); },
  TRIM: ([a]) => { const t = toText(a); return isErr(t) ? t : t.trim().replace(/\s+/g, ' '); },
  LEFT: ([a, n = 1]) => { const t = toText(a); const k = toNumber(n); return isErr(t) ? t : isErr(k) ? k : t.slice(0, k); },
  RIGHT: ([a, n = 1]) => { const t = toText(a); const k = toNumber(n); return isErr(t) ? t : isErr(k) ? k : k === 0 ? '' : t.slice(-k); },
  MID: ([a, s, n]) => { const t = toText(a); const st = toNumber(s); const k = toNumber(n); return [t, st, k].find(isErr) || t.substr(st - 1, k); },
  REPT: ([a, n]) => { const t = toText(a); const k = toNumber(n); return isErr(t) ? t : isErr(k) ? k : t.repeat(Math.max(0, k)); },
  SUBSTITUTE: ([a, find, rep]) => { const t = toText(a); const f = toText(find); const r = toText(rep); return [t, f, r].find(isErr) || (f === '' ? t : t.split(f).join(r)); },
  FIND: ([find, within, start = 1]) => { const f = toText(find); const w = toText(within); const i = w.indexOf(f, toNumber(start) - 1); return i === -1 ? ERR('#VALUE!') : i + 1; },
  SEARCH: ([find, within, start = 1]) => { const f = toText(find).toLowerCase(); const w = toText(within).toLowerCase(); const i = w.indexOf(f, toNumber(start) - 1); return i === -1 ? ERR('#VALUE!') : i + 1; },
  EXACT: ([a, b]) => toText(a) === toText(b),
  VALUE: ([a]) => toNumber(a),
  TEXT: ([a, fmt]) => {
    const n = toNumber(a);
    if (isErr(n)) return toText(a);
    const f = toText(fmt);
    if (/%$/.test(f)) return `${(n * 100).toFixed((f.split('.')[1] || '').replace('%', '').length)}%`;
    const decimals = (f.split('.')[1] || '').replace(/[^0#]/g, '').length;
    if (f.includes(',')) return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return n.toFixed(decimals);
  },

  // Information
  ISBLANK: ([a]) => { const v = firstValue(a); return v === null || v === ''; },
  ISNUMBER: ([a]) => typeof firstValue(a) === 'number',
  ISTEXT: ([a]) => { const v = firstValue(a); return typeof v === 'string' && v !== ''; },
  ISERROR: ([a]) => isErr(firstValue(a)),
  NA: () => ERR('#N/A'),

  // Date & time
  TODAY: () => Math.floor(dateToSerial(new Date())),
  NOW: () => dateToSerial(new Date()),
  DATE: numFn((y, m, d) => dateToSerial(new Date(y, m - 1, d))),
  YEAR: numFn((s) => serialToDate(s).getFullYear()),
  MONTH: numFn((s) => serialToDate(s).getMonth() + 1),
  DAY: numFn((s) => serialToDate(s).getDate()),
  WEEKDAY: numFn((s) => serialToDate(s).getDay() + 1),
  DAYS: numFn((end, start) => Math.floor(end) - Math.floor(start)),

  // Conditional aggregation
  SUMIF: ([range, crit, sumRange]) => {
    const test = makeCriteria(firstValue(crit));
    const src = isRange(range) ? range.rows : [[range]];
    const tgt = sumRange && isRange(sumRange) ? sumRange.rows : src;
    let total = 0;
    src.forEach((row, r) => row.forEach((v, c) => {
      const t = tgt[r]?.[c];
      if (test(v) && typeof t === 'number') total += t;
    }));
    return total;
  },
  AVERAGEIF: ([range, crit, avgRange]) => {
    const test = makeCriteria(firstValue(crit));
    const src = isRange(range) ? range.rows : [[range]];
    const tgt = avgRange && isRange(avgRange) ? avgRange.rows : src;
    let total = 0, count = 0;
    src.forEach((row, r) => row.forEach((v, c) => {
      const t = tgt[r]?.[c];
      if (test(v) && typeof t === 'number') { total += t; count++; }
    }));
    return count ? total / count : ERR('#DIV/0!');
  },
  COUNTIF: ([range, crit]) => {
    const test = makeCriteria(firstValue(crit));
    return flatten([range]).filter(test).length;
  },
  SUMIFS: ([sumRange, ...pairs]) => {
    const tests = [];
    for (let i = 0; i + 1 < pairs.length; i += 2) tests.push([pairs[i], makeCriteria(firstValue(pairs[i + 1]))]);
    let total = 0;
    (sumRange.rows || [[sumRange]]).forEach((row, r) => row.forEach((v, c) => {
      if (typeof v === 'number' && tests.every(([rg, t]) => t(rg.rows?.[r]?.[c] ?? null))) total += v;
    }));
    return total;
  },
  COUNTIFS: (pairs) => {
    const tests = [];
    for (let i = 0; i + 1 < pairs.length; i += 2) tests.push([pairs[i], makeCriteria(firstValue(pairs[i + 1]))]);
    if (!tests.length) return 0;
    let count = 0;
    (tests[0][0].rows || []).forEach((row, r) => row.forEach((_, c) => {
      if (tests.every(([rg, t]) => t(rg.rows?.[r]?.[c] ?? null))) count++;
    }));
    return count;
  },

  // Lookup & reference
  VLOOKUP: ([needle, table, colIdx, approx = true]) => {
    if (!isRange(table)) return ERR('#N/A');
    const key = firstValue(needle);
    const ci = toNumber(colIdx);
    if (isErr(ci) || ci < 1 || ci > (table.rows[0]?.length || 0)) return ERR('#REF!');
    const exact = !toBool(approx);
    let hit = -1;
    for (let r = 0; r < table.rows.length; r++) {
      const v = table.rows[r][0];
      if (lookupEquals(v, key)) { hit = r; break; }
      if (!exact && typeof v === 'number' && typeof key === 'number' && v <= key) hit = r;
    }
    return hit === -1 ? ERR('#N/A') : table.rows[hit][ci - 1];
  },
  HLOOKUP: ([needle, table, rowIdx, approx = true]) => {
    if (!isRange(table)) return ERR('#N/A');
    const key = firstValue(needle);
    const ri = toNumber(rowIdx);
    if (isErr(ri) || ri < 1 || ri > table.rows.length) return ERR('#REF!');
    const exact = !toBool(approx);
    const header = table.rows[0] || [];
    let hit = -1;
    for (let c = 0; c < header.length; c++) {
      const v = header[c];
      if (lookupEquals(v, key)) { hit = c; break; }
      if (!exact && typeof v === 'number' && typeof key === 'number' && v <= key) hit = c;
    }
    return hit === -1 ? ERR('#N/A') : table.rows[ri - 1][hit];
  },
  INDEX: ([table, rowNum, colNum = 1]) => {
    if (!isRange(table)) return table;
    let r = toNumber(rowNum);
    let c = toNumber(colNum);
    if (table.rows.length === 1 && colNum === 1 && r > 1) { c = r; r = 1; }
    const row = table.rows[r - 1];
    if (!row || c < 1 || c > row.length) return ERR('#REF!');
    return row[c - 1];
  },
  MATCH: ([needle, range, type = 1]) => {
    const key = firstValue(needle);
    const list = flatten([range]);
    const t = toNumber(type);
    if (t === 0) {
      const i = list.findIndex((v) => lookupEquals(v, key));
      return i === -1 ? ERR('#N/A') : i + 1;
    }
    let hit = -1;
    list.forEach((v, i) => {
      if (typeof v !== 'number' || typeof key !== 'number') return;
      if ((t > 0 && v <= key) || (t < 0 && v >= key)) hit = i;
    });
    return hit === -1 ? ERR('#N/A') : hit + 1;
  },
  XLOOKUP: ([needle, lookupRange, returnRange, notFound]) => {
    const key = firstValue(needle);
    const keys = flatten([lookupRange]);
    const vals = flatten([returnRange]);
    const i = keys.findIndex((v) => lookupEquals(v, key));
    if (i === -1) return notFound !== undefined ? notFound : ERR('#N/A');
    return vals[i] ?? null;
  },
  ROWS: ([r]) => (isRange(r) ? r.rows.length : 1),
  COLUMNS: ([r]) => (isRange(r) ? (r.rows[0]?.length || 0) : 1)
};

export const FUNCTION_NAMES = [...Object.keys(FUNCTIONS), 'IF', 'IFS', 'IFERROR', 'IFNA', 'ROW', 'COLUMN'].sort();

// ─────────────────────────────────────────────────────────────
// Tokenizer
// ─────────────────────────────────────────────────────────────

const REF_RE = /^(\$?)([A-Z]{1,3})(\$?)([0-9]+)$/i;

export const tokenize = (src) => {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    const start = i;

    if (ch === '"') {
      let s = '';
      i++;
      while (i < src.length) {
        if (src[i] === '"') {
          if (src[i + 1] === '"') { s += '"'; i += 2; continue; }
          break;
        }
        s += src[i++];
      }
      if (src[i] !== '"') throw ERR('#ERROR!');
      i++;
      tokens.push({ type: 'str', value: s, start, end: i });
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) throw ERR('#ERROR!');
      i += m[0].length;
      tokens.push({ type: 'num', value: parseFloat(m[0]), start, end: i });
      continue;
    }

    if (ch === '#') {
      const m = /^#[A-Z0-9/]+[!?]?/i.exec(src.slice(i));
      const code = m ? m[0].toUpperCase() : '#ERROR!';
      i += m ? m[0].length : 1;
      tokens.push({ type: 'err', value: ERROR_CODES.includes(code) ? code : '#ERROR!', start, end: i });
      continue;
    }

    // Quoted sheet name: 'My Sheet'!A1
    if (ch === "'") {
      const close = src.indexOf("'!", i + 1);
      if (close === -1) throw ERR('#ERROR!');
      const sheet = src.slice(i + 1, close);
      i = close + 2;
      const m = /^\$?[A-Z]{1,3}\$?[0-9]+/i.exec(src.slice(i));
      if (!m) throw ERR('#REF!');
      i += m[0].length;
      tokens.push({ type: 'ref', sheet, text: m[0], start, refStart: close + 2, end: i });
      continue;
    }

    if (/[A-Za-z_$]/.test(ch)) {
      const m = /^[A-Za-z_$][A-Za-z0-9_.$]*/.exec(src.slice(i));
      const word = m[0];
      i += word.length;
      if (src[i] === '!') {
        // Unquoted sheet name prefix: Sheet2!B4
        i++;
        const r = /^\$?[A-Z]{1,3}\$?[0-9]+/i.exec(src.slice(i));
        if (!r) throw ERR('#REF!');
        const refStart = i;
        i += r[0].length;
        tokens.push({ type: 'ref', sheet: word, text: r[0], start, refStart, end: i });
      } else if (REF_RE.test(word)) {
        tokens.push({ type: 'ref', sheet: null, text: word, start, refStart: start, end: i });
      } else if (src.slice(i).trimStart()[0] === '(') {
        tokens.push({ type: 'fn', value: word.toUpperCase(), start, end: i });
      } else if (/^(TRUE|FALSE)$/i.test(word)) {
        tokens.push({ type: 'bool', value: word.toUpperCase() === 'TRUE', start, end: i });
      } else {
        tokens.push({ type: 'name', value: word, start, end: i });
      }
      continue;
    }

    const two = src.slice(i, i + 2);
    if (two === '<=' || two === '>=' || two === '<>') {
      i += 2;
      tokens.push({ type: 'op', value: two, start, end: i });
      continue;
    }
    if ('+-*/^&=<>%(),:;'.includes(ch)) {
      i++;
      tokens.push({ type: 'op', value: ch === ';' ? ',' : ch, start, end: i });
      continue;
    }
    throw ERR('#ERROR!');
  }
  return tokens;
};

// ─────────────────────────────────────────────────────────────
// Parser (Excel precedence: comparison < & < +- < */ < ^ < unary < %)
// ─────────────────────────────────────────────────────────────

const parseRefText = (text) => {
  const m = REF_RE.exec(text);
  return { colAbs: !!m[1], col: getColIndex(m[2]), rowAbs: !!m[3], row: parseInt(m[4], 10) };
};

const parse = (tokens) => {
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v) => peek() && peek().type === 'op' && peek().value === v;
  const expectOp = (v) => {
    if (!isOp(v)) throw ERR('#ERROR!');
    pos++;
  };

  const binary = (next, ops) => () => {
    let left = next();
    while (peek() && peek().type === 'op' && ops.includes(peek().value)) {
      const op = tokens[pos++].value;
      left = { t: 'bin', op, l: left, r: next() };
    }
    return left;
  };

  const primary = () => {
    const tok = tokens[pos++];
    if (!tok) throw ERR('#ERROR!');
    switch (tok.type) {
      case 'num': return { t: 'lit', v: tok.value };
      case 'str': return { t: 'lit', v: tok.value };
      case 'bool': return { t: 'lit', v: tok.value };
      case 'err': return { t: 'lit', v: ERR(tok.value) };
      case 'name': return { t: 'lit', v: ERR('#NAME?') };
      case 'ref': {
        const a = parseRefText(tok.text);
        if (isOp(':') && tokens[pos + 1] && tokens[pos + 1].type === 'ref') {
          pos++;
          const b = parseRefText(tokens[pos++].text);
          return { t: 'range', sheet: tok.sheet, c1: Math.min(a.col, b.col), r1: Math.min(a.row, b.row), c2: Math.max(a.col, b.col), r2: Math.max(a.row, b.row) };
        }
        return { t: 'ref', sheet: tok.sheet, col: a.col, row: a.row };
      }
      case 'fn': {
        expectOp('(');
        const args = [];
        if (!isOp(')')) {
          do {
            // Allow empty arguments like IF(A1,,2)
            if (isOp(',') || isOp(')')) args.push({ t: 'lit', v: null });
            else args.push(expr());
          } while (isOp(',') && ++pos);
        }
        expectOp(')');
        return { t: 'fn', name: tok.value, args };
      }
      case 'op':
        if (tok.value === '(') {
          const e = expr();
          expectOp(')');
          return e;
        }
        if (tok.value === '-' || tok.value === '+') {
          const operand = postfix();
          return tok.value === '-' ? { t: 'neg', e: operand } : operand;
        }
        throw ERR('#ERROR!');
      default:
        throw ERR('#ERROR!');
    }
  };

  const postfix = () => {
    let e = primary();
    while (isOp('%')) {
      pos++;
      e = { t: 'pct', e };
    }
    return e;
  };
  const power = binary(postfix, ['^']);
  const mult = binary(power, ['*', '/']);
  const add = binary(mult, ['+', '-']);
  const concat = binary(add, ['&']);
  const compare = binary(concat, ['=', '<>', '<', '>', '<=', '>=']);
  const expr = compare;

  const ast = expr();
  if (pos < tokens.length) throw ERR('#ERROR!');
  return ast;
};

// Small cache so the same formula text is only parsed once per session
const astCache = new Map();
const getAst = (formula) => {
  let entry = astCache.get(formula);
  if (!entry) {
    try {
      entry = { ast: parse(tokenize(formula.slice(1))) };
    } catch (e) {
      entry = { error: isErr(e) ? e : ERR('#ERROR!') };
    }
    if (astCache.size > 5000) astCache.clear();
    astCache.set(formula, entry);
  }
  return entry;
};

// ─────────────────────────────────────────────────────────────
// Evaluator
// ─────────────────────────────────────────────────────────────

// Raw stored cell -> typed scalar
const literalOf = (cell) => {
  if (!cell) return null;
  const raw = cell.value;
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number' || typeof raw === 'boolean') return raw;
  if (cell.format === 'text') return String(raw);
  const s = String(raw).trim();
  if (s !== '' && !isNaN(Number(s))) return Number(s);
  if (/^-?[\d,]+(\.\d+)?$/.test(s) && s.includes(',')) return Number(s.replace(/,/g, ''));
  if (/^-?\d+(\.\d+)?%$/.test(s)) return Number(s.slice(0, -1)) / 100;
  if (/^(TRUE|FALSE)$/i.test(s)) return s.toUpperCase() === 'TRUE';
  return String(raw);
};

const compareValues = (a, b, op) => {
  a = firstValue(a);
  b = firstValue(b);
  if (isErr(a)) return a;
  if (isErr(b)) return b;
  let x = a, y = b;
  const numeric = (v) => typeof v === 'number' || v === null;
  if (numeric(x) && numeric(y)) {
    x = x ?? 0;
    y = y ?? 0;
  } else {
    x = toText(x).toLowerCase();
    y = toText(y).toLowerCase();
  }
  switch (op) {
    case '=': return x === y;
    case '<>': return x !== y;
    case '<': return x < y;
    case '>': return x > y;
    case '<=': return x <= y;
    default: return x >= y;
  }
};

/**
 * Create a memoised evaluator for one sheet.
 * ctx.sheets (optional) = [{ name, cells }] enables cross-sheet references.
 */
export const createSheetEvaluator = (cells, ctx = {}) => {
  const cache = new Map();
  const inProgress = new Set();
  const others = new Map();

  const evaluatorFor = (sheetName) => {
    if (!sheetName || !ctx.sheets) return null;
    const key = sheetName.toLowerCase();
    if (!others.has(key)) {
      const sheet = ctx.sheets.find((s) => (s.name || '').toLowerCase() === key);
      others.set(key, sheet ? (sheet.cells === cells ? api : createSheetEvaluator(sheet.cells || {}, ctx)) : null);
    }
    return others.get(key);
  };

  const valueAt = (row, col) => {
    const coord = toCoord(row, col);
    if (cache.has(coord)) return cache.get(coord);
    const cell = cells[coord];
    if (!cell || !cell.formula) {
      const v = literalOf(cell);
      cache.set(coord, v);
      return v;
    }
    if (inProgress.has(coord)) return ERR('#CIRC!');
    inProgress.add(coord);
    let v = evalFormula(cell.formula, { row, col });
    inProgress.delete(coord);
    if (isRange(v)) v = firstValue(v);
    cache.set(coord, v);
    return v;
  };

  const evalNode = (node, origin) => {
    switch (node.t) {
      case 'lit': return node.v;
      case 'ref': {
        if (node.sheet) {
          const other = evaluatorFor(node.sheet);
          return other ? other.valueAt(node.row, node.col) : ERR('#REF!');
        }
        return valueAt(node.row, node.col);
      }
      case 'range': {
        const src = node.sheet ? evaluatorFor(node.sheet) : api;
        if (!src) return ERR('#REF!');
        const rows = [];
        for (let r = node.r1; r <= node.r2; r++) {
          const row = [];
          for (let c = node.c1; c <= node.c2; c++) row.push(src.valueAt(r, c));
          rows.push(row);
        }
        return { rows };
      }
      case 'neg': {
        const n = toNumber(evalNode(node.e, origin));
        return isErr(n) ? n : -n;
      }
      case 'pct': {
        const n = toNumber(evalNode(node.e, origin));
        return isErr(n) ? n : n / 100;
      }
      case 'bin': {
        const l = evalNode(node.l, origin);
        const r = evalNode(node.r, origin);
        if (node.op === '&') {
          const a = toText(l), b = toText(r);
          return isErr(a) ? a : isErr(b) ? b : a + b;
        }
        if (['=', '<>', '<', '>', '<=', '>='].includes(node.op)) return compareValues(l, r, node.op);
        const a = toNumber(l), b = toNumber(r);
        if (isErr(a)) return a;
        if (isErr(b)) return b;
        switch (node.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return b === 0 ? ERR('#DIV/0!') : a / b;
          case '^': return Math.pow(a, b);
          default: return ERR('#ERROR!');
        }
      }
      case 'fn': {
        const { name, args } = node;
        // Lazy functions
        if (name === 'IF') {
          const cond = toBool(evalNode(args[0] || { t: 'lit', v: false }, origin));
          if (isErr(cond)) return cond;
          if (cond) return args[1] ? evalNode(args[1], origin) : true;
          return args[2] ? evalNode(args[2], origin) : false;
        }
        if (name === 'IFS') {
          for (let i = 0; i + 1 < args.length; i += 2) {
            const c = toBool(evalNode(args[i], origin));
            if (isErr(c)) return c;
            if (c) return evalNode(args[i + 1], origin);
          }
          return ERR('#N/A');
        }
        if (name === 'IFERROR' || name === 'IFNA') {
          const v = firstValue(evalNode(args[0], origin));
          const catches = name === 'IFERROR' ? isErr(v) : isErr(v) && v.code === '#N/A';
          return catches ? (args[1] ? evalNode(args[1], origin) : '') : v;
        }
        if (name === 'ROW') return args[0] ? (args[0].row ?? args[0].r1 ?? ERR('#VALUE!')) : origin.row;
        if (name === 'COLUMN') return args[0] ? ((args[0].col ?? args[0].c1 ?? -1) + 1) : origin.col + 1;
        const fn = FUNCTIONS[name];
        if (!fn) return ERR('#NAME?');
        const values = args.map((a) => evalNode(a, origin));
        // Errors in scalar arguments propagate (range errors are handled per function)
        const scalarErr = values.find(isErr);
        if (scalarErr) return scalarErr;
        try {
          return fn(values);
        } catch {
          return ERR('#VALUE!');
        }
      }
      default:
        return ERR('#ERROR!');
    }
  };

  const evalFormula = (formula, origin) => {
    const { ast, error } = getAst(formula);
    if (error) return error;
    let v = evalNode(ast, origin);
    if (typeof v === 'number') v = Number.isFinite(v) ? cleanNumber(v) : ERR('#NUM!');
    return v;
  };

  // Display value of a cell: number | string | '' (errors become their code)
  const display = (row, col) => {
    let v = valueAt(row, col);
    if (isErr(v)) return v.code;
    if (v === null || v === undefined) return cells[toCoord(row, col)]?.formula ? 0 : '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return v;
  };

  const api = { valueAt, display, displayCoord: (coord) => { const p = parseCoord(coord); return p ? display(p.row, p.col) : ''; } };
  return api;
};

// Backwards-compatible single-shot evaluation
export const evaluateFormula = (formulaStr, cellsData, ctx) => {
  if (!formulaStr || typeof formulaStr !== 'string' || !formulaStr.startsWith('=')) return formulaStr;
  // Evaluate through an out-of-grid scratch cell so the normal memoised path is reused
  const scratch = createSheetEvaluator({ ...cellsData, ZZZ99999: { formula: formulaStr } }, ctx);
  return scratch.display(99999, getColIndex('ZZZ'));
};

// ─────────────────────────────────────────────────────────────
// Formula rewriting (insert/delete rows & cols, copy/paste, fill)
// ─────────────────────────────────────────────────────────────

const rewriteRefs = (formula, mapRef) => {
  if (!formula || !formula.startsWith('=')) return formula;
  let tokens;
  try {
    tokens = tokenize(formula.slice(1));
  } catch {
    return formula;
  }
  let body = formula.slice(1);
  // Collect replacements first, apply from the end so offsets stay valid
  const edits = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type !== 'ref' || tok.sheet) continue;
    const isRangeStart = tokens[i + 1]?.type === 'op' && tokens[i + 1].value === ':' && tokens[i + 2]?.type === 'ref';
    if (isRangeStart) {
      const end = tokens[i + 2];
      const replaced = mapRef(parseRefText(tok.text), parseRefText(end.text));
      if (replaced !== undefined) edits.push({ start: tok.start, end: end.end, text: replaced });
      i += 2;
    } else {
      const replaced = mapRef(parseRefText(tok.text), null);
      if (replaced !== undefined) edits.push({ start: tok.start, end: tok.end, text: replaced });
    }
  }
  edits.sort((a, b) => b.start - a.start).forEach((e) => {
    body = body.slice(0, e.start) + e.text + body.slice(e.end);
  });
  return '=' + body;
};

const refText = (r) => `${r.colAbs ? '$' : ''}${getColLetter(r.col)}${r.rowAbs ? '$' : ''}${r.row}`;

// Shift references after inserting (delta > 0) or deleting (delta < 0) rows/cols at index `at`
export const shiftFormula = (formula, axis, at, delta) => rewriteRefs(formula, (a, b) => {
  const key = axis === 'row' ? 'row' : 'col';
  const move = (r) => ({ ...r, [key]: r[key] >= at ? r[key] + delta : r[key] });
  if (delta < 0) {
    const removed = (r) => r[key] >= at && r[key] < at - delta;
    if (!b) return removed(a) ? '#REF!' : refText(move(a));
    // Shrink ranges that overlap the deleted band
    let s = { ...a }, e = { ...b };
    if (removed(s) && removed(e)) return '#REF!';
    if (removed(s)) s = { ...s, [key]: at };
    else s = move(s);
    if (removed(e)) e = { ...e, [key]: at - 1 };
    else e = move(e);
    return `${refText(s)}:${refText(e)}`;
  }
  return b ? `${refText(move(a))}:${refText(move(b))}` : refText(move(a));
});

// Move relative references by (dRow, dCol), as Excel does when copying a formula
export const offsetFormula = (formula, dRow, dCol) => rewriteRefs(formula, (a, b) => {
  const move = (r) => ({ ...r, row: r.rowAbs ? r.row : r.row + dRow, col: r.colAbs ? r.col : r.col + dCol });
  const ma = move(a);
  if (ma.row < 1 || ma.col < 0) return '#REF!';
  if (!b) return refText(ma);
  const mb = move(b);
  if (mb.row < 1 || mb.col < 0) return '#REF!';
  return `${refText(ma)}:${refText(mb)}`;
});

// ─────────────────────────────────────────────────────────────
// Display formatting
// ─────────────────────────────────────────────────────────────

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

export const formatCellValue = (value, cell = {}) => {
  if (value === '' || value === null || value === undefined) return '';
  if (typeof value === 'string' && value.startsWith('#')) return value;
  const num = typeof value === 'number' ? value : (String(value).trim() !== '' && !isNaN(Number(value)) ? Number(value) : null);
  if (num === null || cell.format === 'text') return String(value);

  const decimals = cell.decimals !== undefined ? cell.decimals : 2;
  const symbol = cell.currencySymbol || '$';
  const fixed = (n, d) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  switch (cell.format) {
    case 'currency':
      return num < 0 ? `-${symbol}${fixed(-num, decimals)}` : `${symbol}${fixed(num, decimals)}`;
    case 'accounting':
      return num < 0 ? `${symbol} (${fixed(-num, decimals)})` : num === 0 ? `${symbol} -` : `${symbol} ${fixed(num, decimals)}`;
    case 'percent':
      return `${(num * 100).toFixed(cell.decimals !== undefined ? cell.decimals : 2)}%`;
    case 'comma':
    case 'number':
      return fixed(num, decimals);
    case 'scientific':
      return num.toExponential(decimals).toUpperCase().replace(/E\+?(-?)(\d)$/, 'E+$10$2').replace('E+-', 'E-');
    case 'fraction': {
      const whole = Math.trunc(num);
      const frac = Math.abs(num - whole);
      if (frac < 1e-9) return String(whole);
      const den = 100;
      let n = Math.round(frac * den);
      const g = gcd(n, den);
      n /= g;
      const d = den / g;
      return whole ? `${whole} ${n}/${d}` : `${num < 0 ? '-' : ''}${n}/${d}`;
    }
    case 'shortDate':
      return serialToDate(num).toLocaleDateString();
    case 'longDate':
      return serialToDate(num).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    case 'time':
      return serialToDate(num).toLocaleTimeString();
    default:
      if (cell.decimals !== undefined) return num.toFixed(cell.decimals);
      // General: trim long fractions the way a narrow Excel column would
      if (!Number.isInteger(num) && String(num).length > 12) return String(Number(num.toPrecision(10)));
      return typeof value === 'number' ? String(value) : String(value);
  }
};

// ─────────────────────────────────────────────────────────────
// CSV export & initial template
// ─────────────────────────────────────────────────────────────

export const sheetToMatrix = (sheet, workbook) => {
  const ev = createSheetEvaluator(sheet.cells || {}, { sheets: workbook?.sheets });
  const rows = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = [];
    for (let c = 0; c < sheet.colCount; c++) {
      const cell = sheet.cells?.[toCoord(r, c)];
      row.push(cell ? formatCellValue(ev.display(r, c), cell) : '');
    }
    rows.push(row);
  }
  // Trim trailing empty rows/cols for tidy exports
  while (rows.length && rows[rows.length - 1].every((v) => v === '')) rows.pop();
  const width = rows.reduce((w, row) => {
    let last = row.length;
    while (last > 0 && row[last - 1] === '') last--;
    return Math.max(w, last);
  }, 0);
  return rows.map((row) => row.slice(0, width));
};

export const exportSheetToCSV = (sheet, filename = 'spreadsheet.csv', workbook) => {
  if (!sheet) return;
  const csv = sheetToMatrix(sheet, workbook)
    .map((row) => row.map((v) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))
    .join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Initial sample workbook template
export const getInitialWorkbook = () => ({
  activeSheetId: 'sheet1',
  sheets: [
    {
      id: 'sheet1',
      name: 'Sheet1',
      rowCount: 50,
      colCount: 15,
      colWidths: { 0: 210, 1: 130, 2: 120, 3: 100, 4: 130 },
      cells: {
        A1: { value: 'Item Description', bold: true, align: 'left', bg: '#f1f5f9' },
        B1: { value: 'Category', bold: true, align: 'center', bg: '#f1f5f9' },
        C1: { value: 'Unit Price', bold: true, align: 'right', bg: '#f1f5f9' },
        D1: { value: 'Quantity', bold: true, align: 'right', bg: '#f1f5f9' },
        E1: { value: 'Subtotal', bold: true, align: 'right', bg: '#f1f5f9' },

        A2: { value: 'Pro Documentation Suite' },
        B2: { value: 'Software', align: 'center' },
        C2: { value: '149', align: 'right', format: 'currency' },
        D2: { value: '3', align: 'right' },
        E2: { formula: '=C2*D2', align: 'right', format: 'currency' },

        A3: { value: 'Cloud Storage 500MB Pack' },
        B3: { value: 'Infrastructure', align: 'center' },
        C3: { value: '45', align: 'right', format: 'currency' },
        D3: { value: '10', align: 'right' },
        E3: { formula: '=C3*D3', align: 'right', format: 'currency' },

        A4: { value: 'Enterprise Team License' },
        B4: { value: 'Subscription', align: 'center' },
        C4: { value: '299', align: 'right', format: 'currency' },
        D4: { value: '2', align: 'right' },
        E4: { formula: '=C4*D4', align: 'right', format: 'currency' },

        A5: { value: 'TOTAL', bold: true, color: '#326127', bg: '#e8f5e9' },
        B5: { value: '', bg: '#e8f5e9' },
        C5: { value: '', bg: '#e8f5e9' },
        D5: { formula: '=SUM(D2:D4)', bold: true, align: 'right', color: '#326127', bg: '#e8f5e9' },
        E5: { formula: '=SUM(E2:E4)', bold: true, align: 'right', color: '#326127', bg: '#e8f5e9', format: 'currency', border: 'double-bottom' }
      }
    }
  ]
});
