// Sổ tay tiếng Trung HSK — ứng dụng một trang, chạy offline.
import * as db from './db.js';
import { GRADES, todayStr, addDays, daysBetween, review, newCard, isDue, sortDue } from './srs.js';
import { checkAnswer, foldVi, parsePinyin, hanziEquals } from './match.js';
import { vocabFromCSV, validatePack, toCSV, VOCAB_COLUMNS } from './csv.js';
import { BACKUP_FORMAT, BACKUP_SCHEMA, checkBackup, mergeRecords } from './backup.js';
import * as media from './media.js';
import { shuffle, vocabQuestion, buildTest } from './quiz.js';

export const APP_VERSION = '1.1.0';

// ---------- Tiện ích ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Chỉ cho phép vài thẻ định dạng trong nội dung gói (tránh mã lạ từ tệp nhập)
const safe = (html) => String(html ?? '').replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (m, sl, tag, attrs) => {
  tag = tag.toLowerCase();
  if (!['span', 'b', 'i', 'br', 'small', 'em', 'strong'].includes(tag)) return '';
  const cls = /class\s*=\s*['"]([\w\s-]*)['"]/.exec(attrs);
  return `<${sl}${tag}${cls && !sl ? ` class="${cls[1]}"` : ''}>`;
});
const main = $('#main');
const nowISO = () => new Date().toISOString();
const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); };
const fmtDay = (s) => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
const fmtMs = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtBytes = (b) => (b == null ? '—' : b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
const qs = (o) => new URLSearchParams(o).toString();

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

// ---------- Cài đặt ----------
const DEFAULTS = { level: 1, theme: 'auto', fs: 1, showPy: true, showVi: true, newPerDay: 10, maxReviews: 150, minutesPerDay: 20,
  examDate: '', hskVersion: 'hsk3', checkTones: true, rate: 1, cardMode: 'hz', backupEvery: 7 };
let S = { ...DEFAULTS };
async function loadSettings() { S = { ...DEFAULTS, ...(await db.kvGet('settings', {})) }; applySettings(); }
async function saveSettings() { await db.kvSet('settings', S); applySettings(); }
function applySettings() {
  document.documentElement.dataset.theme = S.theme;
  document.documentElement.style.setProperty('--fs', S.fs);
  document.body.classList.toggle('hide-py', !S.showPy);
  document.body.classList.toggle('hide-vi', !S.showVi);
  const sl = $('#side-level'); if (sl) sl.textContent = 'Đang học HSK ' + S.level;
}

// ---------- Dữ liệu theo cấp ----------
let cache = {};
let contentVer = 0;
const invalidate = () => { cache = {}; dictCache = null; contentVer++; };
export const getContentVer = () => contentVer;
const byOrder = (a, b) => (a.lessonNo ?? 99) - (b.lessonNo ?? 99) || (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.id).localeCompare(String(b.id));
async function levelData(level) {
  if (cache[level]) return cache[level];
  const [words, grammar, readings, listening, questions] = await Promise.all(
    ['words', 'grammar', 'readings', 'listening', 'questions'].map((s) => db.byIndex(s, 'level', level)));
  words.sort(byOrder);
  grammar.sort((a, b) => String(a.id).localeCompare(String(b.id)) * 0); // giữ thứ tự nhập
  const d = { words, grammar, readings, listening, questions, qmap: new Map(questions.map((q) => [q.id, q])), wmap: new Map(words.map((w) => [w.id, w])) };
  cache[level] = d;
  return d;
}
let dictCache = null;
async function allWords() {
  if (!dictCache) {
    const ws = await db.all('words');
    dictCache = { list: ws, byId: new Map(ws.map((w) => [w.id, w])), byHz: new Map() };
    for (const w of ws) if (!dictCache.byHz.has(w.hanzi)) dictCache.byHz.set(w.hanzi, w);
  }
  return dictCache;
}
async function levelCounts() {
  const out = {};
  for (let l = 1; l <= 6; l++) out[l] = await db.count('words', 'level', l);
  return out;
}
let configP = null;
function config() {
  if (!configP) configP = fetch('config/hsk-versions.json').then((r) => r.json()).catch(() => ({ versions: [], practiceTests: {} }));
  return configP;
}
async function packIndex() {
  try {
    const r = await fetch('packs/index.json', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    return await r.json();
  } catch {
    return null;
  }
}

// ---------- Tiến độ, lỗi sai, nhật ký ----------
async function getCard(wordId) { return (await db.get('srs', wordId)) || newCard(wordId); }
async function saveCard(c) { c.updatedAt = nowISO(); await db.put('srs', c); }
async function logAttempt(skill, refId, correct) { await db.put('attempts', { at: nowISO(), skill, refId, correct: !!correct }); }
async function addMistake({ id, kind, refId, label, q }) {
  const cur = (await db.get('mistakes', id)) || { id, kind, refId, label, count: 0, firstAt: nowISO() };
  cur.count = (cur.count || 0) + 1;
  cur.streak = 0;
  cur.resolved = false;
  cur.lastAt = nowISO();
  if (label) cur.label = label;
  if (q) cur.q = q;
  await db.put('mistakes', cur);
}
async function clearMistakeOnce(id) {
  const cur = await db.get('mistakes', id);
  if (!cur || cur.resolved) return;
  cur.streak = (cur.streak || 0) + 1;
  cur.lastAt = nowISO();
  if (cur.streak >= 2) cur.resolved = true; // đúng 2 lần liên tiếp thì coi là đã sửa
  await db.put('mistakes', cur);
}
function streakDays(log) {
  let d = todayStr();
  if ((log[d] || 0) < 60) d = addDays(d, -1);
  let n = 0;
  while ((log[d] || 0) >= 60) { n++; d = addDays(d, -1); }
  return n;
}

// ---------- Điều hướng ----------
const TABS = [
  { h: '#/today', ic: '今', t: 'Hôm nay', match: ['today'] },
  { h: '#/learn', ic: '学', t: 'Học tập', match: ['learn', 'words', 'word', 'grammar', 'reading', 'listening', 'writing', 'dict', 'print', 'listen-add'] },
  { h: '#/review', ic: '复', t: 'Ôn tập', match: ['review', 'flash', 'drill', 'mistakes'] },
  { h: '#/exam', ic: '考', t: 'Thi thử', match: ['exam', 'exam-run', 'exam-result'] },
  { h: '#/me', ic: '我', t: 'Cá nhân', match: ['me', 'packs', 'backup', 'manage', 'word-edit', 'about'] },
];
function drawNav(active) {
  const html = TABS.map((t) => `<a href="${t.h}" class="${t.match.includes(active) ? 'on' : ''}"><span class="ic">${t.ic}</span><span>${t.t}</span></a>`).join('');
  $('#tabs').innerHTML = html;
  $('#nav').innerHTML = html;
}
function setTitle(t, back) {
  $('#title').textContent = t;
  document.title = t + ' · Sổ tay HSK';
  const b = $('#back');
  b.hidden = !back;
  b.onclick = () => (history.length > 1 ? history.back() : (location.hash = back));
}
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, q = ''] = h.split('?');
  const [name, ...args] = path.split('/').map(decodeURIComponent);
  return { name: name || '', args, query: Object.fromEntries(new URLSearchParams(q)) };
}

