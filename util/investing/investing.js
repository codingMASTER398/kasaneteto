// Setup DB
const fs = require(`fs`);
const workingDir = __dirname.replace("util/investing", "");
const secretFormula = require(`./secretFormula`);
let db,
  latestStockPrices = {},
  dayCache,
  monthCache,
  everCache;

try {
  db = require(workingDir + `/db/invest.json`);
} catch {
  db = require(workingDir + `/dbb/invest.json`);
}

setInterval(() => {
  fs.writeFile(
    workingDir + `/db/invest.json`,
    JSON.stringify(db),
    "utf-8",
    () => {
      console.log("Wrote one");
      fs.writeFile(
        workingDir + `/dbb/invest.json`,
        JSON.stringify(db),
        "utf-8",
        () => {}
      );
    }
  );
}, 30_000);

// DB users and shtuff

function getUserFromAuth(auth) {
  if (!db.users) {
    db.users = {};
  }

  if (!db.users[auth.id]) {
    db.users[auth.id] = {
      id: auth.id,
      name: auth.n,
      cash: 500,
      stocks: {},
    };
  }

  db.users[auth.id].lastShareCash = 0;
  Object.keys(db.users[auth.id].stocks).forEach((s) => {
    db.users[auth.id].lastShareCash +=
      (latestStockPrices[s] || 0) * db.users[auth.id].stocks[s];
  });

  db.users[auth.id].worth =
    db.users[auth.id].cash + (db.users[auth.id].lastShareCash || 0);

  let maxSpendAmount =
    db.users[auth.id].cash + db.users[auth.id].lastShareCash - 500;
  db.users[auth.id].spendingMoney = Math.max(
    0,
    Math.min(maxSpendAmount, db.users[auth.id].cash)
  );

  return db.users[auth.id];
}

function changeUsername(userID, name) {
  if (name.length < 3 || name.length > 50) return;
  if (!db.users[userID]) return;
  db.users[userID].name = name;
}

function setCash(userID, cash) {
  if (!db.users[userID]) return;
  db.users[userID].cash = cash;
}

function addBeer(userID) {
  if (!db.users[userID]) return;
  db.users[userID].beer ??= 0;
  db.users[userID].beer++;
}

function protestStock(userID, stock) {
  if (!db.users[userID] || !latestStockPrices[stock]) return;
  db.users[userID].lastProtest = Date.now();
  db.users[userID].cash -= 100;

  db.rawData[stock].protests ??= 0;
  db.rawData[stock].protests++;
}

function manipulateStock(userID, stock, amount) {
  if (!db.users[userID] || !latestStockPrices[stock]) return;
  db.users[userID].manipulating ??= {};
  db.users[userID].cash -= amount;

  db.users[userID].manipulating[stock] ??= 0;
  db.users[userID].manipulating[stock] += Math.round(amount / 10);
}

function cancelManipulateStock(userID, stock) {
  if (!db.users[userID] || !latestStockPrices[stock]) return 1;

  if (!db.users[userID].manipulating?.[stock]) return 2;
  if (db.users[userID].manipulating[stock] <= 3) return 3;

  db.users[userID].cash += (db.users[userID].manipulating[stock] - 3) * 10;
  db.users[userID].manipulating[stock] = 3;

  return 4;
}

function accuse(accuser, accused, accusedFor) {
  if (!db.users[accuser] || !db.users[accused] || accuser == accused || db.users[accused].inJail)
    return {
      success: false,
    };

  if (db.users[accuser].spendingMoney < 100) return { success: false };

  db.users[accuser].cash -= 100;

  let theyGotCaught = false;

  if (
    accusedFor == "laundering" &&
    Date.now() - (db.users[accused].lastCrimed || 0) < 30 * 60 * 1000
  )
    theyGotCaught = true;
  else if (
    accusedFor != "laundering" &&
    db.users[accused].manipulating?.[accusedFor]
  )
    theyGotCaught = true;

  if (!theyGotCaught) return { success: false };

  let given = db.users[accused].cash;

  db.users[accuser].cash += given;
  db.users[accused].cash = 0;
  db.users[accused].manipulating = {};
  db.users[accused].lastCaught = Date.now(); // Also invalidates pending money launderings
  db.users[accused].inJail = true;

  getUserFromAuth({ id: accused }); // update it on the leaderboard

  return {
    success: true,
    money: given,
  };
}

function sendMoney(A, B, amount) {
  console.log(A, B, amount);

  if (!db.users[A] || !db.users[B]) return 1;

  db.users[A].cash -= amount;
  db.users[A].lastCrimed = Date.now();

  setTimeout(() => {
    if ((db.users[A]?.lastCaught || 0) > db.users[A].lastCrimed) return;

    db.users[B].cash += amount;

    getUserFromAuth({ id: B });
  }, 30 * 60 * 1000);

  return;
}

function rollDouble(userID) {
  if (!db.users[userID] || !db.users[userID].inJail) return "what";

  if (Date.now() - db.users[userID].lastRoll < 10 * 60 * 1000)
    return {
      notYet: true,
    };

  db.users[userID].lastRoll = Date.now();

  const A = Math.floor(Math.random() * 6) + 1;
  const B = Math.floor(Math.random() * 6) + 1;

  if (A == B) {
    db.users[userID].inJail = false;
    return {
      success: true,
    };
  }

  return { A, B };
}

