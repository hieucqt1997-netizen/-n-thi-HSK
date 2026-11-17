// Thi thử, cá nhân/cài đặt, gói nội dung, sao lưu, quản lý nội dung.
import { routes, H, S, db, esc, $, main, toast, setTitle, levelData, allWords, logAttempt, addMistake,
  fmtDate, fmtDay, fmtMs, fmtBytes, qs, nowISO, invalidate, config, packIndex, saveSettings, onLeave, checkUpdate, APP_VERSION, gen, refresh } from './app.js';
import { renderQuestion, bindQuestion, hydrate, answerValue } from './views2.js';
import { checkAnswer } from './match.js';
import { buildTest } from './quiz.js';
import { todayStr, daysBetween } from './srs.js';
import { vocabFromCSV, validatePack, toCSV, VOCAB_COLUMNS } from './csv.js';
import { BACKUP_FORMAT, BACKUP_SCHEMA, checkBackup, mergeRecords } from './backup.js';
import { PERSONAL, CONTENT, STORES } from './db.js';
import * as media from './media.js';

// ======================= Thi thử =======================
async function examBank(level) {
  const d = await levelData(level);
  const st = await media.ttsStatus();
  const lqs = await hydrate(d.questions.filter((q) => q.skill === 'listening'));
  const audioOk = async (q) => (q.audioKey ? !!(await db.get('audio', q.audioKey)) : false);
  const usable = [];
  for (const q of lqs) if ((await audioOk(q)) || (st.ok && q.lines)) usable.push(q);
  return { words: d.words, questions: await hydrate(d.questions), listeningQs: usable, tts: st, listeningTotal: lqs.length };
}

routes.exam = async () => {
  setTitle('Thi thử · HSK ' + S.level);
  const cfg = await config();
  const lv = S.level;
  const exams = (await db.all('exams')).sort((a, b) => (b.startedAt > a.startedAt ? 1 : -1));
  const running = exams.find((x) => !x.submittedAt);
  const bp = cfg.practiceTests?.[lv];
  const ver = cfg.versions?.find((v) => v.id === S.hskVersion);
  let body = '';
  if (running) body += `<div class="card warn row between"><div><b>Đang làm dở:</b> ${esc(running.title)}<br><small>${running.mode === 'sim' ? 'Mô phỏng thi — thời gian vẫn chạy khi thoát' : 'Luyện tập — đã tạm dừng'}</small></div><a class="btn primary" href="#/exam-run/${running.id}">Tiếp tục</a></div>`;
  if (!bp) body += `<div class="card warn"><b>Chưa có cấu hình bài kiểm tra cho HSK ${lv}.</b><p class="muted">Cần có dữ liệu và cấu hình trong config/hsk-versions.json.</p></div>`;
  else {
    const bank = await examBank(lv);
    const dry = buildTest(bp, bank);
    const sections = bp.sections.map((s) => {
      const m = dry.missing.find((x) => x.section === s.name);
      return `<tr><td>${esc(s.name)}</td><td>${s.count}</td><td>${m ? `<span class="chip ${m.have ? 'amber' : 'red'}">có ${m.have}</span>` : '<span class="chip jade">đủ</span>'}</td></tr>`;
    }).join('');
    const can = dry.questions.length >= 5;
    body += `<div class="card"><h3>${esc(bp.title)}</h3>
      <p class="muted" style="margin:4px 0 8px">Đề do ứng dụng tự lắp từ ngân hàng câu hỏi tự biên soạn — <b>không phải đề thi thật</b>, không theo đúng cấu trúc đề chính thức. ${bp.minutes} phút.</p>
      <div class="scroll-x"><table class="t"><tr><th>Phần</th><th>Số câu</th><th>Ngân hàng</th></tr>${sections}</table></div>
      ${!bank.tts.ok && bank.listeningTotal ? `<p class="muted" style="font-size:.85em">Phần nghe: ${esc(bank.tts.msg)} Các câu nghe không phát được sẽ bị bỏ khỏi đề.</p>` : ''}
      ${dry.missing.length ? '<p class="muted" style="font-size:.85em">Phần thiếu câu sẽ chỉ có số câu hiện có.</p>' : ''}
      <label class="f"><span>Chế độ</span><select id="emode"><option value="practice">Luyện tập — thoát app thì tạm dừng đồng hồ</option><option value="sim">Mô phỏng thi — tính theo giờ kết thúc, thoát app vẫn tính giờ</option></select></label>
      <button class="btn primary block" data-act="start" ${can && !running ? '' : 'disabled'}>${running ? 'Hãy hoàn thành bài đang làm trước' : can ? 'Bắt đầu' : 'Chưa đủ câu hỏi'}</button></div>`;
  }
  const off = ver?.official?.[lv];
  const minBank = cfg.fullMock?.minBank?.[lv];
  body += `<div class="card"><h3>Đề mô phỏng đủ chuẩn ${ver ? '· ' + esc(ver.name) : ''}</h3>
    <p class="muted" style="margin:4px 0 0">🔒 Chưa mở. ${off ? (off.verified ? '' : 'Cấu trúc đề trong cấu hình CHƯA được xác minh từ nguồn chính thức. ') : 'Chưa có cấu trúc đề cho phiên bản/cấp này. '}
    ${minBank ? `Cần ngân hàng tối thiểu ${minBank.listening} câu nghe + ${minBank.reading} câu đọc đúng dạng đề.` : ''} ${esc(ver?.note || '')}</p></div>`;
  body += '<h2>Lịch sử</h2>';
  const done = exams.filter((x) => x.submittedAt);
  body += done.length ? `<ul class="list">${done.map((x) => `<li><a href="#/exam-result/${x.id}"><div class="grow"><b>${x.result.correct}/${x.result.total}</b> · ${esc(x.title)}<div class="sub">${fmtDate(x.submittedAt)} · ${x.mode === 'sim' ? 'Mô phỏng' : 'Luyện tập'}</div></div><span class="chev">›</span></a></li>`).join('')}</ul>` : '<p class="muted">Chưa có lần thi nào.</p>';
  main.innerHTML = body;
  H.start = async () => {
    const bank = await examBank(lv);
    const { questions } = buildTest(bp, bank);
    const mode = $('#emode').value;
    const ms = bp.minutes * 60000;
    const ex = { id: 'ex-' + Date.now(), level: lv, title: bp.title, mode, minutes: bp.minutes, startedAt: nowISO(), updatedAt: nowISO(),
      endsAt: mode === 'sim' ? Date.now() + ms : null, remainingMs: ms,
      questions: questions.map((q) => (q.type === 'listen-choice' && mode === 'sim' ? { ...q, maxPlays: 2 } : q)),
      st: questions.map(() => ({})), marked: [], spent: {}, cur: 0, sections: bp.sections.map((s) => ({ id: s.id, name: s.name })) };
    await db.put('exams', ex);
    location.hash = '#/exam-run/' + ex.id;
  };
};

