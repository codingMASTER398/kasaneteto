const investingSF = require(`./util/investing/investing`);
const express = require("express");
const router = express.Router();
const slotFunction = require(`./util/slotFunction`);

// Auth setup
const jose = require("jose");

const alg = "RS256";
const spki = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjEsRmaLt0GyimmeZpsKf
Pm88VPm/kTMu2/aGGxnSXhcyM/FXZfI4LPB2AJsSxTauS43rKiq+Owvh4yWIUs1f
vFzJ1NUrResuizAF1W2akKPsAloxTgxshBhVApNX55erAHo40OY1w4o+dfLd3jnG
7KrbkcaHQTlhXP4+USm5lIQmn95+v1l4zny8JCqE1S8wqhLWewmFsBy1QdDMYhDC
hA96KwXIxfOqtPfsj9+W5isFMMt232JYxuebgjnXSKrRecumDyFEmZbSO4B0Kjsk
8nIyP4GDC+RT7uszCcnL6CfqjPCK+/ppDZdCRjcdSSFzrbRPLTwxv2ZCRTRRY8/6
aQIDAQAB
-----END PUBLIC KEY-----`;

let publicKey;
jose.importSPKI(spki, alg).then((pk) => {
  publicKey = pk;
});

// ok auth set up have a nice day

let songs = [],
  started = false,
  nextUpdate = 21,
  nextUpdateInterval = setInterval(() => {
    if (nextUpdate == 20) investingSF.prepUpdate();
    if (nextUpdate == 0) {
      investingSF.pushUpdate();
      nextUpdate = 60 * 10;

      let prices = investingSF.getStockPrices();

      Object.values(clients).forEach((socket) => {
        socket.emit("stockPrices", prices);

        socket.emit("updated");

        auth = investingSF.getUserFromAuth(socket.authPayload);

        socket.emit("stats", {
          cash: auth.cash,
          cashStocks: auth.lastShareCash,
          stocks: auth.stocks,
          manipulating: auth.manipulating,
        });
      });
    }

    nextUpdate--;

    Object.values(clients).forEach((c) => {
      c.emit("nextUpdateTimer", nextUpdate);
    });
  }, 1_000),
  clients = {};

const limiter = require(`express-rate-limit`)({
  windowMs: 1 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => {
    return req.clientIp;
  },
});

router.use(require(`request-ip`).mw());
router.use(limiter);

function updateSongs(s, apiKey, io) {
  songs = s;
  investingSF.setSongs(s);

  if (started) return;
  started = true;

  io.on("connection", ioConnection);
}

function ioConnection(socket) {
  let auth, authPayload;

  socket.connected = true;

  function updateStats() {
    auth = investingSF.getUserFromAuth(authPayload);

    socket.authPayload = authPayload;

    if (!socket.connected) return;
    socket.emit("stats", {
      cash: auth.cash,
      cashStocks: auth.lastShareCash,
      stocks: auth.stocks,
      manipulating: auth.manipulating,
    });
  }

  function loggedIn() {
    if (clients[authPayload.id]) {
      clients[authPayload.id].emit("doubleUp", true);
      clients[authPayload.id].disconnect();
    }

    clients[authPayload.id] = socket;

    updateStats();

    socket.emit("baseStocks", [
      {
        url: "/",
        title: "TETO STOCK EXCHANGE $TSX",
        id: "GDP",
      },
      ...songs.map((s) => {
        return {
          url: s.url,
          title: s.title,
          id: s.id,
        };
      }),
    ]);

    socket.emit("stockPrices", investingSF.getStockPrices());
  }

  socket.on("auth", (cookie) => {
    if (auth) return;
    auth = "haha";

    jose
      .jwtVerify(cookie, publicKey)
      .then(async (r) => {
        if (!r.payload || !r.payload?.cb?.startsWith(process.env.URL)) {
          socket.disconnect();
          return;
        }

        authPayload = r.payload;
        auth = investingSF.getUserFromAuth(r.payload);

        // base stocks
        loggedIn();
      })
      .catch((e) => {
        console.log(e);
        socket.disconnect();
      });
  });

  socket.on("buyStock", (id) => {
    if (!auth) return;
    investingSF.buyStock(authPayload.id, id);
    updateStats();
  });

  socket.on("sellStock", (id) => {
    if (!auth) return;
    investingSF.sellStock(authPayload.id, id);
    updateStats();
  });

  socket.on("resetUser", (data) => {
    if (!auth) return;
    if (authPayload.id != "dsc.626618189450838027") return;
    investingSF.resetUser(data);
  });

  socket.on("getDBUsers", (data) => {
    if (!auth) return;
    if (authPayload.id != "dsc.626618189450838027") return;
    socket.emit("DBUsers", investingSF.getUsers());
  });

  let gambling = false;

  socket.on("gamble", (spend) => {
    if (!auth) return;
    if (isNaN(spend) || spend < 1) return;
    if (gambling) return;

    spend = Math.round(spend);

    const stats = (auth = investingSF.getUserFromAuth(authPayload));

    if (stats.spendingMoney - spend < 0) return;

    gambling = true;

    let slot = slotFunction();

    socket.emit("gambling", {
      ...slot,
      payout: slot.payout * spend,
    });

    investingSF.setCash(auth.id, stats.cash - spend);
    updateStats();

    setTimeout(() => {
      gambling = false;

      if (slot.payout == 0) {
        fetch(process.env.DISCORD_WEBHOOK, {
          method: "POST",
          headers: {
            "Content-type": "application/json",
          },
          body: JSON.stringify({
            content: stats.name + ` just lost $${spend} whilst gambling`
          }),
        });
      } else {
        fetch(process.env.DISCORD_WEBHOOK, {
          method: "POST",
          headers: {
            "Content-type": "application/json",
          },
          body: JSON.stringify({
            content: stats.name + ` just made $${(slot.payout * spend) - spend} whilst gambling`
          }),
        });
      }

      investingSF.setCash(auth.id, stats.cash + slot.payout * spend);
      updateStats();
    }, 800);
  });

  socket.on("beer", () => {
    if (!auth) return;

    const stats = (auth = investingSF.getUserFromAuth(authPayload));

    if (stats.spendingMoney - 100 < 0) return;

    investingSF.addBeer(auth.id);
    investingSF.setCash(auth.id, stats.cash - 100);
    updateStats();
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnect");
    socket.connected = false;
  });
}

router.use(require(`cookie-parser`)());

router.get("/wawaworld", (req, res) => {
  res.cookie("TETO_AUTH_DO_NOT_SHARE", req.query.jwt);
  res.redirect("/invest");
});

router.use(`/rollDouble`, (req, res, next) => {
  req.rollDouble = true;
  next();
});

router.use(async (req, res, next) => {
  if (req.cookies["TETO_AUTH_DO_NOT_SHARE"]) {
    jose
      .jwtVerify(req.cookies["TETO_AUTH_DO_NOT_SHARE"], publicKey)
      .then(async (r) => {
        if (!r.payload || !r.payload?.cb?.startsWith(process.env.URL)) {
          next();
          return;
        }

        if (
          req.cookies["TETO_TEST"] == "abcdef" &&
          process.env.URL.includes("localhost:4001")
        ) {
          r.payload.id = "dsc.626618189450838028";
        }

        req.auth = r.payload;
        req.user = investingSF.getUserFromAuth(req.auth);

        if (req.user.inJail) {
          if (req.rollDouble) {
            res.send(investingSF.rollDouble(req.auth.id));
            return;
          }

          res.render(`inJail`);
          return;
        }

        next();
      })
      .catch(() => {
        next();
      });
  } else next();
});

router.get("/", (req, res) => {
  if (!req.user) {
    res.render("investLogin.ejs", {
      URL: process.env.URL + "invest/wawaworld",
    });
    return;
  }

  res.render("investHome.ejs", {
    username: req.user.name,
  });
});

router.get("/leaderboard", (req, res) => {
  if (!req.user) {
    res.render("investLogin.ejs", {
      URL: process.env.URL + "invest/wawaworld",
    });
    return;
  }

  res.render("investLeaderboard.ejs", {
    leaderboard: investingSF.getLBData(),
    formatMoney: (num) => {
      return num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
    username: req.user.name,
    id: req.user.id,
  });
});

router.get("/stocksAndNames", (req, res) => {
  res.json(investingSF.getStocksAndNames());
});

router.get("/how", (req, res) => {
  res.render(`investingHow`);
});

router.post("/changeUsername/:username", (req, res) => {
  if (!req.user) {
    res.status(403).send("Not logged in loser");
    return;
  }

  const changeTo = decodeURIComponent(req.params.username);
  investingSF.changeUsername(req.user.id, changeTo); // length validation in there

  res.send("");
});

router.get("/getStats", (req, res) => {
  if (!req.user) {
    res.status(403).send("Not logged in loser");
    return;
  }

  res.send(investingSF.getUserFromAuth(req.user));
});

router.get("/canProtest", (req, res) => {
  if (!req.user) {
    res.status(403).send("Not logged in loser");
    return;
  }

  stats = investingSF.getUserFromAuth(req.user);
  if (
    stats.spendingMoney < 100 ||
    Date.now() - (stats.lastProtest || 0) < 1000 * 60 * 60 * 12
  ) {
    res.status(400).send(`nah`);
    return;
  }

  res.status(200).send(`ok`);
});

router.post("/protest/:id", (req, res) => {
  if (!req.user) {
    res.status(403).send("Not logged in loser");
    return;
  }

  let song = songs.find((s) => s.id == req.params.id);
  if (!song) {
    res.status(400).send(`what`);
    return;
  }

  stats = investingSF.getUserFromAuth(req.user);
  if (
    stats.spendingMoney < 100 ||
    Date.now() - (stats.lastProtest || 0) < 1000 * 60 * 60 * 12
  ) {
    res.status(400).send(`nah`);
  }

  investingSF.protestStock(req.user.id, req.params.id);

  res.status(200).send(`ok`);
});

router.post("/manipulateStock/:id/:amount", (req, res) => {
  if (!req.user) {
    res.status(403).send("Not logged in loser");
    return;
  }

  let song = songs.find((s) => s.id == req.params.id);
  if (!song) {
    res.status(400).send(`what`);
    return;
  }

  const am = Math.round(Number(req.params.amount) / 10) * 10;
  if (isNaN(am) || am < 30) {
    res.status(400).send(`what are you tryna do`);
    return;
  }

  stats = investingSF.getUserFromAuth(req.user);
  if (stats.spendingMoney < am) {
    res.status(400).send(`nah`);
    return; // fixed.
  }

  investingSF.manipulateStock(req.user.id, req.params.id, am);

  res.status(200).send(`ok`);
});

router.post("/cancelManipulation/:id", (req, res) => {
  if (!req.user) {
    res.status(403).send("Not logged in loser");
    return;
  }

  let song = songs.find((s) => s.id == req.params.id);
  if (!song) {
    res.status(400).send(`what`);
    return;
  }

  console.log(investingSF.cancelManipulateStock(req.user.id, req.params.id));

  res.status(200).send(`ok`);
});

router.post(`/sendMoneyTo/:user/:amount`, (req, res) => {
  if (!req.user) {
    res.status(403).send("Not logged in loser");
    return;
  }

  const am = Math.round(Number(req.params.amount));
  if (isNaN(am)) {
    res.status(400).send(`what are you tryna do`);
    return;
  }

  stats = investingSF.getUserFromAuth(req.user);
  if (stats.spendingMoney < am) {
    res.status(400).send(`nah`);
    return;
  }

  if (req.user.id == req.params.user) {
    res.status(400).send(`LMAOOOOOOOOO`);
    return;
  }

  investingSF.sendMoney(req.user.id, req.params.user, am);

  res.status(200).send(`ok`);
});

router.post(`/accuse/:user/:stock`, (req, res) => {
  if (!req.user) {
    res.status(403).send("Not logged in loser");
    return;
  }

  res.send(investingSF.accuse(req.user.id, req.params.user, req.params.stock));
});

module.exports = {
  updateSongs,
  router,
};
