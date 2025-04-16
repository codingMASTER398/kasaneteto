function protestStock(id) {
  return;
  Swal.showLoading();

  fetch(`/invest/canProtest`).then(async (r) => {
    if (r.status == 200) {
      const response = await Swal.fire({
        title: "Protest stock?",
        text: "Protesting a stock costs $100 in spending cash, and can be done once every 12 hours. It will reduce the stock's price by 5% in the next refresh.",
        icon: "question",
        showCancelButton: true,
        focusConfirm: false,
      });

      if (!response.isConfirmed) return;

      new Audio(`/sound/mob.wav`).play();

      fetch(`/invest/protest/${id}`, {
        method: "POST",
      });
    } else {
      Swal.fire({
        title: "Cannot protest",
        text: "You've already protested in the last 12 hours, or you don't have $100 in spending money.",
        icon: "error",
      });
    }
  });
}

function manipulateStock(id) {
  Swal.fire({
    title: "Ok so you're committing a crime",
    text: "You little crime doer. Ok, so, market manipulation is an investment that makes your stocks go up more, costing $10 every refresh (10 minutes). It increases (added) profits by 100% each time, and makes the stock ALWAYS go up. If someone catches you, you'll go to jail. How much do you want to invest in it? also minimum of $30",
    input: "number",
    inputAttributes: {
      autocapitalize: "off",
    },
    showCancelButton: true,
    confirmButtonText: "MANIPULATE",
  }).then(async (result) => {
    if (!result.isConfirmed || Number(result.value) < 30) {
      Swal.fire({
        icon: "error",
        title: "coward",
      });
      return;
    }

    const invest = Math.round(Number(result.value) / 10) * 10;

    if (invest > spendingMoney) {
      Swal.fire({
        icon: "error",
        title: `ok sure but you don't have $${invest} do you`,
      });
      return;
    }

    const result2 = await Swal.fire({
      icon: "question",
      title: "Ok so I want to make SURE you want to commit a crime.",
      text: `Remember, it'll stay visible on your screen, the investment, the whole time. You can cancel it, but that'll take like half an hour. If someone catches you, you go to jail. You're putting $${invest} of your cash into this. Are you sure? You little crime man.`,
      showCancelButton: true,
    });

    if (!result2.isConfirmed) {
      Swal.fire({
        icon: "error",
        title: "chicken",
      });
      return;
    }

    Swal.showLoading();

    fetch(`/invest/manipulateStock/${id}/${invest}`, {
      method: "POST",
    }).then(async (r) => {
      if (r.status != 200) {
        Swal.fire({
          icon: "error",
          title:
            "error lol what're you gonna do about it NOTHING. that's what.",
        });
        return;
      }

      await Swal.fire({
        icon: "success",
        title:
          "You've singlehandedly destroyed the environment. I hope you're fucking happy.",
      });
      window.location.reload();
    });
  });
}

async function cancelManipulateStock(id) {
  if (!manipulatingStocks[id]) {
    Swal.fire({
      icon: "error",
      title: "bro is trying to save the day when there's nothing to fix?",
    });
    return;
  }

  if (manipulatingStocks[id] <= 3) {
    Swal.fire({
      icon: "error",
      title: "it's already gonna expire in 30 minutes just calm down bro",
    });
    return;
  }

  const yes = await Swal.fire({
    icon: "question",
    title: "so you wanna turn good??",
    text: `Or did someone find you out. Tell you what, I can refund you $${(manipulatingStocks[id] - 3) * 10} and set your manipulation to only $30 left, so that's like half an hour. yeah?`,
    showCancelButton: true,
  });

  if(!yes.isConfirmed) {
    Swal.fire({
      icon: "error",
      title: "you're just evil, you know that, right?"
    })
    return;
  }

  Swal.fire({
    title: "ok"
  })

  fetch(`/invest/cancelManipulation/${id}`, {
    method: "POST"
  }).then(()=>{
    window.location.reload()
  })
}
