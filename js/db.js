// Lớp lưu trữ IndexedDB. Toàn bộ nội dung học và tiến độ nằm ở đây (không dùng localStorage).

const DB_NAME = 'sotay-hsk';
const DB_VER = 1;
export const STORES = {
  packs: { keyPath: 'id' },
  words: { keyPath: 'id', idx: ['level', 'packId'] },
  grammar: { keyPath: 'id', idx: ['level', 'packId'] },
  readings: { keyPath: 'id', idx: ['level', 'packId'] },
  listening: { keyPath: 'id', idx: ['level', 'packId'] },
  questions: { keyPath: 'id', idx: ['level', 'packId'] },
  audio: { keyPath: 'key', idx: ['packId'] },
  srs: { keyPath: 'wordId' },
  mistakes: { keyPath: 'id' },
  attempts: { keyPath: 'id', autoIncrement: true },
  exams: { keyPath: 'id' },
  kv: { keyPath: 'k' },
};
// Nhóm dữ liệu cá nhân (đưa vào bản sao lưu)
export const PERSONAL = ['srs', 'mistakes', 'attempts', 'exams', 'kv'];
export const CONTENT = ['words', 'grammar', 'readings', 'listening', 'questions'];

let dbp = null;
export function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) { reject(new Error('Trình duyệt không hỗ trợ IndexedDB')); return; }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, def] of Object.entries(STORES)) {
        if (db.objectStoreNames.contains(name)) continue;
        const st = db.createObjectStore(name, { keyPath: def.keyPath, autoIncrement: !!def.autoIncrement });
        for (const i of def.idx || []) st.createIndex(i, i);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Cơ sở dữ liệu đang bị khóa bởi một tab khác. Hãy đóng các tab khác của ứng dụng.'));
  });
  return dbp;
}

function wrap(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}
function done(tx) {
  return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('Giao dịch bị hủy')); });
}

export async function get(store, key) {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).get(key));
}
export async function all(store) {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).getAll());
}
export async function byIndex(store, idx, val) {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).index(idx).getAll(val));
}
export async function count(store, idx, val) {
  const db = await open();
  const st = db.transaction(store).objectStore(store);
  return wrap(idx ? st.index(idx).count(val) : st.count());
}
export async function put(store, val) {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  const r = tx.objectStore(store).put(val);
  await done(tx);
  return r.result;
}
export async function putMany(store, vals) {
  if (!vals.length) return;
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  const st = tx.objectStore(store);
  for (const v of vals) st.put(v);
  await done(tx);
}
export async function del(store, key) {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  await done(tx);
}
export async function delByIndex(store, idx, val) {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  const st = tx.objectStore(store);
  const keys = await wrap(st.index(idx).getAllKeys(val));
  for (const k of keys) st.delete(k);
  await done(tx);
  return keys.length;
}
export async function clear(store) {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).clear();
  await done(tx);
}

// Cài đặt / trạng thái dạng khóa–giá trị
export async function kvGet(k, def = null) {
  const r = await get('kv', k);
  return r ? r.v : def;
}
export async function kvSet(k, v) {
  return put('kv', { k, v });
}
