# PokePricesToExcel

Static web app (HTML/CSS/JavaScript) that fetches Pokemon TCG market pricing from free TCGdex endpoints and exports results to Excel.

## Features

- No API key required
- Search by card name, set name, card number, and set code
- Loading indicator during API fetch
- Row numbers on the left
- Alternating white/light gray table rows
- Two tabs: Search Results and Current Sheet
- Add rows from Search Results to Current Sheet with a `+` button
- Remove individual rows from Current Sheet and clear all rows
- Excel export (`.xlsx`) available on both grids using SheetJS (CDN)

## Run Locally

Open `index.html` in a browser.

If your browser blocks direct local API requests from `file://`, run a tiny static server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Usage

1. Enter **Card Name Contains** and/or **Set Name Contains**.
2. Optional examples:
- Card only: `charizard`
- Set only: `base1`
- Both: card `charizard` and set `base1`
3. You can also use **Card Number Contains** (example: `221/105`) and **Set Code Contains** (example: `sv2`).
4. Set **Max Cards** (1-200).
5. Click **Fetch Market Data**.
6. Use the left `+` action on Search Results rows to add them to **Current Sheet**.
7. In **Current Sheet**, remove rows with **Remove**, or clear all with **Clear Current Sheet**.
8. Export either grid with its export button.

## Deployment

Deploy as a static site on any host (GitHub Pages, Netlify, Vercel static, Cloudflare Pages, S3 static hosting).

Required files:

- `index.html`
- `styles.css`
- `app.js`

## API Notes

- Card search: `GET https://api.tcgdex.net/v2/en/cards?name=<query>&set=<query>`
- Card details: `GET https://api.tcgdex.net/v2/en/cards/<id>`
- Pricing fields are flattened from `pricing.cardmarket` and `pricing.tcgplayer` when present.
- `card_number` is built as `localId/official_set_count` when available (for example, `221/105`).
- `set_code` uses TCGdex `set.id` abbreviation (for example, `sv2`).
