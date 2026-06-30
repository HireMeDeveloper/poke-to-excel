# PokePricesToExcel

Static web app (HTML/CSS/JavaScript) that fetches Pokemon TCG market pricing from free TCGdex endpoints and exports results to Excel.

## Features

- No API key required
- Search by card name, set name, or both
- Loading indicator during API fetch
- Row numbers on the left
- Alternating white/light gray table rows
- Excel export (`.xlsx`) using SheetJS (CDN)

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
3. Set **Max Cards** (1-200).
4. Click **Fetch Market Data**.
5. Click **Export to Excel**.

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
