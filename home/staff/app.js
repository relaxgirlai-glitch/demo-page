console.log("STAFF APP LOADED");

// staff/app.js
// =========================
// 設定
// =========================
const BONUS_LIST = [50, 100, 150, 250, 350, 500, 750];

// =========================
// 共通ユーティリティ
// =========================
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function createDefaultStaffData() {
  return {
    coins: 0,
    step: 0,
    lastClaim: "",
    playDate: "",
    playCount: 0,
  };
}

// =========================
// 職員ユーザー管理
// =========================
function loadStaffUsers() {
  return JSON.parse(localStorage.getItem("users_staff") || "{}");
}

function saveStaffUsers(users) {
  localStorage.setItem("users_staff", JSON.stringify(users));
}

function getCurrentStaffUser() {
  return localStorage.getItem("currentStaffUser") || "";
}

function setCurrentStaffUser(id) {
  localStorage.setItem("currentStaffUser", id);
}

function isStaffLoggedIn() {
  return localStorage.getItem("staffLoggedIn") === "true" && !!getCurrentStaffUser();
}

// staff_<id> の初期データ
function ensureStaffData(staffId) {
  if (!staffId) return;

  const key = `staff_${staffId}`;
  const raw = localStorage.getItem(key);

  if (!raw) {
    localStorage.setItem(key, JSON.stringify(createDefaultStaffData()));
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
      ...createDefaultStaffData(),
      ...data,
    })
  );
}

function getStaffData() {
  const user = getCurrentStaffUser();
  if (!user) return createDefaultStaffData();

  ensureStaffData(user);

  try {
    return {
      ...createDefaultStaffData(),
      ...JSON.parse(localStorage.getItem(`staff_${user}`) || "{}"),
    };
  } catch {
    return createDefaultStaffData();
  }
}

function setStaffData(data) {
  const user = getCurrentStaffUser();
  if (!user) return;

  const merged = {
    ...createDefaultStaffData(),
    ...data,
  };

  localStorage.setItem(`staff_${user}`, JSON.stringify(merged));
}

// =========================
// コイン
// =========================
function getCoins() {
  return Number(getStaffData().coins || 0);
}

function setCoins(v) {
  const d = getStaffData();
  d.coins = Number(v) || 0;
  setStaffData(d);
}

// =========================
// 1日プレイ回数（職員別）
// =========================
function getTodayPlays() {
  const d = getStaffData();

  if (d.playDate !== todayKey()) {
    d.playDate = todayKey();
    d.playCount = 0;
    setStaffData(d);
    return 0;
  }

  return Number(d.playCount || 0);
}

function incTodayPlays() {
  const d = getStaffData();

  if (d.playDate !== todayKey()) {
    d.playDate = todayKey();
    d.playCount = 1;
  } else {
    d.playCount = Number(d.playCount || 0) + 1;
  }

  setStaffData(d);
}

// =========================
// 認証
// =========================

// 初期職員ユーザー ttest/ttest
(function initDefaultStaffUser() {
  const users = loadStaffUsers();
  if (!users["ttest"]) {
    users["ttest"] = { pass: "ttest" };
    saveStaffUsers(users);
    ensureStaffData("ttest");
  }
})();

function login() {
  const idEl = document.getElementById("id");
  const passEl = document.getElementById("pass");
  const msg = document.getElementById("message");

  if (!idEl || !passEl) return;

  const id = idEl.value.trim();
  const pass = passEl.value;

  const users = loadStaffUsers();
  if (users[id] && users[id].pass === pass) {
    localStorage.setItem("staffLoggedIn", "true");
    setCurrentStaffUser(id);
    ensureStaffData(id);
    window.location.href = "dashboard.html";
  } else {
    if (msg) msg.textContent = "IDまたはパスワードが違います";
  }
}

function logout() {
  localStorage.removeItem("staffLoggedIn");
  localStorage.removeItem("currentStaffUser");
  window.location.href = "index.html";
}

function requireStaffLogin() {
  if (!isStaffLoggedIn()) {
    window.location.href = "index.html";
  }
}

// =========================
// ダッシュボード：ログインボーナス（職員別）
// =========================
function initDashboard() {
  if (!isStaffLoggedIn()) {
    window.location.href = "index.html";
    return;
  }

  ensureStaffData(getCurrentStaffUser());
  renderHeader();
  renderBonus();
}

