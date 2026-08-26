/**
 * script.js
 * Vanilla JS. No build step, no dependencies beyond the optional Google
 * Fonts link — every food illustration is inline SVG so the site works
 * fully offline and needs no image assets on GitHub Pages.
 */
(function () {
  "use strict";

  /* --------------------------------------------------------------------
     0. ERROR PROTECTION — the splash screen must NEVER stay stuck
        because of a JS error anywhere else on the page. forceHideSplash
        is idempotent and safe to call multiple times; a hard-cap timer
        below guarantees it fires even if init() itself throws.
     -------------------------------------------------------------------- */
  function forceHideSplash() {
    const splashScreen = document.getElementById("splashScreen");
    if (!splashScreen) return;
    splashScreen.classList.add("hide");
    setTimeout(() => {
      if (splashScreen.parentNode) splashScreen.remove();
    }, 500);
  }

  // Absolute safety net: no matter what else fails, the splash is gone
  // within ~3.5s of page load.
  setTimeout(forceHideSplash, 3500);

  window.addEventListener("error", forceHideSplash);
  window.addEventListener("unhandledrejection", forceHideSplash);

  function safeCall(fn, label) {
    try {
      fn();
    } catch (err) {
      console.error(`[FoodCorner] ${label} failed:`, err);
    }
  }

  /* --------------------------------------------------------------------
     1. TABLE NUMBER — read-only from the URL, never editable by hand
     -------------------------------------------------------------------- */
  function getTableNumber() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("table");
    if (!raw) return null;
    const cleaned = raw.replace(/[^0-9]/g, "");
    return cleaned ? cleaned : null;
  }

  const TABLE_NUMBER = getTableNumber();

  function renderTableBadge() {
    const el = document.getElementById("tableBadge");
    if (TABLE_NUMBER) {
      el.classList.remove("table-badge--unset");
      el.textContent = `Table ${TABLE_NUMBER}`;
    } else {
      el.classList.add("table-badge--unset");
      el.textContent = "Takeaway";
    }
  }

  function tableDisplayName() {
    return TABLE_NUMBER ? `Table ${TABLE_NUMBER}` : "Takeaway / Table Not Selected";
  }

  /* --------------------------------------------------------------------
     2. STATE
     -------------------------------------------------------------------- */
  const CART_KEY = "foodcorner_cart_v1";
  const FAVORITES_KEY = "foodcorner_favorites_v1";
  const RECENTLY_VIEWED_KEY = "foodcorner_recently_viewed_v1";
  const THEME_KEY = "foodcorner_theme_v1";
  const RECENTLY_VIEWED_MAX = 8;

  let activeCategory = "all";
  let activeType = "all"; // all | veg | nonveg
  let activeSort = "default"; // default | low | high | name
  let activeBudget = "all"; // all | "0-100" | "100-200" | "200-300" | "300-"
  let searchTerm = "";
  let cart = loadCart(); // { [itemId]: qty }
  let favorites = loadFavorites(); // { [itemId]: true }
  let recentlyViewed = loadRecentlyViewed(); // [itemId, ...] most recent first
  let activeDetailItem = null;

  // Floating search bubble — see initFloatingSearch() / updateFloatingSearchVisibility()
  let floatingSearchBtn = null;
  let floatingSearchTip = null;
  let originalSearchBarVisible = true;

  function updateFloatingSearchVisibility() {
    if (!floatingSearchBtn) return;
    floatingSearchBtn.classList.toggle("is-visible", !originalSearchBarVisible);
  }

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("Could not read favorites from localStorage:", e);
      return {};
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn("Could not save favorites to localStorage:", e);
    }
  }

  function isFavorite(id) {
    return !!favorites[Number(id)];
  }

  function toggleFavorite(id) {
    id = Number(id);
    if (favorites[id]) {
      delete favorites[id];
    } else {
      favorites[id] = true;
    }
    saveFavorites();
    renderAll();
    renderCategories();
    if (settingsSheetOpen) renderSettingsCounts();
  }

  function favoritesCount() {
    return Object.keys(favorites).length;
  }

  function loadRecentlyViewed() {
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("Could not read recently viewed from localStorage:", e);
      return [];
    }
  }

  function saveRecentlyViewed() {
    try {
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recentlyViewed));
    } catch (e) {
      console.warn("Could not save recently viewed to localStorage:", e);
    }
  }

  function addRecentlyViewed(id) {
    id = Number(id);
    recentlyViewed = recentlyViewed.filter((existingId) => existingId !== id);
    recentlyViewed.unshift(id);
    recentlyViewed = recentlyViewed.slice(0, RECENTLY_VIEWED_MAX);
    saveRecentlyViewed();
    renderRecentlyViewed();
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("Could not read cart from localStorage:", e);
      return {};
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn("Could not save cart to localStorage:", e);
    }
  }

  function findItem(id) {
    return MENU_ITEMS.find((i) => i.id === Number(id));
  }

  function cartEntries() {
    return Object.keys(cart)
      .map((id) => ({ item: findItem(id), qty: cart[id] }))
      .filter((e) => e.item && e.qty > 0);
  }

  function cartTotalCount() {
    return cartEntries().reduce((sum, e) => sum + e.qty, 0);
  }

  function cartTotalPrice() {
    return cartEntries().reduce((sum, e) => sum + e.qty * e.item.price, 0);
  }

  function setQty(id, qty) {
    id = Number(id);
    if (qty <= 0) {
      delete cart[id];
    } else {
      cart[id] = qty;
    }
    saveCart();
    // Quantity changes never change which cards are shown, so patch just
    // this one card's control instead of rebuilding the whole grid —
    // rebuilding on every tap was what made add-to-cart feel like a reload.
    if (!updateCardActionInPlace(id)) renderGrid();
    renderCartBar();
    if (cartSheetOpen) renderCartSheet();
  }

  function addToCart(id, qty) {
    id = Number(id);
    const current = cart[id] || 0;
    setQty(id, current + (qty || 1));
    showToast("Added to cart");
    const badge = document.getElementById("cartBadge");
    if (badge) {
      badge.classList.remove("pulse");
      // force reflow so the animation can restart on back-to-back adds
      void badge.offsetWidth;
      badge.classList.add("pulse");
    }
  }

  /* --------------------------------------------------------------------
     3. ICON ILLUSTRATIONS — inline SVG per dish category, palette-matched
     -------------------------------------------------------------------- */
  const ICONS = {
    skewer: `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><rect width="200" height="140" fill="#fff1f1"/><line x1="30" y1="70" x2="175" y2="70" stroke="#e63232" stroke-width="4" stroke-linecap="round"/><rect x="45" y="52" width="26" height="36" rx="6" fill="#a95b19"/><rect x="80" y="50" width="24" height="40" rx="8" fill="#e63232"/><rect x="113" y="53" width="24" height="34" rx="6" fill="#159447" opacity="0.85"/><rect x="146" y="52" width="22" height="36" rx="6" fill="#a95b19"/></svg>`,
    bowl: `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><rect width="200" height="140" fill="#fff1f1"/><ellipse cx="100" cy="95" rx="70" ry="16" fill="#e63232" opacity="0.12"/><path d="M35 78 a65 40 0 0 0 130 0 z" fill="#fff" stroke="#e63232" stroke-width="3"/><circle cx="78" cy="70" r="6" fill="#e63232"/><circle cx="102" cy="64" r="5" fill="#159447"/><circle cx="122" cy="72" r="6" fill="#a95b19"/><circle cx="92" cy="76" r="4" fill="#e63232"/></svg>`,
    curry: `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><rect width="200" height="140" fill="#fff1f1"/><ellipse cx="100" cy="90" rx="72" ry="30" fill="#e63232"/><ellipse cx="100" cy="84" rx="72" ry="26" fill="#c0532f"/><ellipse cx="100" cy="80" rx="60" ry="18" fill="#d9713f" opacity="0.7"/><circle cx="70" cy="76" r="5" fill="#fff" opacity="0.8"/><circle cx="130" cy="82" r="4" fill="#fff" opacity="0.6"/><circle cx="105" cy="70" r="4" fill="#fff" opacity="0.7"/></svg>`,
    noodles: `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><rect width="200" height="140" fill="#fff1f1"/><ellipse cx="100" cy="95" rx="68" ry="26" fill="#a95b19" opacity="0.2"/><path d="M45 90 q15 -35 30 0 q15 -35 30 0 q15 -35 30 0 q15 -35 30 0" fill="none" stroke="#a95b19" stroke-width="5" stroke-linecap="round"/><circle cx="70" cy="60" r="6" fill="#159447"/><circle cx="128" cy="58" r="6" fill="#e63232"/></svg>`,
    wok: `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><rect width="200" height="140" fill="#fff1f1"/><path d="M28 72 a72 30 0 0 0 144 0 z" fill="#222" opacity="0.85"/><ellipse cx="100" cy="66" rx="58" ry="16" fill="#e63232"/><circle cx="80" cy="63" r="7" fill="#a95b19"/><circle cx="112" cy="60" r="6" fill="#c0532f"/><circle cx="130" cy="66" r="6" fill="#159447"/><line x1="24" y1="66" x2="4" y2="60" stroke="#222" stroke-width="4" stroke-linecap="round" opacity="0.85"/></svg>`,
    pizza: `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><rect width="200" height="140" fill="#fff1f1"/><circle cx="100" cy="70" r="52" fill="#e8b45a"/><circle cx="100" cy="70" r="44" fill="#c0532f"/><circle cx="100" cy="70" r="38" fill="#e8b45a" opacity="0.9"/><circle cx="80" cy="58" r="7" fill="#e63232"/><circle cx="118" cy="62" r="7" fill="#e63232"/><circle cx="100" cy="86" r="7" fill="#e63232"/><circle cx="122" cy="88" r="5" fill="#159447"/><circle cx="76" cy="82" r="5" fill="#159447"/></svg>`,
    burger: `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><rect width="200" height="140" fill="#fff1f1"/><path d="M40 65 a60 26 0 0 1 120 0 z" fill="#c0532f"/><rect x="38" y="65" width="124" height="10" fill="#159447"/><rect x="38" y="75" width="124" height="12" fill="#e63232"/><rect x="38" y="87" width="124" height="10" fill="#a95b19"/><path d="M36 97 q64 18 128 0 l-6 14 q-58 14 -116 0 z" fill="#c0532f"/></svg>`,
    drink: `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><rect width="200" height="140" fill="#fff1f1"/><path d="M76 36 h48 l-8 78 a4 4 0 0 1 -4 4 h-24 a4 4 0 0 1 -4 -4 z" fill="#fff" stroke="#e63232" stroke-width="3"/><rect x="80" y="52" width="40" height="30" fill="#a95b19" opacity="0.85"/><line x1="100" y1="20" x2="100" y2="40" stroke="#e63232" stroke-width="4" stroke-linecap="round"/></svg>`,
    dessert: `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><rect width="200" height="140" fill="#fff1f1"/><rect x="55" y="70" width="90" height="30" rx="4" fill="#e63232"/><ellipse cx="100" cy="70" rx="45" ry="12" fill="#c0532f"/><circle cx="100" cy="55" r="16" fill="#fff"/><circle cx="100" cy="48" r="4" fill="#e63232"/></svg>`
  };
  const CATEGORY_IMAGES = {
  starters: "assets/food/starter.jpg",
  soups: "assets/food/soup.jpg",
  chinese: "assets/food/chinese.jpg",
  chowmein: "assets/food/chowmein.jpg",
  rolls: "assets/food/roll.jpg",
  southindian: "assets/food/dosa.jpg",
  rice: "assets/food/rice.jpg",
  biryani: "assets/food/biryani.jpg",
  chicken: "assets/food/chicken.jpg",
  sabji: "assets/food/sabji.jpg",
  paneer: "assets/food/paneer.jpg",
  mushroom: "assets/food/mushroom.jpg",
  kaju: "assets/food/kaju.jpg",
  tandoor: "assets/food/roti.jpg",
  bread: "assets/food/roti.jpg",
  dal: "assets/food/dal.jpg",
  thali: "assets/food/thali.jpg",
  salad: "assets/food/salad.jpg",
  drinks: "assets/food/drinks.jpg"
};

  function iconSvg(key) {
    return ICONS[key] || ICONS.bowl;
  }

  /* --------------------------------------------------------------------
     3b. INDIVIDUAL FOOD IMAGES — auto-derived from item name, with a
         safe fallback to the existing SVG illustrations if a JPG is
         missing. Defined once, globally, before it is used anywhere.
     -------------------------------------------------------------------- */
  function foodImagePath(item) {
    if (item.image) return item.image;

    const filename = item.name
      .toLowerCase()
      .replace(/[()]/g, "")
      .replace(/[\/]/g, "-")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return `assets/food/${filename}.jpg`;
  }

  // Inline onerror handlers run in the global scope, so this fallback is
  // attached to window rather than kept inside the IIFE closure. It swaps
  // a broken <img> for the existing inline SVG illustration exactly once
  // (onerror is cleared before replacement, so there is no retry loop).
  window.__foodImageFallback = function (imgEl, iconKey) {
    if (!imgEl || !imgEl.parentNode) return;
    const wrapper = document.createElement("div");
    wrapper.className = "food-image-fallback";
    wrapper.setAttribute("style", "width:100%;height:100%;");
    wrapper.innerHTML = iconSvg(iconKey);
    imgEl.replaceWith(wrapper);
  };

  const BANNER_PATTERNS = {
    curry: `<svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;"><circle cx="340" cy="40" r="90" fill="rgba(255,255,255,0.08)"/><circle cx="380" cy="180" r="60" fill="rgba(255,255,255,0.06)"/><circle cx="260" cy="190" r="40" fill="rgba(255,255,255,0.05)"/></svg>`,
    pizza: `<svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;"><circle cx="330" cy="60" r="75" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="14"/><circle cx="350" cy="170" r="45" fill="rgba(255,255,255,0.07)"/></svg>`
  };

  /* --------------------------------------------------------------------
     4. RENDERING — categories, grid, cart bar
     -------------------------------------------------------------------- */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // "favorites" is a virtual category layered on top of CATEGORIES (which
  // stays exactly as defined in menu.js) — it's rendered as an extra chip
  // and handled specially in getFilteredItems().
  function renderCategories() {
    const wrap = document.getElementById("categories");
    const favChip = `
      <button class="chip chip--favorites ${activeCategory === "favorites" ? "is-active" : ""}" data-cat="favorites">
        ♥ Favorites${favoritesCount() ? ` (${favoritesCount()})` : ""}
      </button>`;
    wrap.innerHTML = favChip + CATEGORIES.map((c) => `
      <button class="chip ${c.id === activeCategory ? "is-active" : ""}" data-cat="${c.id}">
        ${escapeHtml(c.label)}
      </button>
    `).join("");

    wrap.querySelectorAll(".chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.cat;
        renderCategories();
        renderGrid();
      });
    });
  }

  function renderTypeFilter() {
    document.querySelectorAll(".filter").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.type === activeType);
    });
  }

  document.getElementById("filterArea").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter");
    if (!btn) return;
    activeType = btn.dataset.type;
    renderTypeFilter();
    renderGrid();
  });

  function renderBudgetFilter() {
    document.querySelectorAll(".budget-chip").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.budget === activeBudget);
    });
  }

  const budgetFilterEl = document.getElementById("budgetFilter");
  if (budgetFilterEl) {
    budgetFilterEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".budget-chip");
      if (!btn) return;
      activeBudget = btn.dataset.budget;
      renderBudgetFilter();
      renderGrid();
    });
  }

  function categoryLabel(categoryId) {
    const match = CATEGORIES.find((c) => c.id === categoryId);
    return match ? match.label : "";
  }

  function matchesBudget(item) {
    if (activeBudget === "all") return true;
    const [minStr, maxStr] = activeBudget.split("-");
    const min = Number(minStr);
    const max = maxStr === "" || maxStr === undefined ? Infinity : Number(maxStr);
    return item.price >= min && item.price <= max;
  }

  function getFilteredItems() {
    const term = searchTerm.trim().toLowerCase();
    let items = MENU_ITEMS.filter((item) => {
      const matchesCategory =
        activeCategory === "all" ||
        (activeCategory === "favorites" ? isFavorite(item.id) : item.category === activeCategory);
      const matchesType = activeType === "all" || item.type === activeType;
      const matchesSearch = !term || item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        categoryLabel(item.category).toLowerCase().includes(term);
      return matchesCategory && matchesType && matchesSearch && matchesBudget(item);
    });

    if (activeSort === "low") {
      items = items.slice().sort((a, b) => a.price - b.price);
    } else if (activeSort === "high") {
      items = items.slice().sort((a, b) => b.price - a.price);
    } else if (activeSort === "name") {
      items = items.slice().sort((a, b) => a.name.localeCompare(b.name));
    }

    return items;
  }

  function cardActionHtml(item) {
    const qty = cart[item.id] || 0;
    if (!item.available) {
      return `<button class="add-btn" disabled aria-label="Out of stock">✕</button>`;
    } else if (qty > 0) {
      return `
        <div class="quantity" data-id="${item.id}">
          <button type="button" data-action="dec" aria-label="Decrease quantity">−</button>
          <span>${qty}</span>
          <button type="button" data-action="inc" aria-label="Increase quantity">+</button>
        </div>`;
    }
    return `<button class="add-btn" data-action="add" data-id="${item.id}" aria-label="Add ${escapeHtml(item.name)}">+</button>`;
  }

  function bindCardActionEvents(actionEl) {
    if (!actionEl) return;
    const addBtn = actionEl.matches("[data-action='add']") ? actionEl : null;
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        addToCart(addBtn.dataset.id, 1);
      });
      return;
    }
    if (actionEl.classList.contains("quantity")) {
      const id = actionEl.dataset.id;
      actionEl.querySelector("[data-action='inc']").addEventListener("click", (e) => {
        e.stopPropagation();
        setQty(id, (cart[id] || 0) + 1);
      });
      actionEl.querySelector("[data-action='dec']").addEventListener("click", (e) => {
        e.stopPropagation();
        setQty(id, (cart[id] || 0) - 1);
      });
    }
  }

  // Swaps just one card's add/quantity control in place, instead of
  // rebuilding the whole grid — keeps quantity taps instant with no
  // flash or scroll jump. Returns true if a card was found and patched.
  function updateCardActionInPlace(id) {
    id = Number(id);
    const item = findItem(id);
    if (!item) return false;
    const card = document.querySelector(`.food-card[data-open-id="${id}"]`);
    if (!card) return false;
    const actionEl = card.querySelector(".add-btn, .quantity");
    if (!actionEl) return false;
    actionEl.outerHTML = cardActionHtml(item);
    bindCardActionEvents(card.querySelector(".add-btn, .quantity"));
    return true;
  }

  function cardTemplate(item) {
    const foodImage = foodImagePath(item);
    const vegClass = item.type === "veg" ? "" : "nonveg";
    const vegLabel = item.type === "veg" ? "Veg" : "Non-Veg";
    const actionHtml = cardActionHtml(item);

    // Optional premium fields — every one is undefined-safe so items
    // without them render exactly as before.
    const badges = [];
    if (item.popular) badges.push(`<span class="food-badge food-badge--popular">Popular</span>`);
    if (item.trending) badges.push(`<span class="food-badge food-badge--trending">Trending</span>`);
    if (item.special) badges.push(`<span class="food-badge food-badge--special">Special</span>`);
    if (item.new) badges.push(`<span class="food-badge food-badge--new">New</span>`);
    const badgesHtml = badges.length ? `<div class="food-badges">${badges.join("")}</div>` : "";

    const metaBits = [];
    if (item.prepTime) metaBits.push(`<span class="food-meta__prep">⏱ ${escapeHtml(item.prepTime)}</span>`);
    if (item.spiceLevel) metaBits.push(`<span class="food-meta__spice">${"🌶".repeat(Math.min(item.spiceLevel, 3))}</span>`);
    const metaHtml = metaBits.length ? `<div class="food-meta">${metaBits.join("")}</div>` : "";

    const hasDiscount = item.originalPrice && item.originalPrice > item.price;
    const discountPct = hasDiscount ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;
    const priceHtml = hasDiscount
      ? `<div class="food-price-row">
          <p class="food-price">₹${item.price}</p>
          <span class="food-price--original">₹${item.originalPrice}</span>
          <span class="discount-badge">${discountPct}% OFF</span>
        </div>`
      : `<p class="food-price">₹${item.price}</p>`;
    const imageDiscountBadge = hasDiscount ? `<span class="image-discount-badge">${discountPct}% OFF</span>` : "";

    return `
      <article class="food-card" data-open-id="${item.id}">
        <div class="food-details">
          ${badgesHtml}
          <h3 class="food-name">${escapeHtml(item.name)}</h3>
          <p class="food-type">${escapeHtml(item.description)}</p>
          ${metaHtml}
          ${priceHtml}
          <span class="${item.available ? "available" : "unavailable"}">${item.available ? "● Available" : "● Out of Stock"}</span>
        </div>
        <div class="food-image-box">
          <div class="food-image is-loading ${!item.available ? "is-unavailable" : ""}">
          ${imageDiscountBadge}
          <img
            src="${foodImage}"
            alt="${escapeHtml(item.name)}"
            loading="lazy"
            onload="this.classList.add('is-loaded'); this.parentElement.classList.remove('is-loading');"
            onerror="this.onerror=null; this.parentElement.classList.remove('is-loading'); window.__foodImageFallback(this, '${item.icon || "bowl"}');"
          >
        </div>
          <button type="button" class="fav-btn ${isFavorite(item.id) ? "is-fav" : ""}" data-action="fav" data-id="${item.id}" aria-label="${isFavorite(item.id) ? "Remove from favorites" : "Add to favorites"}">
            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="${isFavorite(item.id) ? "currentColor" : "none"}"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <span class="food-mark ${vegClass}" aria-label="${vegLabel}" title="${vegLabel}"></span>
          ${actionHtml}
        </div>
      </article>
    `;
  }

  function renderGrid() {
    const grid = document.getElementById("menuGrid");
    const items = getFilteredItems();

    // Floating search bubble glow — reflects the real filtered count from
    // getFilteredItems(), never a second search/filter system.
    const hasNoSearchResults = searchTerm.trim().length > 0 && items.length === 0;
    if (floatingSearchBtn) floatingSearchBtn.classList.toggle("is-glowing", hasNoSearchResults);
    if (floatingSearchTip) floatingSearchTip.classList.toggle("is-visible", hasNoSearchResults);

    let heading = "All Dishes";
    if (activeCategory === "favorites") heading = "Favorites";
    else if (activeCategory !== "all") heading = categoryLabel(activeCategory) || "All Dishes";
    document.getElementById("menuHeading").textContent = heading;
    document.getElementById("dishesCount").textContent = `${items.length} ${items.length === 1 ? "dish" : "dishes"}`;

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <strong>No dishes found</strong>
          <p>${activeCategory === "favorites" ? "Tap the heart on a dish to save it here." : "Try a different search, category, or filter."}</p>
        </div>`;
      return;
    }

    grid.innerHTML = items.map(cardTemplate).join("");

    grid.querySelectorAll("[data-action='add']").forEach((btn) => bindCardActionEvents(btn));
    grid.querySelectorAll(".quantity").forEach((stepper) => bindCardActionEvents(stepper));

    grid.querySelectorAll("[data-action='fav']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(btn.dataset.id);
      });
    });

    grid.querySelectorAll(".food-card").forEach((card) => {
      card.addEventListener("click", () => openDetail(card.dataset.openId));
    });
  }

  /* --------------------------------------------------------------------
     4b. RECENTLY VIEWED — last few dishes opened in the detail sheet
     -------------------------------------------------------------------- */
  function renderRecentlyViewed() {
    const section = document.getElementById("recentlyViewedSection");
    const track = document.getElementById("recentlyViewedTrack");
    if (!section || !track) return;

    const items = recentlyViewed.map(findItem).filter(Boolean);
    if (items.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";
    track.innerHTML = items.map((item) => `
      <button type="button" class="recently-viewed-card" data-open-id="${item.id}">
        <div class="recently-viewed-card__img">
          <img
            src="${foodImagePath(item)}"
            alt="${escapeHtml(item.name)}"
            loading="lazy"
            onerror="this.onerror=null; window.__foodImageFallback(this, '${item.icon || "bowl"}');"
          >
        </div>
        <p class="recently-viewed-card__name">${escapeHtml(item.name)}</p>
      </button>
    `).join("");

    track.querySelectorAll(".recently-viewed-card").forEach((card) => {
      card.addEventListener("click", () => openDetail(card.dataset.openId));
    });
  }

  /* --------------------------------------------------------------------
     5. CART BAR — expands with items, collapses to a compact FAB;
        the floating sort button hides while the cart pill is expanded.
     -------------------------------------------------------------------- */
  let compactTimer = null;

  function renderCartBar() {
    const bar = document.getElementById("cartBar");
    const sortBtn = document.getElementById("floatingSortBtn");
    const count = cartTotalCount();

    clearTimeout(compactTimer);

    if (count > 0) {
      bar.classList.add("show");
      bar.classList.remove("compact");
      sortBtn.classList.add("sort-hidden");

      document.getElementById("cartBadge").textContent = count;
      document.getElementById("cartCount").textContent = `${count} ${count === 1 ? "item" : "items"}`;
      document.getElementById("cartTotalLabel").textContent = `₹${cartTotalPrice()}`;

      compactTimer = setTimeout(() => {
        bar.classList.add("compact");
        sortBtn.classList.remove("sort-hidden");
      }, 2200);
    } else {
      bar.classList.remove("show", "compact");
      sortBtn.classList.remove("sort-hidden");
    }
  }

  function renderAll() {
    renderGrid();
    renderCartBar();
    if (cartSheetOpen) renderCartSheet();
  }

  /* --------------------------------------------------------------------
     6. SEARCH — full-page overlay (Zomato-style), backed by a
        precomputed search index so filtering stays instant even as the
        menu grows. The small header bar is a tap-to-open trigger; all
        typing happens inside the overlay.
     -------------------------------------------------------------------- */
  const RECENT_SEARCHES_KEY = "foodcorner_recent_searches_v1";
  const RECENT_SEARCHES_MAX = 6;
  let recentSearches = loadRecentSearches();
  let searchIndex = [];

  function loadRecentSearches() {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("Could not read recent searches from localStorage:", e);
      return [];
    }
  }

  function saveRecentSearches() {
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
    } catch (e) {
      console.warn("Could not save recent searches to localStorage:", e);
    }
  }

  function addRecentSearch(term) {
    term = term.trim();
    if (!term) return;
    recentSearches = recentSearches.filter((t) => t.toLowerCase() !== term.toLowerCase());
    recentSearches.unshift(term);
    recentSearches = recentSearches.slice(0, RECENT_SEARCHES_MAX);
    saveRecentSearches();
  }

  // Built once from MENU_ITEMS: each entry pairs an item with a single
  // lowercase "haystack" string (name + description + category label) so
  // every keystroke is a plain substring check instead of re-normalizing
  // every field on every render.
  function buildSearchIndex() {
    searchIndex = MENU_ITEMS.map((item) => ({
      item,
      haystack: [item.name, item.description, categoryLabel(item.category)].join(" ").toLowerCase(),
    }));
  }

  function searchIndexResults(term) {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    const matches = searchIndex.filter((entry) => entry.haystack.includes(t));
    matches.sort((a, b) => {
      const aStarts = a.item.name.toLowerCase().startsWith(t) ? 0 : 1;
      const bStarts = b.item.name.toLowerCase().startsWith(t) ? 0 : 1;
      return aStarts - bStarts;
    });
    return matches.map((entry) => entry.item);
  }

  const searchTrigger = document.getElementById("searchTrigger");
  const searchTriggerText = document.getElementById("searchTriggerText");
  const searchClear = document.getElementById("searchClear");
  const searchOverlay = document.getElementById("searchOverlay");
  const searchOverlayInput = document.getElementById("searchOverlayInput");
  const searchOverlayClear = document.getElementById("searchOverlayClear");
  const searchOverlayBack = document.getElementById("searchOverlayBack");
  const searchOverlayBody = document.getElementById("searchOverlayBody");

  function syncSearchTrigger() {
    const hasTerm = searchTerm.trim().length > 0;
    searchTriggerText.textContent = hasTerm ? searchTerm : "Search for dishes, cuisines...";
    searchTriggerText.classList.toggle("has-term", hasTerm);
    searchClear.classList.toggle("is-visible", hasTerm);
  }

  function openSearchOverlay() {
    searchOverlayInput.value = searchTerm;
    searchOverlayClear.classList.toggle("is-visible", searchTerm.length > 0);
    searchOverlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    renderSearchOverlay();
    setTimeout(() => searchOverlayInput.focus(), 260);
  }

  function closeSearchOverlay() {
    searchOverlay.classList.remove("is-open");
    const anySheetOpen = document.querySelectorAll(".sheet.is-open").length > 0;
    if (!anySheetOpen) document.body.style.overflow = "";
    syncSearchTrigger();
    updateFloatingSearchVisibility();
  }

  /* --------------------------------------------------------------------
     6b. FLOATING SEARCH BUBBLE — a compact stand-in for the full search
         bar once it scrolls out of view. It owns no filtering logic of
         its own: clicking it just opens the existing search overlay
         above and focuses the existing searchOverlayInput.
     -------------------------------------------------------------------- */
  function initFloatingSearch() {
    floatingSearchBtn = document.getElementById("floatingSearchBtn");
    floatingSearchTip = document.getElementById("floatingSearchTip");
    const searchWrapperEl = document.querySelector(".search-wrapper");
    if (!floatingSearchBtn || !searchWrapperEl) return;

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            originalSearchBarVisible = entry.isIntersecting;
            updateFloatingSearchVisibility();
          });
        },
        { threshold: 0 }
      );
      observer.observe(searchWrapperEl);
    } else {
      // Fallback for browsers without IntersectionObserver support.
      const fallbackCheck = () => {
        originalSearchBarVisible = searchWrapperEl.getBoundingClientRect().bottom > 0;
        updateFloatingSearchVisibility();
      };
      window.addEventListener("scroll", fallbackCheck, { passive: true });
      fallbackCheck();
    }

    floatingSearchBtn.addEventListener("click", () => {
      floatingSearchBtn.classList.add("is-opening");
      openSearchOverlay();
      setTimeout(() => floatingSearchBtn.classList.remove("is-opening"), 320);
    });
  }

  function renderSearchOverlay() {
    const term = searchOverlayInput.value;

    if (!term.trim()) {
      const recentHtml = recentSearches.length ? `
        <div class="search-section">
          <div class="search-section__head">
            <span>Recent Searches</span>
            <button type="button" id="clearRecentSearches">Clear</button>
          </div>
          <div class="search-chip-row">
            ${recentSearches.map((t) => `<button type="button" class="search-chip" data-term="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("")}
          </div>
        </div>` : "";

      searchOverlayBody.innerHTML = `
        ${recentHtml}
        <div class="search-section">
          <div class="search-section__head"><span>Popular Categories</span></div>
          <div class="search-chip-row">
            ${CATEGORIES.map((c) => `<button type="button" class="search-chip" data-cat="${c.id}">${escapeHtml(c.label)}</button>`).join("")}
          </div>
        </div>
      `;
      return;
    }

    const results = searchIndexResults(term);

    if (results.length === 0) {
      searchOverlayBody.innerHTML = `
        <div class="empty-state" style="padding-top:50px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <strong>No dishes found</strong>
          <p>Try a different dish name, description, or cuisine.</p>
        </div>`;
      return;
    }

    searchOverlayBody.innerHTML = `<div class="search-results">${results.map(searchResultRowTemplate).join("")}</div>`;
  }

  function searchResultRowTemplate(item, index) {
    const qty = cart[item.id] || 0;
    const foodImage = foodImagePath(item);
    const vegClass = item.type === "veg" ? "" : "nonveg";
    let actionHtml;
    if (!item.available) {
      actionHtml = `<button class="search-add-btn" disabled aria-label="Out of stock">✕</button>`;
    } else if (qty > 0) {
      actionHtml = `
        <div class="search-qty" data-id="${item.id}">
          <button type="button" data-action="dec" aria-label="Decrease quantity">−</button>
          <span>${qty}</span>
          <button type="button" data-action="inc" aria-label="Increase quantity">+</button>
        </div>`;
    } else {
      actionHtml = `<button class="search-add-btn" data-action="add" data-id="${item.id}" aria-label="Add ${escapeHtml(item.name)}">+</button>`;
    }

    return `
      <article class="search-result-row" data-open-id="${item.id}" style="animation-delay:${Math.min(index, 8) * 30}ms;">
        <div class="search-result-row__img">
          <img
            src="${foodImage}"
            alt="${escapeHtml(item.name)}"
            loading="lazy"
            onerror="this.onerror=null; window.__foodImageFallback(this, '${item.icon || "bowl"}');"
          >
        </div>
        <div class="search-result-row__info">
          <p class="search-result-row__name">${escapeHtml(item.name)}</p>
          <p class="search-result-row__desc">${escapeHtml(item.description)}</p>
          <p class="search-result-row__price">₹${item.price}</p>
        </div>
        <div class="search-result-row__action">${actionHtml}</div>
      </article>
    `;
  }

  searchTrigger.addEventListener("click", openSearchOverlay);

  searchClear.addEventListener("click", () => {
    searchTerm = "";
    syncSearchTrigger();
    renderGrid();
  });

  searchOverlayBack.addEventListener("click", closeSearchOverlay);

  searchOverlayInput.addEventListener("input", () => {
    searchTerm = searchOverlayInput.value;
    searchOverlayClear.classList.toggle("is-visible", searchTerm.length > 0);
    renderSearchOverlay();
    renderGrid();
  });

  searchOverlayInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchOverlayInput.value.trim()) {
      addRecentSearch(searchOverlayInput.value);
    }
  });

  searchOverlayClear.addEventListener("click", () => {
    searchTerm = "";
    searchOverlayInput.value = "";
    searchOverlayClear.classList.remove("is-visible");
    renderSearchOverlay();
    renderGrid();
    searchOverlayInput.focus();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searchOverlay.classList.contains("is-open")) closeSearchOverlay();
  });

  searchOverlayBody.addEventListener("click", (e) => {
    const chip = e.target.closest(".search-chip");
    if (chip) {
      if (chip.dataset.term) {
        searchOverlayInput.value = chip.dataset.term;
        searchTerm = chip.dataset.term;
        renderSearchOverlay();
        renderGrid();
        searchOverlayInput.focus();
      } else if (chip.dataset.cat) {
        activeCategory = chip.dataset.cat;
        renderCategories();
        renderGrid();
        closeSearchOverlay();
      }
      return;
    }

    const clearRecentBtn = e.target.closest("#clearRecentSearches");
    if (clearRecentBtn) {
      recentSearches = [];
      saveRecentSearches();
      renderSearchOverlay();
      return;
    }

    const addBtn = e.target.closest("[data-action='add']");
    if (addBtn) {
      e.stopPropagation();
      addToCart(addBtn.dataset.id);
      renderSearchOverlay();
      return;
    }

    const decBtn = e.target.closest("[data-action='dec']");
    if (decBtn) {
      e.stopPropagation();
      const row = decBtn.closest("[data-id]");
      setQty(row.dataset.id, (cart[row.dataset.id] || 0) - 1);
      renderSearchOverlay();
      return;
    }

    const incBtn = e.target.closest("[data-action='inc']");
    if (incBtn) {
      e.stopPropagation();
      const row = incBtn.closest("[data-id]");
      setQty(row.dataset.id, (cart[row.dataset.id] || 0) + 1);
      renderSearchOverlay();
      return;
    }

    const row = e.target.closest(".search-result-row");
    if (row) {
      addRecentSearch(searchOverlayInput.value);
      closeSearchOverlay();
      openDetail(row.dataset.openId);
    }
  });

  /* --------------------------------------------------------------------
     7. BANNER CAROUSEL — real sliding track, swipeable + draggable,
        with clickable dots and autoplay (local data, no network calls)
     -------------------------------------------------------------------- */
  const bannerViewport = document.getElementById("bannerViewport");
  const bannerTrack = document.getElementById("bannerTrack");
  const bannerDots = document.getElementById("bannerDots");

  let bannerIndex = 0;
  let bannerAutoplayTimer = null;
  let bannerDrag = null; // { startX, startTranslate, width, moved }

