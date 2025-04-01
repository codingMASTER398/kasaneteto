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

const socket = io();
const investmentsHolder = document.querySelector(`.investmentsHolder`);

let idToElem = {},
  idToCanvas = {};

socket.on("baseStocks", (s) => {
  investmentsHolder.innerHTML = ``;

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
    chart.style = "width: 200px;height: 70px";

    let myChart = echarts.init(chart, "dark");

    let option = {
      backgroundColor: "transparent",
      xAxis: { show: false, type: "category" },
      yAxis: { show: false, scale: true },
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line" },
        formatter: (params) => "$" + params[0].value, // Shows dollar amount
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
      dataZoom: [
        {
          type: "inside", // Enables zooming with the mouse wheel or dragging inside the chart
          xAxisIndex: [0],
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

    //

    priceWrapper.append(priceText);

    element.append(title);
    element.append(chart);
    element.append(priceWrapper);

    investmentsHolder.appendChild(element);
  });
});

let initialStockPricesDone = false;

socket.on("stockPrices", (stocks) => {
  Object.keys(stocks).forEach(async (id) => {
    if (!idToCanvas[id]) return;

    stocks[id].price = stocks[id][stocks[id].length - 1];

    if (initialStockPricesDone) {
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

    if (stocks[id].price != 0) {
      idToElem[id].style.display = "block";
    } else {
      idToElem[id].style.display = "none";
      return;
    }

    if(isElementOnScreen(idToElem[id]) && initialStockPricesDone) {
      let s = new Audio("/sound/pop.ogg")
      s.volume = 0.1;
      s.playbackRate = (Math.random() * 0.2) + 0.9
      s.play()
    }

    idToCanvas[id].setOption({
      series: [{ data: stocks[id] }],
      animation: false,
    });

    idToElem[id].querySelector(`.price`).innerText = "$" + stocks[id].price;

    if (stocks[id][0] >= stocks[id].price) {
      idToElem[id].querySelector(`.price`).classList.add(`down`);
    } else {
      idToElem[id].querySelector(`.price`).classList.remove(`down`);
    }
  });

  sortStocks(stocks);

  initialStockPricesDone = true;
});

function sortStocks(stocks) {
  let OKS = Object.keys(stocks);

  let map = OKS.map((key) => {
    return {
      key,
      value: stocks[key],
    };
  });

  const items = Array.from(investmentsHolder.children);

  items.sort(
    (a, b) =>
      map[OKS.indexOf(b.getAttribute("id"))].value.price -
      map[OKS.indexOf(a.getAttribute("id"))].value.price
  );

  // Append sorted elements back into the container in the new order
  items.forEach((item) => investmentsHolder.appendChild(item));
}
