const CACHE_NAME = 'static-cache-v4';
const STATIC_ASSETS = [
    '/',  // Assuming '/home' serves home.ejs
    '/login', // Assuming '/login' serves login.ejs
    '/iconLarge_1.png',
    '/iconLarge_2.png',
    '/iconLarge_3.png',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/jsqr@1.3.1/dist/jsQR.js'
    // Add other static assets here
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        }).catch(error => {
            console.error('Failed to install cache:', error);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
                .map(cacheName => caches.delete(cacheName))
            );
        })
    );
    console.log('Service Worker activated!');
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Check if the request is for a static asset
    if (STATIC_ASSETS.includes(new URL(event.request.url).pathname)) {
        // Use Cache First strategy for static assets
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                return cachedResponse || fetch(event.request).then(fetchResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, fetchResponse.clone());
                        return fetchResponse;
                    });
                });
            })
        );
    } else {
        // Use Network First strategy for dynamic content
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request).then(response => {
                    return response || caches.match('placeholder2.html');
                });
            })
        );
    }
});