let E = null;
routes['exam-run'] = async ([id]) => {
  E = await db.get('exams', id);
  if (!E) { main.innerHTML = '<div class="card err">Không tìm thấy bài thi.</div>'; return; }
  if (E.submittedAt) { location.replace('#/exam-result/' + id); return; }
  setTitle(E.title, '#/exam');
  let lastTick = Date.now();
  let dirty = 0;
  const save = async () => { E.updatedAt = nowISO(); await db.put('exams', E); };
  const remaining = () => (E.mode === 'sim' ? E.endsAt - Date.now() : E.remainingMs);
  if (remaining() <= 0) { await submit(true); return; }
  const tick = async () => {
    const now = Date.now();
    const dt = now - lastTick;
    lastTick = now;
    if (document.visibilityState !== 'visible') return;
    if (E.mode === 'practice') E.remainingMs -= dt;
    const sec = E.questions[E.cur]?.section;
    if (sec) E.spent[sec] = (E.spent[sec] || 0) + dt;
    const left = remaining();
    const el = $('#etimer');
    if (el) { el.textContent = fmtMs(left); el.classList.toggle('low', left < 120000); }
    if (left <= 0) { clearInterval(timer); await submit(true); return; }
    if (++dirty % 5 === 0) save();
  };
  const timer = setInterval(tick, 1000);
  const vis = () => { if (document.visibilityState === 'hidden') save(); else lastTick = Date.now(); };
  document.addEventListener('visibilitychange', vis);
  onLeave(async () => { clearInterval(timer); document.removeEventListener('visibilitychange', vis); if (!E.submittedAt) await save(); });

  const draw = () => {
    const q = E.questions[E.cur];
    const st = E.st[E.cur];
    const sec = E.sections.find((s) => s.id === q.section);
    const answered = E.st.filter((s) => s.ans !== undefined && s.ans !== '' && !(Array.isArray(s.ans) && !s.ans.length)).length;
    main.innerHTML = `<div class="card tight row between"><span><b>${esc(sec?.name || '')}</b> · Câu ${E.cur + 1}/${E.questions.length}</span>
        <span>⏱ <span class="timer" id="etimer">${fmtMs(remaining())}</span></span></div>
      <div class="card">${renderQuestion(q, st, 'exam')}</div>
      <div class="sticky-actions"><div class="grid3"><button class="btn" data-act="prev" ${E.cur ? '' : 'disabled'}>‹ Trước</button>
        <button class="btn ${E.marked.includes(E.cur) ? 'primary' : ''}" data-act="mark">${E.marked.includes(E.cur) ? '⚑ Đã đánh dấu' : '⚑ Xem lại'}</button>
        <button class="btn" data-act="nextq" ${E.cur < E.questions.length - 1 ? '' : 'disabled'}>Sau ›</button></div></div>
      <details class="card" ${E.showGrid ? 'open' : ''}><summary data-act="grid">Danh sách câu (${answered}/${E.questions.length} đã trả lời)</summary>
        <div class="qgrid" style="margin-top:10px">${E.questions.map((qq, i) => { const s = E.st[i]; const a = s.ans !== undefined && s.ans !== '' && !(Array.isArray(s.ans) && !s.ans.length); return `<button class="${a ? 'ans' : ''} ${i === E.cur ? 'cur' : ''} ${E.marked.includes(i) ? 'mark' : ''}" data-act="jump" data-i="${i}">${i + 1}</button>`; }).join('')}</div></details>
      <div class="grid2">${E.mode === 'practice' ? '<a class="btn" href="#/exam">Tạm dừng</a>' : '<a class="btn" href="#/exam">Thoát (giờ vẫn chạy)</a>'}<button class="btn jade" data-act="submit">Nộp bài</button></div>
      <p class="muted" style="font-size:.8em">Bài làm tự lưu sau mỗi thao tác. ${E.mode === 'sim' ? 'Mô phỏng thi: hết giờ sẽ tự nộp, kể cả khi bạn đóng app.' : 'Luyện tập: đóng app thì đồng hồ dừng.'}</p>`;
    bindQuestion(() => E.questions[E.cur], () => E.st[E.cur], draw, () => save());
    const inp = main.querySelector('input[data-input=qfill]');
    inp?.addEventListener('change', save);
  };
  H.prev = () => { E.cur--; save(); draw(); };
  H.nextq = () => { E.cur++; save(); draw(); };
  H.jump = (el) => { E.cur = +el.dataset.i; E.showGrid = false; save(); draw(); window.scrollTo(0, 0); };
  H.grid = () => { E.showGrid = !E.showGrid; draw(); };
  H.mark = () => { const i = E.marked.indexOf(E.cur); if (i >= 0) E.marked.splice(i, 1); else E.marked.push(E.cur); save(); draw(); };
  H.submit = async () => {
    const un = E.st.filter((s) => s.ans === undefined || s.ans === '' || (Array.isArray(s.ans) && !s.ans.length)).length;
    if (!confirm(un ? `Còn ${un} câu chưa trả lời. Vẫn nộp bài?` : 'Nộp bài?')) return;
    clearInterval(timer);
    await submit(false);
  };
  draw();
};

async function submit(auto) {
  const wrong = [];
  const bySec = {};
  let correct = 0;
  for (let i = 0; i < E.questions.length; i++) {
    const q = E.questions[i];
    const ok = checkAnswer(q, answerValue(q, E.st[i]));
    const b = (bySec[q.section] ||= { correct: 0, total: 0 });
    b.total++;
    if (ok) { correct++; b.correct++; } else wrong.push(q.id);
    await logAttempt(q.skill, q.tags?.word || q.id, ok);
    if (!ok) {
      const kind = q.skill === 'vocab' ? 'word' : q.tags?.grammar ? 'grammar' : q.skill;
      const id = q.skill === 'vocab' && q.tags?.word ? 'w:' + q.tags.word : 'q:' + q.id;
      await addMistake({ id, kind, refId: q.tags?.word || q.id, label: q.prompt.replace(/<[^>]+>/g, ' ').slice(0, 80), q: q.skill === 'vocab' ? undefined : q });
    }
  }
  E.submittedAt = nowISO();
  E.autoSubmitted = auto;
  E.result = { correct, total: E.questions.length, bySec, wrong };
  E.updatedAt = nowISO();
  await db.put('exams', E);
  location.replace('#/exam-result/' + E.id);
}

