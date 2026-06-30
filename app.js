const API_BASE = "https://api.tcgdex.net/v2/en/cards";

const state = {
  searchRows: [],
  sheetRows: [],
};

const el = {
  cardName: document.getElementById("cardName"),
  setName: document.getElementById("setName"),
  cardNumber: document.getElementById("cardNumber"),
  setCode: document.getElementById("setCode"),
  maxCards: document.getElementById("maxCards"),
  fetchBtn: document.getElementById("fetchBtn"),
  exportSearchBtn: document.getElementById("exportSearchBtn"),
  exportSheetBtn: document.getElementById("exportSheetBtn"),
  clearSheetBtn: document.getElementById("clearSheetBtn"),
  statusText: document.getElementById("statusText"),
  loadingWrap: document.getElementById("loadingWrap"),
  loadingText: document.getElementById("loadingText"),
  tabSearch: document.getElementById("tabSearch"),
  tabSheet: document.getElementById("tabSheet"),
  searchPanel: document.getElementById("searchPanel"),
  sheetPanel: document.getElementById("sheetPanel"),
  resultsBody: document.getElementById("resultsBody"),
  sheetBody: document.getElementById("sheetBody"),
};

el.fetchBtn.addEventListener("click", onFetch);
el.exportSearchBtn.addEventListener("click", () => onExport(state.searchRows, "search_market_data.xlsx"));
el.exportSheetBtn.addEventListener("click", () => onExport(state.sheetRows, "current_sheet_market_data.xlsx"));
el.clearSheetBtn.addEventListener("click", onClearSheet);
el.tabSearch.addEventListener("click", () => switchTab("search"));
el.tabSheet.addEventListener("click", () => switchTab("sheet"));

function setLoading(isLoading, message = "") {
  el.fetchBtn.disabled = isLoading;
  el.exportSearchBtn.disabled = isLoading;
  el.exportSheetBtn.disabled = isLoading;
  el.loadingWrap.classList.toggle("active", isLoading);
  el.loadingText.textContent = message || "Loading...";
}