function renderBannerSlides() {
  bannerTrack.innerHTML = BANNERS.map((banner, i) => `
    <div
      class="banner-slide"
      data-category="${banner.category || ""}"
      style="
        background-image:
          linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)),
          url('${banner.image}');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      "
    >
      ${banner.offerText ? `<span class="banner-offer-badge">${escapeHtml(banner.offerText)}</span>` : ""}
      <div class="banner-content">
        <p class="banner-eyebrow">${escapeHtml(banner.eyebrow)}</p>
        <h1>${escapeHtml(banner.title)}</h1>
        <p>${escapeHtml(banner.subtitle)}</p>
        ${banner.buttonText ? `<button type="button" class="banner-cta" data-index="${i}">${escapeHtml(banner.buttonText)}</button>` : ""}
      </div>
    </div>
  `).join("");

  bannerTrack.querySelectorAll(".banner-cta").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const banner = BANNERS[Number(btn.dataset.index)];
      if (banner && banner.category) {
        activeCategory = banner.category;
        renderCategories();
        renderGrid();
        document.getElementById("menuGrid").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  bannerDots.innerHTML = BANNERS.map((_, i) => `
    <button
      type="button"
      class="dot ${i === 0 ? "active" : ""}"
      data-index="${i}"
      aria-label="Go to banner ${i + 1}"
    ></button>
  `).join("");

  bannerDots.querySelectorAll(".dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      goToBanner(Number(dot.dataset.index), true);
      restartBannerAutoplay();
    });
  });
}

    

  function goToBanner(index, animate) {
    bannerIndex = ((index % BANNERS.length) + BANNERS.length) % BANNERS.length;
    bannerTrack.classList.toggle("is-snapping", animate !== false);
    bannerTrack.style.transform = `translateX(-${bannerIndex * 100}%)`;
    bannerDots.querySelectorAll(".dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === bannerIndex);
    });
  }

  function restartBannerAutoplay() {
    clearInterval(bannerAutoplayTimer);
    if (BANNERS.length <= 1) return;
    bannerAutoplayTimer = setInterval(() => {
      goToBanner(bannerIndex + 1);
    }, 5000);
  }

  /* Drag / swipe — Pointer Events cover touch, mouse, and pen in one API.
     While dragging, the track follows the pointer 1:1 with no transition
     (feels immediate); on release it snaps to whichever slide is nearest,
     eased in, matching the Zomato/Swiggy-style banner feel. */
  bannerViewport.addEventListener("pointerdown", (e) => {
    if (BANNERS.length <= 1) return;
    if (e.target.closest(".dot")) return; // let dot buttons handle their own click, undisturbed
    bannerDrag = {
      startX: e.clientX,
      startTranslate: -bannerIndex * bannerViewport.offsetWidth,
      width: bannerViewport.offsetWidth,
      moved: false
    };
    bannerTrack.classList.remove("is-snapping");
    bannerViewport.classList.add("is-dragging");
    bannerViewport.setPointerCapture(e.pointerId);
    clearInterval(bannerAutoplayTimer);
  });

  bannerViewport.addEventListener("pointermove", (e) => {
    if (!bannerDrag) return;
    const delta = e.clientX - bannerDrag.startX;
    if (Math.abs(delta) > 4) bannerDrag.moved = true;
    bannerTrack.style.transform = `translateX(${bannerDrag.startTranslate + delta}px)`;
  });

  function endBannerDrag(e) {
    if (!bannerDrag) return;
    const delta = e.clientX - bannerDrag.startX;
    const threshold = bannerDrag.width * 0.18;

    if (delta <= -threshold) {
      goToBanner(bannerIndex + 1);
    } else if (delta >= threshold) {
      goToBanner(bannerIndex - 1);
    } else {
      goToBanner(bannerIndex); // snap back to the same slide
    }

    bannerViewport.classList.remove("is-dragging");
    bannerDrag = null;
    restartBannerAutoplay();
  }

  bannerViewport.addEventListener("pointerup", endBannerDrag);
  bannerViewport.addEventListener("pointercancel", endBannerDrag);

  // Keep the current slide aligned if the viewport is resized (orientation change etc.)
  window.addEventListener("resize", () => goToBanner(bannerIndex, false));

  /* --------------------------------------------------------------------
     8. FLOATING SORT BUTTON + MENU
     -------------------------------------------------------------------- */
  const sortMenu = document.getElementById("sortMenu");
  const floatingSortBtn = document.getElementById("floatingSortBtn");

  floatingSortBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sortMenu.classList.toggle("show");
  });

  sortMenu.querySelectorAll("button[data-sort]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      activeSort = btn.dataset.sort;
      sortMenu.querySelectorAll("button[data-sort]").forEach((b) =>
        b.classList.toggle("is-active", b.dataset.sort === activeSort)
      );
      renderGrid();
      sortMenu.classList.remove("show");
    });
  });

  document.addEventListener("click", () => sortMenu.classList.remove("show"));

  /* --------------------------------------------------------------------
     9. FOOD DETAIL SHEET
     -------------------------------------------------------------------- */
  const detailBackdrop = document.getElementById("detailBackdrop");
  const detailSheet = document.getElementById("detailSheet");
  let detailQty = 1;

  function openDetail(id) {
    activeDetailItem = findItem(id);
    if (!activeDetailItem) return;
    detailQty = 1;
    renderDetail();
    openSheet(detailBackdrop, detailSheet);
    addRecentlyViewed(activeDetailItem.id);
  }

  function renderDetail() {
    const item = activeDetailItem;
    if (!item) return;
    const vegClass = item.type === "veg" ? "" : "nonveg";
    const vegLabel = item.type === "veg" ? "Veg" : "Non-Veg";
    const imgSrc = foodImagePath(item);

    document.getElementById("detailMedia").innerHTML = `
      <img
        src="${imgSrc}"
        alt="${escapeHtml(item.name)}"
        style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"
        onerror="this.onerror=null; window.__foodImageFallback(this, '${item.icon || "bowl"}');"
      >
      <button type="button" class="fav-btn ${isFavorite(item.id) ? "is-fav" : ""}" data-action="fav" data-id="${item.id}" aria-label="${isFavorite(item.id) ? "Remove from favorites" : "Add to favorites"}">
        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="${isFavorite(item.id) ? "currentColor" : "none"}"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    `;
    document.getElementById("detailMedia").querySelector("[data-action='fav']").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(item.id);
    });
    document.getElementById("detailMedia").addEventListener("click", (e) => {
      if (e.target.closest("[data-action='fav']")) return;
      openImagePreview(imgSrc, item.name);
    });

    document.getElementById("detailVegMark").className = `food-mark ${vegClass}`;
    document.getElementById("detailVegLabel").textContent = vegLabel;
    document.getElementById("detailName").textContent = item.name;
    document.getElementById("detailDesc").textContent = item.description;
    document.getElementById("detailQty").textContent = detailQty;

    // Optional premium fields — badges, prep time, spice level, discount
    const badges = [];
    if (item.popular) badges.push(`<span class="food-badge food-badge--popular">Popular</span>`);
    if (item.trending) badges.push(`<span class="food-badge food-badge--trending">Trending</span>`);
    if (item.special) badges.push(`<span class="food-badge food-badge--special">Special</span>`);
    if (item.new) badges.push(`<span class="food-badge food-badge--new">New</span>`);
    document.getElementById("detailBadges").innerHTML = badges.length ? `<div class="food-badges">${badges.join("")}</div>` : "";

    const metaBits = [];
    if (item.prepTime) metaBits.push(`<span class="food-meta__prep">⏱ ${escapeHtml(item.prepTime)}</span>`);
    if (item.spiceLevel) metaBits.push(`<span class="food-meta__spice">${"🌶".repeat(Math.min(item.spiceLevel, 3))}</span>`);
    if (Array.isArray(item.ingredients) && item.ingredients.length) {
      metaBits.push(`<span>Ingredients: ${escapeHtml(item.ingredients.join(", "))}</span>`);
    }
    if (Array.isArray(item.allergens) && item.allergens.length) {
      metaBits.push(`<span>Allergens: ${escapeHtml(item.allergens.join(", "))}</span>`);
    }
    document.getElementById("detailMeta").innerHTML = metaBits.length
      ? `<div class="food-meta" style="flex-wrap:wrap;">${metaBits.join("")}</div>` : "";

    const hasDiscount = item.originalPrice && item.originalPrice > item.price;

    const availNote = document.getElementById("detailUnavailableNote");
    const addBtn = document.getElementById("detailAddBtn");
    const qtyBox = document.getElementById("detailQtyBox");
    const priceEl = document.getElementById("detailPrice");

    if (hasDiscount) {
      const discountPct = Math.round((1 - item.price / item.originalPrice) * 100);
      priceEl.innerHTML = `₹${item.price} <span class="food-price--original" style="margin-left:6px;">₹${item.originalPrice}</span> <span class="discount-badge">${discountPct}% OFF</span>`;
    } else {
      priceEl.textContent = `₹${item.price}`;
    }

    if (item.available) {
      availNote.style.display = "none";
      addBtn.disabled = false;
      addBtn.textContent = `Add to Cart • ₹${item.price * detailQty}`;
      qtyBox.style.display = "flex";
    } else {
      availNote.style.display = "block";
      addBtn.disabled = true;
      addBtn.textContent = "Out of Stock";
      qtyBox.style.display = "none";
    }
  }

  /* --------------------------------------------------------------------
     4c. FULLSCREEN IMAGE PREVIEW
     -------------------------------------------------------------------- */
  const imagePreviewOverlay = document.getElementById("imagePreviewOverlay");
  const imagePreviewImg = document.getElementById("imagePreviewImg");
  const imagePreviewClose = document.getElementById("imagePreviewClose");

  function openImagePreview(src, alt) {
    if (!imagePreviewOverlay) return;
    imagePreviewImg.src = src;
    imagePreviewImg.alt = alt || "";
    imagePreviewOverlay.classList.add("is-open");
  }

  function closeImagePreview() {
    if (imagePreviewOverlay) imagePreviewOverlay.classList.remove("is-open");
  }

  if (imagePreviewClose) imagePreviewClose.addEventListener("click", closeImagePreview);
  if (imagePreviewOverlay) {
    imagePreviewOverlay.addEventListener("click", (e) => {
      if (e.target === imagePreviewOverlay) closeImagePreview();
    });
  }

  /* --------------------------------------------------------------------
     4d. SHARE DISH — Web Share API with clipboard fallback; also
         supports opening a shared link directly via ?dish=ID
     -------------------------------------------------------------------- */
  function shareDish(item) {
    const url = new URL(window.location.href);
    url.searchParams.set("dish", item.id);
    const shareData = { title: item.name, text: item.description, url: url.toString() };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url.toString())
        .then(() => showToast("Link copied"))
        .catch(() => showToast("Couldn't copy the link"));
    } else {
      showToast("Couldn't copy the link");
    }
  }

  const detailShareBtn = document.getElementById("detailShareBtn");
  if (detailShareBtn) {
    detailShareBtn.addEventListener("click", () => {
      if (activeDetailItem) shareDish(activeDetailItem);
    });
  }

  document.getElementById("detailQtyInc").addEventListener("click", () => {
    detailQty += 1;
    renderDetail();
  });
  document.getElementById("detailQtyDec").addEventListener("click", () => {
    if (detailQty > 1) detailQty -= 1;
    renderDetail();
  });
  document.getElementById("detailAddBtn").addEventListener("click", () => {
    if (!activeDetailItem || !activeDetailItem.available) return;
    addToCart(activeDetailItem.id, detailQty);
    closeSheet(detailBackdrop, detailSheet);
  });

  /* --------------------------------------------------------------------
     10. CART SHEET
     -------------------------------------------------------------------- */
  const cartBackdrop = document.getElementById("cartBackdrop");
  const cartSheet = document.getElementById("cartSheet");
  let cartSheetOpen = false;

  function renderCartSheet() {
    const entries = cartEntries();
    const listEl = document.getElementById("cartList");
    const summaryEl = document.getElementById("cartSummary");

    if (entries.length === 0) {
      listEl.innerHTML = `
        <div class="cart-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <strong style="display:block;font-size:16px;color:var(--ink);margin-bottom:4px;">Your cart is empty</strong>
          <p>Add a few dishes to get started.</p>
        </div>`;
      summaryEl.style.display = "none";
      const recWrap = document.getElementById("cartRecommendations");
      if (recWrap) recWrap.style.display = "none";
      return;
    }

    listEl.innerHTML = entries.map(({ item, qty }) => `
      <div class="cart-row" data-id="${item.id}">
        <div class="cart-row__icon">
          <img
            src="${foodImagePath(item)}"
            alt="${escapeHtml(item.name)}"
            style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"
            onerror="this.onerror=null; window.__foodImageFallback(this, '${item.icon || "bowl"}');"
          >
        </div>
        <div class="cart-row__info">
          <p class="cart-row__name">${escapeHtml(item.name)}</p>
          <p class="cart-row__price">₹${item.price} × ${qty} = ₹${item.price * qty}</p>
        </div>
        <div class="quantity" data-id="${item.id}" style="position:static;background:var(--accent-soft);">
          <button type="button" data-action="dec" aria-label="Decrease quantity" style="color:var(--accent);">−</button>
          <span style="color:var(--accent);">${qty}</span>
          <button type="button" data-action="inc" aria-label="Increase quantity" style="color:var(--accent);">+</button>
        </div>
        <button class="cart-row__remove" data-action="remove" data-id="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join("");

    listEl.querySelectorAll(".quantity").forEach((stepper) => {
      const id = stepper.dataset.id;
      stepper.querySelector("[data-action='inc']").addEventListener("click", () => setQty(id, (cart[id] || 0) + 1));
      stepper.querySelector("[data-action='dec']").addEventListener("click", () => setQty(id, (cart[id] || 0) - 1));
    });
    listEl.querySelectorAll("[data-action='remove']").forEach((btn) => {
      btn.addEventListener("click", () => setQty(btn.dataset.id, 0));
    });

    summaryEl.style.display = "block";
    document.getElementById("cartSubtotal").textContent = `₹${cartTotalPrice()}`;
    document.getElementById("cartTotal").textContent = `₹${cartTotalPrice()}`;
    renderCartRecommendations();
  }

  // "You may also like" — a few available, not-already-in-cart dishes,
  // preferring the same categories as what's already in the cart. This is
  // a generic recommender since MENU_ITEMS doesn't define explicit
  // recommendedWith relationships; add that field to items to make specific
  // pairings (e.g. Biryani → Raita) take over here later.
  function renderCartRecommendations() {
    const wrap = document.getElementById("cartRecommendations");
    const track = document.getElementById("cartRecommendationsTrack");
    if (!wrap || !track) return;

    const cartCategories = new Set(cartEntries().map((e) => e.item.category));
    const candidates = MENU_ITEMS.filter((item) => item.available && !cart[item.id]);
    const sameCategory = candidates.filter((item) => cartCategories.has(item.category));
    const rest = candidates.filter((item) => !cartCategories.has(item.category));
    const picks = sameCategory.concat(rest).slice(0, 4);

    if (picks.length === 0) {
      wrap.style.display = "none";
      return;
    }

    wrap.style.display = "block";
    track.innerHTML = picks.map((item) => `
      <div class="cart-rec-card">
        <div class="cart-rec-card__img">
          <img
            src="${foodImagePath(item)}"
            alt="${escapeHtml(item.name)}"
            loading="lazy"
            onerror="this.onerror=null; window.__foodImageFallback(this, '${item.icon || "bowl"}');"
          >
        </div>
        <p class="cart-rec-card__name">${escapeHtml(item.name)}</p>
        <p class="cart-rec-card__price">₹${item.price}</p>
        <button type="button" class="cart-rec-card__add" data-action="add-rec" data-id="${item.id}">+ Add</button>
      </div>
    `).join("");

    track.querySelectorAll("[data-action='add-rec']").forEach((btn) => {
      btn.addEventListener("click", () => {
        addToCart(btn.dataset.id);
      });
    });
  }

  document.getElementById("cartBar").addEventListener("click", () => {
    cartSheetOpen = true;
    renderCartSheet();
    openSheet(cartBackdrop, cartSheet);
  });

  document.getElementById("goToCheckoutBtn").addEventListener("click", () => {
    if (cartTotalCount() === 0) return;
    closeSheet(cartBackdrop, cartSheet);
    setTimeout(openCheckout, 260);
  });

  /* --------------------------------------------------------------------
     10b. CLEAR CART — custom confirmation sheet, no browser alert()
     -------------------------------------------------------------------- */
  const clearCartBackdrop = document.getElementById("clearCartBackdrop");
  const clearCartSheet = document.getElementById("clearCartSheet");

  function openClearCartConfirm() {
    if (cartTotalCount() === 0) {
      showToast("Your cart is already empty");
      return;
    }
    openSheet(clearCartBackdrop, clearCartSheet);
  }

  const clearCartBtnEl = document.getElementById("clearCartBtn");
  if (clearCartBtnEl) clearCartBtnEl.addEventListener("click", openClearCartConfirm);

  const clearCartCancelBtn = document.getElementById("clearCartCancelBtn");
  if (clearCartCancelBtn) {
    clearCartCancelBtn.addEventListener("click", () => closeSheet(clearCartBackdrop, clearCartSheet));
  }

  const clearCartConfirmBtn = document.getElementById("clearCartConfirmBtn");
  if (clearCartConfirmBtn) {
    clearCartConfirmBtn.addEventListener("click", () => {
      cart = {};
      saveCart();
      renderAll();
      closeSheet(clearCartBackdrop, clearCartSheet);
      showToast("Cart cleared");
    });
  }

  /* --------------------------------------------------------------------
     11. CHECKOUT SHEET (demo only — no real backend/order system)
     -------------------------------------------------------------------- */
  const checkoutBackdrop = document.getElementById("checkoutBackdrop");
  const checkoutSheet = document.getElementById("checkoutSheet");

  function openCheckout() {
    document.getElementById("checkoutTable").textContent = tableDisplayName();
    const entries = cartEntries();
    document.getElementById("checkoutItems").innerHTML = entries.map(({ item, qty }) => `
      <div class="summary-line">
        <span>${escapeHtml(item.name)} × ${qty}</span>
        <span>₹${item.price * qty}</span>
      </div>
    `).join("");
    document.getElementById("checkoutTotal").textContent = `₹${cartTotalPrice()}`;
    openSheet(checkoutBackdrop, checkoutSheet);
  }

  document.getElementById("placeOrderBtn").addEventListener("click", () => {
    if (cartTotalCount() === 0) {
      showToast("Your cart is empty");
      return;
    }
    const name = document.getElementById("customerName").value.trim();
    const notes = document.getElementById("specialInstructions").value.trim();
    const orderId = "ORD" + Math.floor(1000 + Math.random() * 9000);

    document.getElementById("confirmTable").textContent = tableDisplayName();
    document.getElementById("confirmOrderId").textContent = `#${orderId}`;
    document.getElementById("confirmName").textContent = name
      ? `Thanks, ${name}! Your demo order has been recorded locally.`
      : "Your demo order has been recorded locally.";
    void notes; // demo only — not persisted anywhere beyond this screen

    closeSheet(checkoutBackdrop, checkoutSheet);
    setTimeout(() => {
      cart = {};
      saveCart();
      renderAll();
      document.getElementById("customerName").value = "";
      document.getElementById("specialInstructions").value = "";
      openSheet(confirmBackdrop, confirmSheet);
    }, 260);
  });

  /* --------------------------------------------------------------------
     12. CONFIRMATION SHEET
     -------------------------------------------------------------------- */
  const confirmBackdrop = document.getElementById("confirmBackdrop");
  const confirmSheet = document.getElementById("confirmSheet");

  document.getElementById("confirmDoneBtn").addEventListener("click", () => {
    closeSheet(confirmBackdrop, confirmSheet);
  });

  /* --------------------------------------------------------------------
     13. GENERIC SHEET OPEN/CLOSE + BACKDROP/ESC HANDLING
     -------------------------------------------------------------------- */
  function openSheet(backdrop, sheet) {
    backdrop.classList.add("is-open");
    sheet.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeSheet(backdrop, sheet) {
    backdrop.classList.remove("is-open");
    sheet.classList.remove("is-open");
    if (sheet === cartSheet) cartSheetOpen = false;
    if (sheet.id === "settingsSheet") settingsSheetOpen = false;
    const anyOpen = document.querySelectorAll(".sheet.is-open").length > 0;
    if (!anyOpen) document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", () => {
      const sheet = document.getElementById(el.dataset.close);
      const backdrop = document.getElementById(el.dataset.close.replace("Sheet", "Backdrop"));
      closeSheet(backdrop, sheet);
    });
  });

  document.querySelectorAll(".sheet-backdrop").forEach((bd) => {
    bd.addEventListener("click", () => {
      const sheet = document.getElementById(bd.id.replace("Backdrop", "Sheet"));
      closeSheet(bd, sheet);
    });
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".sheet.is-open").forEach((sheet) => {
        const backdrop = document.getElementById(sheet.id.replace("Sheet", "Backdrop"));
        closeSheet(backdrop, sheet);
      });
      sortMenu.classList.remove("show");
      closeImagePreview();
    }
  });

  /* --------------------------------------------------------------------
     13b. DARK MODE — CSS-variable based, persisted, applied on load
     -------------------------------------------------------------------- */
  function loadTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || "light";
    } catch (e) {
      console.warn("Could not read theme from localStorage:", e);
      return "light";
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    const toggle = document.getElementById("darkModeToggle");
    if (toggle) toggle.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.warn("Could not save theme to localStorage:", e);
    }
  }

  let currentTheme = loadTheme();
  applyTheme(currentTheme);

  const darkModeToggleEl = document.getElementById("darkModeToggle");
  if (darkModeToggleEl) {
    darkModeToggleEl.addEventListener("click", () => {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(currentTheme);
      saveTheme(currentTheme);
    });
  }

  /* --------------------------------------------------------------------
     13c. SETTINGS SHEET
     -------------------------------------------------------------------- */
  const settingsBackdrop = document.getElementById("settingsBackdrop");
  const settingsSheet = document.getElementById("settingsSheet");
  let settingsSheetOpen = false;

  function renderSettingsCounts() {
    const el = document.getElementById("settingsFavoritesCount");
    if (!el) return;
    const count = favoritesCount();
    el.textContent = `${count} saved ${count === 1 ? "dish" : "dishes"}`;
  }

  const settingsBtnEl = document.getElementById("settingsBtn");
  if (settingsBtnEl && settingsBackdrop && settingsSheet) {
    settingsBtnEl.addEventListener("click", () => {
      settingsSheetOpen = true;
      renderSettingsCounts();
      openSheet(settingsBackdrop, settingsSheet);
    });
  }

  const settingsFavoritesBtn = document.getElementById("settingsFavoritesBtn");
  if (settingsFavoritesBtn) {
    settingsFavoritesBtn.addEventListener("click", () => {
      activeCategory = "favorites";
      renderCategories();
      renderGrid();
      closeSheet(settingsBackdrop, settingsSheet);
    });
  }

  const settingsClearCartBtn = document.getElementById("settingsClearCartBtn");
  if (settingsClearCartBtn) {
    settingsClearCartBtn.addEventListener("click", () => {
      closeSheet(settingsBackdrop, settingsSheet);
      setTimeout(openClearCartConfirm, 260);
    });
  }

  /* --------------------------------------------------------------------
     13d. SHARE MENU — Web Share API with a clipboard fallback
     -------------------------------------------------------------------- */
  function shareMenu() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch(() => {
        // user cancelled the share sheet — not an error, nothing to do
      });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => showToast("Menu link copied"))
        .catch(() => showToast("Couldn't copy the link"));
    } else {
      showToast("Couldn't copy the link");
    }
  }

  const settingsShareBtn = document.getElementById("settingsShareBtn");
  if (settingsShareBtn) settingsShareBtn.addEventListener("click", shareMenu);

  /* --------------------------------------------------------------------
     14. TOAST
     -------------------------------------------------------------------- */
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1600);
  }

  /* --------------------------------------------------------------------
     15. QR DOCS FOOTER — build example links relative to current page
     -------------------------------------------------------------------- */

  /* --------------------------------------------------------------------
     16. INIT — each step is wrapped so one failure can't cascade and
         leave the splash screen stuck or the rest of the page unusable.
     -------------------------------------------------------------------- */
  safeCall(() => {
    document.getElementById("restaurantName").textContent = RESTAURANT.name;
    document.getElementById("restaurantSubtitle").textContent = RESTAURANT.subtitle;
    document.getElementById("checkoutRestaurant").textContent = RESTAURANT.name;
    const splashName = document.getElementById("splashRestaurantName");
    if (splashName) splashName.textContent = RESTAURANT.name;
  }, "restaurant info");

  safeCall(renderTableBadge, "renderTableBadge");
  safeCall(buildSearchIndex, "buildSearchIndex");
  safeCall(syncSearchTrigger, "syncSearchTrigger");
  safeCall(initFloatingSearch, "floating search bubble");
  safeCall(renderCategories, "renderCategories");
  safeCall(renderTypeFilter, "renderTypeFilter");
  safeCall(renderBudgetFilter, "renderBudgetFilter");
  safeCall(renderGrid, "renderGrid");
  safeCall(renderCartBar, "renderCartBar");
  safeCall(renderRecentlyViewed, "renderRecentlyViewed");
  safeCall(() => {
    renderBannerSlides();
    goToBanner(0, false);
    restartBannerAutoplay();
  }, "banner carousel");

  // Sticky header gets a blur/shadow once the page has scrolled a little.
  safeCall(() => {
    const headerEl = document.querySelector(".header");
    if (!headerEl) return;
    const onScroll = () => headerEl.classList.toggle("is-stuck", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }, "sticky header");

  // Shareable dish URL: ?dish=123 (table param, if present, is untouched)
  safeCall(() => {
    const params = new URLSearchParams(window.location.search);
    const dishId = params.get("dish");
    if (dishId && findItem(dishId)) {
      setTimeout(() => openDetail(dishId), 1200);
    }
  }, "deep-linked dish");

  /* ================= SPLASH SCREEN ================= */
  safeCall(() => {
    const splashScreen = document.getElementById("splashScreen");
    const splashTable = document.getElementById("splashTable");

    if (splashScreen) {
      if (splashTable) splashTable.textContent = tableDisplayName();

      setTimeout(() => {
        splashScreen.classList.add("hide");
        setTimeout(() => {
          if (splashScreen.parentNode) splashScreen.remove();
        }, 500);
      }, 1000);
    }
  }, "splash screen");
})();
