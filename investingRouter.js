const investingSF = require(`./util/investing/investing`);
const express = require("express");
const router = express.Router();

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

  function updateStats() {
    auth = investingSF.getUserFromAuth(authPayload);

    socket.authPayload = authPayload;

    socket.emit("stats", {
      cash: auth.cash,
      cashStocks: auth.lastShareCash,
      stocks: auth.stocks,
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

  socket.on("newUsername", (name) => {
    if (!auth) return;
    investingSF.changeUsername(authPayload.id, name);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnect");
  });
}

router.use(require(`cookie-parser`)());

router.get("/wawaworld", (req, res) => {
  res.cookie("TETO_AUTH_DO_NOT_SHARE", req.query.jwt);
  res.redirect("/invest");
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

        req.auth = r.payload;
        req.user = investingSF.getUserFromAuth(req.auth);

        console.log(req.user);

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
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      });
    },
  });
});

module.exports = {
  updateSongs,
  router,
};
