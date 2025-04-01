const investingSF = require(`./util/investing/secretFormula`)

let songs = [], started = false;

function updateSongs(s, apiKey, io) {
  return;
  songs = s;
  investingSF.setVideos(s.map((i)=>i.id))

  if(started) return;
  started = true;

  investingSF.loop(apiKey);
  investingSF.loop2();

  io.on('connection', ioConnection);
}

function ioConnection(socket) {
  return;
  socket.emit("baseStocks", [{
    url: "/",
    title: "TETO STOCK EXCHANGE $TSX",
    id: "GDP"
  }, ...songs.map((s)=>{
    return {
      url: s.url, title: s.title, id: s.id
    }
  })])

  socket.emit("stockPrices", investingSF.getStockPrices())

  let i = setInterval(()=>{
    socket.emit("stockPrices", investingSF.getStockPrices())
  }, 15_000)

  socket.on("disconnect", ()=>{
    console.log("Socket disconnect")
    clearInterval(i)
  })
}

module.exports = {
  updateSongs
}