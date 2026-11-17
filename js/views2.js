// Ôn tập (flashcard SRS), bài tập, ngữ pháp, đọc, nghe, viết, sổ lỗi sai.
import { routes, H, S, db, esc, safe, $, main, toast, setTitle, levelData, allWords, getCard, saveCard, logAttempt, addMistake, clearMistakeOnce,
  rememberLearn, toggles, playBtn, noDataBox, fmtDay, fmtMs, qs, nowISO, saveSettings, onLeave, gen, refresh } from './app.js';
import { GRADES, todayStr, review, isDue, sortDue, addDays } from './srs.js';
import { checkAnswer, pinyinEquals, hanziEquals, normalizeHanzi } from './match.js';
import { shuffle, vocabQuestion } from './quiz.js';
import * as media from './media.js';

// ======================= Bộ hiển thị câu hỏi dùng chung =======================
/**
 * Hiển thị câu hỏi. st = {ans, checked}; mode 'practice' hiện đáp án sau khi kiểm tra, 'exam' không hiện.
 */
export function renderQuestion(q, st, mode = 'practice') {
  const reveal = mode === 'review' || (mode === 'practice' && st.checked);
  let h = '';
  if (q.passageText) h += `<details class="card tight" ${mode === 'exam' || !st.checked ? 'open' : ''}><summary><b>Bài đọc:</b> ${esc(q.passageTitle || '')}</summary><div class="passage" style="margin-top:8px">${esc(q.passageText)}</div></details>`;
  if (q.type === 'listen-choice') {
    const left = q.maxPlays ? q.maxPlays - (st.plays || 0) : null;
    h += `<div class="card tight row between"><div><button class="btn jade" data-act="qplay" ${left === 0 ? 'disabled' : ''}>🔊 Phát đoạn nghe</button>
      ${left !== null ? `<small class="muted"> còn ${left} lượt</small>` : ''}</div><small class="muted">${q.audioKey ? 'Audio trong gói' : 'Giọng đọc thiết bị'}</small></div>`;
    if (reveal && q.lines) h += `<div class="card tight"><b>Lời thoại</b>${q.lines.map((l) => `<div class="ex-line"><span class="zh">${esc(l.who ? l.who + '：' : '')}${esc(l.zh)}</span><div class="py-line">${esc(l.py || '')}</div></div>`).join('')}</div>`;
  }
  h += `<div class="q-prompt">${safe(q.prompt)}</div>`;
  if (q.type === 'choice' || q.type === 'listen-choice') {
    h += `<div class="opts">${q.options.map((o, i) => {
      let cls = st.ans === i ? 'sel' : '';
      if (reveal) cls = i === q.answer ? 'right' : st.ans === i ? 'wrong' : '';
      return `<button class="opt ${q.zhOptions ? 'zh-opt' : ''} ${cls}" data-act="qpick" data-i="${i}" ${reveal ? 'disabled' : ''}><span class="k">${'ABCD'[i] || i + 1}</span><span>${esc(o)}</span></button>`;
    }).join('')}</div>`;
  } else if (q.type === 'fill') {
    const isPy = q.input === 'pinyin';
    h += `<input type="text" class="${isPy ? '' : 'zh'}" data-input="qfill" value="${esc(st.ans || '')}" ${reveal ? 'disabled' : ''}
      placeholder="${isPy ? 'Gõ pinyin: dấu (nǐ) hoặc số (ni3)' : 'Gõ chữ Hán (bàn phím Trung giản thể)'}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="${isPy ? 'en' : 'zh-CN'}">
      ${isPy && q.checkTones !== false ? '<small class="muted">Bài này kiểm tra thanh điệu: sai thanh là sai.</small>' : ''}`;
    if (reveal) h += `<p>Đáp án: <b class="${isPy ? '' : 'zh'}">${esc(q.answer)}</b>${q.accept?.length ? ` <small class="muted">(chấp nhận: ${esc(q.accept.join(', '))})</small>` : ''}</p>`;
  } else if (q.type === 'order') {
    const picked = Array.isArray(st.ans) ? st.ans : [];
    h += `<div class="tokens" aria-label="Câu của bạn">${picked.map((ti, pos) => `<button class="tok" data-act="qunpick" data-pos="${pos}" ${reveal ? 'disabled' : ''}>${esc(q.tokens[ti])}</button>`).join('') || '<span class="muted" style="padding:8px">Chạm các từ bên dưới theo thứ tự…</span>'}</div>
      <div class="row">${q.tokens.map((t, i) => `<button class="tok ${picked.includes(i) ? 'used' : ''}" data-act="qtok" data-i="${i}" ${reveal ? 'disabled' : ''}>${esc(t)}</button>`).join('')}</div>`;
    if (reveal) h += `<p>Đáp án: <b class="zh">${esc(q.answer)}</b></p>`;
  } else if (q.type === 'open') {
    h += `<textarea class="zh" data-input="qopen" placeholder="Viết câu của bạn…" lang="zh-CN">${esc(st.text || '')}</textarea>`;
    if (st.showModel || reveal) {
      h += `<div class="card info" style="margin-top:10px"><b>Đáp án mẫu:</b> <span class="zh">${esc(q.answer)}</span>
        <p style="margin:8px 0 4px"><b>Tự đánh giá theo tiêu chí:</b></p><ul style="margin:0;padding-left:20px">${(q.criteria || []).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
        <small class="muted">Ứng dụng không tự chấm câu tự do. Bạn tự so với tiêu chí rồi chọn kết quả.</small>
        ${st.ans ? '' : `<div class="grid2" style="margin-top:10px"><button class="btn" data-act="qself" data-v="self-no">Chưa đạt</button><button class="btn jade" data-act="qself" data-v="self-ok">Đạt</button></div>`}</div>`;
    }
  }
  if (reveal && mode !== 'exam') {
    const ok = checkAnswer(q, q.type === 'order' ? (st.ans || []).map((i) => q.tokens[i]) : st.ans);
    if (q.type !== 'open' || st.ans) {
      h += `<div class="feedback ${ok ? 'ok' : 'no'}"><b>${ok ? 'Đúng' : st.ans === undefined || st.ans === '' ? 'Chưa trả lời' : 'Chưa đúng'}</b>${q.explain ? `<div class="ex">${safe(q.explain)}</div>` : ''}</div>`;
    }
  }
  return h;
}
/** Giá trị đáp án để chấm (order -> mảng từ). */
export const answerValue = (q, st) => (q.type === 'order' ? (st.ans || []).map((i) => q.tokens[i]) : st.ans);

