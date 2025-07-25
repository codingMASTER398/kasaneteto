const socket = io();
const investmentsHolder = document.querySelector(`.investmentsHolder.stocks`);

let idToElem = {},
  idToCanvas = {},
  initialStockPricesDone = false,
  money = 0,
  cashMoney = 0,
  stocks = {},
  ownedStocks = {},
  manipulatingStocks = {},
  lastStockPricesData,
  spendingMoney = 0;

const filters = {
  owned: document.querySelector(`.filters .owned`),
  onlyUp: document.querySelector(`.filters .onlyUp`),
  buyMult: document.querySelector(`.filters .buyMult`),
  sellMult: document.querySelector(`.filters .sellMult`),
  graphRange: document.querySelector(`.filters #graphRange`),
};

Object.values(filters).forEach((v) => {
  v.addEventListener("change", () => {
    filters.buyMult.value = Math.max(1, Math.round(filters.buyMult.value));
    filters.sellMult.value = Math.max(1, Math.round(filters.sellMult.value));

    if (!stocks) return;

    if (v.tagName == "SELECT") {
      updateStockPrices(lastStockPricesData);
    } else {
      sortStocks(stocks);
      stocks?.forEach?.((s) => {
        updateBuySell(s.i);
      });
    }
  });
});

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

  money = stats.cash + stats.cashStocks;
  cashMoney = stats.cash;
  ownedStocks = stats.stocks;
  manipulatingStocks = stats.manipulating || {};
 
  let maxSpendAmount = money - 500;
  spendingMoney = Math.max(0, Math.min(maxSpendAmount, cashMoney));

  document.querySelector(`#money`).innerHTML = `$${formatMoney(
    money
  )}<p>$${formatMoney(stats.cashStocks)} in stocks, $${formatMoney(
    cashMoney
  )} in cash</p><p>$${formatMoney(spendingMoney)} in spending money</p>`;

  stocks?.forEach?.((s) => {
    updateBuySell(s.i);
  });

  window.updateInvestSlot();
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
      rgba(96, 50, 52, 0.4), 
      rgba(96, 50, 52, 0.4)
    ), url("/imgcompress/songThumbnails/${inv.id == "GDP" ? "../GDP" : inv.id}.avif")`;

    element.style.display = "none";

    const title = document.createElement(`h6`);
    title.innerText =
      inv.title.slice(0, 50) + (inv.title.length > 50 ? "..." : "");

    // chart
    const chart = document.createElement(`div`);
    chart.id = "chart" + inv.id;
    chart.classList.add("chart");
    chart.style = "width: 250px;height: 60px"; // im working on kasane investo

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
          areaStyle: {
            color: "#cc495e", // You can also use a gradient here
            opacity: 0.9, // Adjust opacity as needed
          },
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

    const manipulateButton = document.createElement("button");
    manipulateButton.innerText = "⋮";
    manipulateButton.classList.add("manipulateButton");

    tippy(manipulateButton, {
      content: `
      <p>ID: ${inv.id}</p>
      <!--<a onclick="protestStock('${inv.id}')">Protest stock</a><br>-->
      <a onclick="manipulateStock('${inv.id}')">Manipulate stock</a><br>
      <a onclick="cancelManipulateStock('${inv.id}')">Cancel manipulation</a>`,
      allowHTML: true,
      interactive: true,
      trigger: 'click',
      placement: 'top-start',
      theme: 'light',
    });

    buyButton.addEventListener("click", (e) => {
      let buyMult = Math.ceil(filters.buyMult.value || 1);

      socket.emit("buyStock", {
        id: inv.id,
        mult: buyMult,
      });
      explosionClick(e, true);
    });
    sellButton.addEventListener("click", (e) => {
      let sellMult = Math.ceil(filters.sellMult.value || 1);

      socket.emit("sellStock", {
        id: inv.id,
        mult: sellMult,
      });
      explosionClick(e);
    });

    // bought indicator
    const boughtIndicator = document.createElement(`span`);
    boughtIndicator.innerText = "0";
    boughtIndicator.classList.add(`boughtIndicator`);
    boughtIndicator.setAttribute("hidden", "true");

    const manipulatingIndicator = document.createElement(`span`);
    manipulatingIndicator.innerText = "0";
    manipulatingIndicator.classList.add(`manipulatingIndicator`);
    manipulatingIndicator.setAttribute("hidden", "true");

    //

    buttonWrapper.append(buyButton);
    buttonWrapper.append(sellButton);
    buttonWrapper.append(manipulateButton)

    priceWrapper.append(priceText);
    priceWrapper.appendChild(buttonWrapper);

    element.append(title);
    element.append(chart);
    element.append(priceWrapper);
    element.appendChild(boughtIndicator);
    element.appendChild(manipulatingIndicator);

    investmentsHolder.appendChild(element);
  });
});

function updateStockPrices(_stocks) {
  stocks = _stocks.dayCache;
  lastStockPricesData = _stocks;

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

    idToCanvas[id].setOption({
      series: [
        {
          data: [
            _stocks.dayCache[i].d,
            _stocks.monthCache[i].d,
            _stocks.everCache[i].d,
          ][
            {
              day: 0,
              month: 1,
              ever: 2,
            }[document.querySelector(`#graphRange`).value]
          ],
          lineStyle:
            stock.d[0][1] >= stock.price
              ? { color: "#cc495e", width: 2 }
              : { color: "#a6da95", width: 2 },
          areaStyle: {
            color: stock.d[0][1] >= stock.price ? "#cc495e" : "#a6da95", // You can also use a gradient here
            opacity: 0.9, // Adjust opacity as needed
          },
        },
      ],
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
}

