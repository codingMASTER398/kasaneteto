// CONFIG
const investingEnabled = true;

//
require(`./util/imageCompressor.js`);
const express = require(`express`);
const app = express();
const utilsPlaylist = require(`./util/playlist`);
const rankRouter = require(`./rankRouter`);
const fs = require(`fs`);
const { spawn } = require("child_process");
const path = require("path");
const { createServer } = require("node:http");
const investingRouter = investingEnabled ? require(`./investingRouter`) : false;
const server = createServer(app);
const serveStatic = require('serve-static')
const { Server } = require("socket.io");
const io = new Server(server);
require(`dotenv`).config();

let tetoSongs = require(`./util/kasaneTetoSongs.json`);

rankRouter.updateSongs(tetoSongs);
if (investingEnabled)
  investingRouter.updateSongs(tetoSongs, process.env.YOUTUBE_API_KEY, io);

app.set("view engine", "ejs");
app.use(
  serveStatic("./public", {
    maxAge: '1d'
  })
);

function getNumberWithOrdinal(n) {
  var s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function refreshTetoSongs() {
  console.log("Refreshing teto songs through playlists...");

  const child = spawn(
    "node",
    [path.join(__dirname, "util", "playlistCMD.js")],
    {
      cwd: process.cwd(), // Maintain the same working directory
      stdio: "inherit", // Inherit standard IO (logs will show in the main process)
    }
  );

  child.on("error", (err) => console.error("Child Process Error:", err));

  child.on("exit", (code) => {
    const s = JSON.parse(
      fs.readFileSync(`./util/kasaneTetoSongs.json`, "utf-8").toString()
    );
    tetoSongs = s;
    rankRouter.updateSongs(tetoSongs);
    if (investingEnabled) investingRouter.updateSongs(tetoSongs);

    console.log("UPdated??");
  });
}

//refreshTetoSongs()

let visits;
try {
  visits = require(`./db/visits.json`);
} catch {
  visits = require(`./dbb/visits.json`);
}

visits = visits.visits;

app.get("/", (req, res) => {
  visits++;

  res.render("index.ejs", {
    viewers: getNumberWithOrdinal(visits),
  });
});

app.get("/rot", (req, res) => {
  res.render("rot.ejs", {});
});

app.get("/songs", (req, res) => {
  res.render("songs.ejs", {
    tetoSongs,
    votes: rankRouter.getVotesDb(),
  });
});

app.get("/rank", (req, res) => {
  res.render("rank.ejs");
});

app.use("/rankRouter", rankRouter.router);

if (investingEnabled) {
  app.use("/invest", investingRouter.router);
} else {
  app.use("/invest", (req, res) => {
    res.render("investo/investOff.ejs", {});
  });
}

/*
app.use(`/heardleSongClips`, express.static("./heardleSongs"));

app.get("/heardle", (req, res) => {
  res.render("heardle.ejs", {
    tetoSongs,
  });
});*/

app.get("/heardle", (req, res) => {
  res.status(404).send(`Heardle has been removed since it wasn't that fun anyway & had high maintenance`)
})

setInterval(refreshTetoSongs, 10 * 60_000); // 10 minutes
//refreshTetoSongs();
setInterval(() => {
  fs.writeFileSync(`./db/visits.json`, JSON.stringify({ visits }));
  fs.writeFileSync(`./dbb/visits.json`, JSON.stringify({ visits }));
}, 10_000);

server.listen(4001);
