/**
 * ai-assistant.js
 * ------------------------------------------------------------------
 * Shivaksh AI — premium floating restaurant concierge.
 *
 * Self-contained, vanilla JS. Reads MENU_ITEMS / CATEGORIES / RESTAURANT
 * (globals from menu.js) and drives the existing site through
 * window.ShivakshApp (the bridge exposed at the end of script.js) —
 * it never re-implements cart, filter, search or sheet logic.
 *
 * If window.ShivakshApp isn't available for any reason, the bubble
 * simply doesn't activate — the restaurant menu itself is never
 * affected by an AI failure.
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  const AI_CONFIG = {
    mode: "local", // "local" = on-device menu-aware assistant, no network calls
    apiEndpoint: null
  };

  const THEME_KEY = "shivaksh_ai_theme_v1";
  const ONBOARDED_KEY = "shivaksh_ai_onboarded_v1";

  /* ======================================================================
     BOOTSTRAP — wait for the DOM + the app bridge, fail silently/safely
     ====================================================================== */
  function boot() {
    const app = window.ShivakshApp;
    if (!app) {
      // Menu app failed to init its API bridge — don't break the page,
      // just skip the AI feature entirely.
      console.warn("[Shivaksh AI] ShivakshApp bridge not found — assistant disabled.");
      return;
    }
    if (AI_CONFIG.mode !== "local") {
      // Static/GitHub-Pages site: never call an external AI endpoint from
      // client-side JS (that would require exposing a secret key). Only
      // "local" mode — the on-device menu-aware assistant — is supported
      // until a secure backend is connected.
      console.warn("[Shivaksh AI] Unsupported AI_CONFIG.mode — falling back to local mode.");
    }
    try {
      initAssistant(app);
    } catch (err) {
      console.error("[Shivaksh AI] failed to initialize:", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* ======================================================================
     MAIN
     ====================================================================== */
  function initAssistant(app) {
    const bubble = document.getElementById("aiBubble");
    const panel = document.getElementById("aiPanel");
    const messagesEl = document.getElementById("aiMessages");
    const chipsEl = document.getElementById("aiQuickChips");
    const inputEl = document.getElementById("aiInput");
    const sendBtn = document.getElementById("aiSendBtn");
    const themeToggleBtn = document.getElementById("aiThemeToggle");
    const minimizeBtn = document.getElementById("aiMinimizeBtn");
    const closeBtn = document.getElementById("aiCloseBtn");

    if (!bubble || !panel || !messagesEl || !inputEl) return;

    /* ---------------------------------------------------------------
       Conversation / preference state (temporary, lives while open)
       --------------------------------------------------------------- */
    const state = {
      isOpen: false,
      isMinimized: false,
      hasOnboarded: false, // has this browser seen onboarding before
      stage: "idle", // idle | mood | foodType | budget | ready
      shownIds: new Set(), // every item id already recommended this session
      prefs: {
        mood: null,
        foodType: null,
        category: null,
        spicePreference: null,
        budget: null, // { max: number|null, label: string }
        previousQueries: []
      },
      lastRecommendations: [], // array of MENU_ITEMS refs
      lastCategory: null,
      lastFoodType: null,
      lastQuery: null
    };

    /* ---------------------------------------------------------------
       THEME
       --------------------------------------------------------------- */
    function loadTheme() {
      try {
        return localStorage.getItem(THEME_KEY) || "dark";
      } catch (e) {
        return "dark";
      }
    }
    function saveTheme(t) {
      try {
        localStorage.setItem(THEME_KEY, t);
      } catch (e) {
        /* ignore */
      }
    }
    let aiTheme = loadTheme();
    function applyAiTheme(t, announce) {
      aiTheme = t === "light" ? "light" : "dark";
      panel.setAttribute("data-theme", aiTheme);
      if (themeToggleBtn) {
        themeToggleBtn.textContent = aiTheme === "dark" ? "🌙" : "☀";
        themeToggleBtn.setAttribute(
          "aria-label",
          aiTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"
        );
      }
      saveTheme(aiTheme);
      if (announce) {
        addAiText(`Done — switched to ${aiTheme} mode ${aiTheme === "dark" ? "🌙" : "☀"}`);
      }
    }
    applyAiTheme(aiTheme, false);

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", () => {
        applyAiTheme(aiTheme === "dark" ? "light" : "dark", true);
      });
    }

    /* ---------------------------------------------------------------
       OPEN / CLOSE / MINIMIZE
       --------------------------------------------------------------- */
    function openPanel() {
      state.isOpen = true;
      state.isMinimized = false;
      panel.classList.remove("is-minimized");
      panel.classList.add("is-open");
      bubble.classList.add("is-open");
      bubble.setAttribute("aria-expanded", "true");
      bubble.classList.remove("has-unread");

      if (!state.hasOnboarded) {
        state.hasOnboarded = true;
        try { localStorage.setItem(ONBOARDED_KEY, "1"); } catch (e) {}
        setTimeout(runOnboarding, 200);
      }
      setTimeout(() => inputEl.focus(), 350);
      scrollToBottom();
    }

    function closePanel() {
      state.isOpen = false;
      panel.classList.remove("is-open");
      bubble.classList.remove("is-open");
      bubble.setAttribute("aria-expanded", "false");
    }

    function toggleMinimize() {
      state.isMinimized = !state.isMinimized;
      panel.classList.toggle("is-minimized", state.isMinimized);
      if (!state.isMinimized) setTimeout(() => inputEl.focus(), 200);
    }

    bubble.addEventListener("click", () => {
      if (state.isOpen) closePanel();
      else openPanel();
    });
    if (closeBtn) closeBtn.addEventListener("click", closePanel);
    if (minimizeBtn) minimizeBtn.addEventListener("click", toggleMinimize);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.isOpen) closePanel();
    });

    try {
      state.hasOnboarded = localStorage.getItem(ONBOARDED_KEY) === "1";
    } catch (e) {
      state.hasOnboarded = false;
    }

    /* ---------------------------------------------------------------
       MESSAGE RENDERING
       --------------------------------------------------------------- */
    function scrollToBottom() {
      requestAnimationFrame(() => {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
    }

    function aiAvatarSvg() {
      return `<svg viewBox="0 0 24 24" width="12" height="12" fill="none"><path d="M12 2.5l1.7 4.9 4.9 1.7-4.9 1.7L12 15.7l-1.7-4.9-4.9-1.7 4.9-1.7L12 2.5z" fill="currentColor"/></svg>`;
    }

    // rowEl for an AI message, so options/cards can be appended into it
    function addAiRow() {
      const row = document.createElement("div");
      row.className = "ai-msg-row ai-msg-row--ai";
      row.innerHTML = `<span class="ai-msg-avatar" aria-hidden="true">${aiAvatarSvg()}</span>`;
      messagesEl.appendChild(row);
      scrollToBottom();
      return row;
    }

    function addAiText(text) {
      const row = addAiRow();
      const bubbleEl = document.createElement("div");
      bubbleEl.className = "ai-msg-bubble";
      bubbleEl.textContent = text;
      row.appendChild(bubbleEl);
      scrollToBottom();
      return row;
    }

    function addUserText(text) {
      const row = document.createElement("div");
      row.className = "ai-msg-row ai-msg-row--user";
      const bubbleEl = document.createElement("div");
      bubbleEl.className = "ai-msg-bubble";
      bubbleEl.textContent = text;
      row.appendChild(bubbleEl);
      messagesEl.appendChild(row);
      scrollToBottom();
      return row;
    }

    function addOptions(row, options, onPick) {
      const wrap = document.createElement("div");
      wrap.className = "ai-options";
      options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ai-option-btn";
        btn.textContent = opt.label;
        btn.addEventListener("click", () => {
          if (btn.disabled) return;
          wrap.querySelectorAll(".ai-option-btn").forEach((b) => (b.disabled = true));
          addUserText(opt.label);
          onPick(opt);
        });
        wrap.appendChild(btn);
      });
      row.appendChild(wrap);
      scrollToBottom();
    }

    let typingRow = null;
    function showTyping() {
      hideTyping();
      typingRow = document.createElement("div");
      typingRow.className = "ai-msg-row ai-msg-row--ai";
      typingRow.innerHTML = `<span class="ai-msg-avatar" aria-hidden="true">${aiAvatarSvg()}</span>
        <div class="ai-typing"><span></span><span></span><span></span></div>`;
      messagesEl.appendChild(typingRow);
      scrollToBottom();
    }
    function hideTyping() {
      if (typingRow && typingRow.parentNode) typingRow.parentNode.removeChild(typingRow);
      typingRow = null;
    }

    // Runs `fn` after a short, fast "typing" beat — keeps the assistant
    // feeling alive without ever making the user wait.
    function respond(fn, delay) {
      showTyping();
      setTimeout(() => {
        hideTyping();
        try {
          fn();
        } catch (err) {
          console.error("[Shivaksh AI] response error:", err);
          addAiText("I didn't quite catch that 😅\n\nTry: '₹200 ke andar veg batao'");
        }
      }, delay || 420);
    }

    /* ---------------------------------------------------------------
       RECOMMENDATION CARDS
       --------------------------------------------------------------- */
    function itemImageSrc(item) {
      // Best-effort guess mirroring the site's own asset convention;
      // falls back to an emoji tile on error (see onerror below).
      const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      return `assets/food/${slug}.jpg`;
    }

    function renderRecCard(item) {
      const qtyInCart = app.getCartQty(item.id);
      const isVeg = item.type === "veg";
      const stockHtml = item.available
        ? `<span class="ai-rec-card__stock">● Available</span>`
        : `<span class="ai-rec-card__stock is-out">● Out of Stock</span>`;
      const desc = item.description ? escapeHtmlAi(item.description) : categoryLabelOf(item.category);

      const card = document.createElement("div");
      card.className = "ai-rec-card";
      card.innerHTML = `
        <div class="ai-rec-card__img">
          <img src="${itemImageSrc(item)}" alt="${escapeHtmlAi(item.name)}" loading="lazy"
               onerror="this.style.display='none'; this.parentNode.innerHTML = '${isVeg ? "🥗" : "🍗"}'; this.parentNode.style.fontSize='22px'; this.parentNode.style.display='flex'; this.parentNode.style.alignItems='center'; this.parentNode.style.justifyContent='center';">
        </div>
        <div class="ai-rec-card__info">
          <div class="ai-rec-card__top">
            <span class="ai-rec-card__mark ${isVeg ? "" : "ai-rec-card__mark--nonveg"}" aria-hidden="true"></span>
            <p class="ai-rec-card__name">${escapeHtmlAi(item.name)}</p>
          </div>
          <p class="ai-rec-card__desc">${desc}</p>
          <div class="ai-rec-card__meta">
            <span class="ai-rec-card__price">₹${item.price}</span>
            ${stockHtml}
          </div>
        </div>
        <div class="ai-rec-card__actions">
          <button type="button" class="ai-rec-card__btn ai-rec-card__btn--add" ${item.available ? "" : "disabled"}>
            ${qtyInCart ? `In cart (${qtyInCart})` : "+ Add"}
          </button>
          <button type="button" class="ai-rec-card__btn ai-rec-card__btn--view">View</button>
        </div>
      `;

      const addBtn = card.querySelector(".ai-rec-card__btn--add");
      addBtn.addEventListener("click", () => {
        app.addToCart(item.id, 1);
        addBtn.textContent = `In cart (${app.getCartQty(item.id)})`;
        addAiText(`Added ${item.name} to cart ✓`);
      });
      const viewBtn = card.querySelector(".ai-rec-card__btn--view");
      viewBtn.addEventListener("click", () => {
        app.openDetail(item.id);
      });

      return card;
    }

    function addRecommendations(items, introText) {
      const row = addAiRow();
      const bubbleEl = document.createElement("div");
      bubbleEl.className = "ai-msg-bubble";
      bubbleEl.textContent = introText;
      row.appendChild(bubbleEl);

      const grid = document.createElement("div");
      grid.className = "ai-rec-grid";
      items.forEach((item) => grid.appendChild(renderRecCard(item)));
      row.appendChild(grid);

      items.forEach((it) => state.shownIds.add(it.id));
      state.lastRecommendations = items;

      messagesEl.appendChild(row);
      scrollToBottom();
    }

    function escapeHtmlAi(str) {
      return String(str).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[c]));
    }

    function categoryLabelOf(catId) {
      const cats = app.getCategories();
      const match = cats.find((c) => c.id === catId);
      return match ? match.label : "";
    }

    /* ---------------------------------------------------------------
       NLU — normalization, typo tolerance, keyword mapping
       --------------------------------------------------------------- */
    const TYPO_MAP = {
      chiken: "chicken", chikn: "chicken", chkn: "chicken", chickn: "chicken",
      mushrom: "mushroom", mashroom: "mushroom", mashrum: "mushroom", mushrooom: "mushroom",
      panner: "paneer", panir: "paneer", paneeer: "paneer", pnr: "paneer",
      chowmene: "chowmein", chowmin: "chowmein", chomin: "chowmein", chomein: "chowmein",
      chowmian: "chowmein", chowmeen: "chowmein",
      dhosa: "dosa", dosaa: "dosa",
      biriyani: "biryani", briyani: "biryani", behrani: "biryani", biryni: "biryani", biriani: "biryani",
      sabzi: "sabji", subji: "sabji", sabjee: "sabji",
      daal: "dal", dhal: "dal",
      thaali: "thali",
      salaad: "salad",
      shorba: "soup",
      murga: "chicken", murgh: "chicken",
      khumb: "mushroom",
      chaas: "buttermilk", chachh: "buttermilk"
    };

    function normalize(text) {
      let t = (text || "").toLowerCase().trim().replace(/\s+/g, " ");
      // strip common punctuation that doesn't carry meaning here
      t = t.replace(/[?!.,]+/g, " ").replace(/\s+/g, " ").trim();
      const words = t.split(" ").map((w) => TYPO_MAP[w] || w);
      return words.join(" ");
    }

    // Category keyword map — canonical (typo-fixed) English/Hinglish
    // tokens, plus native Hindi words, mapped to real CATEGORIES ids.
    const CATEGORY_KEYWORDS = [
      ["starters", ["starter", "starters", "starting", "shuru", "appetizer", "appetizers"]],
      ["soups", ["soup", "soups"]],
      ["chowmein", ["chowmein", "chow mein", "noodle", "noodles", "hakka"]],
      ["chinese", ["chinese", "manchurian", "manchooriyan", "chilli", "chili"]],
      ["rolls", ["roll", "rolls", "kathi"]],
      ["southindian", ["dosa", "idli", "uttapam", "south indian", "southindian"]],
      ["biryani", ["biryani"]],
      ["rice", ["rice", "chawal", "pulao", "fried rice"]],
      ["chicken", ["chicken", "murgh", "murga"]],
      ["paneer", ["paneer", "पनीर"]],
      ["mushroom", ["mushroom", "मशरूम"]],
      ["kaju", ["kaju", "cashew", "काजू"]],
      ["sabji", ["sabji", "sabzi", "subji", "curry", "सब्जी"]],
      ["tandoor", ["tandoor", "tandoori", "तंदूर"]],
      ["bread", ["naan", "paratha", "kulcha", "roti", "chapati", "रोटी", "नान"]],
      ["dal", ["dal", "daal", "lentil", "दाल"]],
      ["thali", ["thali", "थाली"]],
      ["salad", ["salad", "raita", "सलाद"]],
      ["drinks", ["drink", "drinks", "lassi", "coffee", "buttermilk", "cold drink", "शीतल पेय"]]
    ];

    function detectCategory(text) {
      for (const [catId, keywords] of CATEGORY_KEYWORDS) {
        for (const kw of keywords) {
          if (text.includes(kw)) return catId;
        }
      }
      return null;
    }

    // NOTE: \b word-boundary regex doesn't work around Devanagari script
    // (\b only fires at a \w / non-\w transition, and Devanagari chars
    // aren't \w in JS regex) — so Hindi terms are matched with plain
    // substring checks instead, kept separate from the ASCII \b regexes.
    const NONVEG_RE = /\bnon[\s-]?veg(etarian)?\b|\bmeat\b|\begg\b/;
    const NONVEG_WORDS_DEV = ["चिकन", "मांस", "अंडा", "मटन"];
    const VEG_RE = /\bveg(etarian)?\b/;
    const VEG_WORDS_DEV = ["शाकाहारी", "वेज"];

    function detectFoodType(text) {
      if (NONVEG_RE.test(text) || NONVEG_WORDS_DEV.some((w) => text.includes(w))) return "nonveg";
      // run veg check only after ruling out nonveg (which itself contains "veg")
      const stripped = text.replace(NONVEG_RE, "");
      if (VEG_RE.test(stripped) || VEG_WORDS_DEV.some((w) => text.includes(w))) return "veg";
      return null;
    }

    const SPICY_RE = /\bspicy\b|\bspice\b|\bmasaledar\b|\btikha\b|\bmirchi\b|\bhot\b|\bmirch\b/;
    const SPICY_WORDS_DEV = ["मसालेदार", "मसाला", "तीखा", "मिर्च"];
    const SPICY_NAME_RE = /chilli|chilly|manchurian|schezwan|szechwan|65|garlic|hot & sour|hot and sour|tikka|kadahi|chatpata/i;

    function detectSpicy(text) {
      return SPICY_RE.test(text) || SPICY_WORDS_DEV.some((w) => text.includes(w));
    }

    // Budget: "under 100", "under ₹100", "100 ke andar", "₹200 ke under",
    // "200 se kam", "300 tak", "cheap food", "budget food"
    function detectBudget(text) {
      let m = text.match(/(?:under|below)\s*(?:rs\.?|₹)?\s*(\d+)/);
      if (m) return { max: Number(m[1]), label: `Under ₹${m[1]}` };

      m = text.match(/(?:rs\.?|₹)?\s*(\d+)\s*(?:ke\s*andar|ke\s*under|se\s*kam|tak|ke\s*niche)/);
      if (m) return { max: Number(m[1]), label: `Under ₹${m[1]}` };

      m = text.match(/(?:rs\.?|₹)\s*(\d+)\s*\+/);
      if (m) return { min: Number(m[1]), label: `₹${m[1]}+` };

      if (/\bcheap\b|\bcheapest\b|\bsasta\b|\bbudget\b/.test(text)) {
        return { max: 150, label: "Budget-friendly" };
      }
      return null;
    }

    // Rule 15 support — "pizza chahiye" (pizza isn't on the menu at all).
    // Only ever applied to Latin-script content words: our menu names are
    // English, so this heuristic is meaningless (and risks false
    // positives) against Devanagari text — that's left to detectCategory.
    const NLU_STOPWORDS = new Set([
      "what", "should", "i", "eat", "today", "the", "a", "an", "is", "are", "for", "me", "my",
      "best", "good", "kya", "hai", "h", "ho", "bhai", "aaj", "sabse", "accha", "acha", "achha",
      "batao", "bata", "dikhao", "dikha", "karo", "kar", "do", "please", "khana", "khau", "khaun",
      "khane", "chahiye", "mujhe", "kuch", "koi", "main", "mai", "me", "hu", "hun", "ke", "ka", "ki",
      "under", "tak", "se", "kam", "budget", "cheap", "rs", "and", "some", "something", "anything",
      "recommend", "suggest", "tell", "show", "find", "menu", "food", "dish", "any", "not", "isme",
      "yeh", "nahi", "aur", "add", "remove", "cart", "order", "mood", "mast", "feeling", "today's",
      // words already understood by the mood/spice/type detectors — never
      // "unknown" dishes, so they must never reach findUnknownDishWord
      "spicy", "spice", "masaledar", "tikha", "mirchi", "hot", "mirch", "veg", "vegetarian",
      "nonveg", "non", "andar", "niche", "andr"
    ]);
    function extractContentWords(text) {
      return text
        .split(" ")
        .filter((w) => w.length > 2 && /^[a-z]+$/.test(w) && !NLU_STOPWORDS.has(w));
    }
    function menuHasWord(word) {
      return app.getMenuItems().some(
        (item) => item.name.toLowerCase().includes(word) || categoryLabelOf(item.category).toLowerCase().includes(word)
      );
    }
    function findUnknownDishWord(text) {
      const words = extractContentWords(text);
      return words.find((w) => !menuHasWord(w)) || null;
    }

    /* ---------------------------------------------------------------
       RECOMMENDATION ENGINE — MENU_ITEMS is the single source of truth
       --------------------------------------------------------------- */
    function scoreItem(item, prefs) {
      let score = 0;
      if (prefs.category && item.category === prefs.category) score += 5;
      if (prefs.foodType && item.type === prefs.foodType) score += 3;
      if (prefs.budget) {
        if (prefs.budget.max != null && item.price > prefs.budget.max) return -Infinity;
        if (prefs.budget.min != null && item.price < prefs.budget.min) return -Infinity;
        score += 1;
      }
      if (prefs.spicy && SPICY_NAME_RE.test(item.name)) score += 4;
      if (!item.available) score -= 10;
      return score;
    }

    function recommend(prefs, opts) {
      opts = opts || {};
      const exclude = opts.exclude || state.shownIds;
      const limit = opts.limit || 4;

      let pool = app.getMenuItems().filter((item) => item.available && !exclude.has(item.id));
      if (pool.length === 0) {
        // everything already shown — allow repeats rather than dead-ending
        pool = app.getMenuItems().filter((item) => item.available);
      }

      let scored = pool
        .map((item) => ({ item, score: scoreItem(item, prefs) }))
        .filter((s) => s.score > -Infinity);

      // If category/type/budget filters left nothing, relax budget first,
      // then relax category — but never invent items outside MENU_ITEMS.
      if (scored.length === 0 && prefs.budget) {
        const relaxed = { ...prefs, budget: null };
        scored = pool.map((item) => ({ item, score: scoreItem(item, relaxed) }));
      }
      if (scored.length === 0 && prefs.category) {
        const relaxed = { ...prefs, category: null };
        scored = pool.map((item) => ({ item, score: scoreItem(item, relaxed) }));
      }

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map((s) => s.item);
    }

    /* ---------------------------------------------------------------
       WEBSITE CONTROL — natural language -> existing site functions
       ---------------------------------------------------------------
       Returns true if the message was handled as a direct site command,
       so the caller can skip the recommendation/chat path.
    */
    function tryHandleCommand(raw, text) {
      // Theme
      if (/\b(dark mode|dark theme|black theme)\b/.test(text) || text === "dark") {
        applyAiTheme("dark", true);
        return true;
      }
      if (/\b(light mode|light theme|white theme)\b/.test(text) || text === "light") {
        applyAiTheme("light", true);
        return true;
      }

      // Cart
      if (/\b(cart dikhao|show.*cart|open cart|my cart|show my cart)\b/.test(text)) {
        respond(() => {
          app.openCartSheet();
          const count = app.getCartTotalCount();
          addAiText(count ? `Here's your cart — ${count} item${count === 1 ? "" : "s"} 🛒` : "Your cart is empty right now.");
        });
        return true;
      }
      if (/\bclose cart\b/.test(text)) {
        respond(() => {
          app.closeCartSheet();
          addAiText("Closed the cart.");
        });
        return true;
      }
      if (/\b(empty (my )?cart|clear cart|cart khali karo|khaali karo)\b/.test(text)) {
        respond(() => {
          if (app.getCartTotalCount() === 0) {
            addAiText("Your cart's already empty!");
            return;
          }
          const row = addAiRow();
          const b = document.createElement("div");
          b.className = "ai-msg-bubble";
          b.textContent = "Clear everything from your cart?";
          row.appendChild(b);
          addOptions(row, [{ label: "Yes, clear it" }, { label: "No, keep it" }], (opt) => {
            respond(() => {
              if (opt.label.startsWith("Yes")) {
                app.clearCart();
                addAiText("Done — your cart is empty now.");
              } else {
                addAiText("No problem, your cart is untouched.");
              }
            }, 300);
          });
        });
        return true;
      }
      if (/\bcheckout\b|\border karo\b|\bplace order\b/.test(text)) {
        respond(() => {
          const ok = app.goToCheckout();
          addAiText(ok ? "Taking you to checkout 🧾" : "Your cart is empty — add a dish first!");
        });
        return true;
      }

      // Remove from cart: "remove paneer", "paneer hatao"
      let m = text.match(/\bremove\s+(.+)/) || text.match(/(.+?)\s+hatao\b/);
      if (m) {
        const query = m[1].trim();
        respond(() => {
          const entries = app.getCartEntries();
          const match = entries.find((e) => e.item.name.toLowerCase().includes(query));
          if (match) {
            app.setQty(match.item.id, 0);
            addAiText(`Removed ${match.item.name} from your cart.`);
          } else {
            addAiText(`I couldn't find "${query}" in your cart.`);
          }
        });
        return true;
      }

      // Add to cart: "add chicken chowmein", "add 2 chicken chowmein",
      // "<dish> add karo", "<dish> daal do"
      let addQty = 1;
      let addQuery = null;
      const addM1 = text.match(/^add\s+(\d+\s+)?(.+)/);
      const addM2 = !addM1 && text.match(/^(.+?)\s+(?:add karo|daal do|de do)$/);
      if (addM1) {
        addQty = addM1[1] ? parseInt(addM1[1], 10) : 1;
        addQuery = addM1[2].trim();
      } else if (addM2) {
        addQuery = addM2[1].trim();
      }
      if (addQuery) {
        const found = findMenuItemByName(addQuery);
        const qty = addQty;
        respond(() => {
          if (found && found.available) {
            app.addToCart(found.id, qty);
            addAiText(`Added ${qty > 1 ? qty + "x " : ""}${found.name} to cart ✓`);
          } else if (found && !found.available) {
            addAiText(`${found.name} is currently unavailable, sorry! Want a similar dish instead?`);
          } else {
            handleFreeText(raw, text, true);
          }
        });
        return true;
      }

      // Sort
      if (/\bsort cheapest\b|\bcheapest first\b|\blow to high\b|\bsasta pehle\b/.test(text)) {
        respond(() => { app.setSort("low"); addAiText("Sorted by price — cheapest first."); });
        return true;
      }
      if (/\bsort expensive\b|\bexpensive first\b|\bhigh to low\b|\bmehenga pehle\b/.test(text)) {
        respond(() => { app.setSort("high"); addAiText("Sorted by price — most expensive first."); });
        return true;
      }
      if (/\bcheapest food\b/.test(text)) {
        respond(() => {
          app.setSort("low");
          const items = app.getMenuItems().filter((i) => i.available).sort((a, b) => a.price - b.price).slice(0, 4);
          addRecommendations(items, "Here's what's easiest on the wallet:");
        });
        return true;
      }
      if (/\bmost expensive food\b/.test(text)) {
        respond(() => {
          app.setSort("high");
          const items = app.getMenuItems().filter((i) => i.available).sort((a, b) => b.price - a.price).slice(0, 4);
          addRecommendations(items, "Here are our premium picks:");
        });
        return true;
      }

      // Reset / show all
      if (/\bshow all dishes\b|\bclear filters\b|\breset menu\b/.test(text)) {
        respond(() => { app.resetFilters(); addAiText("Cleared all filters — showing the full menu."); });
        return true;
      }
      if (/\bclear search\b/.test(text)) {
        respond(() => { app.clearSearch(); addAiText("Search cleared."); });
        return true;
      }

      // Search: "search paneer", "paneer search karo"
      m = text.match(/^search\s+(.+)/) || text.match(/^(.+?)\s+search karo$/);
      if (m) {
        const term = m[1].trim();
        respond(() => {
          app.setSearch(term);
          const count = app.getFilteredItems().length;
          addAiText(count ? `Found ${count} dish${count === 1 ? "" : "es"} matching "${term}".` : `No dishes matched "${term}" — try another search.`);
        });
        return true;
      }

      // Explicit veg/non-veg/category "dikhao"/"show X" filter commands
      const isShowCmd = /\bdikhao\b|\bshow\b|\bshow available dishes\b/.test(text);
      if (isShowCmd) {
        const foodType = detectFoodType(text);
        const category = detectCategory(text);
        if (foodType && !category) {
          respond(() => {
            app.setType(foodType);
            addAiText(`Showing ${foodType === "veg" ? "veg 🌱" : "non-veg 🍗"} dishes.`);
          });
          return true;
        }
        if (category) {
          respond(() => {
            app.setCategory(category);
            if (foodType) app.setType(foodType);
            addAiText(`Showing ${categoryLabelOf(category)}${foodType ? " (" + foodType + ")" : ""}.`);
          });
          return true;
        }
        if (/\bavailable dishes\b/.test(text)) {
          respond(() => {
            const count = app.getMenuItems().filter((i) => i.available).length;
            addAiText(`${count} dishes are available right now on the menu.`);
          });
          return true;
        }
      }

      return false;
    }

    function findMenuItemByName(query) {
      const q = normalize(query).trim();
      if (!q) return null;
      const items = app.getMenuItems();
      // Compare against a typo-normalized version of each item's name too —
      // the menu data itself uses spellings like "Chowmene"/"Dhosa" that
      // differ from how people actually type ("chowmein"/"dosa"), so
      // matching must normalize both sides the same way.
      const normName = (i) => normalize(i.name);

      let found = items.find((i) => normName(i) === q);
      if (found) return found;
      found = items.find((i) => normName(i).includes(q) || q.includes(normName(i)));
      if (found) return found;

      // token overlap fallback, scored so a full-token match on a longer,
      // more specific dish name wins over a partial match on a shorter one
      const qTokens = q.split(" ").filter(Boolean);
      let best = null;
      let bestScore = 0;
      items.forEach((i) => {
        const nameTokens = normName(i).split(" ");
        const overlap = qTokens.filter((t) => nameTokens.includes(t)).length;
        // slight bonus for matching a larger share of the dish's own name,
        // so "chicken chowmein" prefers "Chicken Chowmein" over "Chicken Pakoda"
        const score = overlap + overlap / nameTokens.length;
        if (overlap > 0 && score > bestScore) {
          bestScore = score;
          best = i;
        }
      });
      return best;
    }

    /* ---------------------------------------------------------------
       FREE-TEXT / QUESTION HANDLING — recommendation path + context
       --------------------------------------------------------------- */
    const CONTEXT_MORE_RE = /\baur kuch\b|\banything else\b|\bsomething else\b|\bmore options\b/;
    const CONTEXT_NOT_THIS_RE = /\byeh nahi\b|\bnahi chahiye\b|\bnot this\b|\bkuch aur dikhao\b/;
    const CONTEXT_THIS_REF_RE = /\bisme\b|\bin(?:\s)?(?:it|these|this)\b|\binme\b/;
    const CONTEXT_MORE_DEV = "कुछ और";

    function handleFreeText(raw, text, cameFromFailedAdd) {
      // "aur kuch" / "yeh nahi" — more from the same context, excluding
      // everything already shown.
      if (CONTEXT_MORE_RE.test(text) || CONTEXT_NOT_THIS_RE.test(text) || text.includes(CONTEXT_MORE_DEV)) {
        const prefs = {
          category: state.lastCategory,
          foodType: state.lastFoodType,
          budget: state.prefs.budget,
          spicy: state.prefs.mood === "spicy"
        };
        const items = recommend(prefs);
        if (items.length) {
          addRecommendations(items, "Here are a few more you might like:");
        } else {
          addAiText("I couldn't find a close match on today's menu.");
        }
        return;
      }

      // "isme spicy kya hai" — refer to the last shown set
      if (CONTEXT_THIS_REF_RE.test(text) && state.lastRecommendations.length) {
        const spicyOnes = state.lastRecommendations.filter((i) => SPICY_NAME_RE.test(i.name));
        if (spicyOnes.length) {
          addRecommendations(spicyOnes, "From those, this has the most kick:");
        } else {
          addAiText("None of those are especially spicy — want me to find something spicier?");
        }
        return;
      }

      const category = detectCategory(text);
      const foodType = detectFoodType(text);
      const budget = detectBudget(text);
      const spicy = detectSpicy(text);

      if (category) state.lastCategory = category;
      if (foodType) state.lastFoodType = foodType;
      if (budget) state.prefs.budget = budget;
      state.prefs.previousQueries.push(raw);

      const prefs = {
        category: category || state.lastCategory,
        foodType: foodType || null,
        budget: budget || null,
        spicy
      };

      const items = recommend(prefs);

      if (items.length === 0) {
        addAiText("I couldn't find a close match on today's menu.");
        return;
      }

      // No-result intelligence: if a specific dish/category was named but
      // isn't really on the menu (recommend() had to relax filters), say so.
      const askedCategory = category && !items.some((i) => i.category === category);
      const unknownDish = !category ? findUnknownDishWord(text) : null;
      let intro;
      if (unknownDish) {
        intro = `I couldn't find ${unknownDish} on today's menu 😅\n\nBut you might like these instead:`;
      } else if (askedCategory) {
        intro = `I couldn't find that on today's menu 😅\n\nBut you might like these instead:`;
      } else if (cameFromFailedAdd) {
        intro = `I couldn't find that exact dish, but here's what's close:`;
      } else if (budget) {
        intro = `Here's what fits ${budget.label.toLowerCase()}:`;
      } else if (category) {
        intro = `Here's our ${categoryLabelOf(category)} lineup:`;
      } else if (spicy) {
        intro = `Here's something with a kick 🔥`;
      } else {
        intro = `Here's what I'd recommend:`;
      }

      addRecommendations(items, intro);
    }

    /* ---------------------------------------------------------------
       ONBOARDING FLOW
       --------------------------------------------------------------- */
    const MOOD_OPTIONS = [
      { label: "😊 Comfort Food", mood: "comfort" },
      { label: "🔥 Spicy Mood", mood: "spicy" },
      { label: "🥗 Light & Healthy", mood: "light" },
      { label: "😋 Super Hungry", mood: "hungry" },
      { label: "🍗 Craving Chicken", mood: "chicken", category: "chicken", foodType: "nonveg" },
      { label: "🧀 Craving Paneer", mood: "paneer", category: "paneer", foodType: "veg" },
      { label: "🍚 Something Filling", mood: "filling" },
      { label: "☕ Just a Snack", mood: "snack" }
    ];

    const FOODTYPE_OPTIONS = [
      { label: "🍽 Anything", value: "any" },
      { label: "🌱 Veg", value: "veg", foodType: "veg" },
      { label: "🍗 Non-Veg", value: "nonveg", foodType: "nonveg" },
      { label: "🌶 Spicy", value: "spicy", spicy: true },
      { label: "🍜 Chinese", value: "chinese", category: "chinese" },
      { label: "🍛 Indian", value: "indian", category: "sabji" },
      { label: "🥘 Main Course", value: "main", category: "sabji" },
      { label: "🥤 Drinks", value: "drinks", category: "drinks" },
      { label: "🍨 Something Sweet", value: "sweet", category: "__sweet__" }
    ];

    const BUDGET_OPTIONS = [
      { label: "₹100", max: 100 },
      { label: "₹200", max: 200 },
      { label: "₹300", max: 300 },
      { label: "₹500+", min: 500 },
      { label: "No Budget", max: null }
    ];

    function runOnboarding() {
      addAiText("Hi! 👋 I'm Shivaksh AI.");
      setTimeout(() => {
        addAiText("Let's find something you'll love today.");
        setTimeout(() => {
          const row = addAiText("How are you feeling today?");
          addOptions(row, MOOD_OPTIONS, (opt) => {
            state.prefs.mood = opt.mood;
            if (opt.category) {
              state.lastCategory = opt.category;
              state.prefs.category = opt.category;
            }
            if (opt.foodType) {
              state.lastFoodType = opt.foodType;
              state.prefs.foodType = opt.foodType;
            }
            respond(() => askFoodType(), 350);
          });
        }, 550);
      }, 550);
    }

    function askFoodType() {
      const row = addAiText("What are you in the mood to eat?");
      addOptions(row, FOODTYPE_OPTIONS, (opt) => {
        if (opt.foodType) { state.prefs.foodType = opt.foodType; state.lastFoodType = opt.foodType; }
        if (opt.category && opt.category !== "__sweet__") { state.prefs.category = opt.category; state.lastCategory = opt.category; }
        if (opt.value === "__sweet__" || opt.category === "__sweet__") state.prefs.wantsSweet = true;
        if (opt.spicy) state.prefs.mood = "spicy";
        respond(() => askBudget(), 350);
      });
    }

    function askBudget() {
      const row = addAiText("What's your budget?");
      addOptions(row, BUDGET_OPTIONS, (opt) => {
        state.prefs.budget = opt.max === null && opt.min === undefined
          ? null
          : { max: opt.max, min: opt.min, label: opt.label };
        respond(() => finishOnboarding(), 400);
      });
    }

    function finishOnboarding() {
      if (state.prefs.wantsSweet) {
        // No dessert category exists in MENU_ITEMS — be honest, offer the
        // closest real alternatives instead of inventing a dish.
        const alt = app.getMenuItems().filter((i) => i.available && i.category === "drinks").slice(0, 3);
        addAiText("We don't have a dedicated dessert menu today 😅");
        if (alt.length) addRecommendations(alt, "But these go nicely after a meal:");
      } else {
        const prefs = {
          category: state.prefs.category,
          foodType: state.prefs.foodType,
          budget: state.prefs.budget,
          spicy: state.prefs.mood === "spicy"
        };
        const items = recommend(prefs);
        if (items.length) {
          addRecommendations(items, "Based on what you told me, you'll love these:");
        } else {
          addAiText("I couldn't find a close match on today's menu.");
        }
      }
      setTimeout(showQuickSuggestions, 450);
    }

    function showQuickSuggestions() {
      const row = addAiText("What can I help you with?");
      addOptions(row, [
        { label: "🍽 Recommend something" },
        { label: "🔥 Something spicy" },
        { label: "💰 Under ₹200" },
        { label: "🌱 Best veg" },
        { label: "🍗 Best non-veg" },
        { label: "🛒 My cart" }
      ], (opt) => handleUserMessage(opt.label.replace(/^\S+\s/, "")));
      renderQuickChips();
    }

    /* ---------------------------------------------------------------
       QUICK ACTION CHIPS (persistent bottom bar)
       --------------------------------------------------------------- */
    function renderQuickChips() {
      if (!chipsEl || chipsEl.childElementCount) return;
      const chips = [
        { label: "🍽 Recommend", text: "recommend something" },
        { label: "🌱 Veg", text: "veg dikhao" },
        { label: "🍗 Non-Veg", text: "non veg dikhao" },
        { label: "🔥 Spicy", text: "something spicy" },
        { label: "💰 Under ₹200", text: "under ₹200" },
        { label: "🛒 Cart", text: "cart dikhao" }
      ];
      chips.forEach((c) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ai-chip";
        btn.textContent = c.label;
        btn.addEventListener("click", () => handleUserMessage(c.text));
        chipsEl.appendChild(btn);
      });
    }

    /* ---------------------------------------------------------------
       MAIN MESSAGE PIPELINE
       --------------------------------------------------------------- */
    function handleUserMessage(raw) {
      const trimmed = (raw || "").trim();
      if (!trimmed) return;
      addUserText(trimmed);
      inputEl.value = "";
      autosizeInput();

      const text = normalize(trimmed);
      state.lastQuery = trimmed;

      showTyping();
      setTimeout(() => {
        hideTyping();
        try {
          const handled = tryHandleCommand(trimmed, text);
          if (!handled) handleFreeText(trimmed, text, false);
        } catch (err) {
          console.error("[Shivaksh AI] error handling message:", err);
          addAiText("I didn't quite catch that 😅\n\nTry: '₹200 ke andar veg batao'");
        }
      }, 380);
    }

    /* ---------------------------------------------------------------
       INPUT WIRING
       --------------------------------------------------------------- */
    function autosizeInput() {
      inputEl.style.height = "auto";
      inputEl.style.height = Math.min(inputEl.scrollHeight, 90) + "px";
    }
    inputEl.addEventListener("input", autosizeInput);

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleUserMessage(inputEl.value);
      } else if (e.key === "Escape") {
        closePanel();
      }
    });

    if (sendBtn) {
      sendBtn.addEventListener("click", () => handleUserMessage(inputEl.value));
    }
  }
})();