function switchTab(tabName) {
  const searchActive = tabName === "search";
  el.tabSearch.classList.toggle("active", searchActive);
  el.tabSheet.classList.toggle("active", !searchActive);
  el.searchPanel.classList.toggle("active", searchActive);
  el.sheetPanel.classList.toggle("active", !searchActive);
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

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function buildCardNumber(card) {
  const localId = card?.localId ?? "";
  const officialCount = card?.set?.cardCount?.official ?? card?.set?.cardCount?.total ?? "";
  if (!localId) return "";
  if (String(localId).includes("/")) return String(localId);
  if (!officialCount) return String(localId);
  return `${localId}/${officialCount}`;
}

function rowKey(row) {
  return [row.card_id, row.source, row.variant, row.card_number, row.market_price, row.updated].join("|");
}

function flattenMarketRows(cards) {
  const rows = [];

  for (const card of cards) {
    const setName = card?.set?.name ?? "";
    const setCode = card?.set?.id ?? "";
    const cardNumber = buildCardNumber(card);
    const pricing = card?.pricing ?? {};

    const cardmarket = pricing.cardmarket;
    if (cardmarket && typeof cardmarket === "object") {
      rows.push({
        card_id: card.id ?? "",
        name: card.name ?? "",
        card_number: cardNumber,
        set_name: setName,
        set_code: setCode,
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
          card_number: cardNumber,
          set_name: setName,
          set_code: setCode,
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

function renderSearchTable(rows) {
  el.resultsBody.innerHTML = "";

  const fragment = document.createDocumentFragment();
  const sheetKeys = new Set(state.sheetRows.map((row) => rowKey(row)));

  rows.forEach((row, index) => {
    const tr = document.createElement("tr");
    const inSheet = sheetKeys.has(rowKey(row));
    if (inSheet) {
      tr.classList.add("in-sheet");
    }

    const actionTd = document.createElement("td");
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "row-action-btn";
    addBtn.textContent = "+";
    addBtn.title = "Add row to current sheet";
    addBtn.disabled = inSheet;
    addBtn.addEventListener("click", () => addToSheet(row));
    actionTd.appendChild(addBtn);
    tr.appendChild(actionTd);

    const orderedValues = [
      index + 1,
      row.card_id,
      row.name,
      row.card_number,
      row.set_name,
      row.set_code,
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

function renderSheetTable(rows) {
  el.sheetBody.innerHTML = "";

  const fragment = document.createDocumentFragment();

  rows.forEach((row, index) => {
    const tr = document.createElement("tr");

    const actionTd = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "row-action-btn remove";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeFromSheet(index));
    actionTd.appendChild(removeBtn);
    tr.appendChild(actionTd);

    const orderedValues = [
      index + 1,
      row.card_id,
      row.name,
      row.card_number,
      row.set_name,
      row.set_code,
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

  el.sheetBody.appendChild(fragment);
}

function addToSheet(row) {
  const key = rowKey(row);
  const hasMatch = state.sheetRows.some((candidate) => rowKey(candidate) === key);
  if (!hasMatch) {
    state.sheetRows.push({ ...row });
    renderSheetTable(state.sheetRows);
    renderSearchTable(state.searchRows);
    setStatus(`Added row to current sheet. ${state.sheetRows.length} rows in current sheet.`);
  }
}

function removeFromSheet(index) {
  state.sheetRows.splice(index, 1);
  renderSheetTable(state.sheetRows);
  renderSearchTable(state.searchRows);
  setStatus(`Removed row. ${state.sheetRows.length} rows in current sheet.`);
}

function onClearSheet() {
  state.sheetRows = [];
  renderSheetTable(state.sheetRows);
  renderSearchTable(state.searchRows);
  setStatus("Cleared current sheet.");
}

function filterCards(cards, filters) {
  return cards.filter((card) => {
    const cardName = normalize(card?.name);
    const setName = normalize(card?.set?.name);
    const setCode = normalize(card?.set?.id);
    const cardNumber = normalize(buildCardNumber(card));
    const localId = normalize(card?.localId);

    if (filters.cardName && !cardName.includes(filters.cardName)) return false;
    if (filters.setName && !setName.includes(filters.setName)) return false;
    if (filters.setCode && !setCode.includes(filters.setCode)) return false;
    if (filters.cardNumber && !(cardNumber.includes(filters.cardNumber) || localId.includes(filters.cardNumber))) return false;

    return true;
  });
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
  const cardNumber = el.cardNumber.value.trim();
  const setCode = el.setCode.value.trim();

  if (!cardName && !setName && !cardNumber && !setCode) {
    alert("Provide at least one search field.");
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
    if (setCode) {
      params.set("set", setCode);
    } else if (setName) {
      params.set("set", setName);
    } else if (cardNumber) {
      params.set("localId", cardNumber);
    }

    const summaries = await fetchJson(`${API_BASE}?${params.toString()}`);
    if (!Array.isArray(summaries)) {
      throw new Error("Unexpected response for card list.");
    }

    const cardIds = summaries.slice(0, maxCards).map((item) => item.id).filter(Boolean);
    const cards = await fetchCardDetails(cardIds);
    const filteredCards = filterCards(cards, {
      cardName: normalize(cardName),
      setName: normalize(setName),
      cardNumber: normalize(cardNumber),
      setCode: normalize(setCode),
    });

    state.searchRows = flattenMarketRows(filteredCards);
    renderSearchTable(state.searchRows);

    if (state.searchRows.length === 0) {
      setStatus("No market price rows found for this query. Try a different query.");
    } else {
      setStatus(`Loaded ${state.searchRows.length} market price rows.`);
    }
  } catch (err) {
    setStatus("Fetch failed.");
    alert(`Fetch error: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

function onExport(rows, fileName) {
  if (!rows.length) {
    alert("Fetch market data before exporting.");
    return;
  }

  const exportRows = rows.map((row, idx) => ({
    row_no: idx + 1,
    ...row,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "MarketData");
  XLSX.writeFile(workbook, fileName);
}

renderSearchTable(state.searchRows);
renderSheetTable(state.sheetRows);
