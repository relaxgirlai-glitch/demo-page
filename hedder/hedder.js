(function () {
  function ensureHeaderExists() {
    if (document.querySelector(".coin-bar")) return;

    const header = document.createElement("div");
    header.className = "coin-bar";
    header.innerHTML = `
      <div class="coin-line">💰 Coins: <span id="coinDisplay">0</span></div>
      <div id="coinMilestone" class="coin-milestone" style="display:none;"></div>
    `;
    document.body.prepend(header);
  }

  function formatCoins(v) {
    const s = String(v).replace(/[, ]+/g, "");
    const num = Number(s);
    if (!Number.isFinite(num)) return "0";

    if (num >= 100000000) {
      const oku = Math.floor((num / 100000000) * 10) / 10;
      return `${oku.toFixed(1)}億`;
    }
    if (num >= 100000) {
      const man = Math.floor((num / 10000) * 10) / 10;
      return `${man.toFixed(1)}万`;
    }
    return String(Math.floor(num));
  }

  function readCoins() {
    if (typeof window.getCoins === "function") {
      return Number(window.getCoins()) || 0;
    }

    const staff = localStorage.getItem("currentStaffUser");
    if (staff) {
      try {
        const d = JSON.parse(localStorage.getItem(`staff_${staff}`) || "{}");
        return Number(d.coins || 0);
      } catch {
        return 0;
      }
    }

    const user = localStorage.getItem("currentUser");
    if (user) {
      try {
        const d = JSON.parse(localStorage.getItem(`user_${user}`) || "{}");
        return Number(d.coins || 0);
      } catch {
        return 0;
      }
    }

    return 0;
  }

  function isStaffPage() {
    const path = location.pathname.replace(/\\/g, "/").toLowerCase();
    return path.includes("/staff/");
  }

  let lastText = null;
  let lastMsg = null;

  function updateMilestoneMessage(coins) {
    const el = document.getElementById("coinMilestone");
    if (!el) return;

    const staffMode = isStaffPage();
    let msg = "";

    if (staffMode) {
      if (coins >= 1000000) {
        msg = "100万を超えた...？無限に増やせるのに何がしたいんだ？";
      } else if (coins >= 100000) {
        msg = "10万を超えた！無駄な努力...";
      }
    } else {
      if (coins >= 1000000) {
        msg = "100万を超えた...？キミは何がしたいんだ？";
      } else if (coins >= 100000) {
        msg = "10万を超えた！なんという暇人なんだ！";
      }
    }

    if (!msg) {
      el.style.display = "none";
      el.textContent = "";
      lastMsg = "";
      return;
    }

    if (msg !== lastMsg) {
      el.style.display = "block";
      el.textContent = msg;
      lastMsg = msg;
    }
  }

  function updateCoinDisplay(force = false) {
    ensureHeaderExists();
    const el = document.getElementById("coinDisplay");
    if (!el) return;

    const coins = readCoins();
    const text = formatCoins(coins);

    if (force || text !== lastText) {
      lastText = text;
      el.textContent = text;
    }

    updateMilestoneMessage(coins);
  }

  function renderHeader() {
    ensureHeaderExists();
    updateCoinDisplay(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderHeader);
  } else {
    renderHeader();
  }

  window.updateCoinDisplay = updateCoinDisplay;
  window.renderHeader = renderHeader;

  function hook(name) {
    if (typeof window[name] === "function" && !window[name].__hooked_for_header) {
      const orig = window[name];
      const wrapped = function (...args) {
        const r = orig.apply(this, args);
        updateCoinDisplay(true);
        return r;
      };
      wrapped.__hooked_for_header = true;
      window[name] = wrapped;
    }
  }

  hook("setCoins");
  hook("setUserData");
  hook("setCurrentUser");
  hook("setStaffData");
  hook("setCurrentStaffUser");
  hook("claimBonus");

  window.addEventListener("storage", () => updateCoinDisplay(true));
})();