// Chạy: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pinyinEquals, hanziEquals, checkAnswer, parsePinyin, foldVi } from '../js/match.js';
import { review, newCard, addDays, daysBetween, sortDue } from '../js/srs.js';
import { parseCSV, vocabFromCSV, validatePack, toCSV } from '../js/csv.js';
import { checkBackup, mergeRecords, BACKUP_FORMAT } from '../js/backup.js';
import { buildTest, toneVariants, vocabQuestion } from '../js/quiz.js';

test('pinyin: dấu thanh và số thanh tương đương', () => {
  assert.ok(pinyinEquals('ni3 hao3', 'nǐ hǎo'));
  assert.ok(pinyinEquals('Ni3Hao3', 'nǐ hǎo'));
  assert.ok(pinyinEquals('nǐhǎo', 'nǐ hǎo'));
  assert.ok(pinyinEquals('  nǐ,  hǎo! ', 'nǐ hǎo'));
  assert.ok(pinyinEquals("nü3'er2", "nǚ'ér"));
  assert.ok(pinyinEquals('nv3er2', "nǚ'ér"));
  assert.ok(pinyinEquals('nu:3er2', "nǚ'ér"));
  assert.ok(pinyinEquals('peng2you', 'péngyou'));
  assert.ok(pinyinEquals('peng2you5', 'péngyou'));
});
test('pinyin: sai thanh điệu bị từ chối khi kiểm tra thanh', () => {
  assert.equal(pinyinEquals('ni2 hao3', 'nǐ hǎo'), false);
  assert.equal(pinyinEquals('ni hao', 'nǐ hǎo'), false);
  assert.equal(pinyinEquals('xuexiao', 'xuéxiào', true), false);
  assert.ok(pinyinEquals('xuexiao', 'xuéxiào', false));
  assert.equal(pinyinEquals('', 'nǐ'), false);
});
test('pinyin: dạng NFD (dấu tổ hợp) vẫn khớp', () => {
  assert.ok(pinyinEquals('nǐ'.normalize('NFD'), 'nǐ'));
  assert.deepEqual(parsePinyin('lǜ'), { base: 'lv', tones: '4' });
});
test('chữ Hán: bỏ khoảng trắng và dấu câu', () => {
  assert.ok(hanziEquals(' 我 是 学生。', '我是学生'));
  assert.ok(hanziEquals('我是学生!', '我是学生'));
  assert.equal(hanziEquals('我学生是', '我是学生'), false);
  assert.equal(hanziEquals('', '我'), false);
});
test('chấm theo loại câu', () => {
  assert.ok(checkAnswer({ type: 'choice', answer: 1 }, 1));
  assert.equal(checkAnswer({ type: 'choice', answer: 1 }, 0), false);
  assert.ok(checkAnswer({ type: 'fill', input: 'hanzi', answer: '不是' }, '不是'));
  assert.ok(checkAnswer({ type: 'fill', input: 'pinyin', answer: 'yīfu', accept: ['yi1fu'] }, 'yi1 fu'));
  assert.ok(checkAnswer({ type: 'order', answer: '我是学生' }, ['我', '是', '学生']));
  assert.equal(checkAnswer({ type: 'order', answer: '我是学生' }, ['是', '我', '学生']), false);
  assert.equal(checkAnswer({ type: 'open' }, 'self-ok'), true);
});
test('tìm kiếm tiếng Việt không dấu', () => {
  assert.ok(foldVi('Cảm ơn').includes(foldVi('cam on')));
  assert.equal(foldVi('Đường'), 'duong');
});

