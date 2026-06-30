const API_BASE = "https://api.tcgdex.net/v2/en/cards";

const state = {
  rows: [],
};

const el = {
  cardName: document.getElementById("cardName"),
  setName: document.getElementById("setName"),
  maxCards: document.getElementById("maxCards"),
  fetchBtn: document.getElementById("fetchBtn"),
  exportBtn: document.getElementById("exportBtn"),
  statusText: document.getElementById("statusText"),
  loadingWrap: document.getElementById("loadingWrap"),
  loadingText: document.getElementById("loadingText"),
  resultsBody: document.getElementById("resultsBody"),
};

el.fetchBtn.addEventListener("click", onFetch);
el.exportBtn.addEventListener("click", onExport);

function setLoading(isLoading, message = "") {
  el.fetchBtn.disabled = isLoading;
  el.exportBtn.disabled = isLoading;
  el.loadingWrap.classList.toggle("active", isLoading);
  el.loadingText.textContent = message || "Loading...";
}

function setStatus(message) {
  el.statusText.textContent = message;
}

function parseMaxCards(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 200) {
    throw new Error("Max Cards must be an integer between 1 and 200.");
  }
  return parsed;
}

function toNumberOrBlank(value) {
  return typeof value === "number" ? value : "";
}

function flattenMarketRows(cards) {
  const rows = [];

  for (const card of cards) {
    const setName = card?.set?.name ?? "";
    const pricing = card?.pricing ?? {};

    const cardmarket = pricing.cardmarket;
    if (cardmarket && typeof cardmarket === "object") {
      rows.push({
        card_id: card.id ?? "",
        name: card.name ?? "",
        set_name: setName,
        source: "cardmarket",
        variant: "standard",
        market_price: toNumberOrBlank(cardmarket.trend),
        low_price: toNumberOrBlank(cardmarket.low),
        mid_price: "",
        high_price: "",
        avg_price: toNumberOrBlank(cardmarket.avg),
        trend_price: toNumberOrBlank(cardmarket.trend),
        currency: cardmarket.unit ?? "",
        updated: cardmarket.updated ?? "",
      });
    }

    const tcgplayer = pricing.tcgplayer;
    if (tcgplayer && typeof tcgplayer === "object") {
      const currency = tcgplayer.unit ?? "";
      const updated = tcgplayer.updated ?? "";

      for (const [variantName, variantData] of Object.entries(tcgplayer)) {
        if (variantName === "unit" || variantName === "updated") {
          continue;
        }
        if (!variantData || typeof variantData !== "object") {
          continue;
        }

        rows.push({
          card_id: card.id ?? "",
          name: card.name ?? "",
          set_name: setName,
          source: "tcgplayer",
          variant: variantName,
          market_price: toNumberOrBlank(variantData.marketPrice),
          low_price: toNumberOrBlank(variantData.lowPrice),
          mid_price: toNumberOrBlank(variantData.midPrice),
          high_price: toNumberOrBlank(variantData.highPrice),
          avg_price: "",
          trend_price: "",
          currency,
          updated,
        });
      }
    }
  }

  return rows;
}

function renderTable(rows) {
  el.resultsBody.innerHTML = "";

  const fragment = document.createDocumentFragment();

  rows.forEach((row, index) => {
    const tr = document.createElement("tr");
    const orderedValues = [
      index + 1,
      row.card_id,
      row.name,
      row.set_name,
      row.source,
      row.variant,
      row.market_price,
      row.low_price,
      row.mid_price,
      row.high_price,
      row.avg_price,
      row.trend_price,
      row.currency,
      row.updated,
    ];

    for (const value of orderedValues) {
      const td = document.createElement("td");
      td.textContent = value ?? "";
      tr.appendChild(td);
    }

    fragment.appendChild(tr);
  });

  el.resultsBody.appendChild(fragment);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - ${res.statusText}`);
  }
  return res.json();
}

async function fetchCardDetails(cardIds) {
  const cards = [];
  const batchSize = 8;

  for (let i = 0; i < cardIds.length; i += batchSize) {
    const batch = cardIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          return await fetchJson(`${API_BASE}/${encodeURIComponent(id)}`);
        } catch {
          return null;
        }
      })
    );

    for (const card of results) {
      if (card) cards.push(card);
    }

    el.loadingText.textContent = `Loading card details ${Math.min(i + batchSize, cardIds.length)}/${cardIds.length}...`;
  }

  return cards;
}

async function onFetch() {
  const cardName = el.cardName.value.trim();
  const setName = el.setName.value.trim();

  if (!cardName && !setName) {
    alert("Provide at least Card Name Contains or Set Name Contains.");
    return;
  }

  let maxCards;
  try {
    maxCards = parseMaxCards(el.maxCards.value);
  } catch (err) {
    alert(err.message);
    return;
  }

  setLoading(true, "Searching cards...");
  setStatus("Fetching data from TCGdex...");

  try {
    const params = new URLSearchParams();
    if (cardName) params.set("name", cardName);
    if (setName) params.set("set", setName);

    const summaries = await fetchJson(`${API_BASE}?${params.toString()}`);
    if (!Array.isArray(summaries)) {
      throw new Error("Unexpected response for card list.");
    }

    const cardIds = summaries.slice(0, maxCards).map((item) => item.id).filter(Boolean);
    const cards = await fetchCardDetails(cardIds);
    state.rows = flattenMarketRows(cards);
    renderTable(state.rows);

    if (state.rows.length === 0) {
      setStatus("No market price rows found for this query. Try a different query.");
    } else {
      setStatus(`Loaded ${state.rows.length} market price rows.`);
    }
  } catch (err) {
    setStatus("Fetch failed.");
    alert(`Fetch error: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

function onExport() {
  if (!state.rows.length) {
    alert("Fetch market data before exporting.");
    return;
  }

  const exportRows = state.rows.map((row, idx) => ({
    row_no: idx + 1,
    ...row,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "MarketData");
  XLSX.writeFile(workbook, "pokemon_market_data.xlsx");
}