/** Gắn xử lý cho câu hỏi; getSt() trả về trạng thái hiện tại, redraw() vẽ lại. */
export function bindQuestion(getQ, getSt, redraw, onChange = () => {}) {
  H.qpick = (el) => { const st = getSt(); if (st.locked) return; st.ans = +el.dataset.i; onChange(); redraw(); };
  H.qtok = (el) => { const st = getSt(); if (st.locked) return; st.ans = [...(st.ans || []), +el.dataset.i]; onChange(); redraw(); };
  H.qunpick = (el) => { const st = getSt(); if (st.locked) return; const a = [...(st.ans || [])]; a.splice(+el.dataset.pos, 1); st.ans = a; onChange(); redraw(); };
  H.qfill = (el) => { const st = getSt(); st.ans = el.value; onChange(); };
  H.qopen = (el) => { getSt().text = el.value; };
  H.qself = (el) => { const st = getSt(); st.ans = el.dataset.v; st.checked = true; onChange(); redraw(); };
  H.qplay = async () => {
    const q = getQ(); const st = getSt();
    if (q.maxPlays && (st.plays || 0) >= q.maxPlays) return;
    st.plays = (st.plays || 0) + 1; onChange();
    const r = await media.play({ audioKey: q.audioKey, lines: q.lines, rate: S.rate });
    if (!r.ok) toast(r.msg, 6000);
    redraw();
  };
}

/** Bổ sung bài đọc/đoạn nghe vào câu hỏi trước khi hiển thị. */
export async function hydrate(questions) {
  const out = [];
  for (const q0 of questions) {
    const q = { ...q0 };
    if (q.passage && !q.passageText) {
      const r = await db.get('readings', q.passage);
      if (r) { q.passageText = r.text; q.passageTitle = r.title; }
    }
    if (q.listen && !q.lines && !q.audioKey) {
      const l = await db.get('listening', q.listen);
      if (l) { q.lines = l.lines; q.audioKey = l.audio ? `${l.packId}/${l.audio}` : null; }
    }
    out.push(q);
  }
  return out;
}

async function recordResult(q, ok) {
  const kind = q.skill === 'vocab' ? 'word' : q.tags?.grammar ? 'grammar' : q.skill;
  const id = q.skill === 'vocab' && q.tags?.word ? 'w:' + q.tags.word : 'q:' + q.id;
  await logAttempt(q.skill, q.tags?.word || q.id, ok);
  if (ok) await clearMistakeOnce(id);
  else {
    const label = q.skill === 'vocab' ? (await allWords()).byId.get(q.tags?.word)?.hanzi : q.prompt.replace(/<[^>]+>/g, ' ').slice(0, 80);
    await addMistake({ id, kind, refId: q.tags?.word || q.tags?.grammar || q.id, label, q: q.skill === 'vocab' ? undefined : q });
    if (q.tags?.grammar) await addMistake({ id: 'g:' + q.tags.grammar, kind: 'grammar', refId: q.tags.grammar, label: q.tags.grammar });
  }
  // câu từ vựng cũng cập nhật lịch ôn của từ
  if (q.skill === 'vocab' && q.tags?.word) {
    const c = await getCard(q.tags.word);
    if (c.due) await saveCard(review(c, ok ? 4 : 1));
  }
}

// ======================= Ôn tập (tab) =======================
routes.review = async () => {
  setTitle('Ôn tập');
  const cards = await db.all('srs');
  const today = todayStr();
  const due = cards.filter((c) => isDue(c, today));
  const hard = cards.filter((c) => c.due && ((c.wrong || 0) >= 2 || c.flags?.hard));
  const fav = cards.filter((c) => c.flags?.fav);
  const mistakes = (await db.all('mistakes')).filter((m) => !m.resolved);
  const next7 = [...Array(7)].map((_, i) => { const d = addDays(today, i + 1); return { d, n: cards.filter((c) => c.due === d).length }; });
  const mode = S.cardMode;
  const modes = [['hz', 'Chữ → Nghĩa'], ['vi', 'Nghĩa → Chữ'], ['listen', 'Nghe → Chọn chữ'], ['type', 'Gõ pinyin'], ['fill', 'Điền từ vào câu']];
  main.innerHTML = `
    <div class="card"><h3>Kiểu thẻ</h3><div class="row">${modes.map(([k, t]) => `<button class="btn small ${mode === k ? 'primary' : ''}" data-act="mode" data-k="${k}">${t}</button>`).join('')}</div></div>
    <div class="stack">
      <a class="btn primary block" href="#/flash?src=due">Ôn thẻ đến hạn (${due.length})</a>
      <a class="btn block" href="#/flash?src=today">Buổi học hôm nay (đến hạn + từ mới HSK ${S.level})</a>
      <a class="btn block" href="#/drill?src=quick">Ôn nhanh 10–15 phút (từ đến hạn + lỗi gần đây)</a>
      <div class="grid2"><a class="btn" href="#/flash?src=hard">Từ hay sai (${hard.length})</a><a class="btn" href="#/flash?src=fav">★ Yêu thích (${fav.length})</a></div>
      <a class="btn block" href="#/mistakes">Sổ lỗi sai (${mistakes.length} mục chưa sửa)</a>
    </div>
    <h2>Lịch ôn 7 ngày tới</h2>
    <div class="card"><div class="row" style="align-items:flex-end;gap:6px;height:90px">${next7.map((x) => {
      const max = Math.max(1, ...next7.map((y) => y.n));
      return `<div class="grow" style="text-align:center"><small>${x.n}</small><div style="height:${(x.n / max) * 50 + 2}px;background:var(--jade);border-radius:4px;margin:2px 4px"></div><small class="muted">${x.d.slice(8)}/${x.d.slice(5, 7)}</small></div>`;
    }).join('')}</div></div>
    <p class="muted" style="font-size:.85em">Thuật toán: SM-2. Sau mỗi thẻ bạn chọn Quên / Khó / Nhớ / Dễ; ứng dụng tính ngày ôn tiếp theo và ưu tiên thẻ quá hạn lâu, thẻ hay sai.</p>`;
  H.mode = async (el) => { S.cardMode = el.dataset.k; await saveSettings(); refresh(); };
};

