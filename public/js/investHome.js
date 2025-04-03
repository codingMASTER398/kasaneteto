const socket = io();
const investmentsHolder = document.querySelector(`.investmentsHolder`);

let idToElem = {},
  idToCanvas = {},
  initialStockPricesDone = false,
  money = 0,
  cashMoney = 0,
  stocks = {},
  ownedStocks = {};

function formatDate(date) {
  const now = new Date();
  const inputDate = new Date(date);
  const isToday = now.toDateString() === inputDate.toDateString();

  if (isToday) {
    return inputDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } else {
    return inputDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
  }
}

function formatMoney(num) {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

socket.on("connect", () => {
  socket.emit(
    "auth",
    document.cookie.split("TETO_AUTH_DO_NOT_SHARE=")[1].split(";")[0]
  );
});

socket.on("disconnect", (e) => {
  if (window.didDoubleUp) return;
  alert(`Disconnected, ${e}`);
  window.location.reload();
});

socket.on("stats", (stats) => {
  document.querySelector(`#money`).classList.remove("bounce");
  document.querySelector(`#money`).offsetWidth;
  document.querySelector(`#money`).classList.add("bounce");

  document.querySelector(`#money`).innerHTML = `$${formatMoney(
    stats.cash + stats.cashStocks
  )}<p>$${formatMoney(stats.cashStocks)} in stocks, $${formatMoney(
    stats.cash
  )} in cash</p>`;

  money = stats.cash + stats.cashStocks;
  cashMoney = stats.cash;
  ownedStocks = stats.stocks;

  stocks?.forEach?.((s) => {
    updateBuySell(s.i);
  });
});

socket.on("doubleUp", () => {
  window.didDoubleUp = true;

  document.body.innerHTML = `<h1>Same account opened in a different tab. Please close the other tab & refresh to resume on this one, or close this one.`;
});

socket.on("nextUpdateTimer", (s) => {
  document.querySelector(`#nextUpdate`).classList.remove("bounce");
  document.querySelector(`#nextUpdate`).offsetWidth;
  document.querySelector(`#nextUpdate`).classList.add("bounce");

  document.querySelector(`#nextUpdate`).innerHTML = `${formatTime(
    s
  )} <p>until next stock update</p>`;
});

socket.on("updated", () => {
  new Audio("/sound/tada.mp3").play();
});

socket.on("baseStocks", (s) => {
  investmentsHolder.innerHTML = `<h1>LOADING...</h1>`;

  s.forEach((inv) => {
    const element = document.createElement(`div`);
    element.classList.add("stock");

    element.setAttribute("id", inv.id);

    idToElem[inv.id] = element;

    element.style.background = `linear-gradient(
      rgba(96, 50, 52, 0.8), 
      rgba(96, 50, 52, 0.8)
    ), url("/img/songThumbnails/${inv.id == "GDP" ? "../GDP" : inv.id}.jpg")`;

    element.style.display = "none";

    const title = document.createElement(`h6`);
    title.innerText =
      inv.title.slice(0, 50) + (inv.title.length > 50 ? "..." : "");

    // chart
    const chart = document.createElement(`div`);
    chart.id = "chart" + inv.id;
    chart.classList.add("chart");
    chart.style = "width: 200px;height: 60px";

    let myChart = echarts.init(chart, "dark");

    let option = {
      backgroundColor: "transparent",
      xAxis: {
        type: "time", // Treat timestamps as time
        show: false, // Hide the axis if not needed
      },
      yAxis: {
        show: false,
        scale: true,
      },
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line" },
        formatter: (params) => {
          var time = new Date(params[0].data[0]); // Convert timestamp
          var value = Number(params[0].data[1]).toFixed(4);
          return `${formatDate(time)}<br>$${value}`; // Format tooltip
        },
      },
      series: [
        {
          type: "line",
          data: [], // Money values
          smooth: true,
          lineStyle: { color: "#cc495e", width: 2 },
          symbol: "none",
        },
      ],
      animation: false,
    };

    myChart.setOption(option);

    idToCanvas[inv.id] = myChart;
    //
    // price wrapper
    const priceWrapper = document.createElement(`div`);
    priceWrapper.classList.add(`priceWrapper`);

    // price
    const priceText = document.createElement("p");
    priceText.innerText = "$loading...";
    priceText.classList.add("price");

    // buttons
    const buttonWrapper = document.createElement(`div`);
    buttonWrapper.classList.add("buttonWrapper");

    const buyButton = document.createElement("button");
    buyButton.innerText = "BUY";
    buyButton.classList.add("buyButton");

    const sellButton = document.createElement("button");
    sellButton.innerText = "SELL";
    sellButton.classList.add("sellButton");

    buyButton.addEventListener("click", (e) => {
      socket.emit("buyStock", inv.id);
      explosionClick(e, true);
    });
    sellButton.addEventListener("click", (e) => {
      socket.emit("sellStock", inv.id);
      explosionClick(e);
    });

    // bought indicator
    const boughtIndicator = document.createElement(`span`);
    boughtIndicator.innerText = "0";
    boughtIndicator.classList.add(`boughtIndicator`);
    boughtIndicator.setAttribute("hidden", "true");

    //

    buttonWrapper.append(buyButton);
    buttonWrapper.append(sellButton);

    priceWrapper.append(priceText);
    priceWrapper.appendChild(buttonWrapper);

    element.append(title);
    element.append(chart);
    element.append(priceWrapper);
    element.appendChild(boughtIndicator);

    investmentsHolder.appendChild(element);
  });
});

