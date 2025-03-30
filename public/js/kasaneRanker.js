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
          shuffle.play()
        })
        .catch((e) => {
          alert(e);
          //window.location.reload();
        });
    });
  }
  choose(option) {
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
  document.querySelector(`.mainContentPad`).style.opacity = "0.9";
  document.querySelector(`.mainContentPad`).style.pointerEvents = "none";
}
function showMain() {
  document.querySelector(`.mainContentPad`).style.opacity = "1";
  document.querySelector(`.mainContentPad`).style.pointerEvents = "all";
}

const ranker = new rankerNet();

const FA = document.querySelectorAll(`iframe`)[0],
  FB = document.querySelectorAll(`iframe`)[1];

const pop = new Audio("/sound/pop.ogg"),
  shuffle = new Audio("/sound/shuffle.ogg")

async function go() {
  hideMain();

  await ranker.newRank();

  FA.src = `https://www.youtube.com/embed/${ranker.data.A.id}?autoplay=0&fs=0`;
  FB.src = `https://www.youtube.com/embed/${ranker.data.B.id}?autoplay=0&fs=0`;

  FA.classList.remove("bounce");
  FB.classList.remove("bounce");
  FA.classList.remove("selected");
  FB.classList.remove("selected");
  FA.offsetWidth;
  FB.offsetWidth;
  FA.classList.add("bounce");
  FB.classList.add("bounce");

  window.leftClick = async () => {
    pop.play()
    hideMain();
    FA.classList.add("selected");
    await ranker.choose("left");
    go();
  };
  window.rightClick = async () => {
    pop.play()
    hideMain();
    FB.classList.add("selected");
    await ranker.choose("right");
    go();
  };

  window.noClick = () => {
    pop.play()
    go();
  };

  showMain();
}

go();