routes['exam-result'] = async ([id]) => {
  const ex = await db.get('exams', id);
  setTitle('Kết quả', '#/exam');
  if (!ex?.result) { main.innerHTML = '<div class="card err">Chưa có kết quả.</div>'; return; }
  const r = ex.result;
  const pct = Math.round((r.correct / r.total) * 100);
  main.innerHTML = `<div class="card" style="text-align:center"><div style="font-size:2.4em;font-weight:700">${r.correct}/${r.total}</div><div>${pct}% đúng</div>
      <small class="muted">Điểm tham khảo nội bộ của ứng dụng — không phải và không quy đổi sang điểm HSK chính thức.</small>
      ${ex.autoSubmitted ? '<p class="chip amber">Tự nộp khi hết giờ</p>' : ''}</div>
    <div class="card"><div class="scroll-x"><table class="t"><tr><th>Phần</th><th>Đúng</th><th>Thời gian</th></tr>
      ${ex.sections.map((s) => r.bySec[s.id] ? `<tr><td>${esc(s.name)}</td><td>${r.bySec[s.id].correct}/${r.bySec[s.id].total}</td><td>${fmtMs(ex.spent[s.id] || 0)}</td></tr>` : '').join('')}</table></div>
      <small class="muted">${fmtDate(ex.startedAt)} · ${ex.mode === 'sim' ? 'Mô phỏng thi' : 'Luyện tập'}</small></div>
    <div class="grid2">${r.wrong.length ? `<a class="btn primary" href="#/drill?${qs({ exam: ex.id })}">Làm lại ${r.wrong.length} câu sai</a>` : ''}<a class="btn" href="#/exam">Về Thi thử</a></div>
    <h2>Đáp án và giải thích</h2>
    ${ex.questions.map((q, i) => { const ok = !r.wrong.includes(q.id); return `<div class="card" data-qi="${i}"><div class="row between"><b>Câu ${i + 1}</b><span class="chip ${ok ? 'jade' : 'red'}">${ok ? 'Đúng' : 'Sai'}</span></div>
      ${renderQuestion(q, { ...ex.st[i], checked: true }, 'review')}${q.explain ? `<div class="feedback ${ok ? 'ok' : 'no'}"><div class="ex">${esc(q.explain)}</div></div>` : ''}</div>`; }).join('')}`;
  H.qplay = async (el) => {
    const q = ex.questions[+el.closest('[data-qi]').dataset.qi];
    const res = await media.play({ audioKey: q.audioKey, lines: q.lines, rate: S.rate });
    if (!res.ok) toast(res.msg, 5000);
  };
};

