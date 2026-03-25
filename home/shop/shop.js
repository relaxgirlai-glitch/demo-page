const PRODUCTS = [
  { id: "okawari_normal", name: "おかわり券", price: 5000, category: "ticket", desc: "使用するとおかわりじゃんけんを無視しておかわりできる。" },
  { id: "okawari_dessert", name: "デザートおかわり券", price: 12500, category: "ticket", desc: "使用するとデザートじゃんけんを無視しておかわりできる。" },

  { id: "icon_change", name: "アイコン変更券", price: 1500, category: "power", desc: "プロフィールで使うとアイコンを変えることができる。" },
  { id: "maxbet_plus", name: "MAX BET数+500", price: 1500, category: "power", desc: "なんと！これを買うとMAX BET数を+500できる。" },
  { id: "game_plus", name: "ゲーム回数+1", price: 750, category: "power", desc: "今日のプレイ可能回数を+1する。" }
];

const MAX_OWN = {
  okawari_normal: 1,
  okawari_dessert: 1,
  icon_change: 1,
  maxbet_plus: 8,
  game_plus: 5
};

const shopParams = new URLSearchParams(location.search);
const tabFromURL = shopParams.get("tab");
let currentTab = tabFromURL || localStorage.getItem("shopTab") || "ticket";

function showMsg(text) {
  const el = document.getElementById("shopMsg");
  if (el) el.textContent = text;
}

function hasCore() {
  return (
    typeof window.getUserData === "function" &&
    typeof window.setUserData === "function" &&
    typeof window.getCoins === "function" &&
    typeof window.setCoins === "function"
  );
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function safeGetInventory() {
  const d = window.getUserData();
  if (!Array.isArray(d.inventory)) {
    d.inventory = [];
    window.setUserData(d);
  }
  return d.inventory;
}

function safeSetInventory(inv) {
  const d = window.getUserData();
  d.inventory = inv;
  window.setUserData(d);
}

function ownedCount(id) {
  if (!hasCore()) return 0;
  return safeGetInventory().filter(x => x === id).length;
}

function getMaxOwn(id) {
  return Number.isFinite(MAX_OWN[id]) ? MAX_OWN[id] : Infinity;
}

function resetDailyItemsIfNeeded() {
  if (!hasCore()) return;

  const d = window.getUserData();
  const today = todayKey();

  if (d.shopDay !== today) {
    d.shopDay = today;

    if (!Array.isArray(d.inventory)) d.inventory = [];
    d.inventory = d.inventory.filter(x => x !== "game_plus");

    window.setUserData(d);
  }
}

function updateTabUI() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === currentTab);
  });
}

function renderShop() {
  const box = document.getElementById("shopContent");
  if (!box) return;

  box.innerHTML = "";

  if (!hasCore()) {
    box.innerHTML = `<div style="padding:10px;opacity:.8;">app.js が読み込まれていません</div>`;
    return;
  }

  resetDailyItemsIfNeeded();

  const list = PRODUCTS.filter(p => p.category === currentTab);

  if (list.length === 0) {
    box.innerHTML = `<div style="padding:10px;opacity:.8;">商品がありません</div>`;
    return;
  }

  list.forEach(p => {
    const row = document.createElement("div");
    row.className = "shop-row";

    const own = ownedCount(p.id);
    const max = getMaxOwn(p.id);
    const isMax = own >= max;

    row.innerHTML = `
      <div class="row-left">
        <div class="row-name">${p.name}</div>
        <div class="row-desc">${p.desc}</div>
        <div class="row-sub ${isMax ? "owned-max" : ""}">
          💰 ${p.price} / 所持: ${own}${Number.isFinite(max) ? ` / 最大: ${max}` : ""}
        </div>
      </div>
      <button class="buy-btn" type="button" ${isMax ? "disabled" : ""}>購入</button>
    `;

    const btn = row.querySelector(".buy-btn");
    if (!btn) return;

    btn.addEventListener("click", () => buy(p.id, row));
    box.appendChild(row);
  });
}

function setTab(tab) {
  if (!["ticket", "power"].includes(tab)) tab = "ticket";

  currentTab = tab;
  localStorage.setItem("shopTab", currentTab);

  updateTabUI();
  renderShop();
}

function buy(productId, rowEl) {
  try {
    const p = PRODUCTS.find(x => x.id === productId);
    if (!p) return;

    resetDailyItemsIfNeeded();

    const shakeRow = () => {
      if (!rowEl) return;
      rowEl.classList.remove("shake");
      void rowEl.offsetWidth;
      rowEl.classList.add("shake");
    };

    const own = ownedCount(productId);
    const max = getMaxOwn(productId);

    if (own >= max) {
      showMsg("これ以上持てません！");
      shakeRow();
      renderShop();
      return;
    }

    const coins = window.getCoins();
    if (coins < p.price) {
      showMsg("コインが足りません！");
      shakeRow();
      return;
    }

    const before = JSON.parse(JSON.stringify(window.getUserData()));

    window.setCoins(coins - p.price);
    if (typeof window.updateCoinDisplay === "function") {
      window.updateCoinDisplay(true);
    }

    const inv = safeGetInventory();
    inv.push(productId);
    safeSetInventory(inv);

    if (productId === "game_plus") {
      const d = window.getUserData();

      if (d.playDate !== todayKey()) {
        d.playDate = todayKey();
        d.playCount = 0;
      }

      d.playCount = Math.max(0, Number(d.playCount || 0) - 1);
      window.setUserData(d);
    }

    showMsg(`${p.name} を購入しました！`);

    if (typeof showNotice === "function") {
      showNotice(`${p.name} を購入しました。`, 3000, {
        undo: () => {
          window.setUserData(before);
          if (typeof window.updateCoinDisplay === "function") {
            window.updateCoinDisplay(true);
          }
          renderShop();
        }
      });
    }

    renderShop();
  } catch (e) {
    console.error(e);
    showMsg("エラーが発生しました（コンソール確認）");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  setTab(currentTab);
});

let noticeTimer = null;
let lastNoticeBaseMessage = "";
let lastNoticeCount = 0;
let noticeVersion = 0;

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

function showNotice(baseMessage, duration = 1000, options = {}) {
  ensureNoticeBox();

  const box = document.getElementById("noticeBox");
  const text = document.getElementById("noticeText");
  const bar = document.getElementById("noticeBar");
  const actions = document.getElementById("noticeActions");

  if (!box || !text || !bar || !actions) return;

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

  if (noticeTimer) clearTimeout(noticeTimer);

  const currentVersion = ++noticeVersion;

  bar.style.transition = "none";
  bar.style.width = "100%";

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

  noticeTimer = setTimeout(() => {
    if (currentVersion !== noticeVersion) return;

    box.classList.remove("show");

    setTimeout(() => {
      if (currentVersion !== noticeVersion) return;

      bar.style.transition = "none";
      bar.style.width = "100%";

      lastNoticeBaseMessage = "";
      lastNoticeCount = 0;
      noticeTimer = null;
    }, 250);
  }, duration);
}