function buyStock(userID, data) {
  if (typeof data == "string") {
    data = {
      mult: 1,
      id: data,
    };
  }
  if (!db.users[userID] || !latestStockPrices[data.id]) return;
  if (data.mult < 1) return;
  data.mult = Math.ceil(data.mult) || 1;

  if (db.users[userID].cash - latestStockPrices[data.id] * data.mult < 0) {
    console.log("Insufficient cash");
    return;
  }

  if (latestStockPrices[data.id] <= 0.1) {
    console.log("Buying for this stock is disabled");
    return;
  }

  db.users[userID].cash -= latestStockPrices[data.id] * data.mult;
  db.users[userID].stocks[data.id] ??= 0;
  db.users[userID].stocks[data.id] += data.mult;
  return;
}

function sellStock(userID, data) {
  if (typeof data == "string") {
    data = {
      mult: 1,
      id: data,
    };
  }
  if (!db.users[userID] || !latestStockPrices[data.id]) return;
  if (data.mult < 1) return;
  data.mult = Math.ceil(data.mult) || 1;

  if ((db.users[userID].stocks[data.id] || 0) - data.mult <= -1) {
    console.log("Insufficient stock");
    return;
  }

  db.users[userID].cash += latestStockPrices[data.id] * data.mult;
  db.users[userID].stocks[data.id] -= data.mult;
  return;
}

function resetUser(data) {
  if (!data.userID || !data.cashSet) {
    return;
  }

  if (!db.users[data.userID]) return;

  db.users[data.userID].stocks = {};
  db.users[data.userID].cash = data.cashSet;

  getUserFromAuth({ id: data.userID });
}

function getUsers() {
  return JSON.stringify(db.users);
}

// Cost data
let songIDs,
  stockPrices = {},
  _songs;

async function setSongs(songs) {
  songIDs = songs.map((s) => s.id);
  _songs = songs;
}

async function prepUpdate() {
  await secretFormula.initNewPrices();
}
async function pushUpdate() {
  const OKDBUSERS = Object.keys(db.users);

  songIDs.forEach((id) => {
    if (!db.rawData[id]) {
      const IPOPrice = secretFormula.canIPO(id);
      if (IPOPrice === -1) return;

      let priceWithDate = [Date.now(), Number(IPOPrice.toFixed(4))];

      db.rawData[id] = {
        day: [priceWithDate],
        dayAgg: 1,
        month: [priceWithDate],
        monthAgg: 0,
        ever: [priceWithDate],
        currentPrice: IPOPrice,
        id,
      };

      latestStockPrices[id] = IPOPrice;
      return;
    }

    let newPrice = secretFormula.getNewPrice(db.rawData[id].currentPrice, id);

    if (db.rawData[id].protests > 0) {
      for (let i = 0; i < db.rawData[id].protests; i++) {
        newPrice *= 0.95; // DUN DUN DUN...
      }
    }

    db.rawData[id].protests = 0;

    for (let i = 0; i < OKDBUSERS.length; i++) {
      const user = db.users[OKDBUSERS[i]];

      if (user.manipulating?.[id] > 0) {
        // Multiple people can manipulate for max GAINS
        user.manipulating[id]--;

        if (newPrice > db.rawData[id].currentPrice)
          newPrice += (newPrice - db.rawData[id].currentPrice) * 0.5;
        else
          newPrice =
            db.rawData[id].currentPrice +
            (db.rawData[id].currentPrice - newPrice);
      }
    }

    db.rawData[id].currentPrice = newPrice;
    latestStockPrices[id] = newPrice;

    let priceWithDate = [Date.now(), Number(newPrice.toFixed(4))];
    db.rawData[id].day.push(priceWithDate);

    if (db.rawData[id].day.length > 144) {
      db.rawData[id].day.shift();
    }

    db.rawData[id].dayAgg++;
    if (db.rawData[id].dayAgg >= 144) {
      db.rawData[id].dayAgg = 0;
      db.rawData[id].month.push(priceWithDate);
    }

    db.rawData[id].monthAgg++;
    if (db.rawData[id].monthAgg >= 144 * 15) {
      db.rawData[id].monthAgg = 0;
      db.rawData[id].ever.push(priceWithDate);
    }
  });

  dayCache = null;
  monthCache = null;
  everCache = null;

  // update users
  Object.keys(db.users).forEach((u) => {
    getUserFromAuth({ id: u }); // updates their data somehow
  });
}

function getStockPrices(type) {
  dayCache ??= Object.values(db.rawData).map((stock) => {
    return {
      i: stock.id,
      d: stock.day,
    };
  });

  monthCache ??= Object.values(db.rawData).map((stock) => {
    return {
      i: stock.id,
      d: stock.month,
    };
  });

  everCache ??= Object.values(db.rawData).map((stock) => {
    return {
      i: stock.id,
      d: stock.ever,
    };
  });

  return {
    dayCache,
    monthCache,
    everCache,
  };
}

if (!db.rawData) db.rawData = {};
if (!db.users) db.users = {};

Object.values(db.rawData).forEach((stock) => {
  latestStockPrices[stock.id] = stock.currentPrice;
});

module.exports = {
  setSongs,
  getStockPrices,
  getUserFromAuth,
  sellStock,
  buyStock,
  prepUpdate,
  pushUpdate,
  getLBData: () => {
    return Object.values(db.users)
      .map((u) => {
        return {
          worth: u.worth,
          name: u.name,
          beer: u.beer,
          id: u.id,
          inJail: u.inJail
        };
      })
      .sort((a, b) => b.worth - a.worth);
  },
  changeUsername,
  resetUser,
  getUsers,
  setCash,
  addBeer,
  protestStock,
  manipulateStock,
  cancelManipulateStock,
  sendMoney,
  getStocksAndNames: () => {
    let out = {};

    Object.keys(db.rawData).forEach((d) => {
      let name = _songs.find((s) => s.id == d);
      if (!name) return;
      out[d] = name.title;
    });

    return out;
  },
  accuse,
  rollDouble,
};