// ======================= Cá nhân & cài đặt =======================
routes.me = async () => {
  setTitle('Cá nhân');
  const cfg = await config();
  const attempts = await db.all('attempts');
  const log = await db.kvGet('studyLog', {});
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const recent = attempts.filter((a) => a.at >= since);
  const skills = [['vocab', 'Từ vựng'], ['grammar', 'Ngữ pháp'], ['listening', 'Nghe'], ['reading', 'Đọc'], ['writing', 'Viết']];
  const last7 = [...Array(7)].map((_, i) => { const d = new Date(Date.now() - (6 - i) * 86400000); const k = todayStr(d); return { k, m: Math.round((log[k] || 0) / 60) }; });
  const tts = await media.ttsStatus();
  main.innerHTML = `
    <h2>Thống kê</h2>
    <div class="card"><b>Thời gian học 7 ngày</b> <small class="muted">(chỉ tính khi app đang mở và có thao tác)</small>
      <div class="row" style="align-items:flex-end;gap:6px;height:90px;margin-top:8px">${last7.map((x) => { const max = Math.max(S.minutesPerDay, ...last7.map((y) => y.m)); return `<div class="grow" style="text-align:center"><small>${x.m}</small><div style="height:${(x.m / max) * 50 + 2}px;background:var(--red);border-radius:4px;margin:2px 4px"></div><small class="muted">${x.k.slice(8)}</small></div>`; }).join('')}</div>
      <div class="scroll-x" style="margin-top:10px"><table class="t"><tr><th>Kỹ năng (30 ngày)</th><th>Lượt</th><th>Tỷ lệ đúng</th></tr>
      ${skills.map(([k, n]) => { const a = recent.filter((x) => x.skill === k); const c = a.filter((x) => x.correct).length; return `<tr><td>${n}</td><td>${a.length}</td><td>${a.length ? Math.round((c / a.length) * 100) + '%' : '—'}</td></tr>`; }).join('')}</table></div></div>
    <h2>Mục tiêu và học tập</h2>
    <div class="card">
      <label class="f"><span>Phiên bản HSK hướng tới</span><select data-change="set" data-k="hskVersion">${(cfg.versions || []).map((v) => `<option value="${v.id}" ${S.hskVersion === v.id ? 'selected' : ''}>${esc(v.name)} — ${esc(v.status)}</option>`).join('')}</select></label>
      <div class="grid2"><label class="f"><span>Ngày thi dự kiến</span><input type="date" value="${esc(S.examDate)}" data-change="set" data-k="examDate"></label>
      <label class="f"><span>Số phút học mỗi ngày</span><input type="number" min="5" max="240" value="${S.minutesPerDay}" data-change="set" data-k="minutesPerDay" inputmode="numeric"></label>
      <label class="f"><span>Từ mới mỗi ngày</span><input type="number" min="0" max="100" value="${S.newPerDay}" data-change="set" data-k="newPerDay" inputmode="numeric"></label>
      <label class="f"><span>Nhắc sao lưu sau (ngày)</span><input type="number" min="1" max="60" value="${S.backupEvery}" data-change="set" data-k="backupEvery" inputmode="numeric"></label></div>
      <div class="switch"><span>Kiểm tra thanh điệu khi gõ pinyin</span><input type="checkbox" ${S.checkTones ? 'checked' : ''} data-change="setb" data-k="checkTones"></div>
      <div class="switch"><span>Hiện pinyin mặc định</span><input type="checkbox" ${S.showPy ? 'checked' : ''} data-change="setb" data-k="showPy"></div>
      <div class="switch"><span>Hiện nghĩa tiếng Việt mặc định</span><input type="checkbox" ${S.showVi ? 'checked' : ''} data-change="setb" data-k="showVi"></div>
    </div>
    <h2>Giao diện và âm thanh</h2>
    <div class="card">
      <div class="grid2"><label class="f"><span>Chế độ màu</span><select data-change="set" data-k="theme">${[['auto', 'Theo máy'], ['light', 'Sáng'], ['dark', 'Tối']].map(([v, t]) => `<option value="${v}" ${S.theme === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="f"><span>Cỡ chữ</span><select data-change="set" data-k="fs">${[0.9, 1, 1.15, 1.3, 1.5].map((v) => `<option value="${v}" ${+S.fs === v ? 'selected' : ''}>${Math.round(v * 100)}%</option>`).join('')}</select></label>
      <label class="f"><span>Tốc độ đọc</span><select data-change="set" data-k="rate">${[0.75, 1, 1.25].map((v) => `<option value="${v}" ${+S.rate === v ? 'selected' : ''}>${v}×</option>`).join('')}</select></label></div>
      <p class="muted" style="font-size:.85em;margin:0">${esc(tts.msg)}</p>
      <button class="btn small" data-act="testVoice" style="margin-top:8px">🔊 Thử giọng đọc</button>
    </div>
    <h2>Dữ liệu</h2>
    <ul class="list">
      <li><a href="#/packs"><div class="grow"><b>Gói nội dung & dung lượng</b><div class="sub">Tải gói HSK, kiểm tra đủ để học offline</div></div><span class="chev">›</span></a></li>
      <li><a href="#/backup"><div class="grow"><b>Sao lưu & khôi phục</b><div class="sub">Lưu tệp vào ứng dụng Tệp, chuyển sang máy khác</div></div><span class="chev">›</span></a></li>
      <li><a href="#/manage"><div class="grow"><b>Quản lý nội dung</b><div class="sub">Thêm từ, nhập CSV/JSON, thêm bài nghe MP3</div></div><span class="chev">›</span></a></li>
      <li><a href="#/about"><div class="grow"><b>Giới thiệu, nguồn dữ liệu & giới hạn</b></div><span class="chev">›</span></a></li>
    </ul>
    <div class="row" style="margin-top:12px"><button class="btn" data-act="upd">Kiểm tra cập nhật</button><small class="muted">Phiên bản ${APP_VERSION}</small></div>`;
  H.set = async (el) => { const k = el.dataset.k; let v = el.value; if (['minutesPerDay', 'newPerDay', 'backupEvery'].includes(k)) v = Math.max(0, parseInt(v, 10) || 0); if (['fs', 'rate'].includes(k)) v = +v; S[k] = v; await saveSettings(); toast('Đã lưu'); };
  H.setb = async (el) => { S[el.dataset.k] = el.checked; await saveSettings(); toast('Đã lưu'); };
  H.testVoice = async () => { const r = await media.play({ text: '你好，欢迎学习汉语。', rate: S.rate }); if (!r.ok) toast(r.msg, 6000); };
  H.upd = async () => toast(await checkUpdate(), 4000);
};

// ======================= Gói nội dung =======================
async function installPack(pack, audioFiles = new Map(), baseUrl = null, progress = () => {}) {
  const errs = validatePack(pack);
  if (errs.length) throw new Error('Gói không hợp lệ:\n' + errs.slice(0, 10).join('\n'));
  const pid = pack.id;
  const tag = (x) => ({ ...x, packId: pid, level: Number.isInteger(x.level) ? x.level : pack.level });
  progress('Đang ghi nội dung…');
  for (const s of CONTENT) await db.putMany(s, (pack[s] || []).map(tag));
  const wanted = new Set([...(pack.audioFiles || []), ...(pack.words || []).map((w) => w.audio), ...(pack.listening || []).map((l) => l.audio)].filter(Boolean));
  const missing = [];
  let i = 0;
  let bytes = 0;
  for (const f of wanted) {
    i++;
    progress(`Âm thanh ${i}/${wanted.size}…`);
    let blob = audioFiles.get(f) || null;
    if (!blob && baseUrl) {
      try { const r = await fetch(new URL('audio/' + f, baseUrl)); if (r.ok) blob = await r.blob(); } catch { /* thiếu mạng */ }
    }
    if (blob) { await db.put('audio', { key: `${pid}/${f}`, packId: pid, blob, type: blob.type, size: blob.size }); bytes += blob.size; } else missing.push(f);
  }
  const counts = Object.fromEntries(CONTENT.map((s) => [s, (pack[s] || []).length]));
  counts.audio = wanted.size;
  await db.put('packs', { id: pid, level: pack.level, title: pack.title || pid, version: pack.version || '', hskVersion: pack.hskVersion || '', hskVersionNote: pack.hskVersionNote || '',
    source: pack.source || '', license: pack.license || '', reviewed: pack.reviewed || '', counts, installedAt: nowISO(), bytes: JSON.stringify(pack).length + bytes, audioMissing: missing });
  invalidate();
  return { counts, missing };
}
async function checkPack(p) {
  const res = [];
  for (const s of CONTENT) { const n = (await db.byIndex(s, 'packId', p.id)).length; if (n < (p.counts?.[s] || 0)) res.push(`${s}: có ${n}/${p.counts[s]}`); }
  const audio = await db.byIndex('audio', 'packId', p.id);
  if (audio.length < (p.counts?.audio || 0)) res.push(`âm thanh: có ${audio.length}/${p.counts.audio}`);
  return res;
}

routes.packs = async () => {
  setTitle('Gói nội dung', '#/me');
  const idx = await packIndex();
  const installed = await db.all('packs');
  let est = null;
  try { est = await navigator.storage?.estimate?.(); } catch { /* không hỗ trợ */ }
  let persisted = null;
  try { persisted = await navigator.storage?.persisted?.(); } catch { /* không hỗ trợ */ }
  const rows = [];
  for (let l = 1; l <= 6; l++) {
    const remote = idx?.packs?.filter((p) => p.level === l) || [];
    const local = installed.filter((p) => p.level === l);
    rows.push(`<div class="card"><div class="row between"><h3 style="margin:0">HSK ${l}</h3>${local.length ? '<span class="chip jade">Đã tải</span>' : remote.some((r) => r.status === 'available') ? '<span class="chip">Chưa tải</span>' : '<span class="chip">Chưa có dữ liệu</span>'}</div>
      ${local.map((p) => `<div class="ex-line"><b>${esc(p.title)}</b> <small class="muted">v${esc(p.version)} · ${fmtBytes(p.bytes)}</small><br>
        <small>${Object.entries(p.counts || {}).filter(([, n]) => n).map(([k, n]) => `${{ words: 'từ', grammar: 'ngữ pháp', readings: 'bài đọc', listening: 'bài nghe', questions: 'câu hỏi', audio: 'tệp âm thanh' }[k]} ${n}`).join(' · ')}</small>
        ${p.audioMissing?.length ? `<br><small style="color:var(--red)">Thiếu ${p.audioMissing.length} tệp âm thanh</small>` : ''}
        <div class="row" style="margin-top:8px"><button class="btn small" data-act="pcheck" data-id="${esc(p.id)}">Kiểm tra đủ để học offline</button><button class="btn small ghost" data-act="pdel" data-id="${esc(p.id)}">Xóa gói</button>
        ${(() => { const r = remote.find((x) => x.id === p.id); return r && r.version !== p.version ? `<button class="btn small jade" data-act="pget" data-id="${esc(r.id)}">Cập nhật lên v${esc(r.version)}</button>` : ''; })()}</div><div id="pc-${esc(p.id)}"></div></div>`).join('')}
      ${remote.filter((r) => r.status === 'available' && !local.some((p) => p.id === r.id)).map((r) => `<div class="ex-line"><b>${esc(r.title)}</b> <small class="muted">v${esc(r.version)} · ${fmtBytes(r.bytes)}</small>
        <button class="btn small primary" data-act="pget" data-id="${esc(r.id)}" style="margin-left:8px">Tải về máy</button></div>`).join('')}
      ${!local.length && !remote.some((r) => r.status === 'available') ? `<p class="muted" style="margin:6px 0 0;font-size:.88em">${esc(remote[0]?.note || 'Chưa có gói soạn sẵn.')}</p>` : ''}</div>`);
  }
  main.innerHTML = `${idx ? '' : '<div class="card warn">Không tải được danh mục gói (đang offline?). Vẫn hiện các gói đã có trên máy.</div>'}
    <div class="card"><b>Bộ nhớ trên máy</b><br>${est ? `Ứng dụng đang dùng khoảng ${fmtBytes(est.usage)}${est.quota ? ` / hạn mức trình duyệt cho phép ${fmtBytes(est.quota)}` : ''}.` : 'Trình duyệt không cho biết dung lượng.'}
      <br><small class="muted">Lưu trữ bền vững: ${persisted === true ? 'đã được cấp' : persisted === false ? 'chưa được cấp — trình duyệt có thể dọn dữ liệu khi máy thiếu bộ nhớ' : 'không rõ'}.</small>
      ${persisted === false ? '<br><button class="btn small" data-act="persist" style="margin-top:6px">Xin lưu trữ bền vững</button>' : ''}</div>
    ${rows.join('')}
    <p class="muted" style="font-size:.85em">Xóa gói chỉ xóa nội dung, không xóa tiến độ học. Tải lại gói thì tiến độ tự khớp lại theo ID từ.</p>`;
  H.pget = async (el) => {
    const r = idx.packs.find((x) => x.id === el.dataset.id);
    el.disabled = true;
    try {
      el.textContent = 'Đang tải…';
      const url = new URL(r.url, location.href);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Không tải được gói (mã ' + res.status + '). Kiểm tra kết nối mạng.');
      const pack = await res.json();
      const g0 = gen();
      const out = await installPack(pack, new Map(), url, (m) => { el.textContent = m; });
      toast(out.missing.length ? `Đã tải, nhưng thiếu ${out.missing.length} tệp âm thanh` : 'Đã tải xong gói ' + r.title, 4000);
      if (g0 === gen()) refresh();
    } catch (e) { el.disabled = false; el.textContent = 'Thử lại'; toast(e.message, 6000); }
  };
  H.pcheck = async (el) => {
    const p = installed.find((x) => x.id === el.dataset.id);
    const r = await checkPack(p);
    const shellOk = await caches.has?.('sotay-shell-' + APP_VERSION).catch(() => false);
    $('#pc-' + CSS.escape(p.id)).innerHTML = `<div class="feedback ${r.length || !shellOk ? 'no' : 'ok'}">${r.length ? 'Thiếu: ' + esc(r.join('; ')) : 'Nội dung gói đầy đủ trên máy.'}<br>${shellOk ? 'Khung ứng dụng đã lưu offline.' : 'Khung ứng dụng CHƯA lưu offline (mở qua HTTPS và chờ tải xong).'}</div>`;
  };
  H.pdel = async (el) => {
    if (!confirm('Xóa nội dung của gói này khỏi máy? Tiến độ học vẫn được giữ.')) return;
    const id = el.dataset.id;
    for (const s of [...CONTENT, 'audio']) await db.delByIndex(s, 'packId', id);
    await db.del('packs', id);
    invalidate();
    toast('Đã xóa gói');
    refresh();
  };
  H.persist = async () => { const ok = await navigator.storage.persist(); toast(ok ? 'Đã được cấp lưu trữ bền vững' : 'Trình duyệt từ chối. Trên iPhone, hãy thêm app vào Màn hình chính và sao lưu định kỳ.', 6000); refresh(); };
};

// ======================= Sao lưu =======================
async function buildBackup() {
  const data = {};
  for (const s of PERSONAL) data[s] = await db.all(s);
  const user = {};
  for (const s of CONTENT) user[s] = await db.byIndex(s, 'packId', 'user');
  const audio = [];
  for (const a of await db.byIndex('audio', 'packId', 'user')) {
    const buf = new Uint8Array(await a.blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    audio.push({ key: a.key, type: a.type, b64: btoa(bin) });
  }
  return { format: BACKUP_FORMAT, schema: BACKUP_SCHEMA, appVersion: APP_VERSION, exportedAt: nowISO(), device: navigator.userAgent, data, user, userAudio: audio,
    packs: (await db.all('packs')).map((p) => ({ id: p.id, title: p.title, version: p.version })) };
}
async function applyBackup(b, mode) {
  if (mode === 'replace') {
    for (const s of PERSONAL) await db.clear(s);
    for (const s of CONTENT) await db.delByIndex(s, 'packId', 'user');
    await db.delByIndex('audio', 'packId', 'user');
  }
  const summary = [];
  for (const s of PERSONAL) {
    const incoming = b.data[s] || [];
    const local = mode === 'replace' ? [] : await db.all(s);
    const r = mergeRecords(s, STORES[s].keyPath, local, incoming);
    await db.putMany(s, r.put);
    summary.push(`${s}: +${r.added}${r.updated ? ' ~' + r.updated : ''}`);
  }
  for (const s of CONTENT) {
    const incoming = b.user?.[s] || [];
    const local = mode === 'replace' ? [] : await db.byIndex(s, 'packId', 'user');
    const r = mergeRecords(s, 'id', local, incoming);
    await db.putMany(s, r.put);
  }
  for (const a of b.userAudio || []) {
    const bin = atob(a.b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    await db.put('audio', { key: a.key, packId: 'user', blob: new Blob([u8], { type: a.type }), type: a.type, size: u8.length });
  }
  invalidate();
  return summary;
}

routes.backup = async () => {
  setTitle('Sao lưu & khôi phục', '#/me');
  const last = await db.kvGet('backupAt');
  const counts = {};
  for (const s of PERSONAL) counts[s] = (await db.all(s)).length;
  main.innerHTML = `<div class="card warn"><b>Dữ liệu chỉ nằm trên máy này.</b> Không có máy chủ, không tự đồng bộ giữa điện thoại và máy tính. Dữ liệu có thể mất nếu bạn xóa app khỏi Màn hình chính, xóa dữ liệu Safari/website, hoặc iOS dọn bộ nhớ. Hãy sao lưu định kỳ.</div>
    <div class="card"><h3>Sao lưu</h3><p class="muted" style="margin:4px 0 10px">Lần gần nhất: ${last ? fmtDate(last) : 'chưa có'}. Gồm: lịch ôn ${counts.srs} thẻ, ${counts.mistakes} lỗi sai, ${counts.exams} bài thi, nhật ký, cài đặt, ghi chú và nội dung tự tạo.</p>
      <button class="btn primary block" data-act="mk">Tạo tệp sao lưu</button><div id="bk"></div></div>
    <div class="card"><h3>Khôi phục</h3><p class="muted" style="margin:4px 0 10px">Chọn tệp .json đã sao lưu (trên iPhone: chọn trong ứng dụng Tệp).</p>
      <input type="file" accept=".json,application/json" data-change="pick"><div id="rs"></div></div>
    <div class="card info"><b>Chuyển dữ liệu sang máy khác</b><ol style="margin:6px 0 0;padding-left:20px"><li>Máy cũ: Tạo tệp sao lưu → Lưu vào Tệp / iCloud Drive (hoặc gửi qua Zalo, email cho chính mình).</li><li>Máy mới: mở app, tải gói HSK cần học.</li><li>Máy mới: Khôi phục → chọn tệp → “Gộp” hoặc “Thay thế”.</li></ol></div>`;
  H.mk = async (el) => {
    el.disabled = true;
    const b = await buildBackup();
    const json = JSON.stringify(b);
    const name = `sotay-hsk-saoluu-${todayStr()}-${new Date().toTimeString().slice(0, 5).replace(':', '')}.json`;
    const file = new File([json], name, { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const canShare = navigator.canShare?.({ files: [file] });
    $('#bk').innerHTML = `<p>Đã tạo tệp ${esc(name)} (${fmtBytes(json.length)}).</p><div class="grid2">
      ${canShare ? '<button class="btn jade" data-act="share">Lưu vào Tệp / Chia sẻ</button>' : ''}<a class="btn" href="${url}" download="${esc(name)}" data-act="dl">Tải tệp xuống</a></div>
      <small class="muted">Trên iPhone nên dùng “Lưu vào Tệp”, chọn iCloud Drive hoặc Trên iPhone.</small>`;
    el.disabled = false;
    const mark = async () => { await db.kvSet('backupAt', nowISO()); };
    H.share = async () => { try { await navigator.share({ files: [file], title: 'Sao lưu Sổ tay HSK' }); await mark(); toast('Đã chia sẻ/lưu tệp'); } catch (e) { if (e.name !== 'AbortError') toast('Không chia sẻ được: ' + e.message); } };
    H.dl = async (a) => { await mark(); const tmp = document.createElement('a'); tmp.href = a.href; tmp.download = a.getAttribute('download'); document.body.appendChild(tmp); tmp.click(); tmp.remove(); };
  };
  H.pick = async (el) => {
    const f = el.files?.[0];
    const box = $('#rs');
    if (!f) return;
    el.value = ''; // cho phép chọn lại cùng tệp
    let b;
    try { b = JSON.parse(await f.text()); } catch { box.innerHTML = '<div class="feedback no">Tệp không phải JSON hợp lệ.</div>'; return; }
    const ck = checkBackup(b);
    if (!ck.ok) { box.innerHTML = `<div class="feedback no">${esc(ck.msg)}</div>`; return; }
    const missingPacks = (b.packs || []).filter((p) => true);
    box.innerHTML = `<div class="card tight" style="margin-top:10px">Sao lưu lúc <b>${fmtDate(b.exportedAt)}</b> · bản app ${esc(b.appVersion)} · cấu trúc ${b.schema}<br>
      ${Object.entries(b.data).map(([k, v]) => `${k}: ${v.length}`).join(' · ')}<br>
      ${missingPacks.length ? `<small class="muted">Gói đã dùng: ${missingPacks.map((p) => esc(p.title)).join(', ')} — hãy tải các gói này để thấy nội dung.</small>` : ''}
      <div class="grid2" style="margin-top:10px"><button class="btn jade" data-act="rmerge">Gộp với dữ liệu hiện có</button><button class="btn" data-act="rreplace">Thay thế toàn bộ</button></div>
      <small class="muted">Gộp: giữ bản ghi mới hơn của mỗi mục. Thay thế: xóa tiến độ trên máy này rồi ghi dữ liệu từ tệp.</small></div>`;
    H.rmerge = async () => { const s = await applyBackup(b, 'merge'); box.innerHTML = `<div class="feedback ok">Đã gộp xong.<br><small>${esc(s.join(' · '))}</small></div>`; await reloadSettings(); };
    H.rreplace = async () => {
      if (!confirm('THAY THẾ sẽ xóa toàn bộ tiến độ, lỗi sai, lịch sử thi và nội dung tự tạo trên máy này rồi ghi dữ liệu từ tệp. Tiếp tục?')) return;
      const s = await applyBackup(b, 'replace');
      box.innerHTML = `<div class="feedback ok">Đã thay thế xong.<br><small>${esc(s.join(' · '))}</small></div>`;
      await reloadSettings();
    };
  };
};
async function reloadSettings() {
  const v = await db.kvGet('settings', {});
  Object.assign(S, v);
  await saveSettings();
}

// ======================= Quản lý nội dung =======================
routes.manage = async () => {
  setTitle('Quản lý nội dung', '#/me');
  const userWords = (await db.byIndex('words', 'packId', 'user')).sort((a, b) => (a.id < b.id ? 1 : -1));
  const userListen = await db.byIndex('listening', 'packId', 'user');
  main.innerHTML = `
    <div class="card"><h3>Thêm từ mới</h3>
      <div class="grid2"><label class="f"><span>Chữ Hán *</span><input type="text" id="w-hz" class="zh" lang="zh-CN"></label><label class="f"><span>Pinyin có dấu *</span><input type="text" id="w-py" autocapitalize="off"></label></div>
      <label class="f"><span>Nghĩa tiếng Việt *</span><input type="text" id="w-vi"></label>
      <div class="grid3"><label class="f"><span>Từ loại</span><input type="text" id="w-pos"></label><label class="f"><span>Cấp HSK *</span><select id="w-lv">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => `<option ${l === S.level ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="f"><span>Bài/nhóm</span><input type="text" id="w-ls" value="Từ tự nhập"></label></div>
      <label class="f"><span>Câu ví dụ (chữ Hán)</span><input type="text" id="w-ez" class="zh" lang="zh-CN"></label>
      <div class="grid2"><label class="f"><span>Pinyin câu ví dụ</span><input type="text" id="w-ep"></label><label class="f"><span>Dịch câu ví dụ</span><input type="text" id="w-ev"></label></div>
      <button class="btn primary" data-act="addWord">Lưu từ</button></div>
    <div class="card"><h3>Nhập từ vựng bằng CSV</h3><p class="muted" style="margin:4px 0 8px;font-size:.88em">Cột bắt buộc: id, hanzi, pinyin, meaning_vi, level. <a href="templates/tu-vung-mau.csv" download>Tải tệp CSV mẫu</a>. Lưu CSV dạng UTF-8 (Excel: “CSV UTF-8”).</p>
      <input type="file" accept=".csv,text/csv" data-change="csvPick"><div id="csvres"></div></div>
    <div class="card"><h3>Nhập gói bài học (JSON + âm thanh)</h3><p class="muted" style="margin:4px 0 8px;font-size:.88em">Chọn cùng lúc tệp .json và các tệp .mp3/.wav có tên trong gói. <a href="templates/goi-bai-hoc-mau.json" download>Tải JSON mẫu</a>.</p>
      <input type="file" multiple accept=".json,application/json,audio/*,.mp3,.wav,.m4a" data-change="packPick"><div id="packres"></div></div>
    <a class="btn block" href="#/listen-add" style="margin-bottom:12px">＋ Thêm bài nghe từ tệp MP3/WAV</a>
    <h2>Từ tự tạo (${userWords.length})</h2>
    ${userWords.length ? `<div class="row" style="margin-bottom:8px"><button class="btn small" data-act="exportCsv">Xuất CSV</button></div><ul class="list">${userWords.map((w) => `<li><a href="#/word-edit/${encodeURIComponent(w.id)}"><span class="zh">${esc(w.hanzi)}</span><div class="grow"><div>${esc(w.pinyin)}</div><div class="sub">${esc(w.vi)} · HSK ${w.level}</div></div><span class="chev">Sửa ›</span></a></li>`).join('')}</ul>` : '<p class="muted">Chưa có.</p>'}
    ${userListen.length ? `<h2>Bài nghe tự nhập (${userListen.length})</h2><ul class="list">${userListen.map((l) => `<li><div class="li"><div class="grow"><b>${esc(l.title)}</b><div class="sub">HSK ${l.level}</div></div><button class="btn small ghost" data-act="delListen" data-id="${esc(l.id)}">Xóa</button></div></li>`).join('')}</ul>` : ''}`;
  H.addWord = async () => {
    const v = (id) => $('#' + id).value.trim();
    if (!v('w-hz') || !v('w-py') || !v('w-vi')) { toast('Cần nhập chữ Hán, pinyin và nghĩa'); return; }
    if (!/\p{Script=Han}/u.test(v('w-hz'))) { toast('Ô chữ Hán chưa có chữ Hán'); return; }
    const w = { id: 'u-' + Date.now().toString(36), packId: 'user', hanzi: v('w-hz'), pinyin: v('w-py'), vi: v('w-vi'), pos: v('w-pos'), level: +v('w-lv'), lesson: v('w-ls') || 'Từ tự nhập',
      ex: v('w-ez') ? [{ zh: v('w-ez'), py: v('w-ep'), vi: v('w-ev') }] : [], confusable: [], audio: null, updatedAt: nowISO() };
    await db.put('words', w);
    invalidate();
    toast('Đã lưu từ ' + w.hanzi);
    refresh();
  };
  H.csvPick = async (el) => {
    const f = el.files?.[0];
    if (!f) return;
    el.value = '';
    const existing = new Set((await db.all('words')).map((w) => w.id));
    const r = vocabFromCSV(await f.text(), existing);
    const box = $('#csvres');
    box.innerHTML = `<div class="card tight" style="margin-top:10px"><b>${r.items.length}</b> dòng hợp lệ (${r.items.length - r.updates} mới, ${r.updates} cập nhật id đã có) · <b style="color:var(--red)">${r.errors.length}</b> dòng lỗi
      ${r.errors.length ? `<ul style="margin:6px 0;padding-left:20px;color:var(--red)">${r.errors.slice(0, 50).map((e) => `<li>Dòng ${e.line}: ${esc(e.msg)}</li>`).join('')}</ul>` : ''}
      ${r.items.length ? `<div class="scroll-x"><table class="t"><tr><th>id</th><th>Chữ</th><th>Pinyin</th><th>Nghĩa</th><th>Cấp</th></tr>${r.items.slice(0, 20).map((w) => `<tr><td><small>${esc(w.id)}</small></td><td class="zh">${esc(w.hanzi)}</td><td>${esc(w.pinyin)}</td><td>${esc(w.vi)}</td><td>${w.level}</td></tr>`).join('')}</table></div>
      ${r.items.length > 20 ? `<small class="muted">…và ${r.items.length - 20} dòng nữa</small>` : ''}
      <button class="btn primary" data-act="csvGo" style="margin-top:8px">Nhập ${r.items.length} từ hợp lệ</button>` : ''}</div>`;
    H.csvGo = async () => { await db.putMany('words', r.items.map((w) => ({ ...w, packId: 'user', updatedAt: nowISO() }))); invalidate(); toast(`Đã nhập ${r.items.length} từ`); refresh(); };
  };
  H.packPick = async (el) => {
    const files = [...(el.files || [])];
    el.value = '';
    const box = $('#packres');
    const jf = files.find((f) => /\.json$/i.test(f.name));
    if (!jf) { box.innerHTML = '<div class="feedback no">Chưa chọn tệp .json của gói.</div>'; return; }
    let pack;
    try { pack = JSON.parse(await jf.text()); } catch (e) { box.innerHTML = `<div class="feedback no">JSON lỗi: ${esc(e.message)}</div>`; return; }
    const errs = validatePack(pack);
    if (errs.length) { box.innerHTML = `<div class="feedback no"><b>Gói chưa hợp lệ:</b><ul style="margin:4px 0;padding-left:20px">${errs.slice(0, 40).map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`; return; }
    if (pack.id === 'user') { box.innerHTML = '<div class="feedback no">id gói "user" được dành riêng, hãy đổi id khác.</div>'; return; }
    const audio = new Map(files.filter((f) => f !== jf).map((f) => [f.name, f]));
    const exists = await db.get('packs', pack.id);
    box.innerHTML = `<div class="card tight" style="margin-top:10px"><b>${esc(pack.title || pack.id)}</b> · HSK ${pack.level} · ${(pack.words || []).length} từ, ${(pack.questions || []).length} câu hỏi, ${audio.size} tệp âm thanh được chọn
      ${exists ? '<br><span style="color:var(--amber)">Gói cùng id đã có — nhập sẽ ghi đè nội dung gói (tiến độ giữ nguyên).</span>' : ''}
      <br><button class="btn primary" data-act="packGo" style="margin-top:8px">Nhập gói</button></div>`;
    H.packGo = async (b) => {
      b.disabled = true;
      try { const r = await installPack(pack, audio, null, (m) => { b.textContent = m; }); box.innerHTML = `<div class="feedback ${r.missing.length ? 'no' : 'ok'}">Đã nhập gói.${r.missing.length ? ' Thiếu âm thanh: ' + esc(r.missing.join(', ')) : ''}</div>`; } catch (e) { box.innerHTML = `<div class="feedback no">${esc(e.message)}</div>`; }
    };
  };
  H.exportCsv = () => {
    const rows = [VOCAB_COLUMNS, ...userWords.map((w) => [w.id, w.hanzi, w.pinyin, w.vi, w.pos, w.level, w.lesson, w.topic, w.ex?.[0]?.zh, w.ex?.[0]?.py, w.ex?.[0]?.vi, (w.confusable || []).join(';'), w.audio, w.note])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + toCSV(rows)], { type: 'text/csv' }));
    a.download = 'tu-tu-tao.csv';
    document.body.appendChild(a); a.click(); a.remove();
  };
  H.delListen = async (el) => { if (!confirm('Xóa bài nghe này?')) return; const l = await db.get('listening', el.dataset.id); await db.del('listening', l.id); if (l.audio) await db.del('audio', 'user/' + l.audio); invalidate(); refresh(); };
};

