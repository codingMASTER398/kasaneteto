const fs = require(`fs`);
const fetch = require(`node-fetch`);
const sharp = require('sharp');

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

    fileStream.on("finish", async () => {
      console.log(`Thumbnail saved as ${filename}, converting to AVIF`);

      await sharp(`./public/img/songThumbnails/${filename}`)
            .avif({ quality: 80 })
            .toFile(`./public/imgcompress/songThumbnails/${filename}`.replace(".jpg", ".avif"));
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