let H = {}; // xử lý thao tác của màn hình hiện tại
let viewGen = 0; // tăng mỗi lần đổi màn hình; thao tác bất đồng bộ cũ không được vẽ đè
let cleanups = [];
const onLeave = (fn) => cleanups.push(fn);
const routes = {};
let routing = false;
async function route(keepScroll) {
  if (routing) { routing = 'again'; return; }
  routing = true;
  try {
    for (const f of cleanups) { try { await f(); } catch (e) { console.error(e); } }
    cleanups = [];
    media.stopAll();
    H = {};
    viewGen++;
    const { name, args, query } = parseHash();
    const fn = routes[name] || routes.today;
    drawNav(routes[name] ? name : 'today');
    try {
      await fn(args, query);
    } catch (e) {
      console.error(e);
      main.innerHTML = `<div class="card err"><h3>Có lỗi khi mở màn hình</h3><p>${esc(e.message || e)}</p><a class="btn" href="#/today">Về trang Hôm nay</a></div>`;
    }
    if (keepScroll !== true && !['flash', 'exam-run', 'drill'].includes(name)) window.scrollTo(0, 0);
    if (name && !['exam-run'].includes(name)) db.kvSet('lastRoute', location.hash).catch(() => {});
  } finally {
    const again = routing === 'again';
    routing = false;
    if (again) route();
  }
}
// Ghi nhớ bài đang học để nút "Tiếp tục"
const rememberLearn = (label) => db.kvSet('lastLearn', { hash: location.hash, label, at: nowISO() });

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = H[el.dataset.act] || G[el.dataset.act];
  if (fn) { e.preventDefault(); Promise.resolve(fn(el, e)).catch((err) => { console.error(err); toast('Lỗi: ' + err.message); }); }
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (!el) return;
  const fn = H[el.dataset.input];
  if (fn) fn(el, e);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const fn = H[el.dataset.change] || G[el.dataset.change];
  if (fn) Promise.resolve(fn(el, e)).catch((err) => toast('Lỗi: ' + err.message));
});
// Ô nhập: cuộn vào giữa màn hình để bàn phím iPhone không che
document.addEventListener('focusin', (e) => {
  if (e.target.matches('input[type=text], input[type=search], textarea')) setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
});