function renderBonus() {
  const grid = document.getElementById("bonusGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const d = getStaffData();
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
  if (!isStaffLoggedIn()) return;

  const user = getCurrentStaffUser();
  ensureStaffData(user);

  const d = getStaffData();
  const today = todayKey();

  if (d.lastClaim === today) return;

  const step = Number(d.step || 0);
  const reward = BONUS_LIST[step] ?? BONUS_LIST[0];

  d.coins = Number(d.coins || 0) + reward;
  d.step = step + 1;
  if (d.step >= BONUS_LIST.length) d.step = 0;
  d.lastClaim = today;

  setStaffData(d);

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
// 遊び心
// =========================
const params = new URLSearchParams(window.location.search);
const from = params.get("from");

const bottomLinkText = document.getElementById("bottomLinkText");

if (from === "student" && bottomLinkText) {
  bottomLinkText.innerHTML = `
    興味で触りましたね？残念！戻れません！<br>
    己の行動を後悔してください。
  `;

  history.pushState({ staffDummy: true }, "", window.location.href);

  window.addEventListener("popstate", () => {
    sessionStorage.setItem("staffBackMessage", "1");
    history.back();
  }, { once: true });
}

let noticeTimer = null;
let lastNoticeBaseMessage = "";
let lastNoticeCount = 0;
let noticeVersion = 0;

// =========================
// DOM生成
// =========================
function ensureNoticeBox() {
  if (document.getElementById("noticeBox")) return;

  const box = document.createElement("div");
  box.id = "noticeBox";
  box.className = "notice-box";
  box.innerHTML = `
    <div id="noticeText" class="notice-text"></div>
    <div id="noticeActions" class="notice-actions"></div>
    <div class="notice-bar-wrap">
      <div id="noticeBar" class="notice-bar"></div>
    </div>
  `;
  document.body.appendChild(box);
}

// =========================
// 表示
// =========================
function showNotice(baseMessage, duration = 1000, options = {}) {
  ensureNoticeBox();

  const box = document.getElementById("noticeBox");
  const text = document.getElementById("noticeText");
  const bar = document.getElementById("noticeBar");
  const actions = document.getElementById("noticeActions");

  if (!box || !text || !bar || !actions) return;

  // =========================
  // カウント処理
  // =========================
  if (baseMessage === lastNoticeBaseMessage) {
    lastNoticeCount += 1;
  } else {
    lastNoticeBaseMessage = baseMessage;
    lastNoticeCount = 1;
  }

  const displayMessage =
    lastNoticeCount >= 2
      ? `${baseMessage}(${lastNoticeCount})`
      : baseMessage;

  text.textContent = displayMessage;

  // =========================
  // ボタン
  // =========================
  actions.innerHTML = "";

  if (options.undo) {
    const btn = document.createElement("button");
    btn.textContent = "元に戻す";
    btn.className = "notice-undo-btn";

    btn.onclick = () => {
      options.undo();
      showNotice("元に戻しました！", 2000);
    };

    actions.appendChild(btn);
  }

  // =========================
  // タイマー制御
  // =========================
  if (noticeTimer) clearTimeout(noticeTimer);

  const currentVersion = ++noticeVersion;

  // =========================
  // バー初期化
  // =========================
  bar.style.transition = "none";
  bar.style.width = "100%";

  // =========================
  // ワープ → ヌルッ
  // =========================
  box.classList.remove("show");
  box.style.transition = "none";
  box.style.opacity = "0";
  box.style.transform = "translateY(24px)";

  requestAnimationFrame(() => {
    if (currentVersion !== noticeVersion) return;

    box.style.transition = "";
    box.style.opacity = "";
    box.style.transform = "";

    requestAnimationFrame(() => {
      if (currentVersion !== noticeVersion) return;

      box.classList.add("show");
      bar.style.transition = `width ${duration}ms linear`;
      bar.style.width = "0%";
    });
  });

  // =========================
  // 消える処理（修正版）
  // =========================
  noticeTimer = setTimeout(() => {
    if (currentVersion !== noticeVersion) return;

    // まず下にヌルッと消す
    box.classList.remove("show");

    // アニメ後にバーリセット
    setTimeout(() => {
      if (currentVersion !== noticeVersion) return;

      bar.style.transition = "none";
      bar.style.width = "100%";

      lastNoticeBaseMessage = "";
      lastNoticeCount = 0;
      noticeTimer = null;
    }, 250); // ← CSSのtransition時間に合わせる
  }, duration);
}

const add100Btn = document.getElementById("add100Btn");
const add500Btn = document.getElementById("add500Btn");
const add1000Btn = document.getElementById("add1000Btn");

if (add100Btn) {
  add100Btn.addEventListener("click", () => {
    const before = getStaffData();

    setCoins(getCoins() + 100);
    updateCoinDisplay();

    showNotice("100Coinを追加しました。", 3000, {
      undo: () => {
        setStaffData(before);
        updateCoinDisplay();
      }
    });
  });
}

if (add500Btn) {
  add500Btn.addEventListener("click", () => {
    const before = getStaffData();

    setCoins(getCoins() + 500);
    updateCoinDisplay();

    showNotice("500Coinを追加しました。", 3000, {
      undo: () => {
        setStaffData(before);
        updateCoinDisplay();
      }
    });
  });
}

if (add1000Btn) {
  add1000Btn.addEventListener("click", () => {
    const before = getStaffData();

    setCoins(getCoins() + 1000);
    updateCoinDisplay();

    showNotice("1000Coinを追加しました。", 3000, {
      undo: () => {
        setStaffData(before);
        updateCoinDisplay();
      }
    });
  });
}