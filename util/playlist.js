const { execSync } = require("child_process");

const playlistUrls = [
  "https://music.youtube.com/playlist?list=PL1dGKN09sRtU299Em9Vil5lYeMDUJSzK1", // big one
  "https://music.youtube.com/playlist?list=PLHZZREW2WLMq1zZRhGAcKiR83rjJD2hqB", // silly
  "https://music.youtube.com/playlist?list=PLH-Bh_b1TTcFmNStRUJj_XA_qELCo62U2", // more teto.
  "https://music.youtube.com/playlist?list=PLbYSELue6KyDRpsGQfLONK7C5iRPd7hvL", // more teto.
  "https://music.youtube.com/playlist?list=PLBogHLCY5IFxtcGfRECcG97P4AHoKBl8I", // more teto.
  "https://music.youtube.com/playlist?list=PL0jq6mGkDwfzuOqrEDfNd-5sJUTxJy7n5", // more teto.
  "https://music.youtube.com/playlist?list=PLlBxB5S0GPa9shVv5dSeSWiw0lcpmLoTR", // my extra songs playlist just in case
  "https://www.youtube.com/playlist?list=PLFUvuG19TifkUT8X2LNGEc-HNahD_envA" // KaisoRain's playlist
];

const excludeList =
  "https://music.youtube.com/browse/VLPLlBxB5S0GPa__rzwVGnrsz33akM1qJelO";

module.exports = () => {
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
          playlist: playlistUrls[i]
        };
      })
      .filter((v) => {
        // Exclude videos we don't want
        return (
          !excludes.includes(v.id) && !v.title.includes("[Private video]") && !v.title.includes("[Deleted video]")
        );
      });

    videos.forEach((v) => {
      // Add them to the full array
      if (!allVideos.find((vv) => vv.id == v.id)) allVideos.push(v);
    });

    console.log(`Loaded ${playlistUrls[i]}, ${i + 1}/${playlistUrls.length}`);
  }

  // Write the whole array

  require(`fs`).writeFileSync(
    `./util/kasaneTetoSongs.json`,
    JSON.stringify(allVideos)
  );

  return allVideos;
};
