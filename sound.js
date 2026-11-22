// ==============================
// 音楽プレイヤー
// ==============================

// HTML要素の取得
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

// 再生用URLの管理
let objectUrls = [];


// ==============================
// IndexedDB（曲を保存する場所）
// ==============================

const DB_NAME = "SoundPlayerDB";
const STORE_NAME = "songs";

let db;


// データベースを開く
function openDatabase() {
    return new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, 1);

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
            resolve(db);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}


// 保存された曲を取得
function getSavedSongs() {
    return new Promise((resolve, reject) => {

        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}


// 曲を保存
function saveSong(file) {
    return new Promise((resolve, reject) => {

        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        const request = store.add({
            name: file.name,
            file: file
        });

        request.onsuccess = function () {
            resolve({
                id: request.result,
                name: file.name,
                file: file
            });
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}


// ==============================
// 曲一覧の表示
// ==============================

function renderSongList() {

    songList.innerHTML = "";

    songs.forEach((song, index) => {

        const songElement = document.createElement("div");
        songElement.className = "song";

        // 曲アイコン
        const icon = document.createElement("span");
        icon.className = "song-icon";

        // 曲名
        const name = document.createElement("span");
        name.className = "song-name";

        // 拡張子を除いたファイル名
        name.textContent = song.name.replace(/\.[^/.]+$/, "");

        // 再生中の曲かどうか
        if (index === currentIndex) {
            icon.textContent = audio.paused ? "■" : "▶";
        } else {
            icon.textContent = "■";
        }

        // 曲をクリックしたら再生
        songElement.addEventListener("click", function () {
            if (index === currentIndex) {
                if (audio.paused) {
                    audio.play();
                } else {
                    audio.pause();
                }

                updatePlayer();
                renderSongList();
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

    // 範囲外の番号を調整
    if (index < 0) {
        index = songs.length - 1;
    }

    if (index >= songs.length) {
        index = 0;
    }

    currentIndex = index;

    // 前の再生URLを解放
    if (audio.src) {
        audio.pause();
    }

    // 再生する曲のURLを作成
    const song = songs[currentIndex];

    audio.src = URL.createObjectURL(song.file);

    audio.play()
        .then(() => {
            updatePlayer();
        })
        .catch(error => {
            console.error("再生エラー:", error);
        });

    updatePlayer();
    renderSongList();
}


// ==============================
// 再生・一時停止
// ==============================

function togglePlay() {

    if (songs.length === 0) return;

    // 曲が選択されていない場合は最初の曲を再生
    if (currentIndex === -1) {
        playSong(0);
        return;
    }

    if (audio.paused) {
        audio.play()
            .then(() => {
                updatePlayer();
                renderSongList();
            })
            .catch(error => {
                console.error("再生エラー:", error);
            });
    } else {
        audio.pause();
        updatePlayer();
        renderSongList();
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

    // 再生開始から3秒以上経過していたら現在の曲を最初から再生
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        audio.play();
        return;
    }

    playSong(currentIndex - 1);
}


// ==============================
// 自動再生
// ==============================

audio.addEventListener("ended", function () {

    if (songs.length === 0) return;

    // 1曲リピート
    if (isRepeatOne) {
        audio.currentTime = 0;
        audio.play();
        return;
    }

    // 次の曲へ
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
// プレイヤー画面更新
// ==============================

function updatePlayer() {

    // 再生中の曲名
    if (currentIndex !== -1 && songs[currentIndex]) {

        currentSongDisplay.textContent =
            songs[currentIndex].name.replace(/\.[^/.]+$/, "");

    } else {

        currentSongDisplay.textContent = "未選択";
    }

    // 再生ボタン
    playButton.textContent = audio.paused ? "▶" : "Ⅱ";

    // リピートボタン
    repeatButton.textContent = isRepeatOne ? "🔁" : "🔁";
    repeatButton.classList.toggle("active", isRepeatOne);

    repeatButton.title = isRepeatOne
        ? "1曲リピート ON"
        : "1曲リピート OFF";

    // 曲一覧のアイコンも更新
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

    for (const file of selectedFiles) {

        // 音声ファイル以外は無視
        if (!file.type.startsWith("audio/")) continue;

        try {
            const savedSong = await saveSong(file);
            songs.push(savedSong);

        } catch (error) {
            console.error("曲の保存に失敗:", error);
        }
    }

    // 一覧更新
    renderSongList();

    // 選択状態をリセット
    musicFiles.value = "";
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

        // 保存されている曲を読み込む
        songs = await getSavedSongs();

        renderSongList();
        updatePlayer();

    } catch (error) {

        console.error("初期化エラー:", error);

        currentSongDisplay.textContent = "データ読み込みエラー";
    }
}


// 起動
initialize();
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
        .then(() => {
            console.log("Service Worker 登録成功");
        })
        .catch((error) => {
            console.error("Service Worker 登録失敗:", error);
        });
}