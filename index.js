const express = require(`express`)
const app = express()

app.set("view engine", "ejs")

app.use(express.static("./public"))

function getNumberWithOrdinal(n) {
  var s = ["th", "st", "nd", "rd"],
      v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

let viewers = 0;

app.get("/", (req, res)=>{
  viewers++;

  res.render("index.ejs", {
    viewers: getNumberWithOrdinal(viewers)
  })
})

app.listen(4001)