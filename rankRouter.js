const express = require('express')
const router = express.Router()
const rateLimit = require(`express-rate-limit`)
const fs = require(`fs`)

let db, songsToChooseFrom;

try{
  db = require(`./db/votes.json`)
} catch {
  db = require(`./dbb/votes.json`)
}

function writeDb(){
  fs.writeFile(`./db/votes.json`, JSON.stringify(db), "utf-8", ()=>{
    fs.writeFile(`./dbb/votes.json`, JSON.stringify(db), "utf-8", ()=>{})
  })
}

setInterval(writeDb, 10_000)

let songs, tokens = {};

function updateSongs(s) {
  songs = s;

  songsToChooseFrom = songs.map((song)=>{
    return {
      id: song.id,
      num: (db[song.id]?.pos || 0) + (db[song.id]?.neg || 0)
    }
  }).sort((a, b)=>{
    return a.num - b.num
  }).slice(0, 100).map((song)=>{
    return songs.find((s)=>s.id == song.id)
  })
}

// Route
const limiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minutes
	limit: 10, // Limit each IP to 00 requests per `window` (here, per 1 minute).
  keyGenerator: (req) => {
    console.log(req.clientIp)
    return req.clientIp
  }
})

// We use tokens here to limit & obfuscate votes, such that it's difficult to artificially boost a song's ranking.

router.use(require(`request-ip`).mw())

router.post('/new', limiter, (req, res) => {
  const A = songsToChooseFrom[Math.floor(Math.random() * songsToChooseFrom.length)]
  const BSort = songsToChooseFrom.filter((s)=>s != A)
  const B = BSort[Math.floor(Math.random() * BSort.length)]

  const token = String(Math.random())

  tokens[token] = {A, B}

  setTimeout(()=>{
    delete tokens[token]
  }, 10 * 60 * 1000)

  res.send({
    token, A, B
  })
})

router.post(`/choose/:choice/:token`, (req, res)=>{
  const data = tokens[req.params.token];
  if(!data) res.status(404).send("Token not found");

  console.log(data)

  // Update DB

  db[data.A.id] ??= {
    pos: 0,
    neg: 0,
    perc: 0
  };
  db[data.B.id] ??= {
    pos: 0,
    neg: 0,
    perc: 0
  };

  if(req.params.choice.includes("l")) {
    db[data.A.id].pos++;
    db[data.B.id].neg++;
  } else {
    db[data.A.id].neg++;
    db[data.B.id].pos++;
  }

  // Update percentages
  db[data.A.id].perc = (100 * db[data.A.id].pos) / (db[data.A.id].pos + db[data.A.id].neg)
  db[data.B.id].perc = (100 * db[data.B.id].pos) / (db[data.B.id].pos + db[data.B.id].neg)

  // Manipulate percentages to ensure that one positive vote and no negative votes != 100%
  // Only songs with over 10 votes can go up to 100%

  if((db[data.A.id].pos + db[data.A.id].neg) < 10) {
    db[data.A.id].perc *= (db[data.A.id].pos + db[data.A.id].neg) * 0.1
  }

  if((db[data.B.id].pos + db[data.B.id].neg) < 10) {
    db[data.B.id].perc *= (db[data.B.id].pos + db[data.B.id].neg) * 0.1
  }

  delete tokens[req.params.token]

  res.send("Counted")
})

function calcTotalVotes() {
  let tv = 0;

  Object.keys(db).forEach((v)=>{
    if(v == "totalVotes") return;
    tv += db[v].pos + db[v].neg
  })

  db.totalVotes = tv;
}

setInterval(calcTotalVotes, 30_000)
calcTotalVotes()

module.exports = {
  router, updateSongs, getVotesDb: ()=>{
    return db;
  }
}