module.exports = () => {
  const symbols = ["🍒", "🍋", "🍇", "💰", "🔔", "🍀", "❌"];

  const payAmount = {
    "💰💰💰": 42,
    "🍀🍀🍀": 27,
    "🔔🔔🔔": 21,
    "❌❌❌": 13,
    "🍒🍒🍒": 16,
    "🍇🍇🍇": 12,
    "🍋🍋🍋": 11,

    "💰💰": 4,
    "🍀🍀": 3.14,
    "🔔🔔": 3,
    "❌❌":1.3
    "🍒🍒": 2.5,
    "🍇🍇": 2,
    "🍋🍋": 1.5,
  }

  let reel = [];
  for (let i = 0; i < 3; i++) {
    reel.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }

  const result = reel.join("");
  let payout = 0;

  for (let i = 0; i < Object.keys(payAmount).length; i++) {
    const element = Object.keys(payAmount)[i];

    if(!result.includes(element)) continue;
    if(payout == 0) payout = 1;
    payout *= payAmount[element]
    break;
  }

  return {
    reel: reel,
    payout: payout,
  };
};
