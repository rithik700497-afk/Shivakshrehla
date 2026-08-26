# Shivaksh Restaurant — QR Digital Menu (Static Prototype)

A fully static, mobile-first restaurant digital menu. Each table gets its own
link (`?table=1`, `?table=2`, ...) that a QR code points to. No backend, no
database, no build step — just HTML, CSS, and vanilla JavaScript, so it
deploys straight to GitHub Pages.

```
restaurant-menu/
├── index.html      structure for every screen (header, search, grid, sheets)
├── style.css        all styling — design tokens live at the top
├── script.js         all behavior (table param, search, cart, checkout)
├── menu.js            → EDIT THIS to add/remove/change dishes
└── README.md
```

## Run it locally

No install needed — it's static files. Any of these work:

```bash
# Option A: Python (built into most machines)
cd restaurant-menu
python3 -m http.server 8000
# then open http://localhost:8000/?table=4

# Option B: Node
npx serve .

# Option C: VS Code
# Right-click index.html → "Open with Live Server"
```

Don't just double-click `index.html` (`file://...`) — `fetch`/search-param
handling and some browsers' CORS rules behave inconsistently from the file
system. A local server takes 10 seconds and avoids all of that.

Try these once it's running:
- `?table=1`, `?table=2`, `?table=10` → header badge updates to that table
- no `table` param at all → badge shows **Takeaway**
- add a few items, refresh the page → cart survives (localStorage)
- place a demo order → cart clears and an order ID confirmation appears

## Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `restaurant-menu`) and push these files to
   the root of the `main` branch.
2. In the repo: **Settings → Pages → Source** → select `main` branch, `/root`
   folder → **Save**.
3. GitHub gives you a URL like `https://username.github.io/restaurant-menu/`.
4. Table links are that URL plus `?table=N`:
   ```
   https://username.github.io/restaurant-menu/?table=1
   https://username.github.io/restaurant-menu/?table=2
   https://username.github.io/restaurant-menu/?table=3
   ```
5. Generate a QR code for each link (any free QR generator — e.g.
   `https://www.qr-code-generator.com`, or the `qrcode` npm package if you
   want to batch-generate them) and print one per table.

Everything uses relative paths (`style.css`, not `/style.css`), so this also
works fine if the repo isn't at the domain root — no config needed either way.

## Editing the menu

Open `menu.js`. Every dish is one object:

```js
{
  id: 20,
  name: "Veg Manchurian",
  category: "chinese",        // must match an id in CATEGORIES
  price: 210,
  description: "Fried veg balls tossed in a tangy sauce",
  type: "veg",                 // "veg" | "nonveg"
  available: true,             // false shows "Out of Stock" + disables Add
  icon: "wok"                  // which placeholder illustration to show —
                                // see ICONS in script.js: skewer, bowl, curry,
                                // noodles, wok, pizza, burger, drink, dessert
}
```

Add a new object to `MENU_ITEMS`, or delete/edit one, and refresh — that's
the entire content-management workflow for this prototype. Restaurant name,
subtitle, and categories are also in `menu.js` at the top.

## How the table system works

```js
const params = new URLSearchParams(window.location.search);
const tableNumber = params.get("table"); // never typed by the customer
```

The number is read once on page load and used everywhere the UI needs it
(header badge, checkout screen, confirmation screen). There's no way for a
customer to change it except by scanning a different table's QR code.

## What's a demo vs. what's real

- **Real**: search, category filtering, availability logic, cart math,
  quantity controls, localStorage persistence, table detection from URL.
- **Demo only**: "Place Demo Order" doesn't call any server — it just clears
  the cart and shows a locally-generated order ID. That's intentional; this
  is the front-end layer of a system that would plug into a real backend
  later.

## What I'd extend first

Roughly in the order I'd tackle them if this were going into production:

1. **Real order delivery** — swap the fake "Place Demo Order" handler for a
   `fetch()` POST to an actual backend (or something serverless like a
   Cloudflare Worker / Supabase function) that writes the order to a
   database and pings the kitchen — e.g. via a Telegram bot, WhatsApp
   webhook, or a simple kitchen-display web page listening on a socket.
2. **Real food photos** — replace the inline SVG placeholders in `ICONS`
   with actual `<img>` tags pointing at `assets/food/*.jpg`, with a
   `srcset` for retina and lazy-loading (`loading="lazy"`).
3. **A tiny admin view** — even a second static page that reads/writes
   `menu.js`-shaped JSON via a headless CMS (Netlify CMS / a Google Sheet +
   a build step) would remove the need to hand-edit JS to update prices or
   toggle stock.
4. **Per-table order status** — once orders hit a backend, add a lightweight
   "Order status: Preparing → Served" screen the customer can check without
   asking staff, polling or subscribing to the order's record.
5. **Multi-language menu** — the copy is centralized enough (`menu.js`,
   `RESTAURANT`, `CATEGORIES`) that adding an `i18n` object and a language
   toggle in the header would be a contained change.
6. **Analytics** — most-viewed dishes, most-abandoned carts, and busiest
   tables are valuable to a restaurant owner and only need a few
   `fetch()`-to-a-logging-endpoint calls sprinkled through existing
   handlers (`openDetail`, `addToCart`, `placeOrderBtn`).
7. **Allergen / spice-level tags** — extend the item schema (`allergens: []`,
   `spice: 1-3`) and surface it as small icons on the card and detail sheet.

## Notes on the design

- Red-on-white theme (`#e63232` accent) with Poppins throughout, veg/non-veg
  filter pills, a rotating offer banner, a floating "Sort" button, and a
  cart bar that expands into a full pill when you add something and settles
  into a small circular button after a couple of seconds.
- The veg/non-veg marks are the real Indian packaged-food symbol (green
  square + dot for veg, red square + dot for non-veg) instead of emoji,
  since that's the symbol people actually expect on a menu.
- The banner carousel uses CSS gradients + a decorative SVG pattern instead
  of hotlinked photos, so it works fully offline and never 404s on GitHub
  Pages. To use real photos, edit `showBanner()` in `script.js` and set
  `bannerEl.style.backgroundImage` instead of `background`.
- All food "photos" are dependency-free inline SVGs (see `ICONS` in
  `script.js`) — swap them for real photography whenever you have it (see
  extension #2).
- Sort (Default / Price Low→High / Price High→Low / Name A→Z) and the
  Veg/Non-Veg filter both combine with search and category — all four
  narrow the same `getFilteredItems()` list in `script.js`.
