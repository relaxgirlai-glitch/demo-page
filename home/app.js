// app.js（完成版）
// =========================
// 設定
// =========================
const BONUS_LIST = [50, 100, 150, 250, 350, 500, 750];
const ADMIN_CODE = "sushi-1234"; // ←自分用に変更！

// =========================
// 共通ユーティリティ
// =========================
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function createDefaultUserData() {
  return {
    coins: 0,
    step: 0,
    lastClaim: "",
    playDate: "",
    playCount: 0,
  };
}

// =========================
// ユーザー管理
// =========================
function loadUsers() {
  return JSON.parse(localStorage.getItem("users") || "{}");
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

function getCurrentUser() {
  return localStorage.getItem("currentUser") || "";
}

function setCurrentUser(id) {
  localStorage.setItem("currentUser", id);
}

function isLoggedIn() {
  return localStorage.getItem("loggedIn") === "true" && !!getCurrentUser();
}

// user_<id> の初期データ
function ensureUserData(userId) {
  if (!userId) return;

  const key = `user_${userId}`;
  const raw = localStorage.getItem(key);

  if (!raw) {
    localStorage.setItem(key, JSON.stringify(createDefaultUserData()));
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = {};
  }

  localStorage.setItem(
    key,
    JSON.stringify({
      ...createDefaultUserData(),
      ...data,
    })
  );
}

function getUserData() {
  const user = getCurrentUser();
  if (!user) return createDefaultUserData();

  ensureUserData(user);

  try {
    return {
      ...createDefaultUserData(),
      ...JSON.parse(localStorage.getItem(`user_${user}`) || "{}"),
    };
  } catch {
    return createDefaultUserData();
  }
}

function setUserData(data) {
  const user = getCurrentUser();
  if (!user) return;

  const merged = {
    ...createDefaultUserData(),
    ...data,
  };

  localStorage.setItem(`user_${user}`, JSON.stringify(merged));
}

// =========================
// コイン
// =========================
function getCoins() {
  return Number(getUserData().coins || 0);
}

function setCoins(v) {
  const d = getUserData();
  d.coins = Number(v) || 0;
  setUserData(d);
}

// =========================
// 1日プレイ回数（ユーザー別）
// =========================
function getTodayPlays() {
  const d = getUserData();

  if (d.playDate !== todayKey()) {
    d.playDate = todayKey();
    d.playCount = 0;
    setUserData(d);
    return 0;
  }

  return Number(d.playCount || 0);
}

function incTodayPlays() {
  const d = getUserData();

  if (d.playDate !== todayKey()) {
    d.playDate = todayKey();
    d.playCount = 1;
  } else {
    d.playCount = Number(d.playCount || 0) + 1;
  }

  setUserData(d);
}

// =========================
// ヘッダー（コイン表示）
// どのページでも renderHeader(); だけでOK
// =========================
function renderHeader() {
  if (document.querySelector(".coin-bar")) return;

  const bar = document.createElement("div");
  bar.className = "coin-bar";
  bar.innerHTML = `<div class="coin-line">💰 Coins: <span id="coinDisplay">0</span></div>`;
  document.body.prepend(bar);

  updateCoinDisplay();
}

function updateCoinDisplay() {
  const el = document.getElementById("coinDisplay");
  if (el) el.textContent = String(getCoins());
}

// =========================
// 認証（ログイン / 登録 / ログアウト）
// =========================

// 初期ユーザー test/test（いらなければ消してOK）
(function initDefaultUser() {
  const users = loadUsers();
  if (!users["test"]) {
    users["test"] = { pass: "test" };
    saveUsers(users);
    ensureUserData("test");
  }
})();

function login() {
  const idEl = document.getElementById("id");
  const passEl = document.getElementById("pass");
  const msg = document.getElementById("message");

  if (!idEl || !passEl) return;

  const id = idEl.value.trim();
  const pass = passEl.value;

  const users = loadUsers();
  if (users[id] && users[id].pass === pass) {
    localStorage.setItem("loggedIn", "true");
    setCurrentUser(id);
    ensureUserData(id);
    window.location.href = "dashboard.html";
  } else {
    if (msg) msg.textContent = "IDまたはパスワードが違います";
  }
}

function register() {
  const code = document.getElementById("adminCode")?.value ?? "";
  const newId = (document.getElementById("newId")?.value ?? "").trim();
  const newPass = document.getElementById("newPass")?.value ?? "";
  const regMsg = document.getElementById("regMsg");

  if (code !== ADMIN_CODE) {
    if (regMsg) regMsg.textContent = "管理者コードが違います";
    return;
  }

  if (!newId || !newPass) {
    if (regMsg) regMsg.textContent = "IDとパスワードを入力してね";
    return;
  }

  const users = loadUsers();
  if (users[newId]) {
    if (regMsg) regMsg.textContent = "そのIDはもう使われています";
    return;
  }

  users[newId] = { pass: newPass };
  saveUsers(users);
  ensureUserData(newId);

  if (regMsg) regMsg.textContent = `登録しました：${newId}`;
}

function logout() {
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// =========================
// ダッシュボード：ログインボーナス（ユーザー別）
// =========================
function initDashboard() {
  if (!isLoggedIn()) {
    window.location.href = "index.html";
    return;
  }

  ensureUserData(getCurrentUser());
  renderHeader();
  renderBonus();
}

function renderBonus() {
  const grid = document.getElementById("bonusGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const d = getUserData();
  const step = Number(d.step || 0);
  const lastClaim = d.lastClaim || "";
  const today = todayKey();

  const dayRow = document.createElement("div");
  dayRow.className = "bonus-day-row";

  const rewardRow = document.createElement("div");
  rewardRow.className = "bonus-reward-row";

  for (let i = 0; i < BONUS_LIST.length; i++) {
    const day = document.createElement("div");
    day.className = "bonus-day-label";
    day.textContent = `${i + 1}日目`;

    if (i === step) day.classList.add("current-day");
    if (i < step) day.classList.add("claimed-day");

    dayRow.appendChild(day);

    const reward = document.createElement("div");
    reward.className = "bonus-day";
    reward.textContent = BONUS_LIST[i];

    if (i === step) reward.classList.add("current");
    if (i < step) {
      reward.classList.add("claimed");
      reward.textContent = "✔";
    }

    rewardRow.appendChild(reward);
  }

  grid.appendChild(dayRow);
  grid.appendChild(rewardRow);

  const btn = document.getElementById("claimBtn");
  if (btn) {
    if (lastClaim === today) {
      btn.textContent = "受け取り済み";
      btn.disabled = true;
    } else {
      btn.textContent = "受け取る";
      btn.disabled = false;
    }
  }
}

function claimBonus() {
  if (!isLoggedIn()) return;

  const user = getCurrentUser();
  ensureUserData(user);

  const d = getUserData();
  const today = todayKey();

  if (d.lastClaim === today) return;

  const step = Number(d.step || 0);
  const reward = BONUS_LIST[step] ?? BONUS_LIST[0];

  d.coins = Number(d.coins || 0) + reward;
  d.step = step + 1;
  if (d.step >= BONUS_LIST.length) d.step = 0;
  d.lastClaim = today;

  setUserData(d);

  const status = document.getElementById("status");
  if (status) status.textContent = `${reward}コイン獲得！`;

  const btn = document.getElementById("claimBtn");
  if (btn) {
    btn.textContent = "受け取り済み";
    btn.disabled = true;
  }

  updateCoinDisplay();
  renderBonus();
}

// =========================
// DOM初期化（ログインページ用UI）
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openRegister");
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      const box = document.getElementById("registerBox");
      if (!box) return;
      box.style.display = box.style.display === "none" ? "block" : "none";
    });
  }
});


window.addEventListener("pageshow", () => {
  const staffLinkText = document.getElementById("staffLinkText");
  const staffBackMessage = sessionStorage.getItem("staffBackMessage");

  if (staffLinkText && staffBackMessage === "1") {
    staffLinkText.textContent = "クッ！バレたか。ブラウザバックに気づくとは...なかなかやるな...";
    sessionStorage.removeItem("staffBackMessage");
  }
});