test('SM-2: lịch ôn tăng dần và quên thì về 1 ngày', () => {
  let c = newCard('a');
  c = review(c, 4, '2026-01-01');
  assert.equal(c.interval, 1); assert.equal(c.due, '2026-01-02');
  c = review(c, 4, '2026-01-02');
  assert.equal(c.interval, 6); assert.equal(c.due, '2026-01-08');
  c = review(c, 4, '2026-01-08');
  assert.equal(c.interval, 15);
  const ef = c.ef;
  c = review(c, 1, '2026-01-23');
  assert.equal(c.interval, 1); assert.equal(c.reps, 0); assert.equal(c.lapses, 1); assert.equal(c.wrong, 1);
  assert.ok(c.ef < ef && c.ef >= 1.3);
  assert.equal(c.firstSeen, '2026-01-01');
});
test('SM-2: EF không xuống dưới 1.3', () => {
  let c = newCard('a');
  for (let i = 0; i < 20; i++) c = review(c, 1, '2026-01-01');
  assert.equal(c.ef, 1.3);
});
test('ngày: cộng ngày qua tháng/năm', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(daysBetween('2026-11-17', '2026-12-13'), 26);
  assert.deepEqual(sortDue([{ due: '2026-02-01', wrong: 0 }, { due: '2026-01-01', wrong: 0 }, { due: '2026-01-01', wrong: 3 }]).map((x) => x.wrong), [3, 0, 0]);
});

test('CSV: ngoặc kép, dấu phẩy và xuống dòng trong ô', () => {
  const rows = parseCSV('a,b\n"x, y","dòng 1\ndòng 2"\n');
  assert.deepEqual(rows[1].cells, ['x, y', 'dòng 1\ndòng 2']);
  assert.equal(parseCSV(toCSV([['a,"b"', 'c']]))[0].cells[0], 'a,"b"');
});
test('CSV từ vựng: báo lỗi theo dòng và phát hiện trùng', () => {
  const csv = 'id,hanzi,pinyin,meaning_vi,level\nx1,你,nǐ,bạn,1\nx2,,hǎo,tốt,1\nx1,我,wǒ,tôi,1\nx3,abc,a,b,1\nx4,他,tā,anh ấy,12\nold,她,tā,cô ấy,1';
  const r = vocabFromCSV(csv, new Set(['old']));
  assert.equal(r.items.length, 2);
  assert.equal(r.updates, 1);
  const lines = r.errors.map((e) => e.line);
  assert.deepEqual(lines, [3, 4, 5, 6]);
  assert.match(r.errors[1].msg, /lặp/);
  const bad = vocabFromCSV('id,hanzi\n1,你');
  assert.match(bad.errors[0].msg, /Thiếu cột/);
});
test('Gói HSK 1 mẫu hợp lệ, ID duy nhất, pinyin câu hỏi có đáp án đúng', () => {
  const p = JSON.parse(readFileSync(new URL('../packs/hsk1/pack.json', import.meta.url)));
  assert.deepEqual(validatePack(p), []);
  assert.equal(p.words.length, 150);
  // mỗi bài sắp xếp: các mảnh ghép lại đúng bằng đáp án (không thừa/thiếu chữ)
  for (const q of p.questions.filter((x) => x.type === 'order')) assert.equal([...q.tokens.join('')].sort().join(''), [...q.answer].sort().join(''), q.id);
  // từ trong câu ví dụ phải chứa chính từ đó
  for (const w of p.words) if (!w.hanzi.includes('……')) assert.ok(w.ex.length && w.ex[0].zh.includes(w.hanzi), w.id);
  // câu hỏi tham chiếu đúng id
  const qids = new Set(p.questions.map((q) => q.id));
  for (const g of p.grammar) for (const id of g.questions) assert.ok(qids.has(id), id);
});
test('Mẫu JSON gói hợp lệ', () => {
  const p = JSON.parse(readFileSync(new URL('../templates/goi-bai-hoc-mau.json', import.meta.url)));
  assert.deepEqual(validatePack(p), []);
  assert.ok(validatePack({ format: 'x' }).length > 0);
});