socket.on("stockPrices", (_stocks) => {
  stocks = _stocks.dayCache;

  stocks.forEach(async (stock, i) => {
    id = stock.i;
    if (!idToCanvas[id]) return;

    stocks[i].price = stock.d[stock.d.length - 1][1];
    stock = stocks[i];

    /*if (initialStockPricesDone) {
      idToElem[id].classList.remove("bounceRed");
      idToElem[id].classList.remove("bounceGreen");

      await sleep(Math.floor(Math.random() * 15_000));

      if (
        stocks[id][stocks[id].length - 1] > stocks[id][stocks[id].length - 2]
      ) {
        idToElem[id].classList.add("bounceGreen");
      } else {
        idToElem[id].classList.add("bounceRed");
      }
    }
    if (isElementOnScreen(idToElem[id]) && initialStockPricesDone) {
      let s = new Audio("/sound/pop.ogg");
      s.volume = 0.1;
      s.playbackRate = Math.random() * 0.2 + 0.9;
      s.play();
    }  
    */

    if (stock.price != 0) {
      idToElem[id].style.display = "block";
    } else {
      idToElem[id].style.display = "none";
      return;
    }

    idToCanvas[id].setOption({
      series: [{ data: stock.d }],
      animation: false,
    });

    idToElem[id].querySelector(`.price`).innerText =
      "$" + formatMoney(Number(stock.price));

    if (stock.d[0][1] >= stock.price) {
      idToElem[id].querySelector(`.price`).classList.add(`down`);
    } else {
      idToElem[id].querySelector(`.price`).classList.remove(`down`);
    }

    updateBuySell(id);
  });

  investmentsHolder.querySelector(`h1`).remove();

  sortStocks(stocks);

  initialStockPricesDone = true;
});

/* funny utils */
function sortStocks(stocks) {
  const items = Array.from(investmentsHolder.children);

  items.sort(
    (a, b) =>
      (stocks.find((s)=>s.i == b.getAttribute("id"))?.price || 0) -
      (stocks.find((s)=>s.i == a.getAttribute("id"))?.price || 0)
  );

  // Append sorted elements back into the container in the new order
  items.forEach((item) => investmentsHolder.appendChild(item));
}

function updateBuySell(id) {
  // yes chatgpt cleaned this up for me
  const element = idToElem[id];
  if (!element) return;

  const stock = stocks.find((s)=>s.i == id);
  const buyButton = element.querySelector(".buyButton");
  const sellButton = element.querySelector(".sellButton");
  const boughtIndicator = element.querySelector(".boughtIndicator");

  buyButton.toggleAttribute("hidden", stock.price <= 0.1);
  buyButton.toggleAttribute("disabled", cashMoney <= stock.price);
  sellButton.toggleAttribute("disabled", !ownedStocks[id]);
  boughtIndicator.toggleAttribute("hidden", !ownedStocks[id]);

  if (ownedStocks[id]) {
    const newIndicatorText = ownedStocks[id];
    if (boughtIndicator.innerText !== String(newIndicatorText)) {
      boughtIndicator.classList.remove("bounce");
      boughtIndicator.offsetWidth;
      boughtIndicator.classList.add("bounce");
      boughtIndicator.innerText = newIndicatorText;
    }
  }
}
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes)}:${String(secs).padStart(2, "0")}`;
}

function explosionClick(event, buy) {
  const boom = document.createElement("img");
  boom.src = buy
    ? `/img/confetti.png`
    : `/img/explosion.png`;
  boom.classList.add("boom");
  boom.style.left =
    event.pageX - (buy ? 200 : 100) + (Math.random() * 60 - 30) + "px";
  boom.style.top =
    event.pageY - (buy ? 200 : 100) + (Math.random() * 60 - 30) + "px";

  document.body.appendChild(boom);

  // Remove the element after it plays once
  boom.onload = () => {
    setTimeout(() => {
      boom.remove();
    }, 700);
  };

  if (buy) {
    new Audio("/sound/yippee.mp3").play();
  } else {
    new Audio("/sound/explosion.ogg").play();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isElementOnScreen(element) {
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;

  return (
    rect.top >= -100 &&
    rect.left >= -100 &&
    rect.bottom <= windowHeight + 100 &&
    rect.right <= windowWidth + 100
  );
}
