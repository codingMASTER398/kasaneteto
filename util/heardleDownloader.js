const fs = require("fs");
const ytdl = require("ytdl-core");
const { exec } = require("child_process");
const s = JSON.parse(
  fs.readFileSync(`./util/kasaneTetoSongs.json`, "utf-8").toString()
);
const tetoSongs = s;

function downloadFirst16s(url, id) {
  try {
    const stream = ytdl(url, { filter: "audioonly" });
    const outputFile = `./heardleSongs/${id}.ogg`;

    // Pipe to FFmpeg to cut the first 16 seconds
    const ffmpeg = exec(
      `ffmpeg -hide_banner -y -i pipe:0 -t 16 -vn -acodec libvorbis "${outputFile}"`
    );

    stream.pipe(ffmpeg.stdin);

    ffmpeg.stdin.on("error", (err) => {
      if (err.code === "EPIPE") {
        return;
      } else {
        console.error("FFmpeg stdin error:", err);
      }
    });

    ffmpeg.stderr.on("data", (data) => {
      console.log(data.toString());
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        console.log("Ooh i'm heardling it ", outputFile);
      } else {
        console.error("Nah i can't heardle it ", code);
      }
    });
  } catch (e) {
    console.log(e);
  }
}

const sleep = (t) => new Promise((r) => setTimeout(r, t));

(async () => {
  for (let i = 0; i < tetoSongs.length; i++) {
    const song = tetoSongs[i];

    console.log(song.id);

    if (fs.existsSync(`./heardleSongs/${song.id}.ogg`)) {
      continue;
    } else {
      downloadFirst16s(song.url, song.id)
      await sleep(1000)
    }
  }
})();