// ======================= Flashcard SRS =======================
let F = null;
async function buildQueue(q) {
  const cards = await db.all('srs');
  const cmap = new Map(cards.map((c) => [c.wordId, c]));
  const dict = await allWords();
  const today = todayStr();
  const exists = (id) => dict.byId.has(id);
  let ids = [];
  if (q.src === 'due' || q.src === 'today') {
    ids = sortDue(cards.filter((c) => isDue(c, today) && exists(c.wordId))).slice(0, S.maxReviews).map((c) => c.wordId);
    if (q.src === 'today') {
      const d = await levelData(S.level);
      const newToday = cards.filter((c) => c.firstSeen === today).length;
      const n = Math.max(0, S.newPerDay - newToday);
      ids.push(...d.words.filter((w) => !cmap.get(w.id)?.due).slice(0, n).map((w) => w.id));
    }
  } else if (q.src === 'hard') ids = cards.filter((c) => c.due && ((c.wrong || 0) >= 2 || c.flags?.hard) && exists(c.wordId)).sort((a, b) => (b.wrong || 0) - (a.wrong || 0)).map((c) => c.wordId);
  else if (q.src === 'fav') ids = cards.filter((c) => c.flags?.fav && exists(c.wordId)).map((c) => c.wordId);
  else if (q.src === 'more') {
    const d = await levelData(S.level);
    ids = d.words.filter((w) => !cmap.get(w.id)?.due).slice(0, 10).map((w) => w.id);
  } else if (q.lesson) {
    const d = await levelData(S.level);
    ids = d.words.filter((w) => w.lesson === q.lesson).map((w) => w.id);
  }
  return [...new Set(ids)];
}

routes.flash = async (args, q) => {
  setTitle('Thẻ ghi nhớ', '#/review');
  const key = JSON.stringify(q);
  if (!F || F.key !== key || F.done) {
    const queue = await buildQueue(q);
    F = { key, queue, i: 0, flipped: false, requeued: new Set(), stats: { n: 0, again: 0 }, st: {} };
  }
  F.gen = gen();
  if (q.lesson) rememberLearn('Thẻ: ' + q.lesson);
  await drawFlash();
};

async function flashQuestion(w, mode) {
  const d = await levelData(w.level);
  const pool = d.words.length >= 4 ? d.words : (await allWords()).list;
  if (mode === 'listen') { const q = vocabQuestion(w, pool, 'hanzi'); return q && { ...q, prompt: 'Nghe và chọn chữ Hán đúng:' }; }
  if (mode === 'fill') return vocabQuestion(w, pool, 'fill');
  return null;
}