// Thao tác dùng chung
const G = {
  setLevel: async (el) => { S.level = +el.dataset.level; await saveSettings(); refresh(); },
  togglePy: async () => { S.showPy = !S.showPy; await saveSettings(); toast(S.showPy ? 'Hiện pinyin' : 'Ẩn pinyin'); },
  toggleVi: async () => { S.showVi = !S.showVi; await saveSettings(); toast(S.showVi ? 'Hiện nghĩa' : 'Ẩn nghĩa'); },
  speakWord: async (el) => {
    const w = (await allWords()).byId.get(el.dataset.id);
    if (!w) return;
    const r = await media.play({ audioKey: w.audio ? `${w.packId}/${w.audio}` : null, text: w.hanzi, rate: S.rate });
    if (!r.ok) toast(r.msg, 5000);
  },
  speakText: async (el) => {
    const r = await media.play({ text: el.dataset.text, rate: S.rate });
    if (!r.ok) toast(r.msg, 5000);
  },
  go: (el) => { location.hash = el.dataset.href; },
};
const toggles = () => `<div class="toggle-row no-print"><button class="btn small ghost" data-act="togglePy">Pinyin</button><button class="btn small ghost" data-act="toggleVi">Nghĩa</button></div>`;
const playBtn = (w) => `<button class="btn small" data-act="speakWord" data-id="${esc(w.id)}" aria-label="Phát âm">🔊 Nghe</button>`;
const empty = (msg, extra = '') => `<div class="card warn"><b>Chưa có dữ liệu</b><p class="muted" style="margin:6px 0 10px">${msg}</p>${extra}</div>`;
async function noDataBox(level) {
  const idx = await packIndex();
  const p = idx?.packs?.find((x) => x.level === level && x.status === 'available');
  const btn = p ? `<a class="btn primary" href="#/packs">Tải gói HSK ${level}</a>` : '';
  return empty(`HSK ${level} chưa có nội dung trên máy này.${p ? '' : ' Ứng dụng chưa có gói soạn sẵn cho cấp này — bạn có thể tự nhập bằng CSV/JSON.'}`,
    `<div class="row">${btn}<a class="btn" href="#/manage">Tự nhập nội dung</a></div>`);
}

