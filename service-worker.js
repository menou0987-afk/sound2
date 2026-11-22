const CACHE_NAME = "sound-cache-v4";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./sound.css",
    "./sound.js",
    "./manifest.json"
];

// インストール時に新しいキャッシュを作成
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FILES_TO_CACHE);
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

// 新しいバージョンを有効化し、古いキャッシュを削除
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// ページ・ファイルの読み込み処理
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    // HTMLはネットワークから最新を取得し、失敗したらキャッシュを使用
    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    return response;
                })
                .catch(() => {
                    return caches.match("./index.html");
                })
        );
        return;
    }

    // CSS・JSなどはキャッシュ優先
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request);
        })
    );
});
