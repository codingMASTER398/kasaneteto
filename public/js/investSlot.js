const beerMachine = document.querySelector(`.stock.beer`);
const slotMachine = document.querySelector(`.stock.gambling`);
const slotElements = [...slotMachine.querySelectorAll(`.slot`)];
const symbols = ["🍒", "🍋", "🍇", "💰", "🔔", "🍀", "❌"];

let gambling = false;

window.updateInvestSlot = () => {
  slotMachine.querySelector(`.price`).innerText = `SP$${filters.buyMult.value}`;

  let can = spendingMoney - filters.buyMult.value >= 0;
  if (gambling) can = false;

  if (can) {
    slotMachine.querySelector(`.buyButton`).removeAttribute("disabled");
  } else {
    slotMachine.querySelector(`.buyButton`).setAttribute("disabled", "true");
  }

  // also beer
  can = spendingMoney - 100 >= 0;

  if (can) {
    beerMachine.querySelector(`.buyButton`).removeAttribute("disabled");
  } else {
    beerMachine.querySelector(`.buyButton`).setAttribute("disabled", "true");
  }
};

slotMachine.querySelector(`.buyButton`).addEventListener(`click`, () => {
  const value = filters.buyMult.value;
  socket.emit(`gamble`, value);
});

socket.on("gambling", (slot) => {
  gambling = true;
  window.updateInvestSlot();

  console.log(slot);

  new Audio(`/sound/onespinawayfromabigwin.ogg`).play();

  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      slotElements.forEach((s) => {
        s.innerText = symbols[Math.floor(Math.random() * symbols.length)];
        s.classList.remove("bounce");
        s.offsetWidth;
        s.classList.add("bounce");
      });
    }, i * 80);
  }

  setTimeout(() => {
    slotElements[0].innerText = slot.reel[0];
    slotElements[1].innerText = slot.reel[1];
    slotElements[2].innerText = slot.reel[2];

    slotElements.forEach((s) => {
      s.classList.remove("bounce");
      s.offsetWidth;
      s.classList.add("bounce");
    });

    gambling = false;
    window.updateInvestSlot();

    slotMachine.querySelector(`h6`).innerText = `Big win! Got $${slot.payout}`;

    setTimeout(window.updateInvestSlot, 1000);
  }, 800);
});

// also beer
beerMachine.addEventListener(`click`, () => {
  window.updateInvestSlot();
  new Audio(`/sound/beer.wav`).play();
  socket.emit(`beer`);
});