// ---------- Màn hình: Hôm nay ----------
routes.today = async () => {
  setTitle('Hôm nay');
  const lv = S.level;
  const [d, cards, log, counts, exams, lastLearn, lastBackup] = await Promise.all([
    levelData(lv), db.all('srs'), db.kvGet('studyLog', {}), levelCounts(), db.all('exams'), db.kvGet('lastLearn'), db.kvGet('backupAt')]);
  const today = todayStr();
  const cmap = new Map(cards.map((c) => [c.wordId, c]));
  const due = cards.filter((c) => isDue(c, today)).length;
  const newToday = cards.filter((c) => c.firstSeen === today).length;
  const unseen = d.words.filter((w) => !cmap.get(w.id)?.due).length;
  const newAvail = Math.min(Math.max(0, S.newPerDay - newToday), unseen);
  const minutes = Math.round((log[today] || 0) / 60);
  const learned = d.words.length - unseen;
  const running = exams.find((x) => !x.submittedAt);
  const studied = cards.some((c) => c.due);
  const daysSinceBackup = lastBackup ? daysBetween(lastBackup.slice(0, 10), today) : null;

  let plan = `<p class="muted" style="margin:0">Chưa đặt ngày thi dự kiến. <a href="#/me">Đặt ngày thi và số phút mỗi ngày</a> để có kế hoạch.</p>`;
  if (S.examDate) {
    const left = daysBetween(today, S.examDate);
    if (left < 0) plan = `<p style="margin:0">Ngày thi dự kiến (${fmtDay(S.examDate)}) đã qua. <a href="#/me">Cập nhật</a></p>`;
    else {
      const study = Math.max(1, left - 7);
      const per = Math.ceil(unseen / study);
      plan = `<p style="margin:0">Còn <b>${left}</b> ngày đến ngày thi (${fmtDay(S.examDate)}). Còn <b>${unseen}</b> từ HSK ${lv} chưa học trên máy →
        nên học khoảng <b>${per}</b> từ mới/ngày, dành 7 ngày cuối để ôn và thi thử. Mục tiêu: ${S.minutesPerDay} phút/ngày.</p>
        ${per > S.newPerDay ? `<p class="muted" style="margin:6px 0 0">Đang đặt ${S.newPerDay} từ mới/ngày — thấp hơn mức cần. <a href="#/me">Điều chỉnh</a></p>` : ''}`;
    }
  }
  const total = due + newAvail;
  main.innerHTML = `
    <div class="levels" role="group" aria-label="Chọn cấp HSK">
      ${[1, 2, 3, 4, 5, 6].map((l) => `<button class="${l === lv ? 'on' : ''}" data-act="setLevel" data-level="${l}">HSK ${l}<span class="dot">${counts[l] ? counts[l] + ' từ' : 'trống'}</span></button>`).join('')}
    </div>
    <div id="today-body" style="margin-top:12px">
    ${running ? `<div class="card warn row between"><div><b>Bài thi đang làm dở</b><br><small>${esc(running.title)} · ${running.mode === 'sim' ? 'Mô phỏng thi' : 'Luyện tập'}</small></div><a class="btn primary" href="#/exam-run/${running.id}">Tiếp tục</a></div>` : ''}
    ${studied && (daysSinceBackup === null || daysSinceBackup >= S.backupEvery) ? `<div class="card warn"><b>Nên sao lưu tiến độ</b><p class="muted" style="margin:4px 0 8px">${daysSinceBackup === null ? 'Bạn chưa sao lưu lần nào.' : `Lần sao lưu gần nhất: ${daysSinceBackup} ngày trước.`} Dữ liệu chỉ nằm trên máy này và có thể mất nếu xóa dữ liệu website.</p><a class="btn small" href="#/backup">Sao lưu ngay</a></div>` : ''}
    ${!d.words.length ? await noDataBox(lv) : `
      <div class="grid3">
        <div class="card stat"><b>${due}</b><span>thẻ đến hạn</span></div>
        <div class="card stat"><b>${newAvail}</b><span>từ mới hôm nay</span></div>
        <div class="card stat"><b>${minutes}<small>/${S.minutesPerDay}</small></b><span>phút đã học</span></div>
      </div>
      <a class="btn primary block" href="#/flash?${qs({ src: 'today' })}" ${total ? '' : 'aria-disabled="true"'}>${total ? `Bắt đầu học hôm nay (${total} thẻ)` : 'Đã xong thẻ hôm nay ✓ — ôn thêm?'}</a>
      <div class="grid2" style="margin-top:10px">
        <a class="btn" href="#/drill?src=quick">Ôn nhanh 10–15 phút</a>
        ${lastLearn ? `<a class="btn" href="${esc(lastLearn.hash)}">Tiếp tục: ${esc(lastLearn.label)}</a>` : `<a class="btn" href="#/words">Xem từ vựng</a>`}
      </div>`}
    <h2>Lối vào nhanh</h2>
    <div class="quick grid4">
      <a href="#/words"><span class="ic">词</span>Học từ</a>
      <a href="#/grammar"><span class="ic">法</span>Ngữ pháp</a>
      <a href="#/listening"><span class="ic">听</span>Nghe</a>
      <a href="#/reading"><span class="ic">读</span>Đọc</a>
      <a href="#/writing"><span class="ic">写</span>Viết</a>
      <a href="#/exam"><span class="ic">考</span>Thi thử</a>
      <a href="#/mistakes"><span class="ic">错</span>Sổ lỗi sai</a>
      <a href="#/dict"><span class="ic">查</span>Tra từ</a>
    </div>
    ${d.words.length ? `<h2>Tiến độ HSK ${lv}</h2>
    <div class="card"><div class="row between"><span>Đã học ${learned}/${d.words.length} từ trên máy</span><span class="chip jade">Chuỗi ${streakDays(log)} ngày</span></div>
      <div class="bar" style="margin-top:8px"><i style="width:${d.words.length ? (learned / d.words.length) * 100 : 0}%"></i></div>
      <p class="muted" style="margin:8px 0 0;font-size:.85em">Số từ tính trên dữ liệu đã tải, không phải toàn bộ đề cương HSK ${lv}.</p></div>` : ''}
    <h2>Kế hoạch</h2><div class="card">${plan}</div>
    </div>`;
};