async function drawFlash() {
  const g0 = F.gen;
  if (g0 !== gen()) return;
  if (!F.queue.length) {
    main.innerHTML = `<div class="card info"><b>Không có thẻ nào cần ôn lúc này.</b><p class="muted">Bạn có thể học thêm từ mới hoặc làm bài tập.</p>
      <div class="grid2"><a class="btn primary" href="#/flash?src=more">Học thêm 10 từ mới</a><a class="btn" href="#/words">Xem từ vựng</a></div></div>`;
    return;
  }
  if (F.i >= F.queue.length) {
    F.done = true;
    main.innerHTML = `<div class="card info"><h3>Hoàn thành buổi ôn ✓</h3><p>Đã ôn ${F.stats.n} lượt thẻ, quên ${F.stats.again} lần. Tiến độ đã được lưu trên máy.</p>
      <div class="grid2"><a class="btn primary" href="#/today">Về Hôm nay</a><a class="btn" href="#/drill?src=quick">Làm bài ôn nhanh</a></div></div>`;
    return;
  }
  const dict = await allWords();
  const w = dict.byId.get(F.queue[F.i]);
  if (!w) { F.i++; return drawFlash(); }
  const card = await getCard(w.id);
  let mode = S.cardMode;
  if (!F.cur || F.cur.id !== w.id) {
    F.cur = { id: w.id, q: null, st: {} };
    if (mode === 'listen' || mode === 'fill') F.cur.q = await flashQuestion(w, mode);
  }
  if (g0 !== gen()) return; // người dùng đã chuyển màn hình
  if ((mode === 'listen' || mode === 'fill') && !F.cur.q) mode = 'hz'; // từ thiếu ví dụ hoặc không đủ phương án
  const isNew = !card.due;
  const total = F.queue.length;
  let front = '';
  let back = '';
  const exHtml = (w.ex || []).slice(0, 1).map((e) => `<div class="ex"><div class="zh" style="font-size:1.15em">${esc(e.zh)}</div><div class="py-line">${esc(e.py)}</div><div class="muted vi-line">${esc(e.vi)}</div></div>`).join('');
  const full = `<div class="hz">${esc(w.hanzi)}</div><div class="py">${esc(w.pinyin)}</div><div class="vi">${esc(w.vi)} <small class="muted">${esc(w.pos || '')}</small></div>${exHtml}`;
  if (mode === 'hz') { front = `<div class="hz">${esc(w.hanzi)}</div><div class="py hide-able-py">${S.showPy ? esc(w.pinyin) : ''}</div>`; back = full; }
  if (mode === 'vi') { front = `<div class="vi" style="font-size:1.4em">${esc(w.vi)}</div><small class="muted">${esc(w.pos || '')}</small>`; back = full; }
  let body;
  if (mode === 'hz' || mode === 'vi') {
    body = `<div class="card flash" data-act="flip" role="button" aria-label="Chạm để lật thẻ">${F.flipped ? back : front}<span class="hint">${F.flipped ? '' : 'Chạm để lật thẻ'}</span></div>`;
  } else if (mode === 'type') {
    const st = F.cur.st;
    body = `<div class="card"><div class="word-head" style="padding:8px"><div class="hz">${esc(w.hanzi)}</div></div>
      <label class="f"><span>Gõ pinyin ${S.checkTones ? 'có thanh điệu (dấu hoặc số)' : '(không kiểm tra thanh điệu)'}</span>
      <input type="text" id="tp" value="${esc(st.ans || '')}" ${st.checked ? 'disabled' : ''} autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"></label>
      ${st.checked ? `<div class="feedback ${st.ok ? 'ok' : 'no'}"><b>${st.ok ? 'Đúng' : 'Chưa đúng'}</b><div class="ex">${full}</div></div>` : `<button class="btn primary block" data-act="typeCheck">Kiểm tra</button>`}</div>`;
  } else {
    body = `<div class="card">${renderQuestion(F.cur.q, F.cur.st, 'practice')}${F.cur.st.checked ? `<div class="ex-line" style="text-align:center">${full}</div>` : ''}</div>`;
  }
  const answered = mode === 'hz' || mode === 'vi' ? F.flipped : F.cur.st.checked;
  main.innerHTML = `
    <div class="progress-line"><span>${F.i + 1}/${total}</span><div class="bar"><i style="width:${(F.i / total) * 100}%"></i></div>${isNew ? '<span class="chip red">Từ mới</span>' : '<span class="chip">Ôn lại</span>'}</div>
    ${body}
    <div class="row between no-print" style="margin:-4px 0 10px">
      <div class="row">${playBtn(w)}<button class="btn small ghost" data-act="cflag" data-k="fav">${card.flags?.fav ? '★' : '☆'} Yêu thích</button><button class="btn small ghost" data-act="cflag" data-k="conf">${card.flags?.conf ? '● ' : ''}Dễ nhầm</button></div>
      <a class="btn small ghost" href="#/word/${encodeURIComponent(w.id)}">Chi tiết</a>
    </div>
    <div class="sticky-actions">${answered ? `<div class="grades">${GRADES.map((g) => `<button class="btn ${g.cls}" data-act="grade" data-q="${g.q}">${g.label}<small>${previewInterval(card, g.q)}</small></button>`).join('')}</div>`
      : mode === 'hz' || mode === 'vi' ? '<button class="btn primary block" data-act="flip">Lật thẻ</button>' : (mode === 'type' ? '' : '<button class="btn primary block" data-act="fcheck">Kiểm tra</button>')}</div>`;

  H.flip = () => { if (!F.flipped) { F.flipped = true; drawFlash(); } };
  H.typeCheck = () => {
    const v = $('#tp').value;
    F.cur.st.ans = v;
    F.cur.st.checked = true;
    F.cur.st.ok = pinyinEquals(v, w.pinyin, S.checkTones);
    drawFlash();
  };
  H.fcheck = () => {
    const st = F.cur.st;
    if (st.ans === undefined) { toast('Hãy chọn một đáp án'); return; }
    st.checked = true;
    st.ok = checkAnswer(F.cur.q, st.ans);
    drawFlash();
  };
  if (F.cur.q) bindQuestion(() => F.cur.q, () => F.cur.st, drawFlash);
  if (mode === 'listen' && F.cur.q) {
    H.qplay = async () => { const r = await media.play({ audioKey: w.audio ? `${w.packId}/${w.audio}` : null, text: w.hanzi, rate: S.rate }); if (!r.ok) toast(r.msg, 6000); };
    // Nút phát riêng cho chế độ nghe
    const qp = main.querySelector('.q-prompt');
    qp?.insertAdjacentHTML('afterbegin', '<button class="btn jade" data-act="qplay" style="margin-bottom:8px">🔊 Phát âm</button><br>');
  }
  H.cflag = async (el) => { const c = await getCard(w.id); c.flags = { ...(c.flags || {}), [el.dataset.k]: !c.flags?.[el.dataset.k] }; await saveCard(c); drawFlash(); };
  H.grade = async (el) => {
    const qv = +el.dataset.q;
    const c = review(await getCard(w.id), qv);
    await saveCard(c);
    await logAttempt('vocab', w.id, qv >= 3);
    F.stats.n++;
    if (qv < 3) {
      F.stats.again++;
      await addMistake({ id: 'w:' + w.id, kind: 'word', refId: w.id, label: w.hanzi });
      if (!F.requeued.has(w.id)) { F.requeued.add(w.id); F.queue.push(w.id); }
    } else if (qv >= 4) await clearMistakeOnce('w:' + w.id);
    F.i++;
    F.flipped = false;
    F.cur = null;
    await drawFlash();
    window.scrollTo(0, 0);
  };
  if (mode === 'type' && !F.cur.st.checked) {
    const inp = $('#tp');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') H.typeCheck(); });
  }
}
function previewInterval(card, q) {
  const c = review(card, q);
  return c.interval <= 1 ? (q < 3 ? 'ôn lại' : '1 ngày') : c.interval + ' ngày';
}
// Phím tắt trên máy tính
addEventListener('keydown', (e) => {
  if (!location.hash.startsWith('#/flash') || e.target.matches('input, textarea')) return;
  if (e.key === ' ' && H.flip) { e.preventDefault(); H.flip(); }
  const g = { 1: 1, 2: 3, 3: 4, 4: 5 }[e.key];
  if (g && H.grade && main.querySelector('[data-act=grade]')) H.grade({ dataset: { q: g } });
});

