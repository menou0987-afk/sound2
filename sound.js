// ==============================
// 曲の追加
// ==============================

addMusicButton.addEventListener("click", function () {
    musicFiles.click();
});

musicFiles.addEventListener("change", async function () {
    const selectedFiles = Array.from(musicFiles.files);

    // iPhoneがファイルを認識しているか確認
    alert(
        "選択されたファイル数：" + selectedFiles.length +
        "\nファイル名：" + (selectedFiles[0]?.name || "なし") +
        "\n形式：" + (selectedFiles[0]?.type || "不明")
    );

    for (const file of selectedFiles) {
        // 音声ファイルか確認
        const isAudio =
            file.type.startsWith("audio/") ||
            /\.(mp3|flac|m4a|wav|aac|ogg)$/i.test(file.name);

        if (!isAudio) continue;

        try {
            const savedSong = await saveSong(file);
            songs.push(savedSong);
        } catch (error) {
            console.error("曲の保存に失敗:", error);
            alert("曲の保存に失敗しました：" + error.message);
        }
    }

    renderSongList();
    musicFiles.value = "";
});
