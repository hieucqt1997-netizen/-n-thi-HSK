// Phát âm thanh: ưu tiên tệp audio trong gói (IndexedDB), dự phòng giọng đọc của thiết bị.
import * as db from './db.js';

let voicesP = null;
function loadVoices() {
  if (!('speechSynthesis' in self)) return Promise.resolve([]);
  if (voicesP) return voicesP;
  voicesP = new Promise((res) => {
    const v = speechSynthesis.getVoices();
    if (v.length) return res(v);
    const t = setTimeout(() => res(speechSynthesis.getVoices()), 2000);
    speechSynthesis.addEventListener?.('voiceschanged', () => { clearTimeout(t); res(speechSynthesis.getVoices()); }, { once: true });
  });
  return voicesP;
}

export async function zhVoice() {
  const vs = await loadVoices();
  const zh = vs.filter((v) => /^zh/i.test(v.lang) || /cmn/i.test(v.lang));
  // Ưu tiên tiếng Phổ thông Trung Quốc đại lục, rồi Đài Loan; tránh tiếng Quảng (zh-HK)
  return zh.find((v) => /zh[-_]CN|cmn/i.test(v.lang)) || zh.find((v) => /zh[-_]TW/i.test(v.lang)) || zh.find((v) => !/HK/i.test(v.lang)) || null;
}

/** Trạng thái giọng đọc để hiển thị trung thực cho người học. */
export async function ttsStatus() {
  if (!('speechSynthesis' in self)) return { ok: false, msg: 'Trình duyệt này không hỗ trợ giọng đọc (Text-to-Speech).' };
  const v = await zhVoice();
  if (!v) return { ok: false, msg: 'Thiết bị chưa có giọng đọc tiếng Trung. Trên iPhone: Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Trung, tải một giọng về máy.' };
  return { ok: true, voice: v, msg: `Giọng đọc: ${v.name} (${v.lang})${v.localService === false ? ' — giọng trực tuyến, có thể không dùng được khi mất mạng' : ''}` };
}

export async function speak(text, rate = 0.85) {
  const v = await zhVoice();
  if (!v) throw new Error('NO_VOICE');
  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v;
    u.lang = v.lang;
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? resolve() : reject(new Error(e.error || 'TTS_ERROR')));
    speechSynthesis.speak(u);
  });
}

let gen = 0;
export function stopAll() {
  gen++;
  try { speechSynthesis.cancel(); } catch { /* bỏ qua */ }
  if (current) { current.pause(); current = null; }
}

let current = null;
const urlCache = new Map();

export async function audioURL(key) {
  if (!key) return null;
  if (urlCache.has(key)) return urlCache.get(key);
  const rec = await db.get('audio', key);
  if (!rec || !rec.blob) return null;
  const u = URL.createObjectURL(rec.blob);
  urlCache.set(key, u);
  return u;
}

/**
 * Phát một nguồn: {audioKey} hoặc {text}. Trả về {ok, via, msg}.
 * Phải gọi từ thao tác chạm của người dùng (iOS chặn tự phát).
 */
export async function play({ audioKey, text, lines, rate = 1, loop = false }) {
  stopAll();
  if (audioKey) {
    const u = await audioURL(audioKey);
    if (u) {
      const a = new Audio(u);
      a.playbackRate = rate;
      a.loop = loop;
      current = a;
      try {
        await a.play();
        return { ok: true, via: 'audio', el: a };
      } catch (e) {
        return { ok: false, msg: e.name === 'NotAllowedError' ? 'iOS chặn tự phát âm thanh. Hãy chạm lại nút Phát.' : 'Không phát được tệp âm thanh (' + e.message + ').' };
      }
    }
    if (!text && !lines) return { ok: false, msg: 'Thiếu tệp âm thanh trong gói đã tải.' };
  }
  const seq = lines ? lines.map((l) => l.zh) : text ? [text] : [];
  if (!seq.length) return { ok: false, msg: 'Mục này chưa có âm thanh.' };
  const st = await ttsStatus();
  if (!st.ok) return { ok: false, msg: st.msg };
  try {
    const my = gen;
    for (const s of seq) { if (my !== gen) break; await speak(s, 0.85 * rate); }
    return { ok: true, via: 'tts' };
  } catch (e) {
    return { ok: false, msg: 'Giọng đọc gặp lỗi: ' + e.message };
  }
}
