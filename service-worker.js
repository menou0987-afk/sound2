const CACHE_NAME = "sound-cache-v5";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./sound.css",
    "./sound.js",
    "./manifest.json"
];

// ==============================
// インストール
// ==============================

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(FILES_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// ==============================
// 更新・古いキャッシュ削除
// ==============================

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// ==============================
// ファイル取得
// ==============================

self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") return;

    // 外部サイトの通信は対象外
    if (new URL(request.url).origin !== self.location.origin) return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (!response || !response.ok) {
                    throw new Error("Network response error");
                }

                const responseClone = response.clone();

                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(request, responseClone);
                    });

                return response;
            })
            .catch(() => {
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // オフライン時にページを開く場合
                    if (request.mode === "navigate") {
                        return caches.match("./index.html");
                    }

                    throw new Error("Cache not found");
                });
            })
    );
});
