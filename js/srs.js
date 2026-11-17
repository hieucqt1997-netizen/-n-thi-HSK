// Ôn tập cách quãng theo SM-2 (SuperMemo 2), có chỉnh nhẹ cho thẻ quên.
// Mức nhớ người học chọn: Quên=1, Khó=3, Nhớ=4, Dễ=5.

export const GRADES = [
  { q: 1, label: 'Quên', cls: 'g-again' },
  { q: 3, label: 'Khó', cls: 'g-hard' },
  { q: 4, label: 'Nhớ', cls: 'g-good' },
  { q: 5, label: 'Dễ', cls: 'g-easy' },
];

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return todayStr(dt);
}

export function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function newCard(wordId) {
  return { wordId, ef: 2.5, reps: 0, interval: 0, lapses: 0, wrong: 0, due: null, last: null, seen: 0, flags: {} };
}

/** Trả về thẻ mới sau khi chấm mức nhớ q (0–5) vào ngày today. */
export function review(card, q, today = todayStr()) {
  const c = { ...card, flags: { ...(card.flags || {}) } };
  c.seen = (c.seen || 0) + 1;
  if (q < 3) {
    c.reps = 0;
    c.interval = 1;
    c.lapses = (c.lapses || 0) + 1;
    c.wrong = (c.wrong || 0) + 1;
  } else {
    c.reps = (c.reps || 0) + 1;
    if (c.reps === 1) c.interval = q === 5 ? 2 : 1;
    else if (c.reps === 2) c.interval = q === 3 ? 3 : 6;
    else c.interval = Math.max(1, Math.round(c.interval * c.ef * (q === 3 ? 0.8 : 1)));
  }
  c.ef = Math.max(1.3, +(c.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))).toFixed(3));
  c.due = addDays(today, c.interval);
  c.last = today;
  if (!c.firstSeen) c.firstSeen = today;
  return c;
}

export function isDue(card, today = todayStr()) {
  return !!card.due && card.due <= today;
}

/** Sắp xếp thẻ đến hạn: quá hạn lâu trước, rồi thẻ hay sai. */
export function sortDue(cards) {
  return [...cards].sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : (b.wrong || 0) - (a.wrong || 0)));
}