socket.on("stockPrices", updateStockPrices);

/* funny utils */
function sortStocks(stocks) {
  const items = Array.from(investmentsHolder.children);

  items.sort(
    (a, b) =>
      (stocks.find((s) => s.i == b.getAttribute("id"))?.price || 0) -
      (stocks.find((s) => s.i == a.getAttribute("id"))?.price || 0)
  );

  // Append sorted elements back into the container in the new order
  items.forEach((item) => {
    const id = item.getAttribute("id");
    const correspondingStock = stocks.find((s) => s.i == id);

    let hideOverride = false;

    if (!correspondingStock || correspondingStock.price == 0) {
      hideOverride = true;
    } else if (filters.owned.checked && !ownedStocks[id]) {
      hideOverride = true;
    } else if (
      filters.onlyUp.checked &&
      correspondingStock.price < correspondingStock.d[0][1]
    ) {
      hideOverride = true;
    }

    if (hideOverride) {
      item.style.display = "none";
    } else {
      item.style.display = "block";
    }

    investmentsHolder.appendChild(item);
  });

  // Update other stuff too
  window.updateInvestSlot();
}

function updateBuySell(id) {
  // yes chatgpt cleaned this up for me
  const element = idToElem[id];
  if (!element) return;

  const stock = stocks.find((s) => s.i == id);
  const buyButton = element.querySelector(".buyButton");
  const sellButton = element.querySelector(".sellButton");
  const boughtIndicator = element.querySelector(".boughtIndicator");
  const manipulatingIndicator = element.querySelector(".manipulatingIndicator");

  let buyMult = Math.ceil(filters.buyMult.value || 1),
    sellMult = Math.ceil(filters.sellMult.value || 1);

  buyButton.innerText = `BUY${buyMult <= 1 ? "" : " " + buyMult + "x"}`;
  sellButton.innerText = `SELL${sellMult <= 1 ? "" : " " + sellMult + "x"}`;

  buyButton.toggleAttribute("hidden", stock.price <= 0.1);
  buyButton.toggleAttribute("disabled", cashMoney <= stock.price * buyMult);
  sellButton.toggleAttribute("disabled", (ownedStocks[id] || 0) < sellMult);
  boughtIndicator.toggleAttribute("hidden", !ownedStocks[id]);
  manipulatingIndicator.toggleAttribute("hidden", manipulatingStocks[id] <= 0 || !manipulatingStocks[id])

  if (ownedStocks[id]) {
    const newIndicatorText = ownedStocks[id];
    if (boughtIndicator.innerText !== String(newIndicatorText)) {
      boughtIndicator.classList.remove("bounce");
      boughtIndicator.offsetWidth;
      boughtIndicator.classList.add("bounce");
      boughtIndicator.innerText = newIndicatorText;
    }
  }

  if (manipulatingStocks[id] && manipulatingStocks[id] > 0) {
    manipulatingIndicator.innerText = `$${manipulatingStocks[id] * 10} 😈`;
  }
}
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes)}:${String(secs).padStart(2, "0")}`;
}

function explosionClick(event, buy) {
  const boom = document.createElement("img");
  boom.src = buy ? `/imgcompress/confetti.avif` : `/imgcompress/explosion.avif`;
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
