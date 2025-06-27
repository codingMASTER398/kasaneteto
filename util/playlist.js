const { execSync } = require("child_process");
const fs = require(`fs`)

const playlistUrls = [
  "https://music.youtube.com/playlist?list=PL1dGKN09sRtU299Em9Vil5lYeMDUJSzK1", // big one
  "https://music.youtube.com/playlist?list=PLHZZREW2WLMq1zZRhGAcKiR83rjJD2hqB", // silly
  "https://music.youtube.com/playlist?list=PLH-Bh_b1TTcFmNStRUJj_XA_qELCo62U2", // more teto.
  "https://music.youtube.com/playlist?list=PLbYSELue6KyDRpsGQfLONK7C5iRPd7hvL", // more teto.
  "https://music.youtube.com/playlist?list=PLBogHLCY5IFxtcGfRECcG97P4AHoKBl8I", // more teto.
  "https://music.youtube.com/playlist?list=PL0jq6mGkDwfzuOqrEDfNd-5sJUTxJy7n5", // more teto.
  "https://music.youtube.com/playlist?list=PLlBxB5S0GPa9shVv5dSeSWiw0lcpmLoTR", // my extra songs playlist just in case
  "https://www.youtube.com/playlist?list=PLFUvuG19TifkUT8X2LNGEc-HNahD_envA", // KaisoRain's playlist
];

const excludeList =
  "https://music.youtube.com/browse/VLPLlBxB5S0GPa__rzwVGnrsz33akM1qJelO";

const s = JSON.parse(
  fs.readFileSync(`./util/kasaneTetoSongs.json`, "utf-8").toString()
);
const tetoSongsBefore = s;

function replaceDetailsVocaDB(details) {
  return new Promise((resolve) => {
    details.vdbFetched = true;

    console.log(`VocaDB fetching for ${details.id}`)

    fetch(
      `https://vocadb.net/api/songs/byPv?pvService=Youtube&pvId=${details.id}&fields=AdditionalNames`,
      {
        headers: {
          Accept: "Application/JSON",
        },
      }
    )
      .then(async (r) => {
        if (r.status != 200) {
          console.log(await r.text());
          resolve(details);
          return;
        }

        const text = await r.text();
        if (text == "null" || !text) {
          console.log("No vocaDB found for ", details);
          resolve(details);
          return;
        }

        const json = JSON.parse(text);
        details.title = json.defaultName;
        details.author = json.artistString;

        if(json.additionalNames) details.title += " " + json.additionalNames

        resolve(details)
      })
      .catch((e) => {
        console.error(e);
        resolve(details);
      });
  });
}

module.exports = async () => {
  const excludes = JSON.parse(
    execSync(`yt-dlp --flat-playlist -J "${excludeList}"`).toString()
  ).entries.map((v) => {
    return v.id;
  });

  let allVideos = [];

  for (let i = 0; i < playlistUrls.length; i++) {
    const out = execSync(`yt-dlp --flat-playlist -J "${playlistUrls[i]}"`);
    const parsed = JSON.parse(out.toString());

    const videos = parsed.entries
      .map((v) => {
        // Parse em out
        return {
          url: v.url,
          title: v.title,
          author: v.channel,
          id: v.id,
          uploaded: v.release_timestamp, // May not exist
          playlist: playlistUrls[i],
        };
      })
      .filter((v) => {
        // Exclude videos we don't want
        return (
          !excludes.includes(v.id) &&
          !v.title.includes("[Private video]") &&
          !v.title.includes("[Deleted video]")
        );
      });

    videos.forEach((v) => {
      // Add them to the full array
      if (!allVideos.find((vv) => vv.id == v.id)) allVideos.push(v);
    });

    console.log(`Loaded ${playlistUrls[i]}, ${i + 1}/${playlistUrls.length}`);
  }

  // Do a big vocadb transfer
  for (let i = 0; i < allVideos.length; i++) {
    const found = tetoSongsBefore.find((a)=>a.id == allVideos[i].id && a.vdbFetched);

    if(found) {
      console.log(`Already voca-voca'd ${allVideos[i].id}`)
      allVideos[i] = found
      allVideos[i].author = allVideos[i].author.replace("feat. 重音テト SV", "").replace("feat. 重音テトSV", "").replace("重音テトSV", "").replace("重音テト", "").replace("feat. ", "").replace("feat.", "").trim();
      continue;
    };

    allVideos[i] = await replaceDetailsVocaDB(allVideos[i])
  }

  // Write the whole array
  console.log("Writing")

  try {
    fs.writeFileSync(
      `./util/kasaneTetoSongs.json`,
      JSON.stringify(allVideos)
    );
  } catch {}
  try {
    fs.writeFileSync(
      `./kasaneTetoSongs.json`,
      JSON.stringify(allVideos)
    );
  } catch {}

  return allVideos;
};
