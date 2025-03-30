const express = require(`express`);
const app = express();
const utilsPlaylist = require(`./util/playlist`);
const rankRouter = require(`./rankRouter`);
const fs = require(`fs`)
const { spawn } = require('child_process');
const path = require('path');

let tetoSongs = require(`./util/kasaneTetoSongs.json`);

rankRouter.updateSongs(tetoSongs);

app.set("view engine", "ejs");

app.use(express.static("./public"));

function getNumberWithOrdinal(n) {
  var s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function refreshTetoSongs() {
  console.log("Refreshing teto songs through playlists...");

  const child = spawn('node', [path.join(__dirname, 'util', 'playlistCMD.js')], {
    cwd: process.cwd(), // Maintain the same working directory
    stdio: 'inherit' // Inherit standard IO (logs will show in the main process)
  });
  
  child.on('error', (err) => console.error('Child Process Error:', err));
  
  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Child process exited with code ${code}`);
    }
  });
}

setInterval(()=>{
  const s = require(`./util/kasaneTetoSongs.json`);
  tetoSongs = s;
  rankRouter.updateSongs(tetoSongs)
}, 100_000)

refreshTetoSongs()

let visits;
try{
  visits = require(`./db/visits.json`)
} catch {
  visits = require(`./dbb/visits.json`)
}

visits = visits.visits

app.get("/", (req, res) => {
  visits++;

  res.render("index.ejs", {
    viewers: getNumberWithOrdinal(visits),
  });
});

app.get("/rot", (req, res) => {
  res.render("rot.ejs", {
  });
});

app.get("/songs", (req, res) => {
  res.render("songs.ejs", {
    tetoSongs,
    votes: rankRouter.getVotesDb()
  });
});

app.get("/rank", (req, res) => {
  res.render("rank.ejs");
});

app.use("/rankRouter", rankRouter.router);

setInterval(refreshTetoSongs, 10 * 60_000); // 10 minutes
setInterval(()=>{
  fs.writeFileSync(`./db/visits.json`, JSON.stringify({visits}))
  fs.writeFileSync(`./dbb/visits.json`, JSON.stringify({visits}))
}, 10_000)

app.listen(4001);
