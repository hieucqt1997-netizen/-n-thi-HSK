// Sao lưu / phục hồi. Phần logic gộp là hàm thuần để kiểm thử bằng Node.

export const BACKUP_FORMAT = 'sotay-hsk-backup';
export const BACKUP_SCHEMA = 1; // tăng khi đổi cấu trúc; phục hồi kiểm tra trường này

export function checkBackup(obj) {
  if (!obj || obj.format !== BACKUP_FORMAT) return { ok: false, msg: 'Đây không phải tệp sao lưu của Sổ tay HSK.' };
  if (typeof obj.schema !== 'number') return { ok: false, msg: 'Tệp sao lưu thiếu số phiên bản cấu trúc.' };
  if (obj.schema > BACKUP_SCHEMA)
    return { ok: false, msg: `Tệp sao lưu được tạo bởi bản ứng dụng mới hơn (cấu trúc ${obj.schema}). Hãy cập nhật ứng dụng trước khi phục hồi.` };
  if (!obj.data || typeof obj.data !== 'object') return { ok: false, msg: 'Tệp sao lưu không có dữ liệu.' };
  return { ok: true };
}

// Thời điểm cập nhật của một bản ghi để so sánh khi gộp
function stamp(store, r) {
  if (!r) return '';
  if (store === 'srs') return r.updatedAt || r.last || '';
  if (store === 'mistakes') return r.lastAt || '';
  if (store === 'exams') return r.updatedAt || r.startedAt || '';
  return r.updatedAt || '';
}

/**
 * Gộp hai danh sách bản ghi theo khóa: giữ bản mới hơn.
 * Với attempts (nhật ký) thì gộp theo dấu vân tay (at+refId) để tránh nhân đôi.
 */
export function mergeRecords(store, keyPath, local, incoming) {
  if (store === 'attempts') {
    const fp = (a) => `${a.at}|${a.refId}|${a.skill}`;
    const seen = new Set(local.map(fp));
    const add = incoming.filter((a) => !seen.has(fp(a))).map(({ id, ...rest }) => rest);
    return { put: add, added: add.length, updated: 0 };
  }
  if (store === 'kv') {
    // studyLog: cộng theo ngày lấy giá trị lớn hơn; các khóa khác giữ máy hiện tại nếu đã có
    const map = new Map(local.map((r) => [r.k, r]));
    const out = [];
    for (const r of incoming) {
      const cur = map.get(r.k);
      if (r.k === 'studyLog') {
        const v = { ...(cur?.v || {}) };
        for (const [d, s] of Object.entries(r.v || {})) v[d] = Math.max(v[d] || 0, s);
        out.push({ k: 'studyLog', v });
      } else if (!cur) out.push(r);
    }
    return { put: out, added: out.length, updated: 0 };
  }
  const map = new Map(local.map((r) => [r[keyPath], r]));
  const out = [];
  let added = 0;
  let updated = 0;
  for (const r of incoming) {
    const cur = map.get(r[keyPath]);
    if (!cur) { out.push(r); added++; }
    else if (stamp(store, r) > stamp(store, cur)) { out.push(r); updated++; }
  }
  return { put: out, added, updated };
}
