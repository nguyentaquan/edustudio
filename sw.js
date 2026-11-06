// EduStudio Service Worker (v3.10.56 - GDMN & GDPT)
// Bản quyền & Định hướng chuyên môn: Thầy Nguyễn Tá Quan

const CACHE_NAME = "edustudio-pwa-v3.10.56-lsdl-multi-grade-matrix";

self.addEventListener('install', (event) => {
  // Bỏ qua chờ đợi, kích hoạt ngay lập tức
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Xóa toàn bộ cache cũ ngay lập tức
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          console.log('[PWA] Purging cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Luôn lấy tài nguyên mới nhất từ Network cho HTML & JS
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  // Với API, HTML và JS chính: Luôn luôn tải mới từ server (Network Only)
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Các tài nguyên khác (icon, font)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