// ======================= Bài tập (drill) =======================
let D = null;
async function buildDrill(q) {
  const d = await levelData(S.level);
  let list = [];
  let title = 'Bài tập';
  let back = '#/learn';
  if (q.grammar) {
    const g = await db.get('grammar', q.grammar);
    title = g ? 'Bài tập: ' + g.title : 'Bài tập ngữ pháp';
    list = (g?.questions || []).map((id) => d.qmap.get(id)).filter(Boolean);
    back = '#/grammar/' + encodeURIComponent(q.grammar);
  } else if (q.reading) {
    const r = await db.get('readings', q.reading);
    title = r ? 'Đọc: ' + r.title : 'Đọc hiểu';
    list = (r?.questions || []).map((id) => d.qmap.get(id)).filter(Boolean);
    back = '#/reading/' + encodeURIComponent(q.reading);
  } else if (q.listen) {
    const l = await db.get('listening', q.listen);
    title = l ? 'Nghe: ' + l.title : 'Luyện nghe';
    list = (l?.questions || []).map((id) => d.qmap.get(id) || null).filter(Boolean);
    if (!list.length && l?.questions) list = (await Promise.all(l.questions.map((id) => db.get('questions', id)))).filter(Boolean);
    back = '#/listening/' + encodeURIComponent(q.listen);
  } else if (q.skill) {
    title = q.skill === 'writing' ? 'Luyện viết' : 'Bài tập';
    list = shuffle(d.questions.filter((x) => x.skill === q.skill));
    back = '#/writing';
  } else if (q.src === 'mistakes') {
    title = 'Ôn lỗi sai';
    back = '#/mistakes';
    const ms = (await db.all('mistakes')).filter((m) => !m.resolved && (!q.kind || m.kind === q.kind)).sort((a, b) => (b.lastAt > a.lastAt ? 1 : -1));
    const dict = await allWords();
    for (const m of ms.slice(0, 20)) {
      if (m.kind === 'word') { const w = dict.byId.get(m.refId); const qq = w && vocabQuestion(w, (await levelData(w.level)).words.length >= 4 ? (await levelData(w.level)).words : dict.list, shuffle(['meaning', 'hanzi', 'tone'])[0]); if (qq) list.push(qq); }
      else if (m.kind === 'grammar' && m.id.startsWith('g:')) { const g = await db.get('grammar', m.refId); for (const id of g?.questions || []) { const qq = await db.get('questions', id); if (qq) list.push(qq); } }
      else if (m.q) list.push(m.q);
    }
    const seen = new Set(); list = list.filter((x) => !seen.has(x.id) && seen.add(x.id));
  } else if (q.src === 'quick') {
    title = 'Ôn nhanh 10–15 phút';
    back = '#/review';
    const today = todayStr();
    const dict = await allWords();
    const due = sortDue((await db.all('srs')).filter((c) => isDue(c, today) && dict.byId.has(c.wordId))).slice(0, 12);
    for (const c of due) { const w = dict.byId.get(c.wordId); const pool = (await levelData(w.level)).words; const qq = vocabQuestion(w, pool.length >= 4 ? pool : dict.list, shuffle(['meaning', 'hanzi', 'tone', 'fill'])[0]) || vocabQuestion(w, pool, 'meaning'); if (qq) list.push(qq); }
    const ms = (await db.all('mistakes')).filter((m) => !m.resolved && m.q).sort((a, b) => (b.lastAt > a.lastAt ? 1 : -1)).slice(0, 8);
    list.push(...ms.map((m) => m.q));
    if (list.length < 8 && d.words.length >= 4) {
      const learned = new Set((await db.all('srs')).filter((c) => c.due).map((c) => c.wordId));
      for (const w of shuffle(d.words.filter((x) => learned.has(x.id))).slice(0, 10 - list.length)) { const qq = vocabQuestion(w, d.words, 'meaning'); if (qq) list.push(qq); }
    }
    const seen = new Set(); list = shuffle(list.filter((x) => !seen.has(x.id) && seen.add(x.id)));
  } else if (q.exam) {
    const ex = await db.get('exams', q.exam);
    title = 'Làm lại câu sai';
    back = '#/exam-result/' + q.exam;
    list = (ex?.questions || []).filter((qq) => ex.result?.wrong?.includes(qq.id));
  }
  return { title, back, list: await hydrate(list) };
}

routes.drill = async (args, q) => {
  const key = JSON.stringify(q);
  if (!D || D.key !== key || D.finished) {
    const b = await buildDrill(q);
    D = { key, ...b, i: 0, st: b.list.map(() => ({})), correct: 0, timed: q.timed ? +q.timed * 60000 : 0, startAt: Date.now() };
    if (D.timed) D.endsAt = Date.now() + D.timed;
  }
  setTitle(D.title, D.back);
  if (q.grammar || q.reading || q.listen) rememberLearn(D.title);
  D.gen = gen();
  if (!D.list.length) {
    main.innerHTML = `<div class="card warn"><b>Chưa có câu hỏi cho mục này.</b><p class="muted">${q.src === 'quick' ? 'Hãy học vài từ bằng thẻ trước, sau đó quay lại ôn nhanh.' : q.src === 'mistakes' ? 'Sổ lỗi sai đang trống — tốt lắm!' : 'Gói dữ liệu chưa có bài tập cho mục này.'}</p><a class="btn" href="${D.back}">Quay lại</a></div>`;
    return;
  }
  if (D.timed) {
    const t = setInterval(() => {
      const left = D.endsAt - Date.now();
      const el = $('#dtimer');
      if (el) { el.textContent = fmtMs(left); el.classList.toggle('low', left < 60000); }
      if (left <= 0) { clearInterval(t); finishDrill(); }
    }, 1000);
    onLeave(() => clearInterval(t));
  }
  drawDrill();
};
function drawDrill() {
  if (D.gen !== gen()) return;
  if (D.i >= D.list.length) return finishDrill();
  const q = D.list[D.i];
  const st = D.st[D.i];
  main.innerHTML = `<div class="progress-line"><span>Câu ${D.i + 1}/${D.list.length}</span><div class="bar"><i style="width:${(D.i / D.list.length) * 100}%"></i></div>
    ${D.timed ? `<span class="timer" id="dtimer">${fmtMs(D.endsAt - Date.now())}</span>` : ''}</div>
    <div class="card">${renderQuestion(q, st, 'practice')}</div>
    <div class="sticky-actions">${st.checked ? `<button class="btn primary block" data-act="next">${D.i + 1 < D.list.length ? 'Câu tiếp' : 'Xem kết quả'}</button>`
      : q.type === 'open' ? `<button class="btn primary block" data-act="showModel" ${st.showModel ? 'disabled' : ''}>Xem đáp án mẫu để tự đánh giá</button>`
      : `<button class="btn primary block" data-act="check">Kiểm tra</button>`}</div>`;
  bindQuestion(() => q, () => st, drawDrill);
  H.check = async () => {
    const v = answerValue(q, st);
    if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) { toast('Bạn chưa trả lời'); return; }
    st.checked = true;
    st.locked = true;
    st.ok = checkAnswer(q, v);
    if (st.ok) D.correct++;
    await recordResult(q, st.ok);
    drawDrill();
  };
  H.showModel = () => { st.showModel = true; drawDrill(); };
  const origSelf = H.qself;
  H.qself = async (el) => { origSelf(el); st.ok = el.dataset.v === 'self-ok'; if (st.ok) D.correct++; st.locked = true; await logAttempt('writing', q.id, st.ok); drawDrill(); };
  H.next = () => { D.i++; drawDrill(); window.scrollTo(0, 0); };
  const inp = main.querySelector('input[data-input=qfill]');
  inp?.addEventListener('keydown', (e) => { if (e.key === 'Enter') H.check(); });
}
function finishDrill() {
  if (D.gen !== gen()) return;
  D.finished = true;
  const done = D.st.filter((s) => s.checked).length;
  main.innerHTML = `<div class="card info"><h3>Kết quả</h3><p style="font-size:1.3em"><b>${D.correct}/${D.list.length}</b> câu đúng${done < D.list.length ? ` <small class="muted">(${D.list.length - done} câu chưa làm — hết giờ)</small>` : ''}</p>
    <p class="muted">Câu sai đã được thêm vào Sổ lỗi sai. Thời gian: ${fmtMs(Date.now() - D.startAt)}</p>
    <div class="grid2"><a class="btn primary" href="${D.back}">Quay lại</a><a class="btn" href="#/mistakes">Sổ lỗi sai</a></div></div>`;
}

