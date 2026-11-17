// Service worker: lưu khung ứng dụng để chạy offline.
// Nội dung bài học + tiến độ nằm trong IndexedDB, KHÔNG bị xóa khi cập nhật.
// Khi phát hành bản mới: tăng APP_VERSION (cũng đổi ở js/app.js).
const APP_VERSION = '1.1.0';
const SHELL_CACHE = 'sotay-shell-' + APP_VERSION;
const SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/db.js',
  './js/srs.js',
  './js/match.js',
  './js/csv.js',
  './js/backup.js',
  './js/media.js',
  './js/quiz.js',
  './js/views2.js',
  './js/views3.js',
  './config/hsk-versions.json',
  './packs/index.json',
  './templates/tu-vung-mau.csv',
  './templates/goi-bai-hoc-mau.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  // Không skipWaiting tự động: chờ người dùng bấm "Cập nhật" để tránh đổi mã giữa bài thi.
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    // Chỉ xóa bộ đệm khung cũ của chính ứng dụng; không đụng IndexedDB
    await Promise.all(keys.filter((k) => k.startsWith('sotay-shell-') && k !== SHELL_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'VERSION') e.source?.postMessage({ type: 'VERSION', version: APP_VERSION });
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ứng dụng không dùng tài nguyên ngoài

  // Danh mục gói và tệp gói: ưu tiên mạng để thấy bản mới, mất mạng thì dùng bộ đệm
  if (url.pathname.includes('/packs/')) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-store' });
        if (res.ok && url.pathname.endsWith('/packs/index.json')) {
          const c = await caches.open(SHELL_CACHE);
          c.put(req, res.clone());
        }
        return res;
      } catch (err) {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  // Mở trang: trả index.html từ bộ đệm (ứng dụng 1 trang)
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = await caches.match('./index.html', { ignoreSearch: true });
      if (cached) return cached;
      try { return await fetch(req); } catch { return (await caches.match('./offline.html')) || new Response('Offline', { status: 503 }); }
    })());
    return;
  }

  // Tài nguyên khung: bộ đệm trước, sau đó mạng
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(req); } catch { return new Response('', { status: 504, statusText: 'Thiếu tài nguyên offline' }); }
  })());
});
