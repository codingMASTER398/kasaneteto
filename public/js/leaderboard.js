function changeUsername() {
  let newUser = prompt("New username?");

  if (!newUser) return;

  if (newUser.length < 3 || newUser.length > 50) {
    alert("Between 3 and 50 characters pls :3");
    changeUsername();
    return;
  }

  fetch(`/invest/changeUsername/${encodeURIComponent(newUser)}`, {
    method: "POST",
  }).then((r) => {
    if (r.status == 200) {
      document.querySelector(`#username`).innerText = newUser;
    } else {
      alert(`uh ooh status ${r.status}`);
    }
  });
}
window.changeUsername = changeUsername;

async function payMoneyTo(user) {
  Swal.showLoading();

  try {
    const stats = await (await fetch(`/invest/getStats`)).json();

    if (stats.spendingMoney <= 0) {
      Swal.fire({
        icon: "error",
        text: "You don't have spending money...",
      });
      return;
    }

    const confirm = await Swal.fire({
      icon: "question",
      title: "Commit a CRIME and send money to someone???",
      text: "You will be liable for half an hour, and can go to PRISON. The money will be taken from your account and arrive in the other person's account after the half hour. How much?",
      input: "number",
      inputAttributes: {
        autocapitalize: "off",
      },
      showCancelButton: true,
      confirmButtonText: "SEND",
    });

    if (!confirm.isConfirmed) {
      Swal.fire({
        title: "all good man",
      });
      return;
    }

    const sending = Number(confirm.value);
    if (isNaN(sending) || sending < 0 || sending > stats.spendingMoney) {
      Swal.fire({
        icon: "error",
        title: "nah",
        text: `You only have $${stats.spendingMoney}...`,
      });
      return;
    }

    const really = await Swal.fire({
      icon: "question",
      title: "really?",
      text: `You're about to send $${sending} to the guy. Are you sure??! you'll be liable for half an hour!!! also if the servers restart during the 30 minute waiting period im sorry man it'll just be gone.`,
      showCancelButton: true,
      confirmButtonText: "do it no balls",
    });

    if (!really.isConfirmed) {
      Swal.fire({
        icon: "error",
        title: "yeah, that's what i thought.",
      });
      return;
    }

    fetch(`/invest/sendMoneyTo/${user}/${sending}`, {
      method: "POST",
    }).then(() => {
      window.location.reload();
    });
  } catch (e) {
    Swal.fire({
      icon: "error",
      text: e,
    });
    return;
  }
}

async function investigate(user) {
  try {
    Swal.showLoading()

    const stats = await (await fetch(`/invest/getStats`)).json();

    if(stats.spendingMoney < 100) {
      await Swal.fire({
        icon: "error",
        title: "errrm,",
        text: "Investigating someone costs $100 in spending cash."
      })
      return;
    }

    const { value, isConfirmed } = await Swal.fire({
      title: "Ok so what did this guy do",
      text: "Spend $100 to investigate them and if they committed the crime recently then you'll get all their *cash*, put them in jail, and stop the crime.",
      input: "select",
      inputOptions: {
        manipulation: "Market manipulation",
        laundering: "Money laundering (sending money)",
      },
      inputPlaceholder: "Select a CRIME",
      showCancelButton: true,
    });

    if(!isConfirmed || !value) return;

    let stock;
    
    if(value == "manipulation") {
      const r = await Swal.fire({
        title: "What stock are they manipulating?",
        input: "select",
        inputOptions: await (await fetch("/invest/stocksAndNames")).json(),
        inputPlaceholder: "Select a STOCK",
        showCancelButton: true,
      });

      if(!r.isConfirmed || !r.value) return;

      stock = r.value;
    }

    const real = await Swal.fire({
      icon: "question",
      title: `Are you SURE you want to accuse them of ${stock ? `manipulating the stonk market?` : `money laundering`}?`,
      text: "it costs like $100 spending money",
      showCancelButton: true,
    })

    if(!real.isConfirmed) return;

    Swal.showLoading();

    fetch(`/invest/accuse/${user}/${stock || "laundering"}`, {
      method: "POST"
    }).then(async(r)=>{
      const out = await r.json();

      if(out.success) {
        await Swal.fire({
          icon: "success",
          title: "YOU DID IT!!!",
          text: `They were, indeed, ${stock ? `manipulating the stonk market?` : `money laundering`}! You've claimed $${out.money.toFixed(4)} of their cash, and they are now in JAIL. You also stopped the crime!!1`
        })
        
        window.location.reload()
      } else {
        await Swal.fire({
          icon: "error",
          title: "oh... that's false...",
          text: `they weren't doing that...`
        })

        window.location.reload()
      }
    })

  } catch (e) {
    Swal.fire({
      icon: "error",
      text: e,
    });
    return;
  }
}
