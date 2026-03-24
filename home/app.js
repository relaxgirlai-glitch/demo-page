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
} from "./firebase.js";

const BONUS_LIST = [50, 100, 150, 250, 350, 500, 750];
const ADMIN_CODE = "sushi-1234";

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
  bar.inner
