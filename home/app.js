import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "./firebace.js";

// =========================
// 設定
// =========================
const BONUS_LIST = [50, 100, 150, 250, 350, 500, 750];
const ADMIN_CODE = "sushi-1234";

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
    role: "student",
    loginId: ""
  };
}

function normalizeUserData(data = {}) {
  return {
    ...createDefaultUserData(),
    ...data
  };
}

function toFirebaseEmail(id) {
  const v = String(id || "").trim().toLowerCase();
  return `${v}@demo.local`;
}

function getCurrentUser() {
  return localStorage.getItem("currentUser") || "";
}

function setCurrentUser(id) {
  localStorage.setItem("currentUser", id);
}

function getCurrentUid() {
  return localStorage.getItem("currentUid") || "";
}

function setCurrentUid(uid) {
  localStorage.setItem("currentUid", uid);
}

function isLoggedIn() {
  return localStorage.getItem("loggedIn") === "true" && !!getCurrentUser() && !!getCurrentUid();
}

function cacheUserData(loginId, data) {
  localStorage.setItem(`user_${loginId}`, JSON.stringify(normalizeUserData(data)));
}

function getUserData() {
  const user = getCurrentUser();
  if (!user) return createDefaultUserData();

  try {
    return normalizeUserData(JSON.parse(localStorage.getItem(`user_${user}`) || "{}"));
  } catch {
    return createDefaultUserData();
  }
}

let saveTimer = null;

async function saveUserDataNow(data) {
  const uid = getCurrentUid();
  const loginId = getCurrentUser();
  if (!uid || !loginId) return;

  const merged = normalizeUserData({
    ...getUserData(),
    ...data,
    loginId
  });

  cacheUserData(loginId, merged);

  await setDoc(
    doc(db, "users", uid),
    {
      ...merged,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

function scheduleSaveUserData(data) {
  const uid = getCurrentUid();
  const loginId = getCurrentUser();
  if (!uid || !loginId) return;

  const merged = normalizeUserData({
    ...getUserData(),
    ...data,
    loginId
  });

  cacheUserData(loginId, merged);

  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await setDoc(
        doc(db, "users", uid),
        {
          ...merged,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (e) {
      console.error("保存失敗:", e);
    }
  }, 150);
}

function setUserData(data) {
  scheduleSaveUserData(data);
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
  updateCoinDisplay();
}

// =========================
// 1日プレイ回数
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
// ヘッダー
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
// Firebase同期
// =========================
async function ensureCloudUser() {
  const uid = getCurrentUid();
  const loginId = getCurrentUser();
  if (!uid || !loginId) return;

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const data = normalizeUserData({
      loginId,
      role: "student"
    });
    await setDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    cacheUserData(loginId, data);
    return;
  }

  const data = normalizeUserData(snap.data());
  cacheUserData(loginId, data);
}

async function refreshCloudUser() {
  const uid = getCurrentUid();
  const loginId = getCurrentUser();
  if (!uid || !loginId) return;

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    await ensureCloudUser();
    return;
  }

  cacheUserData(loginId, snap.data());
}

// =========================
// 認証
// =========================
async function login() {
  const idEl = document.getElementById("id");
  const passEl = document.getElementById("pass");
  const msg = document.getElementById("message");

  if (!idEl || !passEl) return;

  const id = idEl.value.trim();
  const pass = passEl.value;

  if (!id || !pass) {
    if (msg) msg.textContent = "IDとパスワードを入力してね";
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, toFirebaseEmail(id), pass);

    localStorage.setItem("loggedIn", "true");
    setCurrentUser(id);
    setCurrentUid(cred.user.uid);

    await ensureCloudUser();
    window.location.href = "dashboard.html";
  } catch (e) {
    console.error(e);
    if (msg) msg.textContent = "IDまたはパスワードが違います";
  }
}

async function register() {
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

  if (newId.includes("@")) {
    if (regMsg) regMsg.textContent = "IDに @ は使えません";
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, toFirebaseEmail(newId), newPass);

    setCurrentUser(newId);
    setCurrentUid(cred.user.uid);
    localStorage.setItem("loggedIn", "true");

    const initData = normalizeUserData({
      loginId: newId,
      role: "student"
    });

    await setDoc(doc(db, "users", cred.user.uid), {
      ...initData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    cacheUserData(newId, initData);

    if (regMsg) regMsg.textContent = `登録しました：${newId}`;
  } catch (e) {
    console.error(e);
    if (regMsg) regMsg.textContent = "登録に失敗しました（同じIDの可能性あり）";
  }
}

async function logout() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error(e);
  }

  localStorage.removeItem("loggedIn");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("currentUid");
  window.location.href = "index.html";
}

// =========================
// ダッシュボード
// =========================
async function initDashboard() {
  if (!auth.currentUser && !isLoggedIn()) {
    window.location.href = "index.html";
    return;
  }

  await refreshCloudUser();
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

async function claimBonus() {
  if (!isLoggedIn()) return;

  await refreshCloudUser();

  const d = getUserData();
  const today = todayKey();

  if (d.lastClaim === today) return;

  const step = Number(d.step || 0);
  const reward = BONUS_LIST[step] ?? BONUS_LIST[0];

  d.coins = Number(d.coins || 0) + reward;
  d.step = step + 1;
  if (d.step >= BONUS_LIST.length) d.step = 0;
  d.lastClaim = today;

  await saveUserDataNow(d);

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
// 自動ログイン同期
// =========================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (!getCurrentUid()) setCurrentUid(user.uid);
    localStorage.setItem("loggedIn", "true");

    if (location.pathname.endsWith("/home/index.html") || location.pathname.endsWith("/home/")) {
      const id = getCurrentUser();
      if (id) {
        await refreshCloudUser();
      }
    }
  } else {
    if (
      location.pathname.includes("/home/dashboard.html") ||
      location.pathname.includes("/home/high_low/") ||
      location.pathname.includes("/home/shop/")
    ) {
      localStorage.removeItem("loggedIn");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("currentUid");
    }
  }
});

// =========================
// 既存UI用
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

// =========================
// グローバル公開
// =========================
window.login = login;
window.register = register;
window.logout = logout;
window.initDashboard = initDashboard;
window.claimBonus = claimBonus;
window.getCoins = getCoins;
window.setCoins = setCoins;
window.getUserData = getUserData;
window.setUserData = setUserData;
window.getTodayPlays = getTodayPlays;
window.incTodayPlays = incTodayPlays;
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.isLoggedIn = isLoggedIn;
window.renderHeader = renderHeader;
window.updateCoinDisplay = updateCoinDisplay;
