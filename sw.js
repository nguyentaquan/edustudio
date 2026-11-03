// EduStudio Service Worker (PWA Engine v3.5.0 GDMN & GDPT)
// Bản quyền & Định hướng chuyên môn: Thầy Nguyễn Tá Quan

const CACHE_NAME = "edustudio-pwa-v3.10.27";
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/tkb-styles.css',
  '/js/app.js',
  '/js/tkb-engine.js',
  '/js/canh-thuan-tkb-data.js',
  '/js/tkb-ui.js',
  '/js/xlsx.full.min.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/apple-touch-icon.png',
  '/assets/favicon-32.png'
];

// 1. Cài đặt Service Worker và lưu trữ Cache cốt lõi
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA] Caching core assets for offline capability...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Kích hoạt và dọn dẹp Cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Xử lý yêu cầu mạng (Network First, Fallback to Cache)
self.addEventListener('fetch', (event) => {
  // Chỉ can thiệp các request GET http/https
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Nếu mạng tốt, lưu bản mới vào cache và trả về
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Khi mất mạng hoặc sóng yếu, phục vụ từ Cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});