// ---------- Học tập ----------
routes.learn = async () => {
  setTitle('Học tập · HSK ' + S.level);
  const d = await levelData(S.level);
  if (!d.words.length && !d.grammar.length && !d.listening.length) { main.innerHTML = await noDataBox(S.level); return; }
  const cards = new Map((await db.all('srs')).map((c) => [c.wordId, c]));
  const lessons = [];
  for (const w of d.words) {
    let l = lessons.find((x) => x.name === w.lesson);
    if (!l) lessons.push((l = { name: w.lesson, words: [] }));
    l.words.push(w);
  }
  const writingN = d.questions.filter((q) => q.skill === 'writing').length;
  main.innerHTML = `
    <div class="quick grid4">
      <a href="#/words"><span class="ic">词</span>Từ vựng<br><small class="muted">${d.words.length}</small></a>
      <a href="#/grammar"><span class="ic">法</span>Ngữ pháp<br><small class="muted">${d.grammar.length}</small></a>
      <a href="#/reading"><span class="ic">读</span>Đọc<br><small class="muted">${d.readings.length}</small></a>
      <a href="#/listening"><span class="ic">听</span>Nghe<br><small class="muted">${d.listening.length}</small></a>
      <a href="#/writing"><span class="ic">写</span>Viết<br><small class="muted">${writingN}</small></a>
      <a href="#/dict"><span class="ic">查</span>Tra từ</a>
      <a href="#/print"><span class="ic">印</span>In danh sách</a>
      <a href="#/manage"><span class="ic">＋</span>Thêm nội dung</a>
    </div>
    <h2>Bài học</h2>
    <ul class="list">${lessons.map((l) => {
      const done = l.words.filter((w) => cards.get(w.id)?.due).length;
      return `<li><a href="#/words?${qs({ lesson: l.name })}"><div class="grow"><b>${esc(l.name)}</b> <span class="zh muted">${esc(l.words.slice(0, 4).map((w) => w.hanzi).join(' '))}…</span><div class="sub">${done}/${l.words.length} từ đã học</div>
        <div class="bar" style="margin-top:6px"><i style="width:${(done / l.words.length) * 100}%"></i></div></div><span class="chev">›</span></a></li>`;
    }).join('')}</ul>`;
};

function wordStatus(c) {
  if (!c || !c.due) return '<span class="chip">Mới</span>';
  if (c.interval >= 21) return '<span class="chip jade">Đã thuộc</span>';
  return '<span class="chip amber">Đang học</span>';
}
routes.words = async (args, q) => {
  setTitle(q.lesson || 'Từ vựng · HSK ' + S.level, '#/learn');
  const d = await levelData(S.level);
  if (!d.words.length) { main.innerHTML = await noDataBox(S.level); return; }
  const cards = new Map((await db.all('srs')).map((c) => [c.wordId, c]));
  const f = q.f || 'all';
  let list = q.lesson ? d.words.filter((w) => w.lesson === q.lesson) : d.words;
  if (f === 'fav') list = list.filter((w) => cards.get(w.id)?.flags?.fav);
  if (f === 'hard') list = list.filter((w) => { const c = cards.get(w.id); return c?.flags?.hard || (c?.wrong || 0) >= 2 || (c?.due && c.interval < 21); });
  if (f === 'conf') list = list.filter((w) => cards.get(w.id)?.flags?.conf || (w.confusable || []).length);
  const link = (ff, t) => `<a class="chip ${f === ff ? 'red' : ''}" href="#/words?${qs({ ...(q.lesson ? { lesson: q.lesson } : {}), f: ff })}">${t}</a>`;
  rememberLearn(q.lesson || 'Từ vựng HSK ' + S.level);
  main.innerHTML = `
    <div class="row" style="margin-bottom:10px">${link('all', 'Tất cả')}${link('fav', '★ Yêu thích')}${link('hard', 'Chưa thuộc')}${link('conf', 'Dễ nhầm')}</div>
    ${q.lesson ? `<div class="grid2" style="margin-bottom:10px"><a class="btn primary" href="#/flash?${qs({ lesson: q.lesson })}">Học bài này bằng thẻ</a><a class="btn" href="#/drill?${qs({ lesson: q.lesson })}">Kiểm tra bài</a></div>` : ''}
    ${!q.lesson && list.length > 300 ? `<p class="muted" style="font-size:.85em">Đang hiện 300/${list.length} từ. Chọn từng bài ở mục Học tập hoặc dùng Tra từ để xem đủ.</p>` : ''}
    ${toggles()}
    ${list.length ? `<ul class="list">${(q.lesson ? list : list.slice(0, 300)).map((w) => `<li><a href="#/word/${encodeURIComponent(w.id)}"><span class="zh">${esc(w.hanzi)}</span>
      <div class="grow"><div class="py-line">${esc(w.pinyin)}</div><div class="sub vi-line">${esc(cards.get(w.id)?.viMine || w.vi)}</div></div>
      ${cards.get(w.id)?.flags?.fav ? '★' : ''}${wordStatus(cards.get(w.id))}</a></li>`).join('')}</ul>` : '<p class="muted">Không có từ nào trong bộ lọc này.</p>'}`;
};

