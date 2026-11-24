# SkinScan

**Know your skin. Love your routine.**

SkinScan maps your skin from one selfie, checks any product's ingredient label against *your* skin, and builds a morning and night routine with real products ranked for you. The analysis is real computer vision in Python (OpenCV), not a black box, and it works without any API key.

![SkinScan landing page](docs/screenshots/landing.jpg)

## Features

- **Selfie skin map.** 68 face points are found in the browser (face-api.js), then a Python engine measures five zones (forehead, nose, both cheeks, chin) for **redness, oiliness, dark spots, texture and blemishes**, plus **dark circles** under the eyes. Results show as a heatmap on your photo, a 0-100 skin score, a zone-by-zone table and a plain-English summary.
- **What we found.** Not just scores: a list with counts and places, like "about 60 small brown dots on your nose and cheeks: this pattern looks like freckles, which are harmless", "5 small red bumps on your chin", or "darker under-eyes, brownish (pigment)".
- **Remedy plan.** A card for every finding: what it is, the best-studied ingredients with strengths, how to use them, when to expect results, safe home care, popular DIY remedies to skip (lemon, toothpaste, baking soda) and when to see a dermatologist.
- **Fair across skin tones.** Every measure compares each zone with *your own* skin, not with a "reference" complexion. The test suite checks that clear skin scores low for light, medium and deep skin tones.
- **Photo quality check.** Refuses side views and photos where the face is cut off, because the zones can't be placed fairly. Warns about dim light, blur, shadow on one side, a tilted head or a face that's too small, and lowers its confidence instead of pretending.
- **Ingredient label checker.** Photograph a label (read in the browser with Tesseract.js), paste the list, or search a product by name. About 200 ingredients (with 400+ label names) are marked **good / fine / watch / avoid** for your skin type, sensitivity, breakouts and pregnancy, with the reason. Small text-reading mistakes like "Glyc0l" are still matched, but near-identical ingredients (retinol vs retinal) are never guessed.
- **Personal routine.** AM, PM and weekly steps built from your latest scan and your answers, with ingredients to look for and avoid, and **real products** from [Open Beauty Facts](https://world.openbeautyfacts.org), ranked by how well their ingredients suit you. Anything containing an ingredient you should avoid is never suggested.
- **Progress tracking.** Charts of every measure over time and side-by-side comparison of any two scans.
- **Responsible by design.** Cosmetic estimates only, never a diagnosis. Clear "when to see a dermatologist" guidance, private photos with location data stripped, and one-click deletion of a scan or the whole account.
- **Optional Gemini.** With a free key, Gemini writes a warmer scan summary (from the measured numbers only, so it can't invent findings) and reads tricky curved or glossy labels.

## Screenshots

| Scan result with heatmap | 68-point face map |
|---|---|
| ![Scan result](docs/screenshots/scan-result.jpg) | ![Face landmarks](docs/screenshots/face-landmarks.jpg) |

| What we found + remedy plan | Ingredient label check |
|---|---|
| ![Remedy plan](docs/screenshots/remedy-plan.jpg) | ![Label check](docs/screenshots/label-check.jpg) |

| Personal routine | Progress |
|---|---|
| ![Routine](docs/screenshots/routine.jpg) | ![Progress](docs/screenshots/progress.jpg) |

| Mobile | |
|---|---|
| <img src="docs/screenshots/mobile.jpg" width="260" alt="Mobile"> | |


Demo faces are anonymous catalogue photos (see Credits). Product search was offline when these were taken, so the routine shows the fallback message instead of product cards.

## Tech stack

| Part | Language | Tools |
|---|---|---|
| Skin analysis engine | **Python** | FastAPI, OpenCV (YuNet face detector), NumPy, RapidFuzz, pytest |
| Website | **JavaScript** | React 18, Vite, Tailwind CSS, Framer Motion, Recharts, face-api.js (TensorFlow.js), Tesseract.js |
| API server | **JavaScript** | Node.js, Express, JWT + bcrypt, sharp, helmet, rate limiting, optional Gemini |
| Database | **SQL** | SQLite (Node's built-in `node:sqlite`, nothing to install) |

## How it works

```
Browser (React)
  ├─ face-api.js finds 68 face points   ─┐
  └─ Tesseract.js reads label text       │  photo + points / label text
                                         ▼
Node API (Express) ── accounts, history, routine, product search (Open Beauty Facts)
  │      SQLite: users · profiles · scans · label checks
  ▼
Python engine (FastAPI + OpenCV)
  1. Face: browser points, or OpenCV YuNet if none were sent
  2. Rescale so the eyes are always 140 px apart (same measurement scale for every camera)
  3. Five zone masks, minus hair/brows/background (colour distance from the person's own skin)
  4. Per zone, measured against the person's own skin:
       redness    hue shift + share of pixels redder than the face's median
       oiliness   bright, low-colour highlights (shine)
       dark spots small round patches darker than the surrounding skin, plus tiny
                  pigment dots (darker AND browner than nearby skin) counted as freckles
       dark circles under-eye brightness vs the person's own cheeks, tone = pigment or veins
       texture    fine-detail energy, ignoring smile lines, face outline, shine and freckles
       blemishes  small local redness peaks
  5. Heatmaps, skin score, skin-type guess, findings with counts, photo-quality warnings
```

A few details that keep results honest:
- Local comparisons use **skin-only blurs** (normalised convolution), so the edge of the hair or the background can't leak into a measurement.
- Dark spots must be **round and small**. Long thin shapes are shadow edges (jaw, nose side, brow), not spots.
- Spots and blemishes are scored mostly by **how many**, so one faint mark can't look like a problem.

## Run it locally

You need **Node.js 22.13+** and **Python 3.10–3.13**.

```bash
npm run setup   # once: Python virtual env + packages, npm packages, .env files
npm run dev     # starts the Python engine, the API and the website together
```

Open **http://localhost:5175**, create an account, answer three quick questions and take your first scan.

`npm run setup` creates `analyzer/.venv` for the Python packages, so nothing is installed globally. On Windows it uses the `py` launcher automatically.

### Optional: Gemini

Get a free key at [Google AI Studio](https://aistudio.google.com/apikey) and add it to `server/.env`:

```
GEMINI_API_KEY=your_key_here
```

Restart `npm run dev`. Everything else works without it.

## Tests

```bash
npm test
```

- **53 Python tests**, including "metamorphic" tests: a real face is digitally given redness, shine, dark spots, freckles, darker under-eyes, rough texture or red bumps, and the matching score must rise while the others stay steady. Others check fairness across four skin tones, agreement between the browser's 68-point map and the server's 5-point map, robustness to brightness and photo size, the ingredient matcher (typos, ambiguity, pregnancy, fragrance, pore-clogging), and refusing side views or cut-off faces.
- **11 Node tests** for the routine builder and remedy plan: sunscreen always last in the morning, no retinoids in pregnancy, gentle choices for sensitive skin, a complete remedy card for every finding type.

The full browser flow (sign up, quiz, scan, heatmaps, routine, typed and photographed labels, progress, no-face error, mobile layout) was also tested end to end with Playwright.

## Project structure

```
analyzer/   Python engine: skin.py (computer vision), ingredients.py, data/ingredients.json, tests/
server/     Express API: routes/, lib/advice.js (routine + tips), lib/products.js, ai/gemini.js
client/     React app: pages/, components/, lib/face.js (landmarks), lib/ocr.js (label reading)
scripts/    setup, dev and test helpers (cross-platform)
```

## API

| Method | Route | What it does |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Create account, sign in |
| GET / DELETE | `/api/auth/me` | Current user; delete account and every photo |
| GET / PUT | `/api/profile` | Skin type, sensitivity, breakouts, pregnancy, concerns |
| POST / GET | `/api/scans` | Analyse a selfie (+ optional 68 landmarks); history |
| GET | `/api/scans/progress` | Scores over time and change since the first scan |
| GET / DELETE | `/api/scans/:id` | One scan with heatmaps, tips and dermatologist notes |
| POST / GET | `/api/labels` | Check an ingredient list (text or photo); history |
| GET | `/api/routine` | Personal AM / PM / weekly routine |
| GET | `/api/routine/products` | Real products for a step, ranked for your skin |
| GET | `/api/routine/search` | Find a product by name |

The Python engine has interactive docs at http://localhost:8001/docs while it runs.

## Limitations

SkinScan works from a single front-facing 2D photo (side views are refused). Lighting, camera quality, makeup and expressions (a big smile creates shadows) all affect the numbers, so they're best for following **your own trend** in similar conditions, not for comparing people. It's a cosmetic tool and does not detect or diagnose any skin condition.

## Credits and licences

- Face detection: [YuNet](https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet) (MIT) via OpenCV. Face landmarks: [face-api.js](https://github.com/vladmandic/face-api) (MIT). OCR: [Tesseract.js](https://github.com/naptha/tesseract.js) (Apache-2.0).
- Product data: [Open Beauty Facts](https://world.openbeautyfacts.org) (Open Database License).
- Test face photos in `analyzer/tests/fixtures/` are anonymous catalogue images from the [IDM-VTON](https://github.com/yisol/IDM-VTON) examples (VITON-HD), CC BY-NC-SA 4.0, used for non-commercial testing only.

## Author

**Megha Raykar** · [GitHub](https://github.com/Megharaykar27) · [LinkedIn](https://www.linkedin.com/in/megha-raykar-335617337)
