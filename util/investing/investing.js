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

  return db.users[auth.id];
}

function changeUsername(userID, name) {
  if(name.length < 3 || name.length > 50) return;
  if (!db.users[userID]) return;
  db.users[userID].name = name
}

function buyStock(userID, data) {
  if(typeof data == "string") {
    data = {
      mult: 1,
      id: data
    }
  }
  if (!db.users[userID] || !latestStockPrices[data.id]) return;
  if(data.mult < 1) return;
  data.mult = Math.ceil(data.mult) || 1

  if (db.users[userID].cash - (latestStockPrices[data.id] * data.mult) < 0) {
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
  if(typeof data == "string") {
    data = {
      mult: 1,
      id: data
    }
  }
  if (!db.users[userID] || !latestStockPrices[data.id]) return;
  if(data.mult < 1) return;
  data.mult = Math.ceil(data.mult) || 1

  if (((db.users[userID].stocks[data.id] || 0) - data.mult) <= -1) {
    console.log("Insufficient stock");
    return;
  }

  db.users[userID].cash += latestStockPrices[data.id] * data.mult;
  db.users[userID].stocks[data.id] -= data.mult;
  return;
}

function resetUser(data) {
  if(!data.userID || !data.cashSet) {
    return;
  }

  if (!db.users[data.userID]) return;

  db.users[data.userID].stocks = {}
  db.users[data.userID].cash = data.cashSet

  getUserFromAuth({ id: data.userID });
}

function getUsers(){
  return JSON.stringify(db.users)
}

// Cost data
let songIDs,
  stockPrices = {};

async function setSongs(songs) {
  songIDs = songs.map((s) => s.id);
}

async function prepUpdate() {
  await secretFormula.initNewPrices();
}
async function pushUpdate() {
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

    const newPrice = secretFormula.getNewPrice(db.rawData[id].currentPrice, id);

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
    dayCache, monthCache, everCache
  }
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
        };
      })
      .sort((a, b) => b.worth - a.worth);
  },
  changeUsername,
  resetUser,
  getUsers
};