routes['word-edit'] = async ([id]) => {
  setTitle('Sửa từ', '#/manage');
  const w = await db.get('words', id);
  if (!w || w.packId !== 'user') { main.innerHTML = '<div class="card err">Chỉ sửa được từ tự tạo. Với từ trong gói, hãy dùng ghi chú cá nhân.</div>'; return; }
  const f = (k, label, v, cls = '') => `<label class="f"><span>${label}</span><input type="text" id="e-${k}" value="${esc(v ?? '')}" class="${cls}"></label>`;
  main.innerHTML = `<div class="card">${f('hz', 'Chữ Hán', w.hanzi, 'zh')}${f('py', 'Pinyin', w.pinyin)}${f('vi', 'Nghĩa', w.vi)}${f('pos', 'Từ loại', w.pos)}
    <label class="f"><span>Cấp</span><select id="e-lv">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => `<option ${l === w.level ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    ${f('ls', 'Bài/nhóm', w.lesson)}${f('ez', 'Ví dụ', w.ex?.[0]?.zh, 'zh')}${f('ep', 'Pinyin ví dụ', w.ex?.[0]?.py)}${f('ev', 'Dịch ví dụ', w.ex?.[0]?.vi)}
    <div class="grid2"><button class="btn primary" data-act="save">Lưu</button><button class="btn" data-act="delete" style="color:var(--red)">Xóa từ</button></div></div>`;
  H.save = async () => {
    const v = (k) => $('#e-' + k).value.trim();
    Object.assign(w, { hanzi: v('hz'), pinyin: v('py'), vi: v('vi'), pos: v('pos'), level: +v('lv'), lesson: v('ls'), ex: v('ez') ? [{ zh: v('ez'), py: v('ep'), vi: v('ev') }] : [], updatedAt: nowISO() });
    await db.put('words', w); invalidate(); toast('Đã lưu'); history.back();
  };
  H.delete = async () => { if (!confirm('Xóa từ ' + w.hanzi + '? Lịch ôn của từ này cũng bị xóa.')) return; await db.del('words', w.id); await db.del('srs', w.id); invalidate(); location.hash = '#/manage'; };
};

routes['listen-add'] = async () => {
  setTitle('Thêm bài nghe', '#/listening');
  main.innerHTML = `<div class="card">
    <label class="f"><span>Tên bài *</span><input type="text" id="l-t"></label>
    <label class="f"><span>Cấp HSK</span><select id="l-lv">${[1, 2, 3, 4, 5, 6].map((l) => `<option ${l === S.level ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f"><span>Tệp âm thanh (MP3, WAV, M4A) *</span><input type="file" id="l-f" accept="audio/*,.mp3,.wav,.m4a"></label>
    <label class="f"><span>Lời thoại (chữ Hán, mỗi câu một dòng) — dùng cho chép chính tả và hiện lời sau khi nghe</span><textarea id="l-tr" class="zh" lang="zh-CN"></textarea></label>
    <label class="f"><span>Pinyin (mỗi câu một dòng, tùy chọn)</span><textarea id="l-py"></textarea></label>
    <label class="f"><span>Bản dịch tiếng Việt (tùy chọn)</span><textarea id="l-vi"></textarea></label>
    <button class="btn primary" data-act="save">Lưu bài nghe</button>
    <p class="muted" style="font-size:.85em">Chỉ nhập âm thanh bạn có quyền sử dụng. Tệp được lưu trong bộ nhớ app trên máy này và có trong bản sao lưu.</p></div>`;
  H.save = async () => {
    const t = $('#l-t').value.trim();
    const file = $('#l-f').files?.[0];
    if (!t || !file) { toast('Cần tên bài và tệp âm thanh'); return; }
    if (file.size > 30 * 1048576) { toast('Tệp lớn hơn 30 MB — hãy cắt ngắn hoặc nén lại'); return; }
    const id = 'ul-' + Date.now().toString(36);
    const ext = (file.name.match(/\.\w+$/) || ['.mp3'])[0];
    const zh = $('#l-tr').value.split('\n').map((x) => x.trim()).filter(Boolean);
    const py = $('#l-py').value.split('\n').map((x) => x.trim());
    await db.put('audio', { key: `user/${id}${ext}`, packId: 'user', blob: file, type: file.type, size: file.size });
    await db.put('listening', { id, packId: 'user', level: +$('#l-lv').value, title: t, audio: id + ext, tts: false, transcript: zh.join(' '), lines: zh.map((z, i) => ({ zh: z, py: py[i] || '' })), vi: $('#l-vi').value, questions: [], updatedAt: nowISO() });
    invalidate();
    toast('Đã lưu bài nghe');
    location.hash = '#/listening/' + id;
  };
};

routes.about = async () => {
  setTitle('Giới thiệu & giới hạn', '#/me');
  const cfg = await config();
  const packs = await db.all('packs');
  main.innerHTML = `<div class="card"><h3>Sổ tay tiếng Trung HSK · ${APP_VERSION}</h3><p>Ứng dụng web cài lên Màn hình chính (PWA), không cần tài khoản, không có máy chủ lưu dữ liệu. Toàn bộ tiến độ nằm trên máy của bạn.</p></div>
    <div class="card"><h3>Phiên bản HSK</h3>${(cfg.versions || []).map((v) => `<p><b>${esc(v.name)}</b> — ${esc(v.status)}<br><small class="muted">${esc(v.note)}</small></p>`).join('')}
      <p class="muted" style="font-size:.85em">Cấu trúc đề và danh sách từ chính thức cần đối chiếu tại chinesetest.cn trước khi dùng để luyện thi.</p></div>
    <div class="card"><h3>Gói đã tải</h3>${packs.map((p) => `<p><b>${esc(p.title)}</b> v${esc(p.version)}<br><small>Nguồn: ${esc(p.source)}<br>Giấy phép: ${esc(p.license)}<br>Rà soát: ${esc(p.reviewed)}<br>${esc(p.hskVersionNote)}</small></p>`).join('') || '<p class="muted">Chưa có.</p>'}</div>
    <div class="card"><h3>Giới hạn thực tế</h3><ul style="padding-left:20px;margin:0">
      <li>Không tự đồng bộ giữa các máy; chuyển bằng tệp sao lưu.</li>
      <li>iOS có thể xóa dữ liệu website khi thiếu bộ nhớ hoặc khi bạn xóa dữ liệu Safari — cần sao lưu.</li>
      <li>Không có nhắc lịch học khi app đóng (bản này chưa dùng thông báo đẩy).</li>
      <li>Gói HSK 1 chưa có tệp audio người đọc; phần nghe dùng giọng đọc của thiết bị nếu máy có giọng tiếng Trung.</li>
      <li>Không chấm phát âm, không nhận dạng chữ viết tay, không chấm câu tự do.</li>
      <li>Điểm thi thử là điểm tham khảo nội bộ, không quy đổi sang điểm HSK.</li>
      <li>HSK 2–6 chưa có dữ liệu soạn sẵn.</li></ul></div>`;
};
