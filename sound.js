
 // ==============================
 // 音楽プレイヤー 診断版
 // ==============================

const audio = document.getElementById("audio");
const musicFiles = document.getElementById("music-files");
const addMusicButton = document.getElementById("add-music");
const songList = document.getElementById("song-list");
const currentSongDisplay = document.getElementById("current-song");

const playButton = document.getElementById("play");
const prevButton = document.getElementById("prev");
const nextButton = document.getElementById("next");
const repeatButton = document.getElementById("repeat");


// ==============================
// データ
// ==============================

let songs = [];
let currentIndex = -1;
let isRepeatOne = false;
let db;


// ==============================
// IndexedDB
// 診断用の新しいデータベース名
// ==============================

const DB_NAME = "SoundPlayerDB-Diagnostic";
const STORE_NAME = "songs";


// ==============================
// エラー詳細表示
// ==============================

function showError(title, error) {
    const name = error?.name || "不明";
    const message = error?.message || String(error || "詳細不明");

    console.error(title, error);

    alert(
        title + "\n\n" +
        "エラー名：" + name + "\n" +
        "詳細：" + message
    );
}


// ==============================
// データベースを開く
// ==============================

function openDatabase() {
    return new Promise((resolve, reject) => {
        let request;

        try {
            request = indexedDB.open(DB_NAME, 1);
        } catch (error) {
            reject(error);
            return;
        }

        request.onupgradeneeded = function (event) {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                    autoIncrement: true
                });
            }
        };

        request.onsuccess = function (event) {
            db = event.target.result;

            db.onversionchange = function () {
                db.close();
            };

            resolve(db);
        };

        request.onerror = function () {
            reject(request.error);
        };

        request.onblocked = function () {
            reject(new Error("データベースの処理がブロックされています"));
        };
    });
}


// ==============================
// 保存済みの曲を取得
// ==============================

function getSavedSongs() {
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(
                STORE_NAME,
                "readonly"
            );

            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = function () {
                resolve(request.result);
            };

            request.onerror = function () {
                reject(request.error);
            };

            transaction.onerror = function () {
                reject(transaction.error);
            };

        } catch (error) {
            reject(error);
        }
    });
}


// ==============================
// 曲を保存
// ArrayBuffer形式
// ==============================

async function saveSong(file) {
    // ファイルをバイトデータに変換
    const buffer = await file.arrayBuffer();

    return new Promise((resolve, reject) => {
        let transaction;
        let request;
        let savedId;

        try {
            transaction = db.transaction(
                STORE_NAME,
                "readwrite"
            );

            const store = transaction.objectStore(STORE_NAME);

            request = store.add({
                name: file.name,
                type: file.type,
                file: buffer
            });

            request.onsuccess = function () {
                savedId = request.result;
            };

            request.onerror = function () {
                reject(request.error);
            };

            transaction.oncomplete = function () {
                resolve({
                    id: savedId,
                    name: file.name,
                    type: file.type,
                    file: buffer
                });
            };

            transaction.onerror = function () {
                reject(
                    transaction.error ||
                    request.error ||
                    new Error("保存トランザクション失敗")
                );
            };

            transaction.onabort = function () {
                reject(
                    transaction.error ||
                    request.error ||
                    new Error("保存トランザクション中断")
                );
            };

        } catch (error) {
            reject(error);
        }
    });
}


// ==============================
// 曲一覧表示
// ==============================

function renderSongList() {
    songList.innerHTML = "";

    songs.forEach((song, index) => {
        const songElement = document.createElement("div");
        songElement.className = "song";

        const icon = document.createElement("span");
        icon.className = "song-icon";

        const name = document.createElement("span");
        name.className = "song-name";

        name.textContent = song.name.replace(/\.[^/.]+$/, "");

        if (index === currentIndex) {
            icon.textContent = audio.paused ? "■" : "▶";
        } else {
            icon.textContent = "■";
        }

        songElement.addEventListener("click", function () {
            if (index === currentIndex) {
                if (audio.paused) {
                    audio.play()
                        .then(updatePlayer)
                        .catch(error => {
                            showError("再生エラー", error);
                        });
                } else {
                    audio.pause();
                    updatePlayer();
                }

                return;
            }

            playSong(index);
        });

        songElement.appendChild(icon);
        songElement.appendChild(name);

        songList.appendChild(songElement);
    });
}


// ==============================
// 曲の再生
// ==============================