// ======================= Sổ lỗi sai =======================
routes.mistakes = async (args, q) => {
  setTitle('Sổ lỗi sai', '#/review');
  const all = await db.all('mistakes');
  const showAll = q.all === '1';
  const list = all.filter((m) => showAll || !m.resolved).sort((a, b) => (b.lastAt > a.lastAt ? 1 : -1));
  const groups = [['word', 'Từ vựng'], ['grammar', 'Ngữ pháp'], ['listening', 'Nghe'], ['reading', 'Đọc'], ['writing', 'Viết']];
  const dict = await allWords();
  const gname = async (m) => { if (m.kind === 'grammar' && m.id.startsWith('g:')) { const g = await db.get('grammar', m.refId); return g ? 'Mẫu: ' + g.title : m.refId; } if (m.kind === 'word') { const w = dict.byId.get(m.refId); return w ? `${w.hanzi} · ${w.pinyin} · ${w.vi}` : m.label; } return m.label || m.id; };
  let html = `<div class="row between" style="margin-bottom:10px"><a class="btn primary" href="#/drill?src=mistakes">Ôn tất cả lỗi</a>
    <a class="chip ${showAll ? 'red' : ''}" href="#/mistakes${showAll ? '' : '?all=1'}">${showAll ? 'Đang hiện cả lỗi đã sửa' : 'Hiện cả lỗi đã sửa'}</a></div>`;
  if (!list.length) html += '<div class="card info">Chưa có lỗi nào cần sửa. Lỗi được ghi tự động khi bạn trả lời sai hoặc chọn “Quên”.</div>';
  for (const [k, name] of groups) {
    const items = list.filter((m) => m.kind === k);
    if (!items.length) continue;
    html += `<h2>${name} <span class="chip">${items.length}</span> <a class="btn small" href="#/drill?${qs({ src: 'mistakes', kind: k })}">Ôn nhóm này</a></h2><ul class="list">`;
    for (const m of items) {
      const href = m.kind === 'word' ? '#/word/' + encodeURIComponent(m.refId) : m.kind === 'grammar' && m.id.startsWith('g:') ? '#/grammar/' + encodeURIComponent(m.refId) : null;
      html += `<li><div class="li"><div class="grow">${href ? `<a href="${href}" style="padding:0;min-height:0">${esc(await gname(m))}</a>` : esc(await gname(m))}
        <div class="sub">Sai ${m.count} lần · gần nhất ${fmtDay((m.lastAt || '').slice(0, 10))}${m.resolved ? ' · đã sửa' : ''}</div></div>
        <button class="btn small ghost" data-act="mdel" data-id="${esc(m.id)}" aria-label="Xóa">✕</button></div></li>`;
    }
    html += '</ul>';
  }
  main.innerHTML = html;
  H.mdel = async (el) => { await db.del('mistakes', el.dataset.id); refresh(); };
};

// ======================= Ngữ pháp =======================
routes.grammar = async ([id]) => {
  const d = await levelData(S.level);
  if (!id) {
    setTitle('Ngữ pháp · HSK ' + S.level, '#/learn');
    if (!d.grammar.length) { main.innerHTML = await noDataBox(S.level); return; }
    const ms = new Map((await db.all('mistakes')).filter((m) => m.kind === 'grammar' && m.id.startsWith('g:') && !m.resolved).map((m) => [m.refId, m]));
    main.innerHTML = `<ul class="list">${d.grammar.map((g) => `<li><a href="#/grammar/${encodeURIComponent(g.id)}"><div class="grow"><b>${esc(g.title)}</b><div class="sub zh">${esc(g.pattern)}</div></div>${ms.has(g.id) ? '<span class="chip red">Hay sai</span>' : ''}<span class="chev">›</span></a></li>`).join('')}</ul>`;
    return;
  }
  const g = await db.get('grammar', id);
  setTitle('Ngữ pháp', '#/grammar');
  if (!g) { main.innerHTML = '<div class="card err">Không tìm thấy mẫu ngữ pháp.</div>'; return; }
  rememberLearn('Ngữ pháp: ' + g.title);
  main.innerHTML = `<div class="card"><h3>${esc(g.title)}</h3><p class="zh" style="font-size:1.2em;color:var(--red)">${esc(g.pattern)}</p><p>${esc(g.explain)}</p></div>
    <div class="card"><div class="row between"><h3 style="margin:0">Ví dụ</h3>${toggles()}</div>
    ${(g.examples || []).map((e) => `<div class="ex-line"><div class="zh">${esc(e.zh)} <button class="btn small ghost" data-act="speakText" data-text="${esc(e.zh)}">🔊</button></div><div class="py-line">${esc(e.py)}</div><div class="vi-line muted">${esc(e.vi)}</div></div>`).join('')}</div>
    ${g.compare ? `<div class="card warn"><b>So sánh / dễ nhầm</b><p style="margin:6px 0 0">${esc(g.compare)}</p></div>` : ''}
    ${(g.questions || []).length ? `<a class="btn primary block" href="#/drill?${qs({ grammar: g.id })}">Làm bài tập (${g.questions.length} câu)</a>` : '<p class="muted">Chưa có bài tập cho mẫu này.</p>'}`;
};

