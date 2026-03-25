import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "./firebase.js";

const BONUS_LIST = [50, 100, 150, 250, 350, 500, 750];

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

function getCoins() {
  return Number(getUserData().coins || 0);
}

function setCoins(v) {
  const d = getUserData();
  d.coins = Number(v) || 0;
  setUserData(d);
  updateCoinDisplay();
}

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

async function login() {
  const idEl = document.getElementById("id");
  const passEl = document.getElementById("pass");
  const msg = document.getElementById("message");

  console.log("login start");

  if (msg) msg.textContent = "";

  if (!idEl || !passEl) {
    console.error("id or pass element not found");
    if (msg) msg.textContent = "入力欄が見つかりません";
    return;
  }

  const id = idEl.value.trim();
  const pass = passEl.value;

  console.log("input id:", id);

  if (!id || !pass) {
    if (msg) msg.textContent = "IDとパスワードを入力してね";
    return;
  }

  try {
    const email = toFirebaseEmail(id);
    console.log("firebase email:", email);

    const cred = await signInWithEmailAndPassword(auth, email, pass);
    console.log("login success uid:", cred.user.uid);

    localStorage.setItem("loggedIn", "true");
    setCurrentUser(id);
    setCurrentUid(cred.user.uid);

    try {
      await ensureCloudUser();
      console.log("ensureCloudUser done");
    } catch (cloudErr) {
      console.error("ensureCloudUser error:", cloudErr);
    }

    if (msg) msg.textContent = "ログイン成功、移動します";
    window.location.href = "dashboard.html";

  } catch (e) {
    console.error("login error:", e);

    let text = "ログインに失敗しました";

    switch (e.code) {
      case "auth/invalid-email":
        text = "IDは test のように入力してください（@demo.local は不要）";
        break;
      case "auth/invalid-credential":
        text = "IDまたはパスワードが違います";
        break;
      case "auth/user-not-found":
        text = "このIDは登録されていません";
        break;
      case "auth/wrong-password":
        text = "パスワードが違います";
        break;
      case "auth/network-request-failed":
        text = "通信エラーです";
        break;
      default:
        text = `ログイン失敗: ${e.code || "unknown"}`;
        break;
    }

    if (msg) msg.textContent = text;
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

window.addEventListener("pageshow", () => {
  const staffLinkText = document.getElementById("staffLinkText");
  const staffBackMessage = sessionStorage.getItem("staffBackMessage");

  if (staffLinkText && staffBackMessage === "1") {
    staffLinkText.textContent = "クッ！バレたか。ブラウザバックに気づくとは...なかなかやるな...";
    sessionStorage.removeItem("staffBackMessage");
  }
});

window.login = login;
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
