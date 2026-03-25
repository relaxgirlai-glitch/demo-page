const introScreen = document.getElementById("introScreen");
const betScreen = document.getElementById("betScreen");
const playScreen = document.getElementById("playScreen");

const introOk = document.getElementById("introOk");
const startBtn = document.getElementById("startBtn");

const betInput = document.getElementById("betAmount");
const allBetBtn = document.getElementById("allBetBtn");

const card1El = document.getElementById("card1");
const card2El = document.getElementById("card2");

const highBtn = document.getElementById("highBtn");
const lowBtn = document.getElementById("lowBtn");
const goBtn = document.getElementById("goBtn");

const actionArea = document.getElementById("actionArea");
const resultEl = document.getElementById("result");

const afterArea = document.getElementById("afterArea");
const againBtn = document.getElementById("againBtn");
const backBtn = document.getElementById("backBtn");

const MAX_PLAYS_PER_DAY = 5;
const MAX_BET = 1000;

function canPlayToday() {
  return window.getTodayPlays() < MAX_PLAYS_PER_DAY;
}

function incrementTodayPlays() {
  window.incTodayPlays();
}

let firstCard = 0;
let secondCard = 0;
let selected = null;
let bet = 0;
let hasStarted = false;

function drawCard() {
  return Math.floor(Math.random() * 13) + 2;
}

function numberToDisplay(num) {
  if (num === 11) return "J";
  if (num === 12) return "Q";
  if (num === 13) return "K";
  if (num === 14) return "A";
  return String(num);
}

function resetChoice() {
  highBtn.classList.remove("selected");
  lowBtn.classList.remove("selected");
  selected = null;
}

function showTwoCardsFaceDown() {
  card1El.textContent = numberToDisplay(firstCard);
  card2El.style.color = "";
  card2El.classList.add("card-back");
  card2El.textContent = "?";
}

function revealSecondCard() {
  card2El.classList.remove("card-back");
  card2El.style.color = "";
  card2El.textContent = numberToDisplay(secondCard);
}

function showResultMessage(mult) {
  if (mult === 0) {
    resultEl.textContent = "残念...BETしたコインは無くなりました...。";
  } else if (mult === 2) {
    resultEl.textContent = "おめでとう！BETしたコインは2倍になったよ！";
  } else if (mult === 5) {
    resultEl.textContent = "スゴい！！！BETしたコインは5倍になったよ！";
  }
}

function toPlayUI() {
  actionArea.style.display = "block";
  afterArea.style.display = "none";
  resultEl.textContent = "";
  resetChoice();
}

function toResultUI() {
  actionArea.style.display = "none";
  afterArea.style.display = "flex";
}

function backToBetScreen() {
  hasStarted = false;
  bet = 0;

  betInput.disabled = false;
  startBtn.disabled = false;

  resetChoice();
  resultEl.textContent = "";

  card1El.textContent = "?";
  card2El.textContent = "?";
  card2El.classList.add("card-back");
  card2El.style.color = "";

  playScreen.style.display = "none";
  betScreen.style.display = "block";
}

introOk.addEventListener("click", () => {
  introScreen.style.display = "none";
  betScreen.style.display = "block";
});

startBtn.addEventListener("click", () => {
  if (!canPlayToday()) {
    alert("今日はもう5回プレイしました！");
    return;
  }

  if (hasStarted) return;

  const v = Number(betInput.value);

  if (!Number.isFinite(v) || v <= 0 || v % 10 !== 0) {
    alert("BET枚数は10単位で入力してね！");
    return;
  }

  if (v > MAX_BET) {
    alert("MAX BETは1000までです！");
    return;
  }

  const coins = window.getCoins();
  if (coins < v) {
    alert("コインが足りません！");
    return;
  }

  window.setCoins(coins - v);
  window.updateCoinDisplay();

  bet = v;
  hasStarted = true;

  betInput.disabled = true;
  startBtn.disabled = true;

  firstCard = drawCard();
  secondCard = drawCard();

  showTwoCardsFaceDown();
  toPlayUI();

  betScreen.style.display = "none";
  playScreen.style.display = "block";
});

highBtn.addEventListener("click", () => {
  selected = "high";
  highBtn.classList.add("selected");
  lowBtn.classList.remove("selected");
});

lowBtn.addEventListener("click", () => {
  selected = "low";
  lowBtn.classList.add("selected");
  highBtn.classList.remove("selected");
});

goBtn.addEventListener("click", () => {
  if (!hasStarted) return;

  revealSecondCard();

  let mult = 0;
  if (selected === null && secondCard === firstCard) mult = 5;
  else if (selected === "high" && secondCard > firstCard) mult = 2;
  else if (selected === "low" && secondCard < firstCard) mult = 2;

  const payout = bet * mult;
  if (payout > 0) {
    window.setCoins(window.getCoins() + payout);
    window.updateCoinDisplay();
  }

  showResultMessage(mult);
  toResultUI();

  incrementTodayPlays();
  hasStarted = false;
});

againBtn.addEventListener("click", () => {
  backToBetScreen();
});

backBtn.addEventListener("click", () => {
  location.href = "../dashboard.html";
});

allBetBtn.addEventListener("click", () => {
  const coins = window.getCoins();
  let betValue = Math.floor(coins / 10) * 10;

  if (betValue > MAX_BET) betValue = MAX_BET;

  if (betValue <= 0) {
    alert("コインが足りません！");
    return;
  }

  betInput.value = betValue;
});