// ======================= Đọc =======================
routes.reading = async ([id]) => {
  const d = await levelData(S.level);
  if (!id) {
    setTitle('Luyện đọc · HSK ' + S.level, '#/learn');
    if (!d.readings.length) { main.innerHTML = await noDataBox(S.level); return; }
    main.innerHTML = `<ul class="list">${d.readings.map((r) => `<li><a href="#/reading/${encodeURIComponent(r.id)}"><div class="grow"><b>${esc(r.title)}</b><div class="sub">${esc(r.topic || '')} · ${(r.questions || []).length} câu hỏi</div></div><span class="chev">›</span></a></li>`).join('')}</ul>`;
    return;
  }
  const r = await db.get('readings', id);
  setTitle('Bài đọc', '#/reading');
  if (!r) { main.innerHTML = '<div class="card err">Không tìm thấy bài đọc.</div>'; return; }
  rememberLearn('Đọc: ' + r.title);
  const dict = await allWords();
  const segs = segment(r.text, dict.byHz);
  main.innerHTML = `<div class="card"><h3>${esc(r.title)}</h3>
    <div class="passage">${segs.map((s) => (s.w ? `<span class="tap" data-act="lookup" data-id="${esc(s.w.id)}">${esc(s.s)}</span>` : esc(s.s))).join('')}</div>
    <small class="muted">Chạm vào từ có gạch chấm để tra nghĩa.</small><div id="pop"></div>
    <div class="row" style="margin-top:10px"><button class="btn small" data-act="rv" data-k="py">Hiện pinyin</button><button class="btn small" data-act="rv" data-k="vi">Hiện bản dịch</button></div>
    <div id="rv-py" class="reveal hidden py-line" style="visibility:visible">${esc(r.pinyin || '')}</div><div id="rv-vi" class="reveal hidden muted">${esc(r.vi || '')}</div></div>
    ${(r.questions || []).length ? `<div class="grid2"><a class="btn primary" href="#/drill?${qs({ reading: r.id })}">Làm câu hỏi (không giới hạn giờ)</a>
      <a class="btn" href="#/drill?${qs({ reading: r.id, timed: Math.max(2, r.questions.length) })}">Tính giờ (${Math.max(2, r.questions.length)} phút)</a></div>` : ''}`;
  H.rv = (el) => $('#rv-' + el.dataset.k).classList.toggle('hidden');
  H.lookup = async (el) => {
    const w = dict.byId.get(el.dataset.id);
    const c = await getCard(w.id);
    $('#pop').innerHTML = `<div class="card info" style="margin-top:10px"><div class="row between"><div><span class="zh" style="font-size:1.6em">${esc(w.hanzi)}</span> <span style="color:var(--red)">${esc(w.pinyin)}</span><div>${esc(w.vi)}</div></div>
      <div class="row">${playBtn(w)}${c.due ? '<span class="chip jade">Đã có trong thẻ</span>' : `<button class="btn small jade" data-act="addCard" data-id="${esc(w.id)}">Lưu vào thẻ ôn</button>`}</div></div></div>`;
  };
  H.addCard = async (el) => {
    const c = await getCard(el.dataset.id);
    if (!c.due) { c.due = todayStr(); c.firstSeen = todayStr(); c.flags = { ...(c.flags || {}), fromReading: true }; await saveCard(c); }
    el.outerHTML = '<span class="chip jade">Đã lưu — ôn trong mục Ôn tập</span>';
  };
};
/** Tách câu thành từ theo từ điển đã tải (khớp dài nhất, tối đa 4 chữ). */
export function segment(text, byHz) {
  const ch = [...text];
  const out = [];
  for (let i = 0; i < ch.length;) {
    let hit = null;
    for (let L = Math.min(4, ch.length - i); L >= 1; L--) { const s = ch.slice(i, i + L).join(''); if (byHz.has(s)) { hit = s; break; } }
    if (hit) { out.push({ s: hit, w: byHz.get(hit) }); i += [...hit].length; } else { out.push({ s: ch[i] }); i++; }
  }
  return out;
}

