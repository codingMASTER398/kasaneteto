// Assuming the variable "songs" is passed along

let artists = [];

Object.keys(votes).forEach((v)=>{
  const songIndex = songs.indexOf(songs.find((s)=>s.id == v))
  if(!songIndex) {
    console.log(`Vote but no video for ${v}`)
  }

  songs[songIndex].vote = votes[v].perc
})

songs.sort((a, b) => (b.vote || 0) - (a.vote || 0)).forEach((song, i) => {
  const element = document.createElement(`div`);
  element.classList.add("song");

  const title = document.createElement(`a`);
  title.innerText = song.title;
  title.href = song.url;

  const thumb = document.createElement(`img`);
  thumb.src = "/img/songThumbnails/" + song.id + ".jpg";
  thumb.setAttribute("loading", "lazy");

  const vote = document.createElement(`p`)
  vote.classList.add("vote")

  vote.innerText = typeof song.vote === "number" ? ("#" + (i + 1) + ", " + (song.vote.toFixed(1)) + "%") : "Unknown";

  if(typeof song.vote === "undefined"){

  } else if(i == 0) {
    vote.classList.add("first")
  } else if(song.vote > 90) {
    vote.classList.add("v90")
  } else if(song.vote > 80) {
    vote.classList.add("v80")
  } else if(song.vote > 70) {
    vote.classList.add("v70")
  } else if(song.vote > 60) {
    vote.classList.add("v60")
  } else if(song.vote > 50) {
    vote.classList.add("v50")
  } else if(song.vote > 40) {
    vote.classList.add("v40")
  } else if(song.vote > 30) {
    vote.classList.add("v30")
  } else if(song.vote > 20) {
    vote.classList.add("v20")
  } else if(song.vote > 10) {
    vote.classList.add("v10")
  } else vote.classList.add("v0")

  const detail = document.createElement(`p`);
  detail.innerText = `By ${song.author}`;

  element.appendChild(thumb);
  element.appendChild(title);
  element.appendChild(detail);
  element.appendChild(vote);

  if (!artists.includes(song.author)) {
    artists.push(song.author);
  }

  element.setAttribute(`id`, song.id);

  document.querySelector(`.reading.songList`).appendChild(element);
});

artists.filter((a)=>a).sort((a, b) => a.localeCompare(b)).forEach((e) => {
  elem = document.createElement(`option`);
  elem.value = e;
  elem.innerText = e;
  document.querySelector(`#artists`).appendChild(elem);
});

// Searching

let miniSearch = new MiniSearch({
  fields: ["title"], // fields to index for full-text search
  storeFields: ["id", "author"], // fields to return with search results
});

// Index all documents
miniSearch.addAll(songs);

// Util to filter songs
function setVisibleSongs(ss) {
  [...document.querySelectorAll(`.song`)].forEach((s) => {
    s.setAttribute(
      `visible`,
      ss.find((sss) => sss.id == s.getAttribute("id")) ? "true" : "false"
    );
  });
}

function filterSongs(s) {
  const artistFilter = document.querySelector(`#artists`).value;

  if (!artistFilter) setVisibleSongs(s);
  else setVisibleSongs(s.filter((v) => v.author == artistFilter));
}

// Search logic
const searchBox = document.querySelector(`#searchBox`);

function search() {
  if (searchBox.value == "") {
    filterSongs(songs);
  } else {
    filterSongs(miniSearch.search(searchBox.value))
  }
}

searchBox.addEventListener(`keyup`, search);
document.querySelector(`#artists`).addEventListener(`change`, search);

filterSongs(songs)