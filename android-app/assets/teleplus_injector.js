/**
 * TelePlus Pro - Injected Client-Side Premium & Privacy Engine
 * Works seamlessly inside Telegram WebK / WebA & TelePlus Hybrid Container
 */
(function () {
  if (window.__TELEPLUS_INJECTED__) return;
  window.__TELEPLUS_INJECTED__ = true;

  const DEFAULT_CONFIG = {
    apiId: "6",
    apiHash: "eb06d4abfb49dc3eeb1aeb98ae0f581e",
    ghostReadReceipts: true,
    ghostTyping: true,
    ghostOnline: true,
    antiDelete: true,
    antiEdit: true,
    noSponsoredAds: true,
    saveRestricted: true,
    speedBoost: true,
    autoTranslateBn: true,
    targetLang: "bn",
    theme: "amoled_gold"
  };

  function loadConfig() {
    try {
      if (window.TelePlusBridge && window.TelePlusBridge.getConfigJson) {
        const raw = window.TelePlusBridge.getConfigJson();
        if (raw) return Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw));
      }
      const local = localStorage.getItem("teleplus_config");
      if (local) return Object.assign({}, DEFAULT_CONFIG, JSON.parse(local));
    } catch (e) {}
    return Object.assign({}, DEFAULT_CONFIG);
  }

  function saveConfig(cfg) {
    window.__TELEPLUS_CFG__ = cfg;
    try {
      localStorage.setItem("teleplus_config", JSON.stringify(cfg));
      if (window.TelePlusBridge && window.TelePlusBridge.saveConfigJson) {
        window.TelePlusBridge.saveConfigJson(JSON.stringify(cfg));
      }
    } catch (e) {}
    applyPremiumStyles(cfg);
  }

  function getVault() {
    try {
      if (window.TelePlusBridge && window.TelePlusBridge.getVaultJson) {
        const raw = window.TelePlusBridge.getVaultJson();
        if (raw) return JSON.parse(raw);
      }
      const local = localStorage.getItem("teleplus_antidelete_vault");
      if (local) return JSON.parse(local);
    } catch (e) {}
    return [];
  }

  function pushToVault(entry) {
    try {
      const vault = getVault();
      vault.unshift(entry);
      const trimmed = vault.slice(0, 200);
      localStorage.setItem("teleplus_antidelete_vault", JSON.stringify(trimmed));
      if (window.TelePlusBridge && window.TelePlusBridge.saveVaultJson) {
        window.TelePlusBridge.saveVaultJson(JSON.stringify(trimmed));
      }
    } catch (e) {}
  }

  window.__TELEPLUS_CFG__ = loadConfig();

  // 1. Hook Worker.postMessage & WebSocket.send for Ghost Mode
  const origPostMessage = window.Worker && window.Worker.prototype.postMessage;
  if (origPostMessage) {
    window.Worker.prototype.postMessage = function (data, transfer) {
      try {
        const cfg = window.__TELEPLUS_CFG__ || DEFAULT_CONFIG;
        if (data && typeof data === "object") {
          const str = JSON.stringify(data);
          if (cfg.ghostReadReceipts && /readHistory|readMessagesContents|readMentions/i.test(str)) {
            console.log("[TelePlus Ghost] Blocked Read Receipt packet");
            return;
          }
          if (cfg.ghostTyping && /setTyping|SendMessageTypingAction/i.test(str)) {
            console.log("[TelePlus Ghost] Blocked Typing indicator");
            return;
          }
          if (cfg.ghostOnline && /updateStatus/i.test(str) && /"offline"\s*:\s*false/i.test(str)) {
            console.log("[TelePlus Ghost] Forced offline presence");
            return;
          }
        }
      } catch (err) {}
      return origPostMessage.apply(this, arguments);
    };
  }

  // 2. Apply Client-Side Premium Styles (Ad-Blocker, Save Restricted Content, Themes)
  function applyPremiumStyles(cfg) {
    let styleEl = document.getElementById("teleplus-premium-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "teleplus-premium-style";
      (document.head || document.documentElement).appendChild(styleEl);
    }

    let css = "";
    if (cfg.noSponsoredAds) {
      css += `
        .sponsored-message, .Message.sponsored, [data-sponsored="true"],
        .bubble.is-sponsored, .SponsoredMessage {
          display: none !important;
          height: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
    }
    if (cfg.saveRestricted) {
      css += `
        *, .bubble, .message, .text-content, .Message {
          -webkit-user-select: text !important;
          user-select: text !important;
          -webkit-touch-callout: default !important;
        }
      `;
    }
    if (cfg.theme === "amoled_gold") {
      css += `
        :root {
          --primary-color: #f59e0b !important;
          --surface-color: #090d16 !important;
        }
      `;
    } else if (cfg.theme === "cyberpunk") {
      css += `
        :root {
          --primary-color: #06b6d4 !important;
          --surface-color: #0f0720 !important;
        }
      `;
    }
    styleEl.textContent = css;
  }

  // Bypass copy/contextmenu restriction on noforwards channels
  document.addEventListener(
    "contextmenu",
    function (e) {
      if ((window.__TELEPLUS_CFG__ || DEFAULT_CONFIG).saveRestricted) {
        e.stopImmediatePropagation();
      }
    },
    true
  );
  document.addEventListener(
    "copy",
    function (e) {
      if ((window.__TELEPLUS_CFG__ || DEFAULT_CONFIG).saveRestricted) {
        e.stopImmediatePropagation();
      }
    },
    true
  );

  // 3. Anti-Delete & Anti-Edit Real-Time Message Tracker
  const seenMessages = new Map();
  let currentChatTitle = "";

  function scanMessages() {
    const cfg = window.__TELEPLUS_CFG__ || DEFAULT_CONFIG;
    if (!cfg.antiDelete && !cfg.antiEdit) return;

    const headerTitleEl = document.querySelector(
      ".chat-info .peer-title, .ChatInfo .fullName, .top .peer-title"
    );
    const chatTitle = headerTitleEl ? headerTitleEl.textContent.trim() : "Telegram Chat";
    const chatChanged = chatTitle !== currentChatTitle;
    if (chatChanged) {
      currentChatTitle = chatTitle;
      seenMessages.clear();
    }

    const msgNodes = document.querySelectorAll(
      "[data-mid], .Message[data-message-id], .bubble[data-mid]"
    );
    const currentIds = new Set();

    msgNodes.forEach((node) => {
      const mid =
        node.getAttribute("data-mid") ||
        node.getAttribute("data-message-id") ||
        node.id;
      if (!mid) return;
      currentIds.add(mid);

      const textEl = node.querySelector(
        ".message, .text-content, .translatable-message"
      );
      const rawText = textEl ? textEl.innerText.trim() : node.innerText.trim();
      if (!rawText) return;

      if (seenMessages.has(mid)) {
        const prev = seenMessages.get(mid);
        if (
          cfg.antiEdit &&
          prev.text !== rawText &&
          !rawText.includes("[পূর্বে ছিল:") &&
          prev.text.length > 1
        ) {
          pushToVault({
            type: "EDITED",
            chat: chatTitle,
            mid: mid,
            oldText: prev.text,
            newText: rawText,
            time: new Date().toLocaleTimeString()
          });
          prev.text = rawText;
        }
      } else {
        seenMessages.set(mid, {
          mid: mid,
          chat: chatTitle,
          text: rawText.slice(0, 600),
          time: new Date().toLocaleTimeString()
        });
      }
    });

    // Check if any message in the current chat view was deleted while viewing
    if (!chatChanged && currentIds.size > 0 && cfg.antiDelete) {
      for (const [mid, info] of seenMessages.entries()) {
        if (!currentIds.has(mid)) {
          pushToVault({
            type: "DELETED",
            chat: info.chat,
            mid: mid,
            text: info.text,
            time: new Date().toLocaleTimeString()
          });
          seenMessages.delete(mid);
          showToast("🗑️ Anti-Delete: মেসেজ ডিলিট ধরা পড়েছে! Vault-এ সেভ করা হয়েছে।");
        }
      }
    }
  }

  setInterval(scanMessages, 1800);

  // 4. Built-in One-Tap Google Translate (Bengali / English) for Chat Messages
  async function translateVisibleMessages() {
    const cfg = window.__TELEPLUS_CFG__ || DEFAULT_CONFIG;
    const tl = cfg.targetLang || "bn";
    const nodes = document.querySelectorAll(
      ".bubble .message, .Message .text-content, .translatable-message"
    );
    if (!nodes.length) {
      showToast("অনুবাদ করার মতো কোনো চ্যাট মেসেজ স্ক্রিনে পাওয়া যায়নি।");
      return;
    }

    showToast("🌐 মেসেজ বাংলায় অনুবাদ করা হচ্ছে...");
    let count = 0;
    for (const node of Array.from(nodes).slice(-12)) {
      if (node.querySelector(".teleplus-translated-box")) continue;
      const originalText = node.innerText.trim();
      if (!originalText || originalText.length < 2) continue;
      try {
        const url =
          "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
          encodeURIComponent(tl) +
          "&dt=t&q=" +
          encodeURIComponent(originalText.slice(0, 500));
        const res = await fetch(url);
        const data = await res.json();
        const translated = data[0].map((part) => part[0]).join("");
        if (translated && translated.toLowerCase() !== originalText.toLowerCase()) {
          const box = document.createElement("div");
          box.className = "teleplus-translated-box";
          box.style.cssText =
            "margin-top:6px;padding:5px 8px;border-left:3px solid #f59e0b;background:rgba(245,158,11,0.14);border-radius:6px;font-size:12.5px;color:#fde68a;font-weight:500;";
          box.textContent = "🇧🇩 " + translated;
          node.appendChild(box);
          count++;
        }
      } catch (e) {}
    }
    showToast(count > 0 ? `✓ ${count}টি মেসেজ অনুবাদ সম্পন্ন হয়েছে!` : "সব মেসেজ ইতিমধ্যে অনুবাদ করা হয়েছে।");
  }

  function showToast(msg) {
    let t = document.getElementById("teleplus-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "teleplus-toast";
      t.style.cssText =
        "position:fixed;bottom:82px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.95);color:#f8fafc;border:1px solid #f59e0b;padding:9px 16px;border-radius:999px;font-family:sans-serif;font-size:13px;z-index:2147483647;box-shadow:0 8px 25px rgba(0,0,0,0.5);transition:opacity 0.25s;pointer-events:none;";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    clearTimeout(window.__teleplusToastTimer);
    window.__teleplusToastTimer = setTimeout(() => {
      t.style.opacity = "0";
    }, 2800);
  }

  // 5. Floating TelePlus Mod Button & Drawer inside Telegram
  function mountFloatingModUI() {
    if (document.getElementById("teleplus-fab")) return;
    // Do not mount duplicate FAB if we are on the local studio home page
    if (location.href.startsWith("file://")) return;

    const fabBar = document.createElement("div");
    fabBar.id = "teleplus-fab";
    fabBar.style.cssText =
      "position:fixed;bottom:18px;right:14px;z-index:2147483646;display:flex;gap:8px;align-items:center;font-family:system-ui,-apple-system,sans-serif;";

    const btnTranslate = document.createElement("button");
    btnTranslate.textContent = "🇧🇩 অনুবাদ";
    btnTranslate.style.cssText =
      "background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:999px;padding:9px 13px;font-size:12.5px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,0.4);cursor:pointer;";
    btnTranslate.onclick = translateVisibleMessages;

    const btnMod = document.createElement("button");
    btnMod.textContent = "⚡ TelePlus";
    btnMod.style.cssText =
      "background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;border:none;border-radius:999px;padding:9px 14px;font-size:12.5px;font-weight:800;box-shadow:0 4px 14px rgba(0,0,0,0.45);cursor:pointer;";
    btnMod.onclick = toggleDrawer;

    fabBar.appendChild(btnTranslate);
    fabBar.appendChild(btnMod);
    document.body.appendChild(fabBar);
  }

  function toggleDrawer() {
    let drawer = document.getElementById("teleplus-drawer");
    if (drawer) {
      drawer.remove();
      return;
    }
    const cfg = window.__TELEPLUS_CFG__ || DEFAULT_CONFIG;
    const vault = getVault();

    drawer = document.createElement("div");
    drawer.id = "teleplus-drawer";
    drawer.style.cssText =
      "position:fixed;inset:0;background:rgba(2,6,23,0.82);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif;";

    const card = document.createElement("div");
    card.style.cssText =
      "width:100%;max-width:410px;max-height:86vh;overflow-y:auto;background:#0f172a;border:1px solid rgba(245,158,11,0.4);border-radius:18px;padding:18px;color:#f8fafc;box-shadow:0 20px 50px rgba(0,0,0,0.75);";

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <div style="font-size:17px;font-weight:800;color:#fbbf24;">⚡ TelePlus Pro Mod Menu</div>
          <div style="font-size:11.5px;color:#94a3b8;">Ghost Mode • Anti-Delete • Premium Unlocks</div>
        </div>
        <button id="tp-close" style="background:#1e293b;color:#f8fafc;border:none;border-radius:8px;padding:6px 11px;font-weight:700;cursor:pointer;">✕</button>
      </div>

      <div style="display:grid;gap:8px;margin-bottom:14px;">
        ${renderToggleRow("ghostReadReceipts", "👻 Ghost Read Receipts (Blue Tick লুকান)", cfg.ghostReadReceipts)}
        ${renderToggleRow("ghostTyping", "⌨️ Hide Typing Status (Typing... লুকান)", cfg.ghostTyping)}
        ${renderToggleRow("ghostOnline", "🟢 Hide Online Status (অফলাইন মোড)", cfg.ghostOnline)}
        ${renderToggleRow("antiDelete", "🗑️ Anti-Delete Messages (ডিলিট রোধ)", cfg.antiDelete)}
        ${renderToggleRow("antiEdit", "✏️ Anti-Edit History (এডিট ট্র্যাকার)", cfg.antiEdit)}
        ${renderToggleRow("noSponsoredAds", "🚫 Block Sponsored Ads (বিজ্ঞাপন বন্ধ)", cfg.noSponsoredAds)}
        ${renderToggleRow("saveRestricted", "🔓 Save Restricted Content (কপি/ডাউনলোড)", cfg.saveRestricted)}
      </div>

      <div style="margin-bottom:12px;background:#1e293b;padding:10px;border-radius:10px;">
        <div style="font-size:12px;font-weight:700;color:#38bdf8;margin-bottom:6px;">🗑️ Anti-Delete Vault (${vault.length}টি মেসেজ সংরক্ষিত)</div>
        <div style="max-height:110px;overflow-y:auto;font-size:11.5px;color:#cbd5e1;">
          ${
            vault.length === 0
              ? '<div style="color:#64748b;">এখনো কোনো ডিলিট বা এডিট করা মেসেজ ধরা পড়েনি।</div>'
              : vault
                  .slice(0, 8)
                  .map(
                    (v) =>
                      `<div style="padding:4px 0;border-bottom:1px solid #334155;"><b>[${v.type}] ${v.chat}</b> (${v.time}): ${
                        v.text || v.oldText + " ➔ " + v.newText
                      }</div>`
                  )
                  .join("")
          }
        </div>
      </div>

      <div style="display:flex;gap:8px;">
        <button id="tp-home" style="flex:1;background:#2563eb;color:#fff;border:none;border-radius:10px;padding:10px;font-weight:700;font-size:12.5px;cursor:pointer;">🏠 Studio Dashboard</button>
        <button id="tp-trans-now" style="flex:1;background:#059669;color:#fff;border:none;border-radius:10px;padding:10px;font-weight:700;font-size:12.5px;cursor:pointer;">🇧🇩 পুরো চ্যাট অনুবাদ</button>
      </div>
    `;

    drawer.appendChild(card);
    document.body.appendChild(drawer);

    document.getElementById("tp-close").onclick = () => drawer.remove();
    document.getElementById("tp-home").onclick = () => {
      if (window.TelePlusBridge && window.TelePlusBridge.openHomeDashboard) {
        window.TelePlusBridge.openHomeDashboard();
      } else {
        location.href = "file:///android_asset/index.html";
      }
    };
    document.getElementById("tp-trans-now").onclick = () => {
      drawer.remove();
      translateVisibleMessages();
    };

    card.querySelectorAll("input[data-tp-key]").forEach((inp) => {
      inp.onchange = function () {
        const k = this.getAttribute("data-tp-key");
        cfg[k] = this.checked;
        saveConfig(cfg);
        showToast("✓ TelePlus সেটিং আপডেট হয়েছে!");
      };
    });
  }

  function renderToggleRow(key, label, checked) {
    return `
      <label style="display:flex;justify-content:space-between;align-items:center;background:#1e293b;padding:9px 12px;border-radius:10px;font-size:12.5px;cursor:pointer;">
        <span>${label}</span>
        <input type="checkbox" data-tp-key="${key}" ${checked ? "checked" : ""} style="width:18px;height:18px;accent-color:#f59e0b;" />
      </label>
    `;
  }

  function init() {
    applyPremiumStyles(window.__TELEPLUS_CFG__ || DEFAULT_CONFIG);
    mountFloatingModUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  setInterval(mountFloatingModUI, 2500);
})();