// ======================= Nghe =======================
routes.listening = async ([id]) => {
  const d = await levelData(S.level);
  const st = await media.ttsStatus();
  if (!id) {
    setTitle('Luyện nghe · HSK ' + S.level, '#/learn');
    main.innerHTML = `<div class="card ${st.ok ? 'info' : 'warn'}"><small>${esc(st.msg)}</small><br><small class="muted">Bài có tệp audio trong gói phát được khi offline. Bài dùng giọng đọc thiết bị phụ thuộc giọng đã cài trên máy.</small></div>
      <a class="btn block" href="#/listen-add" style="margin-bottom:12px">＋ Thêm bài nghe từ tệp MP3/WAV</a>
      ${d.listening.length ? `<ul class="list">${d.listening.map((l) => `<li><a href="#/listening/${encodeURIComponent(l.id)}"><div class="grow"><b>${esc(l.title)}</b><div class="sub">${l.audio ? 'Audio trong gói' : 'Giọng đọc thiết bị (TTS)'} · ${(l.questions || []).length} câu hỏi</div></div>${l.packId === 'user' ? '<span class="chip amber">Tự nhập</span>' : ''}<span class="chev">›</span></a></li>`).join('')}</ul>` : await noDataBox(S.level)}`;
    return;
  }
  const l = await db.get('listening', id);
  setTitle('Bài nghe', '#/listening');
  if (!l) { main.innerHTML = '<div class="card err">Không tìm thấy bài nghe.</div>'; return; }
  rememberLearn('Nghe: ' + l.title);
  const key = l.audio ? `${l.packId}/${l.audio}` : null;
  const hasAudio = key && (await db.get('audio', key));
  const canPlay = hasAudio || (l.tts !== false && st.ok);
  const L = { rate: S.rate, loop: false, dict: (l.lines || []).map(() => ({})) };
  const draw = () => {
    main.innerHTML = `<div class="card"><h3>${esc(l.title)}</h3>
      ${canPlay ? '' : `<div class="card err tight">${key && !hasAudio ? 'Thiếu tệp âm thanh của bài này trên máy (gói tải chưa đủ hoặc tệp bị xóa).' : esc(st.msg)}</div>`}
      <div class="row"><button class="btn jade" data-act="lplay" ${canPlay ? '' : 'disabled'}>🔊 Phát</button><button class="btn" data-act="lstop">■ Dừng</button>
        <select data-change="lrate" style="width:auto">${[0.75, 1, 1.25].map((r) => `<option value="${r}" ${r === L.rate ? 'selected' : ''}>Tốc độ ${r}×</option>`).join('')}</select>
        ${hasAudio ? `<label class="row" style="gap:4px"><input type="checkbox" data-change="lloop" ${L.loop ? 'checked' : ''}> Lặp</label>` : ''}</div>
      <small class="muted">${hasAudio ? 'Đang dùng tệp audio đã lưu trên máy.' : 'Đang dùng giọng đọc của thiết bị — giọng máy, không phải giọng người đọc đề thi.'}</small>
      <div class="row" style="margin-top:10px"><button class="btn small" data-act="ltr">Hiện lời & dịch</button></div>
      <div id="ltr" class="hidden">${(l.lines || []).map((x) => `<div class="ex-line"><div class="zh">${esc(x.who ? x.who + '：' : '')}${esc(x.zh)}</div><div class="py-line">${esc(x.py || '')}</div></div>`).join('') || `<p class="zh">${esc(l.transcript)}</p>`}<p class="muted">${esc(l.vi || '')}</p></div></div>
      ${(l.questions || []).length ? `<a class="btn primary block" href="#/drill?${qs({ listen: l.id })}">Nghe chọn đáp án (${l.questions.length} câu)</a>` : ''}
      ${(l.lines || []).length ? `<h2>Nghe chép chính tả</h2><p class="muted" style="font-size:.85em">Phát từng câu rồi gõ lại bằng chữ Hán. ${hasAudio ? 'Mỗi câu dùng giọng đọc thiết bị.' : ''}</p>
        ${l.lines.map((x, i) => `<div class="card tight"><div class="row"><button class="btn small jade" data-act="lline" data-i="${i}" ${st.ok ? '' : 'disabled'}>🔊 Câu ${i + 1}</button>
          <input type="text" class="zh grow" data-input="ldict" data-i="${i}" value="${esc(L.dict[i].v || '')}" lang="zh-CN" autocomplete="off" style="flex:1;min-width:160px"><button class="btn small" data-act="ldcheck" data-i="${i}">Kiểm tra</button></div>
          ${L.dict[i].checked ? `<div class="feedback ${L.dict[i].ok ? 'ok' : 'no'}"><b>${L.dict[i].ok ? 'Đúng' : 'Chưa đúng'}</b><div class="ex zh">${esc(x.zh)}</div></div>` : ''}</div>`).join('')}` : ''}`;
  };
  draw();
  H.lplay = async () => { const r = await media.play({ audioKey: hasAudio ? key : null, lines: l.lines, text: l.lines ? undefined : l.transcript, rate: L.rate, loop: L.loop }); if (!r.ok) toast(r.msg, 6000); };
  H.lstop = () => media.stopAll();
  H.lrate = (el) => { L.rate = +el.value; };
  H.lloop = (el) => { L.loop = el.checked; };
  H.ltr = () => $('#ltr').classList.toggle('hidden');
  H.lline = async (el) => { const r = await media.play({ text: l.lines[+el.dataset.i].zh, rate: L.rate }); if (!r.ok) toast(r.msg, 6000); };
  H.ldict = (el) => { L.dict[+el.dataset.i].v = el.value; };
  H.ldcheck = async (el) => {
    const i = +el.dataset.i;
    L.dict[i].checked = true;
    L.dict[i].ok = hanziEquals(L.dict[i].v || '', l.lines[i].zh);
    const g0 = gen();
    await logAttempt('listening', l.id + '#' + i, L.dict[i].ok);
    if (g0 === gen()) draw();
  };
};

// ======================= Viết =======================
routes.writing = async () => {
  setTitle('Luyện viết · HSK ' + S.level, '#/learn');
  const d = await levelData(S.level);
  const ws = d.questions.filter((q) => q.skill === 'writing');
  if (!ws.length) { main.innerHTML = await noDataBox(S.level); return; }
  const cnt = (t) => ws.filter((q) => q.type === t).length;
  main.innerHTML = `<div class="card"><p style="margin-top:0">Gồm: sắp xếp từ thành câu (${cnt('order')}), gõ chữ Hán/pinyin (${cnt('fill')}), viết câu tự do có đáp án mẫu (${cnt('open')}).</p>
    <p class="muted" style="font-size:.88em">Câu tự do: ứng dụng KHÔNG tự chấm ngữ pháp. Bạn xem đáp án mẫu và tiêu chí rồi tự đánh giá. Viết tay theo thứ tự nét chưa có trong bản này.</p>
    <a class="btn primary block" href="#/drill?skill=writing">Bắt đầu luyện viết (${ws.length} câu)</a></div>
    <div class="card info"><b>Gõ chữ Hán trên iPhone:</b> Cài đặt → Cài đặt chung → Bàn phím → Bàn phím → Thêm bàn phím mới → Tiếng Trung giản thể → Bính âm. Khi gõ, chạm 🌐 để đổi bàn phím.</div>`;
};
