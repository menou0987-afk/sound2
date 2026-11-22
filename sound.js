
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


// ==============================
// IndexedDB
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

        // FileをBlobに変換
        const blob = file.slice(
            0,
            file.size,
            file.type
        );

        const transaction = db.transaction(
            STORE_NAME,
            "readwrite"
        );

        const store = transaction.objectStore(STORE_NAME);

        const request = store.add({
            name: file.name,
            file: blob
        });

        request.onsuccess = function () {
            resolve({
                id: request.result,
                name: file.name,
                file: blob
            });
        };

        request.onerror = function () {
            reject(request.error);
        };

        transaction.onerror = function () {
            reject(transaction.error);
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

        name.textContent = song.name.replace(/\.[^/.]+$/, "");

        // 再生中の曲かどうか
        if (index === currentIndex) {
            icon.textContent = audio.paused ? "■" : "▶";
        } else {
            icon.textContent = "■";
        }

        // 曲をクリックしたら再生・一時停止
        songElement.addEventListener("click", function () {
            if (index === currentIndex) {
                if (audio.paused) {
                    audio.play()
                        .then(() => {
                            updatePlayer();
                        })
                        .catch(error => {
                            console.error("再生エラー:", error);
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

    // 古い再生用URLを解放
    if (audio.src.startsWith("blob:")) {
        URL.revokeObjectURL(audio.src);
    }

    audio.src = URL.createObjectURL(song.file);

    audio.play()
        .then(() => {
            updatePlayer();
        })
        .catch(error => {
            console.error("再生エラー:", error);
            updatePlayer();
            alert("再生できませんでした。ファイル形式に対応していない可能性があります。");
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
            .then(() => {
                updatePlayer();
            })
            .catch(error => {
                console.error("再生エラー:", error);
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

    if (isRepeatOne) {
        audio.currentTime = 0;
        audio.play();
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
// プレイヤー画面更新
// ==============================

function updatePlayer() {
    if (currentIndex !== -1 && songs[currentIndex]) {
        currentSongDisplay.textContent =
            songs[currentIndex].name.replace(/\.[^/.]+$/, "");
    } else {
        currentSongDisplay.textContent = "未選択";
    }

    playButton.textContent = audio.paused ? "▶" : "Ⅱ";

    repeatButton.textContent = isRepeatOne ? "🔁" : "🔁";
    repeatButton.classList.toggle("active", isRepeatOne);

    repeatButton.title = isRepeatOne
        ? "1曲リピート ON"
        : "1曲リピート OFF";

    renderSongList();
}


// ==============================
// 曲の追加
// ==============================

// 曲追加ボタン
addMusicButton.addEventListener("click", function () {
    musicFiles.click();
});


// ファイルが選択されたとき
musicFiles.addEventListener("change", async function () {

    const selectedFiles = Array.from(musicFiles.files);

    // 動作確認用アラート
    alert(
        "ファイル選択イベントが動きました。\n" +
        "選択されたファイル数：" + selectedFiles.length +
        "\nファイル名：" + (selectedFiles[0]?.name || "なし") +
        "\n形式：" + (selectedFiles[0]?.type || "不明")
    );

    if (selectedFiles.length === 0) {
        musicFiles.value = "";
        return;
    }

    let addedCount = 0;

    for (const file of selectedFiles) {

        // 音声ファイルか確認
        const isAudio =
            file.type.startsWith("audio/") ||
            /\.(mp3|flac|m4a|wav|aac|ogg)$/i.test(file.name);

        if (!isAudio) {
            continue;
        }

        try {
            const savedSong = await saveSong(file);

            songs.push(savedSong);
            addedCount++;

        } catch (error) {
            console.error("曲の保存に失敗:", error);

            alert(
                "曲の保存に失敗しました。\n" +
                error.message
            );
        }
    }

    renderSongList();

    musicFiles.value = "";

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
        console.error("初期化エラー:", error);

        currentSongDisplay.textContent = "データ読み込みエラー";

        alert("初期化エラー：" + error.message);
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
        .catch((error) => {
            console.error("Service Worker 登録失敗:", error);
        });
}
