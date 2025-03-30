class rankerNet {
  constructor() {}
  newRank() {
    return new Promise((resolve) => {
      fetch("/rankRouter/new", {
        method: "POST",
      })
        .then(async (r) => {
          if (r.status != 200) {
            if (r.status == 429) {
              alert(`Too many requests, reload in a bit.`);
            } else
              alert(
                `/rankRouter/new returned status ${r.status}. Reload the page or check devtools.`
              );
            return;
          }

          this.data = await r.json();
          resolve();
        })
        .catch((e) => {
          alert(e);
          //window.location.reload();
        });
    });
  }
  choose(option){
    return new Promise((resolve) => {
      fetch(`/rankRouter/choose/${option}/${this.data.token}`, {
        method: "POST",
      })
        .then(async (r) => {
          if (r.status != 200) {
            if (r.status == 429) {
              alert(`Too many requests, reload in a bit.`);
            } else
              alert(
                `/rankRouter/choose returned status ${r.status}. Choice probably expired, reload the page.`
              );
            return;
          }

          resolve();
        })
        .catch((e) => {
          alert(e);
          //window.location.reload();
        });
    });
  }
}

function hideMain() {
  document.querySelector(`.mainContentPad`).style.opacity = "0.5";
  document.querySelector(`.mainContentPad`).style.pointerEvents = "none";
}
function showMain() {
  document.querySelector(`.mainContentPad`).style.opacity = "1";
  document.querySelector(`.mainContentPad`).style.pointerEvents = "all";
}

const ranker = new rankerNet();

async function go() {
  hideMain()

  await ranker.newRank();

  document.querySelectorAll(
    `iframe`
  )[0].src = `https://www.youtube.com/embed/${ranker.data.A.id}?autoplay=0&fs=0`;
  document.querySelectorAll(
    `iframe`
  )[1].src = `https://www.youtube.com/embed/${ranker.data.B.id}?autoplay=0&fs=0`;

  window.leftClick = async () => {
    hideMain()
    await ranker.choose("left");
    go()
  };
  window.rightClick = async () => {
    hideMain()
    await ranker.choose("right");
    go()
  };

  window.noClick = () => {
    go()
  };

  showMain()
}

go();