function playSong(index) {
    if (songs.length === 0) return;

    if (index < 0) {
        index = songs.length - 1;
    }

    if (index >= songs.length) {
        index = 0;
    }

    currentIndex = index;

    audio.pause();

    const song = songs[currentIndex];

    if (audio.src.startsWith("blob:")) {
        URL.revokeObjectURL(audio.src);
    }

    const audioBlob = new Blob(
        [song.file],
        {
            type: song.type || "audio/mpeg"
        }
    );

    audio.src = URL.createObjectURL(audioBlob);

    audio.play()
        .then(updatePlayer)
        .catch(error => {
            showError("再生エラー", error);
            updatePlayer();
        });

    updatePlayer();
}


// ==============================
// 再生・一時停止
// ==============================

function togglePlay() {
    if (songs.length === 0) return;

    if (currentIndex === -1) {
        playSong(0);
        return;
    }

    if (audio.paused) {
        audio.play()
            .then(updatePlayer)
            .catch(error => {
                showError("再生エラー", error);
            });
    } else {
        audio.pause();
        updatePlayer();
    }
}


// ==============================
// 次の曲・前の曲
// ==============================

function nextSong() {
    if (songs.length === 0) return;

    playSong(currentIndex + 1);
}

function prevSong() {
    if (songs.length === 0) return;

    if (audio.currentTime > 3) {
        audio.currentTime = 0;

        audio.play().catch(error => {
            showError("再生エラー", error);
        });

        return;
    }

    playSong(currentIndex - 1);
}


// ==============================
// 曲終了時の自動再生
// ==============================

audio.addEventListener("ended", function () {
    if (songs.length === 0) return;

    if (isRepeatOne) {
        audio.currentTime = 0;

        audio.play().catch(error => {
            showError("リピート再生エラー", error);
        });

        return;
    }

    nextSong();
});


// ==============================
// リピート切り替え
// ==============================

repeatButton.addEventListener("click", function () {
    isRepeatOne = !isRepeatOne;
    updatePlayer();
});


// ==============================
// 画面更新
// ==============================

function updatePlayer() {
    if (currentIndex !== -1 && songs[currentIndex]) {
        currentSongDisplay.textContent =
            songs[currentIndex].name.replace(/\.[^/.]+$/, "");
    } else {
        currentSongDisplay.textContent = "未選択";
    }

    playButton.textContent = audio.paused ? "▶" : "Ⅱ";

    repeatButton.textContent = "🔁";
    repeatButton.classList.toggle("active", isRepeatOne);

    repeatButton.title = isRepeatOne
        ? "1曲リピート ON"
        : "1曲リピート OFF";

    renderSongList();
}


// ==============================
// 曲の追加
// ==============================

addMusicButton.addEventListener("click", function () {
    musicFiles.click();
});


musicFiles.addEventListener("change", async function () {
    const selectedFiles = Array.from(musicFiles.files);

    if (selectedFiles.length === 0) {
        musicFiles.value = "";
        return;
    }

    let addedCount = 0;
    let errorDetails = [];

    for (const file of selectedFiles) {
        const isAudio =
            file.type.startsWith("audio/") ||
            /\.(mp3|flac|m4a|wav|aac|ogg)$/i.test(file.name);

        if (!isAudio) continue;

        try {
            const savedSong = await saveSong(file);

            songs.push(savedSong);
            addedCount++;

        } catch (error) {
            console.error("保存失敗:", file.name, error);

            errorDetails.push(
                "ファイル名：" + file.name +
                "\nエラー名：" + (error?.name || "不明") +
                "\n詳細：" + (error?.message || String(error))
            );
        }
    }

    renderSongList();

    musicFiles.value = "";

    if (errorDetails.length > 0) {
        alert(
            "曲の保存に失敗しました。\n\n" +
            errorDetails.join("\n\n----------------\n\n")
        );
    }

    alert("追加できた曲数：" + addedCount);
});


// ==============================
// ボタン操作
// ==============================

playButton.addEventListener("click", togglePlay);
nextButton.addEventListener("click", nextSong);
prevButton.addEventListener("click", prevSong);


// ==============================
// 初期起動
// ==============================

async function initialize() {
    try {
        await openDatabase();

        songs = await getSavedSongs();

        renderSongList();
        updatePlayer();

    } catch (error) {
        showError("初期化エラー", error);
        currentSongDisplay.textContent = "データ読み込みエラー";
    }
}

initialize();


// ==============================
// Service Worker
// ==============================

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
        .then(() => {
            console.log("Service Worker 登録成功");
        })
        .catch(error => {
            console.error("Service Worker 登録失敗:", error);
        });
}
