# PokePricesToExcel

Static web app (HTML/CSS/JavaScript) that fetches Pokemon TCG market pricing from free TCGdex endpoints and exports results to Excel.

## Features

- No API key required
- Search by card name, set name, card number, and set code
- Import a CSV or Excel file to run batch searches by card name/card number
- Optional import behavior: include multiple matches when an imported row has no card number
- Loading indicator during API fetch
- Row selection checkboxes on the left
- Search tab plus dynamically created color-coded tabs
- Move selected search rows into a chosen tab
- Remove selected rows, clear a tab, refresh prices, duplicate a tab, copy rows to the clipboard, and export all rows
- Active tab grid filtering and sortable column headers
- Theme toggle with light, dark, and auto modes
- Tab data persists in local browser storage across sessions
- Excel export (`.xlsx`) available on search and tab grids using SheetJS (CDN)

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
6. Select one or more search rows with the left checkboxes.
7. Click **Move Selected** and choose the destination tab.
8. Open a tab to filter rows, sort by a column header, remove selected rows, clear the tab, duplicate the tab, copy a row, refresh prices, or export all rows.

### Importing a file

1. In Search, click **Import CSV or Excel**.
2. Choose a `.csv`, `.xls`, or `.xlsx` file.
3. Include a card name column (for example: `card name` or `name`).
4. Optional: include card number (for example: `card number`, `number`, or `local id`).
5. Optional: enable **Include multiple matches when card number is missing** if you want all matching cards for name-only rows.

### Grid controls

- Drag a visible column header to reorder columns.
- Drag the right edge of a column header to resize it.
- Use the filter bar above an active tab to search within that tab.
- Click a column header to toggle ascending, descending, or no sort.
- Use the theme button in the top bar to switch between auto, light, and dark mode.

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
