
const audio = document.getElementById("audio");
const musicFiles = document.getElementById("music-files");
const addMusicButton = document.getElementById("add-music");
const songList = document.getElementById("song-list");
const currentSongDisplay = document.getElementById("current-song");

const playButton = document.getElementById("play");
const prevButton = document.getElementById("prev");
const nextButton = document.getElementById("next");
const repeatButton = document.getElementById("repeat");

const DB_NAME = "SoundPlayerDB-Diagnostic";
const STORE_NAME = "songs";

let db;
let songs = [];
let currentIndex = -1;
let repeatOne = false;

// IndexedDBを開く
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                    autoIncrement: true
                });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 曲を保存
function saveSong(file) {
    return new Promise(async (resolve, reject) => {
        try {
            const buffer = await file.arrayBuffer();

            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);

            store.add({
                name: file.name,
                type: file.type,
                file: buffer
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        } catch (error) {
            reject(error);
        }
    });
}

// 保存済みの曲を読み込む
function loadSongs() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 曲名表示用（拡張子を除去）
function getDisplayName(name) {
    return name.replace(/\.[^/.]+$/, "");
}

// 曲一覧を表示
function renderSongList() {
    songList.innerHTML = "";

    songs.forEach((song, index) => {
        const row = document.createElement("div");
        row.className = "song-row";

        const name = document.createElement("span");
        name.className = "song-name";
        name.textContent = getDisplayName(song.name);

        if (index === currentIndex) {
            const mark = document.createElement("span");
            mark.className = "playing-mark";
            mark.textContent = audio.paused ? "" : "⏸";
            row.appendChild(mark);
        }

        row.appendChild(name);

        row.addEventListener("click", () => {
            playSong(index);
        });

        songList.appendChild(row);
    });
}

// 曲を再生
function playSong(index) {
    if (songs.length === 0) return;

    if (index < 0) index = songs.length - 1;
    if (index >= songs.length) index = 0;

    currentIndex = index;

    const song = songs[currentIndex];
    const blob = new Blob([song.file], {
        type: song.type || "audio/mpeg"
    });

    if (audio.src) {
        URL.revokeObjectURL(audio.src);
    }

    audio.src = URL.createObjectURL(blob);
    audio.play();

    currentSongDisplay.textContent = getDisplayName(song.name);
    playButton.textContent = "⏸";

    renderSongList();
}

// 再生・一時停止
function togglePlay() {
    if (songs.length === 0) return;

    if (currentIndex === -1) {
        playSong(0);
        return;
    }

    if (audio.paused) {
        audio.play();
        playButton.textContent = "⏸";
    } else {
        audio.pause();
        playButton.textContent = "▶";
    }

    renderSongList();
}

// 次の曲
function nextSong() {
    if (songs.length === 0) return;
    playSong(currentIndex + 1);
}

// 前の曲
function prevSong() {
    if (songs.length === 0) return;
    playSong(currentIndex - 1);
}

// 曲の追加
async function handleFiles(files) {
    for (const file of files) {
        await saveSong(file);
    }

    songs = await loadSongs();
    renderSongList();
}

// 曲追加ボタン
addMusicButton.addEventListener("click", () => {
    musicFiles.click();
});

// ファイル選択
musicFiles.addEventListener("change", async () => {
    const files = Array.from(musicFiles.files);

    if (files.length > 0) {
        await handleFiles(files);
    }

    musicFiles.value = "";
});

// 再生操作
playButton.addEventListener("click", togglePlay);
nextButton.addEventListener("click", nextSong);
prevButton.addEventListener("click", prevSong);

// 1曲リピート
repeatButton.addEventListener("click", () => {
    repeatOne = !repeatOne;

    repeatButton.classList.toggle("active", repeatOne);
    repeatButton.textContent = repeatOne ? "🔂" : "🔁";
});

// 曲が終了したら次の曲へ
audio.addEventListener("ended", () => {
    if (repeatOne) {
        audio.currentTime = 0;
        audio.play();
    } else {
        nextSong();
    }
});

// 再生状態の表示更新
audio.addEventListener("play", () => {
    playButton.textContent = "⏸";
    renderSongList();
});

audio.addEventListener("pause", () => {
    playButton.textContent = "▶";
    renderSongList();
});

// 初期化
async function initialize() {
    db = await openDatabase();
    songs = await loadSongs();
    renderSongList();
}

initialize();
