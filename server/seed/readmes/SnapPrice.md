# SnapPrice

**Snap it. Find it cheaper.**

SnapPrice finds the best price for a product across Indian stores. Upload a photo or a screenshot, paste a product link or just type the name. SnapPrice works out exactly which product it is, compares Amazon, Flipkart, Myntra, AJIO, Nykaa, Croma and many more, and shows the cheapest **safe** deal. It also flags the traps: inflated "75% off" prices, sellers that look too cheap to be real, renewed items and look-alike products.

![SnapPrice home page](docs/screenshots/home.png)

## Features

- **Four ways to search.** A photo, a screenshot (just press Ctrl+V anywhere), a product link, or a name. Gemini reads the brand, model, size and colour from photos, and the price and shop from screenshots.
- **Exact matches first.** Every listing is scored against the product. The model name and storage or volume must match for an "Exact match". Covers, cases and other accessories are removed, and other products are moved to the bottom.
- **Best safe deal.** The cheapest new, exact-match offer from a known store or the brand's own store. If a cheaper listing exists but looks risky, it is shown separately as "Cheapest, but check".
- **Traps flagged:**
  - **Inflated MRP:** a big "% off", but other stores already sell at about that price.
  - **Too good to be true:** the price is far below the usual price across stores.
  - **Renewed or used** listings, and **lesser-known stores**.
- **Deal score from 0 to 100** and an "N% below usual" label on every offer. "Usual" means the middle price across stores, not the MRP.
- **Savings vs your screenshot.** If you snap a product page, you see how much less the best store charges.
- **Value per 100 ml or 100 g** when pack sizes differ (single pack vs pack of 2).
- **All stores and reviews.** Per listing:
  - every store with direct links, delivery, coupons and bank offers
  - star breakdown
  - shoppers' reviews summarised into pros and cons
- **Cheaper alternatives.** Similar products from other brands that cost less and are still rated 3.8 or higher.
- **Price watch.**
  - Watch a product and set a target price, with a price-history chart.
  - Alerts on drops, plus automatic re-checks every 12 hours.
  - A **buy now or wait** verdict that uses the price history and the usual dates of big Indian sales (Big Billion Days, Great Indian Festival, Prime Day, Republic Day, End of Reason Sale).
- **History.** Every search is saved, with totals for searches made, money you could save and traps spotted.
- **Demo mode.** Works with no keys at all, using six clearly labelled sample products. Store buttons still open each store's real search page.

## Screenshots

| Snap a product | Results with best deal and traps |
|---|---|
| ![Snap](docs/screenshots/snap.png) | ![Results](docs/screenshots/result.png) |

| All stores and reviews | Cheaper alternatives |
|---|---|
| ![Stores and reviews](docs/screenshots/stores-and-reviews.png) | ![Alternatives](docs/screenshots/alternatives.png) |

| Watchlist with buy-or-wait | History |
|---|---|
| ![Watchlist](docs/screenshots/watchlist.png) | ![History](docs/screenshots/history.png) |

| Mobile | |
|---|---|
| <img src="docs/screenshots/mobile.png" width="260" alt="Mobile"> | |

The screenshots were taken in demo mode, so the prices shown are sample data.

## Tech stack

| Part | Tools |
|---|---|
| Website | React 18, Vite, Tailwind CSS, Framer Motion, Recharts, canvas-confetti |
| API server | Node.js, Express, JWT + bcrypt, multer + sharp (photos cleaned, location data removed), helmet, rate limiting |
| Database | SQLite through Node's built-in `node:sqlite` (nothing to install) |
| Product recognition | Google Gemini, newest Flash model picked automatically (vision, structured JSON output) |
| Prices and reviews | Google Shopping India through SerpApi (`google_shopping` and `google_immersive_product`) |

## How it works

```
photo / screenshot ─► Gemini ─► { brand, model, variant, colour, search query, price seen }
link ─► product name read from the link (or the page title)
name ─► brand detected from a list of popular brands
                │
                ▼
SerpApi Google Shopping (India) ─► up to ~40 offers from many stores
                │
                ▼
Deal engine (server/lib/deals.js)
  1. match score per listing: exact / similar / other / accessory (removed)
  2. "usual price" = median of new, exact listings
  3. flags: inflated MRP, too cheap, renewed, unknown store
  4. best safe deal, cheapest-but-check, best value per 100 ml or 100 g, deal score
                │
                ▼
React results page ─► all stores and reviews (on demand) ─► alternatives ─► watch + alerts
```

