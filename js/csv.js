// Đọc CSV (RFC 4180: dấu phẩy, ngoặc kép, xuống dòng trong ô) và kiểm tra dữ liệu nhập.

export function parseCSV(text) {
  const t = String(text).replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  let line = 1;
  let rowLine = 1;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else {
        if (c === '\n') line++;
        cell += c;
      }
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r') { /* bỏ */ }
    else if (c === '\n') {
      row.push(cell); rows.push({ line: rowLine, cells: row });
      row = []; cell = ''; line++; rowLine = line;
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push({ line: rowLine, cells: row }); }
  return rows.filter((r) => r.cells.some((x) => x.trim() !== ''));
}

export function toCSV(rows) {
  return rows
    .map((r) => r.map((v) => {
      const s = v == null ? '' : String(v);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(','))
    .join('\r\n');
}

export const VOCAB_COLUMNS = ['id', 'hanzi', 'pinyin', 'meaning_vi', 'pos', 'level', 'lesson', 'topic',
  'example_zh', 'example_pinyin', 'example_vi', 'confusable', 'audio', 'note'];
const REQUIRED = ['id', 'hanzi', 'pinyin', 'meaning_vi', 'level'];

/**
 * Chuyển CSV từ vựng thành danh sách từ + lỗi theo dòng.
 * existingIds: Set id đã có để báo trùng.
 */
export function vocabFromCSV(text, existingIds = new Set()) {
  const rows = parseCSV(text);
  const errors = [];
  const items = [];
  if (!rows.length) return { items, errors: [{ line: 1, msg: 'Tệp trống.' }], updates: 0 };
  const header = rows[0].cells.map((h) => h.trim().toLowerCase());
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length) {
    return { items, errors: [{ line: rows[0].line, msg: 'Thiếu cột bắt buộc: ' + missing.join(', ') }], updates: 0 };
  }
  const seen = new Set();
  let updates = 0;
  for (const r of rows.slice(1)) {
    const o = {};
    header.forEach((h, i) => { o[h] = (r.cells[i] ?? '').trim(); });
    const errs = [];
    for (const c of REQUIRED) if (!o[c]) errs.push(`thiếu "${c}"`);
    const level = Number(o.level);
    if (o.level && !(Number.isInteger(level) && level >= 1 && level <= 9)) errs.push('level phải là số 1–9');
    if (o.id && !/^[A-Za-z0-9_.-]+$/.test(o.id)) errs.push('id chỉ gồm chữ không dấu, số, _ . -');
    if (o.hanzi && !/\p{Script=Han}/u.test(o.hanzi)) errs.push('cột hanzi không có chữ Hán');
    if (o.pinyin && /\p{Script=Han}/u.test(o.pinyin)) errs.push('cột pinyin có chữ Hán');
    if (o.id && seen.has(o.id)) errs.push(`id "${o.id}" bị lặp trong tệp`);
    if (errs.length) { errors.push({ line: r.line, msg: errs.join('; ') }); continue; }
    seen.add(o.id);
    if (existingIds.has(o.id)) updates++;
    items.push({
      id: o.id, hanzi: o.hanzi, pinyin: o.pinyin, vi: o.meaning_vi, pos: o.pos || '',
      level, lesson: o.lesson || 'Tự nhập', topic: o.topic || '',
      ex: o.example_zh ? [{ zh: o.example_zh, py: o.example_pinyin || '', vi: o.example_vi || '' }] : [],
      confusable: o.confusable ? o.confusable.split(/[;|]/).map((x) => x.trim()).filter(Boolean) : [],
      audio: o.audio || null, note: o.note || '',
    });
  }
  return { items, errors, updates };
}

/** Kiểm tra gói JSON (định dạng xem templates/pack-mau.json). */
export function validatePack(p) {
  const errors = [];
  if (!p || typeof p !== 'object') return ['Không phải JSON hợp lệ.'];
  if (p.format !== 'sotay-hsk-pack') errors.push('Thiếu "format": "sotay-hsk-pack".');
  if (!p.id || !/^[A-Za-z0-9_.-]+$/.test(p.id)) errors.push('Thiếu hoặc sai "id" của gói.');
  if (!Number.isInteger(p.level)) errors.push('Thiếu "level" (số nguyên).');
  const ids = new Set();
  const check = (arr, name, req) => {
    (arr || []).forEach((it, i) => {
      for (const k of req) if (it[k] === undefined || it[k] === '' || it[k] === null) errors.push(`${name}[${i}]: thiếu "${k}"`);
      if (it.id) { if (ids.has(it.id)) errors.push(`${name}[${i}]: id "${it.id}" bị trùng`); ids.add(it.id); }
    });
  };
  check(p.words, 'words', ['id', 'hanzi', 'pinyin', 'vi']);
  check(p.grammar, 'grammar', ['id', 'title', 'explain']);
  check(p.readings, 'readings', ['id', 'title', 'text']);
  check(p.listening, 'listening', ['id', 'title', 'transcript']);
  check(p.questions, 'questions', ['id', 'type', 'prompt']);
  (p.questions || []).forEach((q, i) => {
    if (['choice', 'listen-choice'].includes(q.type) && (!Array.isArray(q.options) || !(q.answer >= 0 && q.answer < q.options.length)))
      errors.push(`questions[${i}]: "options"/"answer" không hợp lệ`);
    if (['fill', 'order'].includes(q.type) && !q.answer) errors.push(`questions[${i}]: thiếu "answer"`);
    if (q.type === 'order' && !Array.isArray(q.tokens)) errors.push(`questions[${i}]: thiếu "tokens"`);
  });
  return errors;
}
