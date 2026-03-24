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

// ✅ ここ修正済み（params衝突回避）
const shopParams = new URLSearchParams(location.search);
const tabFromURL = shopParams.get("tab");
let currentTab = tabFromURL || localStorage.getItem("staffShopTab") || "ticket";

function showMsg(text) {
  const el = document.getElementById("shopMsg");
  if (el) el.textContent = text;
}

function hasCore() {
  return (
    typeof getStaffData === "function" &&
    typeof setStaffData === "function" &&
    typeof getCoins === "function" &&
    typeof setCoins === "function"
  );
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function safeGetInventory() {
  const d = getStaffData();
  if (!Array.isArray(d.inventory)) {
    d.inventory = [];
    setStaffData(d);
  }
  return d.inventory;
}

function safeSetInventory(inv) {
  const d = getStaffData();
  d.inventory = inv;
  setStaffData(d);
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

  const d = getStaffData();
  const today = todayKey();

  if (d.shopDay !== today) {
    d.shopDay = today;

    if (!Array.isArray(d.inventory)) d.inventory = [];
    d.inventory = d.inventory.filter(x => x !== "game_plus");

    setStaffData(d);
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
    box.innerHTML = `<div style="padding:10px;opacity:.8;">staff app.js が読み込まれていません</div>`;
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
  localStorage.setItem("staffShopTab", currentTab);

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

    const coins = getCoins();
    if (coins < p.price) {
      showMsg("コインが足りません！");
      shakeRow();
      return;
    }

    const before = getStaffData();

    setCoins(coins - p.price);
    if (typeof updateCoinDisplay === "function") updateCoinDisplay();

    const inv = safeGetInventory();
    inv.push(productId);
    safeSetInventory(inv);

    if (productId === "game_plus") {
      const d = getStaffData();
      d.playCount = Math.max(0, Number(d.playCount || 0) - 1);
      setStaffData(d);
    }

    showMsg(`${p.name} を購入しました！`);

    if (typeof showNotice === "function") {
      showNotice(`${p.name} を購入しました。`, 3000, {
        undo: () => {
          setStaffData(before);
          updateCoinDisplay();
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