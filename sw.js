/**
 * EduStudio - Tự hủy đăng ký Service Worker và Xóa sạch Cache đệm cũ
 */
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map(key => caches.delete(key)));
        }).then(() => self.registration.unregister())
        .then(() => self.clients.matchAll({ type: 'window' }))
        .then(clients => {
            for (const client of clients) {
                client.navigate(client.url);
            }
        })
    );
});

self.addEventListener('fetch', (e) => {
    // Không can thiệp cache, luôn chuyển tiếp về mạng
    e.respondWith(fetch(e.request));
});
