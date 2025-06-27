const guessDivs = [...document.querySelector(`.guesses`).children];

// Get the uh the song
const theSong = songs[Math.floor(Math.random() * songs.length)];
const audio = new Audio(`/heardleSongClips/${theSong.id}.ogg`);
const explosion = new Audio(`/sound/explosion.ogg`);
const mob = new Audio(`/sound/mob.wav`);
const yippee = new Audio(`/sound/yippee.mp3`); // we got all the file formats bro

audio.addEventListener(`canplaythrough`, () => {
  playButton.classList.remove("disabled");
});

audio.addEventListener(`error`, (e)=>{
  console.error(e)
  alert(`uhhh audio errored my bad hold on`)
  window.location.reload();
})

// Play button
const playButton = document.querySelector(`.playButton`);
const fill = document.querySelector(`.fill`);
let audioPlayLengthAllowed = 1,
  skipMult = 1;

playButton.addEventListener(`click`, () => {
  if (audio.paused) {
    audio.play();
    playButton.classList.add(`playing`);
  } else {
    audio.pause();
    audio.currentTime = 0;
    playButton.classList.remove(`playing`);
    fill.style.width = `0%`;
  }
});

setInterval(() => {
  if (
    audio.currentTime >= audioPlayLengthAllowed ||
    audio.currentTime > 15.98
  ) {
    audio.pause();
    audio.currentTime = 0;
    playButton.classList.remove(`playing`);

    fill.style.width = `0%`;
    return;
  }

  if (!audio.paused) {
    fill.style.width = `${(audio.currentTime / 16) * 100}%`;
  }
}, 33);

// Guessing search box algorithm
const miniSearch = new MiniSearch({
  fields: ["title"], // fields to index for full-text search
  storeFields: ["title", "id"], // fields to return with search results
  searchOptions: {
    fuzzy: 0.2,
    prefix: true,
  },
});

miniSearch.addAll(
  songs.map((s) => {
    return {
      title: s.author.trim() + " - " + s.title.trim(),
      id: s.id,
    };
  })
);

const searchBox = document.querySelector(`.searchBox`);
const textSuggestions = document.querySelector(`.textSuggestions`);
const checkButton = document.querySelector(`.check`);
const skipButton = document.querySelector(`.skip`);
let selectedVideo;

searchBox.value = ``;

searchBox.addEventListener(`input`, () => {
  selectedVideo = null;
  checkButton.setAttribute("disabled", true);

  const results = miniSearch.search(searchBox.value).slice(0, 5);

  if (results.length == 0) {
    textSuggestions.style.display = "none";
    return;
  }

  textSuggestions.style.display = "flex";

  textSuggestions.innerHTML = ``;

  results.forEach((r) => {
    const elem = document.createElement(`div`);
    elem.innerText = r.title;

    textSuggestions.appendChild(elem);

    const image = document.createElement(`img`);
    image.src = "/imgcompress/songThumbnails/" + r.id + ".avif";
    elem.prepend(image);

    elem.addEventListener(`mousedown`, () => {
      searchBox.value = r.title;
      selectedVideo = r.id;
      checkButton.removeAttribute("disabled");
    });
  });

  textSuggestions.classList.remove("bounce");
  textSuggestions.offsetWidth;
  textSuggestions.classList.add("bounce");
});

searchBox.addEventListener(`blur`, () => {
  setTimeout(() => {
    textSuggestions.style.display = "none";
  }, 33);
});

// Check code
function advanceSkip(guess) {
  if (skipMult == 6) {
    lose();
    return;
  }

  searchBox.value = "";
  selectedVideo = null;
  checkButton.setAttribute("disabled", true);

  guessDivs[skipMult - 1].classList.add(`ed`);
  guessDivs[skipMult - 1].innerText = guess || "SKIPPED ):";

  audioPlayLengthAllowed += skipMult;

  skipMult++;

  skipButton.innerText = skipMult == 6 ? `LOSE!!!` : `SKIP (+${skipMult}s)`;

  explosion.currentTime = 0;
  explosion.play();
}

checkButton.addEventListener(`click`, () => {
  if (selectedVideo == theSong.id) {
    win();
    return;
  } else {
    advanceSkip(searchBox.value);
  }
});

skipButton.addEventListener(`click`, () => {
  advanceSkip();
});

// win
function win() {
  yippee.play();
  audio.pause();

  document.querySelector(`.playfield`).innerHTML = `          <iframe
            id="ytplayer"
            type="text/html"
            src="https://www.youtube.com/embed/${theSong.id}?autoplay=1"
            frameborder="0"
          ></iframe><br><h1>${skipMult == 1 ? "YOU GOT IT STRAIGHT AWAY! 🎉🎉🎉" : `YOU WIN IN ${skipMult} GUESSES!!! 🎉`}</h1><p>Share it for clout. Is that a ROT FOR CLOUT refrence???</p><button onclick="window.location.reload()">AGAIN AGAIN!</button>`;
}

function lose() {
  mob.play();
  audio.pause();

  document.querySelector(`.playfield`).innerHTML = `          <iframe
            id="ytplayer"
            type="text/html"
            src="https://www.youtube.com/embed/${theSong.id}?autoplay=1"
            frameborder="0"
          ></iframe><br><h1>YOU LOSE! YOU GET NOTHING! GOOD DAY SIR.</h1><button onclick="window.location.reload()">AGAIN AGAIN!</button><img src='/imgcompress/tetSad.avif' style='height:20vh'>`;
}
