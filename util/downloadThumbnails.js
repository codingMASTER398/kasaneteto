const fs = require(`fs`);
const fetch = require(`node-fetch`);

async function downloadThumbnail(videoId, filename = "thumbnail.jpg") {
  try {
    const url = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error("Failed to fetch thumbnail:", response.statusText);
      return;
    }

    const fileStream = fs.createWriteStream(
      `./public/img/songThumbnails/${filename}`
    );
    response.body.pipe(fileStream);

    fileStream.on("finish", () => {
      console.log(`Thumbnail saved as ${filename}`);
    });
  } catch (e) {
    console.log(e)
  }
}

module.exports = () => {
  const songs = require(`./kasaneTetoSongs.json`);
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];

    console.log(song.id);

    // Check if it already exists
    if (fs.existsSync(`./public/img/songThumbnails/${song.id}.jpg`)) continue;

    // Download the thumbnail
    downloadThumbnail(song.id, song.id + ".jpg");
  }
};