**Saving the free quota.** Every SerpApi answer is cached in SQLite for 6 to 24 hours. Searches used this month are counted and shown in the navbar. Background re-checks stop once 80% of the monthly searches are used, so the rest stays free for your own searches.

## Run it locally

You need **Node.js 22.13 or newer**.

```bash
npm run setup   # once: installs packages and creates the .env files
npm run dev     # starts the API (port 5004) and the website (port 5176)
```

Open **http://localhost:5176**, create an account and try a sample product.

### Live prices and photo recognition (free keys)

Add one or both keys to `server/.env`, then restart `npm run dev`:

```
SERPAPI_KEY=your_serpapi_key       # https://serpapi.com/manage-api-key  (free: 250 searches a month)
GEMINI_API_KEY=your_gemini_key     # https://aistudio.google.com/apikey  (free)
```

| Keys set | What works |
|---|---|
| none | Demo mode: six sample products, by sample photo, name or link |
| SerpApi | Live prices for **any** product by link or name |
| SerpApi + Gemini | Everything, including your own photos and screenshots, plus AI review summaries |

## Tests

```bash
npm test
```

- **11 unit tests** for the deal engine. They cover:
  - reading product names from Amazon, Flipkart, Myntra and Nykaa links
  - exact, similar and accessory matching, including a different storage size
  - prices, pack sizes and unit prices
  - inflated MRP and too-cheap detection, and choosing the best safe deal
  - deal score, sale windows, and buy now or wait
- **3 API tests** that start the real server:
  - **Live mode** against a fake SerpApi and a fake Gemini that return the real JSON shapes: photo to product to best deal, cache reuse, store details, review summary, alternatives, links, empty results, non-product photos, watchlist, and the monthly limit.
  - **Demo mode** with no keys.
- The website is also built as part of `npm test`.

The full browser flow was tested end to end with Playwright: sign up, sample photo, results, stores drawer, alternatives, filters, edit and search again, watch, price checks, alerts, name and link searches, history, and the mobile layout.

## Project structure

```
server/
  providers/   serpapi.js (prices, stores, reviews), gemini.js (photo recognition, review summary), demo.js
  lib/         text.js (links, matching, sizes), deals.js (deal engine, buy or wait), search.js, watcher.js
  routes/      auth.js, search.js, watch.js
  samples/     demo product pictures
  test/        unit tests, API tests, fake SerpApi + Gemini
client/
  src/pages/   Home, Auth, Snap, Result, Watchlist, History
  src/components/  brand.jsx (logo + Tago mascot), StoreDrawer, Navbar, ui
scripts/       setup and test helpers (work on Windows, macOS and Linux)
```

## API

| Method | Route | What it does |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Create an account, sign in |
| GET / DELETE | `/api/auth/me` | Current user; delete the account and every photo |
| GET | `/api/config` | Live or demo mode, photo AI on or off, searches left this month |
| POST | `/api/search` | Search by `photo` (multipart), `url`, `query`, or an edited `product` |
| GET | `/api/search` | Past searches with totals |
| GET / DELETE | `/api/search/:id` | One search |
| POST | `/api/search/:id/alternatives` | Cheaper similar products from other brands |
| GET | `/api/search/:id/offers/:offerId` | Every store for one listing, plus reviews summary |
| POST / GET | `/api/watch` | Watch a product; watchlist with history and buy-or-wait |
| POST | `/api/watch/:id/check` | Re-check the price now |
| PATCH / DELETE | `/api/watch/:id` | Change the target price; stop watching |
| GET | `/api/watch/alerts` | Price-drop alerts (POST `/alerts/read` marks them read) |

## Limitations

- Prices come from Google Shopping and can be a few hours old. Always check the final price on the store before paying.
- Some stores list a product under a different name. Use **Edit and search again** to fix the brand, model or size.
- Short share links (amzn.in, dl.flipkart.com) don't contain the product name. Open the link and copy the full address.
- Sale dates are approximate and change every year.
- SnapPrice is not affiliated with any store.

## Author

**Megha Raykar** · [GitHub](https://github.com/Megharaykar27) · [LinkedIn](https://www.linkedin.com/in/megha-raykar-335617337)