routes.word = async ([id]) => {
  const dict = await allWords();
  const w = dict.byId.get(id);
  setTitle('Chi tiết từ', '#/words');
  if (!w) { main.innerHTML = '<div class="card err">Không tìm thấy từ này (có thể gói đã bị xóa).</div>'; return; }
  const c = await getCard(w.id);
  rememberLearn(`${w.hanzi} (${w.vi})`);
  const conf = (w.confusable || []).map((h) => dict.byHz.get(h) ? `<a class="chip" href="#/word/${encodeURIComponent(dict.byHz.get(h).id)}">${esc(h)}</a>` : `<span class="chip">${esc(h)}</span>`).join(' ');
  const hasAudio = w.audio && (await db.get('audio', `${w.packId}/${w.audio}`));
  main.innerHTML = `
    <div class="card word-head">
      <div class="hz">${esc(w.hanzi)}</div><div class="py">${esc(w.pinyin)}</div>
      ${c.viMine ? `<div style="font-size:1.1em;margin-top:6px"><b>${esc(c.viMine)}</b> <small class="chip jade">nghĩa của bạn</small></div>` : ''}
      <div style="font-size:${c.viMine ? '.95em' : '1.1em'};margin-top:6px" class="${c.viMine ? 'muted' : ''}">${esc(w.vi || '(chưa có nghĩa tiếng Việt)')}</div>
      <div class="row" style="justify-content:center;margin-top:10px">${playBtn(w)}
        <span class="chip">HSK ${w.level}</span>${w.hsk3 ? `<span class="chip" title="Cấp trong danh sách HSK 3.0 (tham khảo)">HSK 3.0: cấp ${w.hsk3 >= 7 ? '7–9' : w.hsk3}</span>` : ''}${w.packId === 'user' ? '<span class="chip amber">Tự tạo</span>' : ''}${w.viSrc === 'cvdict' ? '<span class="chip amber" title="Nghĩa tiếng Việt lấy tự động từ từ điển CVDICT">nghĩa tự động</span>' : ''}</div>
      ${w.pinyinAlt ? `<small class="muted">Từ điển ghi: ${esc(w.pinyinAlt)} — khi gõ, cả hai cách đều được chấp nhận.</small><br>` : ''}
      <small class="muted">${hasAudio ? 'Âm thanh từ gói học' : 'Chưa có tệp âm thanh — dùng giọng đọc của thiết bị nếu có'}</small>
    </div>
    ${(w.senses || []).length ? `<div class="card"><h3>Các nghĩa</h3>${w.senses.map((s, i) => `<div class="ex-line"><b>${i + 1}.</b> ${s.pos ? `<span class="chip">${esc(s.pos)}</span> ` : ''}${esc(s.vi || '')}${s.vi ? '<br>' : ''}<small class="muted">EN: ${esc(s.en)}</small></div>`).join('')}</div>` : ''}
    <div class="card"><div class="row between"><h3 style="margin:0">Ví dụ</h3>${toggles()}</div>
      ${(w.ex || []).map((e) => `<div class="ex-line"><div class="zh">${esc(e.zh)} <button class="btn small ghost" data-act="speakText" data-text="${esc(e.zh)}">🔊</button></div><div class="py-line">${esc(e.py)}</div><div class="vi-line muted">${esc(e.vi)}</div></div>`).join('') || '<p class="muted">Chưa có ví dụ.</p>'}
    </div>
    ${conf ? `<div class="card"><h3>Từ dễ nhầm</h3>${conf}</div>` : ''}
    <div class="card"><h3>Đánh dấu</h3><div class="row">
      ${[['fav', '★ Yêu thích'], ['hard', 'Chưa thuộc'], ['conf', 'Dễ nhầm']].map(([k, t]) => `<button class="btn small ${c.flags?.[k] ? 'primary' : ''}" data-act="flag" data-k="${k}">${t}</button>`).join('')}
    </div></div>
    <div class="card"><h3>Nghĩa của bạn & ghi chú</h3>
      <label class="f"><span>Sửa / viết lại nghĩa tiếng Việt theo cách bạn hiểu (hiện trên thẻ ôn, có trong bản sao lưu)</span><input type="text" id="vimine" value="${esc(c.viMine || '')}" placeholder="${esc(w.vi || '')}"></label>
      <textarea id="note" placeholder="Mẹo nhớ, câu tự đặt…">${esc(c.note || '')}</textarea>
      <button class="btn small" data-act="saveNote" style="margin-top:8px">Lưu</button></div>
    <div class="card tight muted"><small>${w.lesson ? esc(w.lesson) + ' · ' : ''}${esc(w.topic || '')}<br>
      ${c.due ? `Lần ôn tới: ${fmtDay(c.due)} · khoảng cách ${c.interval} ngày · sai ${c.wrong || 0} lần` : 'Chưa học'}</small>
      ${w.packId === 'user' ? `<br><a href="#/word-edit/${encodeURIComponent(w.id)}">Sửa từ này</a>` : ''}</div>`;
  H.flag = async (el) => { const cc = await getCard(w.id); cc.flags = { ...(cc.flags || {}), [el.dataset.k]: !cc.flags?.[el.dataset.k] }; await saveCard(cc); el.classList.toggle('primary'); };
  H.saveNote = async () => { const cc = await getCard(w.id); cc.note = $('#note').value; cc.viMine = $('#vimine').value.trim(); await saveCard(cc); toast('Đã lưu'); refresh(); };
};