test('Sao lưu: kiểm tra phiên bản và gộp giữ bản mới hơn', () => {
  assert.equal(checkBackup({ format: 'khac' }).ok, false);
  assert.equal(checkBackup({ format: BACKUP_FORMAT, schema: 99, data: {} }).ok, false);
  assert.equal(checkBackup({ format: BACKUP_FORMAT, schema: 1, data: {} }).ok, true);
  const local = [{ wordId: 'a', updatedAt: '2026-01-02' }, { wordId: 'b', updatedAt: '2026-01-05' }];
  const inc = [{ wordId: 'a', updatedAt: '2026-01-03' }, { wordId: 'b', updatedAt: '2026-01-01' }, { wordId: 'c', updatedAt: '2026-01-01' }];
  const r = mergeRecords('srs', 'wordId', local, inc);
  assert.deepEqual(r.put.map((x) => x.wordId).sort(), ['a', 'c']);
  assert.equal(r.added, 1); assert.equal(r.updated, 1);
  const at = mergeRecords('attempts', 'id', [{ id: 1, at: 't1', refId: 'x', skill: 'v' }], [{ id: 1, at: 't1', refId: 'x', skill: 'v' }, { id: 2, at: 't2', refId: 'x', skill: 'v' }]);
  assert.equal(at.put.length, 1); assert.equal(at.put[0].id, undefined);
  const kv = mergeRecords('kv', 'k', [{ k: 'studyLog', v: { d1: 100 } }, { k: 'settings', v: { level: 2 } }], [{ k: 'studyLog', v: { d1: 50, d2: 30 } }, { k: 'settings', v: { level: 1 } }]);
  assert.deepEqual(kv.put, [{ k: 'studyLog', v: { d1: 100, d2: 30 } }]);
});

test('Đề kiểm tra: đủ số câu, không trùng, báo thiếu trung thực', () => {
  const p = JSON.parse(readFileSync(new URL('../packs/hsk1/pack.json', import.meta.url)));
  const bp = { sections: [{ id: 'v', name: 'Từ vựng', count: 10, source: 'vocab' }, { id: 'g', name: 'Ngữ pháp', count: 6, source: 'q:grammar' }, { id: 'r', name: 'Đọc', count: 5000, source: 'q:reading' }] };
  for (let k = 0; k < 20; k++) {
    const { questions, missing } = buildTest(bp, { words: p.words, questions: p.questions });
    const ids = questions.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(questions.filter((q) => q.section === 'v').length, 10);
    assert.equal(questions.filter((q) => q.section === 'g').length, 6);
    assert.equal(missing.length, 1); assert.equal(missing[0].section, 'Đọc'); assert.ok(missing[0].have < 5000);
    for (const q of questions) if (q.type === 'choice') { assert.ok(q.answer >= 0); assert.equal(new Set(q.options).size, q.options.length, q.id); }
  }
});
test('Biến thể thanh điệu', () => {
  const v = toneVariants('xuéxiào');
  assert.equal(v.length, 3);
  assert.ok(!v.includes('xuéxiào'));
  assert.deepEqual(toneVariants('ma'), []);
  const p = JSON.parse(readFileSync(new URL('../packs/hsk1/pack.json', import.meta.url)));
  const q = vocabQuestion(p.words[0], p.words, 'fill');
  assert.ok(q.prompt.includes('＿＿'));
  assert.equal(q.options[q.answer], p.words[0].hanzi);
});

test('Sáu gói HSK: hợp lệ, ID duy nhất toàn bộ, đủ nghĩa tiếng Việt, câu hỏi tham chiếu đúng', () => {
  const ids = new Set();
  let total = 0;
  for (let L = 1; L <= 6; L++) {
    const p = JSON.parse(readFileSync(new URL(`../packs/hsk${L}/pack.json`, import.meta.url)));
    assert.deepEqual(validatePack(p), [], 'HSK' + L);
    for (const w of p.words) {
      assert.ok(!ids.has(w.id), 'trùng ' + w.id); ids.add(w.id);
      assert.ok(w.vi && w.vi.length > 0, 'thiếu nghĩa ' + w.id);
      assert.ok(/\p{Script=Han}/u.test(w.hanzi) && !/[\u2F00-\u2FDF]/.test(w.hanzi), 'chữ lỗi ' + w.hanzi);
      assert.ok(parsePinyin(w.pinyin).base.length > 0, 'pinyin ' + w.id);
      assert.equal(w.level, L);
    }
    const wid = new Set(p.words.map((w) => w.id));
    for (const q of p.questions) {
      if (q.tags?.word) assert.ok(wid.has(q.tags.word), 'câu hỏi trỏ sai từ ' + q.id);
      if (q.type === 'order') assert.equal([...q.tokens.join('')].sort().join(''), [...q.answer].sort().join(''), q.id);
      if (q.type === 'choice' || q.type === 'listen-choice') assert.equal(new Set(q.options).size, q.options.length, q.id);
    }
    total += p.words.length;
  }
  assert.ok(total > 4900, 'tổng ' + total);
});
