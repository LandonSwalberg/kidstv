// KidsTV Service Worker
// Caches the app shell so it loads instantly and works offline

const CACHE_NAME = 'kidstv-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './sw.js', './icon.svg'];

// Install: cache app shell files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for app shell, pass-through for APIs
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Always pass through external API calls
  if (
    url.includes('googleapis.com') ||
    url.includes('anthropic.com') ||
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('ytimg.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) {
    return; // let browser handle it normally
  }

  // Cache-first for everything else (app files)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Only cache successful same-origin responses
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: return index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