routes.dict = async (args, q) => {
  setTitle('Tra từ', '#/learn');
  main.innerHTML = `<input type="search" id="dq" placeholder="Chữ Hán, pinyin (có/không dấu) hoặc nghĩa tiếng Việt" value="${esc(q.q || '')}" data-input="search" autocomplete="off" autocapitalize="off">
    <p class="muted" style="font-size:.85em">Chỉ tra trong các gói đã tải và từ tự nhập trên máy.</p><div id="dres"></div>`;
  const dict = await allWords();
  H.search = (el) => {
    const v = el.value.trim();
    const box = $('#dres');
    if (!v) { box.innerHTML = ''; return; }
    const pv = parsePinyin(v);
    const hasTone = !!pv.tones;
    const fv = foldVi(v);
    const isHan = /\p{Script=Han}/u.test(v);
    const res = dict.list.filter((w) => {
      if (isHan) return w.hanzi.includes(v) || (w.ex || []).some((e) => e.zh.includes(v));
      const wp = parsePinyin(w.pinyin);
      if (pv.base && wp.base.includes(pv.base) && (!hasTone || wp.tones.includes(pv.tones))) return true;
      return foldVi(w.vi).includes(fv) || (fv.length >= 3 && (w.senses || []).some((s) => (s.en || '').toLowerCase().includes(fv)));
    }).slice(0, 100);
    box.innerHTML = res.length ? `<ul class="list">${res.map((w) => `<li><a href="#/word/${encodeURIComponent(w.id)}"><span class="zh">${esc(w.hanzi)}</span><div class="grow"><div class="py-line">${esc(w.pinyin)}</div><div class="sub">${esc(w.vi)}</div></div><span class="chip">HSK ${w.level}</span></a></li>`).join('')}</ul>` : '<p class="muted">Không tìm thấy.</p>';
  };
  if (q.q) H.search($('#dq'));
};

routes.print = async () => {
  setTitle('In danh sách từ', '#/learn');
  const d = await levelData(S.level);
  if (!d.words.length) { main.innerHTML = await noDataBox(S.level); return; }
  main.innerHTML = `<div class="row no-print" style="margin-bottom:10px"><button class="btn primary" data-act="print">In / Lưu PDF</button>
    <label class="switch" style="padding:0"><input type="checkbox" id="blank" data-change="blank"> Phiếu kiểm tra (để trống nghĩa)</label></div>
    <div class="card"><h3>Từ vựng HSK ${S.level} — ${d.words.length} từ</h3><div class="scroll-x"><table class="t"><thead><tr><th>#</th><th>Chữ Hán</th><th>Pinyin</th><th>Nghĩa</th><th>Bài</th></tr></thead><tbody>
    ${d.words.map((w, i) => `<tr><td>${i + 1}</td><td class="zh" style="font-size:1.2em">${esc(w.hanzi)}</td><td>${esc(w.pinyin)}</td><td class="m">${esc(w.vi)}</td><td><small>${esc(w.lesson || '')}</small></td></tr>`).join('')}
    </tbody></table></div></div>`;
  H.print = () => window.print();
  H.blank = (el) => main.querySelectorAll('td.m').forEach((td, i) => { td.textContent = el.checked ? '' : d.words[i].vi; });
};

