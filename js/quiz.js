// Sinh câu hỏi từ vựng và lắp đề kiểm tra theo cấu hình (không trùng câu trong cùng một đề).

export function shuffle(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(word, pool, n, key) {
  const seen = new Set([word[key]]);
  const out = [];
  for (const w of shuffle(pool)) {
    if (out.length >= n) break;
    if (w.id === word.id || seen.has(w[key])) continue;
    seen.add(w[key]);
    out.push(w[key]);
  }
  return out;
}

function choiceQ(id, prompt, correct, distractors, extra = {}) {
  const opts = shuffle([correct, ...distractors]);
  return { id, type: 'choice', prompt, options: opts, answer: opts.indexOf(correct), ...extra };
}

const TONES = ['̄', '́', '̌', '̀'];
/** Tạo các biến thể pinyin khác thanh điệu (đổi thanh của âm tiết đầu tiên có dấu). */
export function toneVariants(py) {
  const d = py.normalize('NFD');
  const idx = [...d].findIndex((c) => TONES.includes(c));
  if (idx < 0) return [];
  const chars = [...d];
  const out = [];
  for (const t of TONES) {
    if (t === chars[idx]) continue;
    const c = [...chars];
    c[idx] = t;
    out.push(c.join('').normalize('NFC'));
  }
  return out;
}

/** Sinh câu hỏi cho 1 từ theo kiểu: meaning | hanzi | tone | fill */
export function vocabQuestion(word, pool, kind) {
  const base = { level: word.level, skill: 'vocab', tags: { word: word.id }, explain: `${word.hanzi} [${word.pinyin}]: ${word.vi}` };
  if (kind === 'meaning') {
    const d = pickDistractors(word, pool, 3, 'vi');
    if (d.length < 3) return null;
    return choiceQ(`v-m-${word.id}`, `<span class="zh big">${word.hanzi}</span><br>Nghĩa của từ này là gì?`, word.vi, d, base);
  }
  if (kind === 'hanzi') {
    const d = pickDistractors(word, pool, 3, 'hanzi');
    if (d.length < 3) return null;
    return choiceQ(`v-h-${word.id}`, `Chọn chữ Hán có nghĩa: <b>${word.vi}</b>`, word.hanzi, d, { ...base, zhOptions: true });
  }
  if (kind === 'tone') {
    const v = toneVariants(word.pinyin);
    if (v.length < 3) return null;
    return choiceQ(`v-t-${word.id}`, `<span class="zh big">${word.hanzi}</span><br>Chọn pinyin đúng thanh điệu:`, word.pinyin, v.slice(0, 3), base);
  }
  if (kind === 'fill') {
    const ex = (word.ex || []).find((e) => e.zh && e.zh.includes(word.hanzi));
    if (!ex) return null;
    const d = pickDistractors(word, pool.filter((w) => !ex.zh.includes(w.hanzi)), 3, 'hanzi');
    if (d.length < 3) return null;
    const blank = ex.zh.replace(word.hanzi, '＿＿');
    return choiceQ(`v-f-${word.id}`, `<span class="zh">${blank}</span><br><small>${ex.vi || ''}</small>`, word.hanzi, d, { ...base, zhOptions: true });
  }
  return null;
}

/**
 * Lắp đề từ cấu hình: sections [{id,name,count,source}]
 * source: "vocab" | "listening" | "q:<skill>"
 * Trả về {questions, missing:[{section, need, have}]}
 */
export function buildTest(blueprint, bank) {
  const questions = [];
  const missing = [];
  const used = new Set();
  for (const sec of blueprint.sections) {
    let cand = [];
    if (sec.source === 'vocab') {
      const kinds = ['meaning', 'hanzi', 'tone', 'fill'];
      const words = shuffle(bank.words);
      let k = 0;
      for (const w of words) {
        if (cand.length >= sec.count) break;
        // xoay vòng loại câu để giữ tỷ lệ cân đối
        for (let t = 0; t < kinds.length; t++) {
          const q = vocabQuestion(w, bank.words, kinds[(k + t) % kinds.length]);
          if (q && !used.has(q.id)) { cand.push(q); k++; break; }
        }
      }
    } else if (sec.source === 'listening') {
      cand = shuffle(bank.listeningQs || []).slice(0, sec.count);
    } else if (sec.source.startsWith('q:')) {
      const skill = sec.source.slice(2);
      const pool = (bank.questions || []).filter((q) => q.skill === skill && q.type !== 'open' && !used.has(q.id));
      // cân bằng độ khó: xen kẽ dễ/khó
      const byD = [1, 2, 3].map((d) => shuffle(pool.filter((q) => (q.difficulty || 1) === d)));
      while (cand.length < sec.count && byD.some((x) => x.length)) for (const g of byD) if (g.length && cand.length < sec.count) cand.push(g.shift());
    }
    cand.forEach((q) => used.add(q.id));
    if (cand.length < sec.count) missing.push({ section: sec.name, need: sec.count, have: cand.length });
    questions.push(...cand.map((q) => ({ ...q, section: sec.id })));
  }
  return { questions, missing };
}
