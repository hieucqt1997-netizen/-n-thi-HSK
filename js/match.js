// So khớp đáp án: chữ Hán và pinyin (dấu thanh hoặc số thanh).
// Không phụ thuộc DOM để có thể kiểm thử bằng Node.

const TONE_COMBINING = { '̄': 1, '́': 2, '̌': 3, '̀': 4 };

/**
 * Chuyển pinyin bất kỳ dạng nào về {base, tones}.
 * - base: chữ cái latin thường, ü/v/u: -> "v", bỏ khoảng trắng, dấu câu, nháy.
 * - tones: chuỗi số thanh 1–4 theo thứ tự xuất hiện (thanh nhẹ không tính).
 * Chấp nhận: "nǐ hǎo", "ni3 hao3", "Ni3hao3", "nü3", "nv3", "nu:3", "lu:4".
 */
export function parsePinyin(input) {
  const s = String(input ?? '').normalize('NFD').toLowerCase();
  let base = '';
  let tones = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c >= 'a' && c <= 'z') {
      if (c === 'u' && (s[i + 1] === '̈' || s[i + 1] === ':')) {
        base += 'v';
        i++;
        // dấu thanh có thể đứng sau dấu hai chấm/umlaut
        continue;
      }
      base += c;
    } else if (TONE_COMBINING[c]) {
      tones += TONE_COMBINING[c];
    } else if (c >= '1' && c <= '4') {
      tones += c;
    }
    // số 0/5 (thanh nhẹ), khoảng trắng, dấu câu, nháy, gạch nối: bỏ qua
  }
  return { base, tones };
}

/** So khớp pinyin. checkTones=true thì sai thanh điệu là sai. */
export function pinyinEquals(input, expected, checkTones = true) {
  const a = parsePinyin(input);
  if (!a.base) return false;
  const list = Array.isArray(expected) ? expected : [expected];
  return list.some((e) => {
    const b = parsePinyin(e);
    return a.base === b.base && (!checkTones || a.tones === b.tones);
  });
}

/** Bỏ khoảng trắng và dấu câu (Trung + Latin) để so chữ Hán. */
export function normalizeHanzi(s) {
  return String(s ?? '')
    .normalize('NFC')
    .replace(/[\s\p{P}\p{S}]/gu, '');
}

export function hanziEquals(input, expected) {
  const a = normalizeHanzi(input);
  if (!a) return false;
  const list = Array.isArray(expected) ? expected : [expected];
  return list.some((e) => normalizeHanzi(e) === a);
}

/** Bỏ dấu tiếng Việt để tìm kiếm ("cam on" khớp "cảm ơn"). */
export function foldVi(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Chấm một câu hỏi theo loại. Trả về true/false; null nếu là bài tự đánh giá. */
export function checkAnswer(q, ans) {
  if (ans === undefined || ans === null || ans === '') return false;
  switch (q.type) {
    case 'choice':
    case 'listen-choice':
      return Number(ans) === Number(q.answer);
    case 'fill': {
      const accepted = [q.answer, ...(q.accept || [])];
      if (q.input === 'pinyin') return pinyinEquals(ans, accepted, q.checkTones !== false);
      return hanziEquals(ans, accepted);
    }
    case 'order': {
      const joined = Array.isArray(ans) ? ans.join('') : String(ans);
      return hanziEquals(joined, [q.answer, ...(q.accept || [])]);
    }
    case 'open':
      return ans === 'self-ok' ? true : ans === 'self-no' ? false : null;
    default:
      return false;
  }
}
