const CACHE_NAME = "sound-cache-v2";

const FILES_TO_CACHE = [
    "./index.html",
    "./sound.css",
    "./sound.js",
    "./manifest.json"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FILES_TO_CACHE);
        })
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    if (event.request.mode === "navigate") {
        event.respondWith(
            caches.match(
                new URL("./index.html", self.registration.scope).href
            ).then((cachedResponse) => {
                return cachedResponse || fetch(event.request);
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});