export { routes, H, G, S, db, esc, safe, $, main, toast, setTitle, levelData, allWords, getCard, saveCard, logAttempt, addMistake, clearMistakeOnce,
  rememberLearn, toggles, playBtn, empty, noDataBox, fmtDate, fmtDay, fmtMs, fmtBytes, qs, nowISO, invalidate, config, packIndex, saveSettings, route, onLeave };
export function setH(k, fn) { H[k] = fn; }
export const gen = () => viewGen;
/** Vẽ lại màn hình đang mở (an toàn nếu người dùng đã chuyển màn hình). */
export const refresh = () => route(true);
export function getS() { return S; }

// Các màn hình còn lại nằm ở views2.js / views3.js
import('./views2.js').then(() => import('./views3.js')).then(boot).catch((e) => {
  main.innerHTML = `<div class="card err"><b>Không tải được mã ứng dụng.</b><p>${esc(e.message)}</p><p>Nếu đang offline: hãy mở ứng dụng khi có mạng một lần để tải đầy đủ.</p></div>`;
});

// ---------- Khởi động ----------
let swReg = null;
let wantReload = false;
async function boot() {
  try {
    await db.open();
  } catch (e) {
    main.innerHTML = `<div class="card err"><b>Không mở được bộ nhớ trên máy</b><p>${esc(e.message)}</p><p class="muted">Safari ở chế độ Riêng tư hoặc bộ nhớ đầy có thể gây lỗi này.</p></div>`;
    return;
  }
  await loadSettings();
  $('#ver-side').textContent = 'Phiên bản ' + APP_VERSION;
  const net = () => { const t = navigator.onLine ? '' : 'Offline'; $('#net').textContent = t; $('#net-side').textContent = t ? '● Đang offline' : '● Có mạng'; };
  addEventListener('online', net); addEventListener('offline', net); net();
  addEventListener('hashchange', () => route());
  if (!location.hash) {
    const last = await db.kvGet('lastRoute');
    history.replaceState(null, '', last && !last.includes('exam-run') ? last : '#/today');
  }
  await route();
  registerSW();
  trackStudyTime();
}

function registerSW() {
  const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!('serviceWorker' in navigator) || !secure) {
    $('#banner').innerHTML = `<div class="card warn"><b>Chế độ offline chưa bật.</b> ${location.protocol === 'file:' ? 'Bạn đang mở tệp trực tiếp (file://).' : 'Trang không chạy qua HTTPS.'} Ứng dụng vẫn dùng được khi đang mở, nhưng không thể cài lên Màn hình chính và không mở lại được khi mất mạng. Xem hướng dẫn trong HUONG-DAN.md.</div>`;
    return;
  }
  navigator.serviceWorker.register('sw.js').then((reg) => {
    swReg = reg;
    const show = (w) => {
      $('#banner').innerHTML = `<div class="card info row between"><div><b>Có phiên bản mới</b><br><small>Cập nhật không xóa tiến độ học. Nên cập nhật khi không làm bài thi.</small></div><button class="btn small jade" id="upd">Cập nhật</button></div>`;
      $('#upd').onclick = () => { wantReload = true; w.postMessage('SKIP_WAITING'); };
    };
    if (reg.waiting && navigator.serviceWorker.controller) show(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) show(w); });
    });
  }).catch((e) => console.warn('SW', e));
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (wantReload) location.reload(); });
}
export async function checkUpdate() {
  if (!swReg) return 'Chế độ offline chưa bật nên không kiểm tra được.';
  if (!navigator.onLine) return 'Đang offline — hãy kết nối mạng để kiểm tra cập nhật.';
  await swReg.update();
  return swReg.waiting || swReg.installing ? 'Đang có bản mới — xem thông báo phía trên.' : 'Bạn đang dùng bản mới nhất (' + APP_VERSION + ').';
}

function trackStudyTime() {
  let last = Date.now();
  ['pointerdown', 'keydown', 'scroll'].forEach((ev) => addEventListener(ev, () => { last = Date.now(); }, { passive: true }));
  setInterval(async () => {
    if (document.visibilityState !== 'visible' || Date.now() - last > 120000) return;
    const log = await db.kvGet('studyLog', {});
    const t = todayStr();
    log[t] = (log[t] || 0) + 15;
    await db.kvSet('studyLog', log);
  }, 15000);
}
