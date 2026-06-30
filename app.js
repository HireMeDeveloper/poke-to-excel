const API_BASE = "https://api.tcgdex.net/v2/en/cards";
const STORAGE_KEY = "pokeprices.tabs.v2";
const THEME_PREFERENCES = new Set(["system", "light", "dark"]);
const NUMERIC_SORT_COLUMN_IDS = new Set(["market_price", "low_price", "mid_price", "high_price", "avg_price", "trend_price"]);
const DEFAULT_TAB_GRID_STATE = {
  filterText: "",
  sortColumnId: "",
  sortDirection: "asc",
};

const TAB_COLORS = [
  { bg: "#dff4e7", border: "#8bcaa5", text: "#1f5338" },
  { bg: "#e4f1ff", border: "#8eb4df", text: "#203f63" },
  { bg: "#fbe8d8", border: "#dfab7d", text: "#5d3416" },
  { bg: "#efe1ff", border: "#b7a0ea", text: "#4a2f77" },
  { bg: "#fde8ef", border: "#e0a1b6", text: "#752d4a" },
  { bg: "#e6f7f4", border: "#8ccdc0", text: "#1f5f57" },
  { bg: "#f6f2d9", border: "#d8c97a", text: "#5b531e" },
  { bg: "#e9edf7", border: "#a8b3d8", text: "#31405f" },
  { bg: "#f5eadf", border: "#d8b18a", text: "#644124" },
];

const DATA_COLUMNS = [
  { id: "card_id", label: "card_id" },
  { id: "name", label: "name" },
  { id: "card_number", label: "card_number" },
  { id: "set_name", label: "set_name" },
  { id: "set_code", label: "set_code" },
  { id: "source", label: "source" },
  { id: "variant", label: "variant" },
  { id: "market_price", label: "market_price" },
  { id: "low_price", label: "low_price" },
  { id: "mid_price", label: "mid_price" },
  { id: "high_price", label: "high_price" },
  { id: "avg_price", label: "avg_price" },
  { id: "trend_price", label: "trend_price" },
  { id: "currency", label: "currency" },
  { id: "updated", label: "updated" },
];

let DEFAULT_COLUMN_ORDER_IDS = DATA_COLUMNS.map((column) => column.id);

const SPECIAL_COLUMNS = [
  { id: "select", label: "select" },
  { id: "add", label: "add" },
  { id: "move", label: "move" },
  { id: "copy", label: "copy" },
  { id: "remove", label: "remove" },
  { id: "index", label: "#" },
];

const DEFAULT_HIDDEN_COLUMN_IDS = new Set(["updated", "source", "set_name"]);
const DEFAULT_VISIBLE_COLUMN_IDS = DATA_COLUMNS.filter((column) => !DEFAULT_HIDDEN_COLUMN_IDS.has(column.id)).map((column) => column.id);
const DEFAULT_VISIBLE_SPECIAL_COLUMN_IDS = SPECIAL_COLUMNS.filter((column) => column.id !== "remove").map((column) => column.id);
const DEFAULT_EXPORT_COLUMN_IDS = [...DEFAULT_VISIBLE_COLUMN_IDS];

const SOURCE_OPTIONS = [
  { id: "cardmarket", label: "Cardmarket" },
  { id: "tcgplayer", label: "TCGplayer" },
];

const DEFAULT_ALLOWED_SOURCE_IDS = SOURCE_OPTIONS.map((source) => source.id);
const DEFAULT_KEEP_SELECTED_ON_SEARCH = true;
const DEFAULT_CLEAR_SEARCH_INPUTS_ON_SEARCH = false;
const DEFAULT_SORT_SETTINGS_BY_SELECTED = false;
const DEFAULT_SEARCH_GRID_STATE = { ...DEFAULT_TAB_GRID_STATE };

function normalizeColumnOrderIds(columnOrderIds) {
  const inputIds = Array.isArray(columnOrderIds)
    ? columnOrderIds.filter((columnId) => DATA_COLUMNS.some((column) => column.id === columnId))
    : [];
  const merged = [];

  inputIds.forEach((columnId) => {
    if (!merged.includes(columnId)) {
      merged.push(columnId);
    }
  });

  DEFAULT_COLUMN_ORDER_IDS.forEach((columnId) => {
    if (!merged.includes(columnId)) {
      merged.push(columnId);
    }
  });

  return merged;
}

function normalizeColumnWidths(columnWidths) {
  const normalized = {};

  if (!columnWidths || typeof columnWidths !== "object") {
    return normalized;
  }

  Object.entries(columnWidths).forEach(([columnId, widthValue]) => {
    if (!DATA_COLUMNS.some((column) => column.id === columnId)) {
      return;
    }

    const width = Number.parseInt(widthValue, 10);
    if (Number.isFinite(width) && width >= 80 && width <= 600) {
      normalized[columnId] = width;
    }
  });

  return normalized;
}

function normalizeIdSelection(rawIds, allIds, fallbackIds) {
  const selected = Array.isArray(rawIds)
    ? rawIds.filter((id) => allIds.includes(id))
    : [];

  if (!selected.length) {
    return [...fallbackIds];
  }

  const unique = [];
  selected.forEach((id) => {
    if (!unique.includes(id)) {
      unique.push(id);
    }
  });
  return unique;
}

function normalizeColumnVisibility(rawVisibility, fallbackVisibility) {
  const dataIds = DATA_COLUMNS.map((column) => column.id);
  const specialIds = SPECIAL_COLUMNS.map((column) => column.id);
  const visibleColumnIds = normalizeIdSelection(
    rawVisibility?.visibleColumnIds,
    dataIds,
    fallbackVisibility.visibleColumnIds
  );
  const visibleSpecialColumnIds = normalizeIdSelection(
    rawVisibility?.visibleSpecialColumnIds,
    specialIds,
    fallbackVisibility.visibleSpecialColumnIds
  );

  if (!visibleColumnIds.length && !visibleSpecialColumnIds.length) {
    return {
      visibleColumnIds: [...fallbackVisibility.visibleColumnIds],
      visibleSpecialColumnIds: [...fallbackVisibility.visibleSpecialColumnIds],
    };
  }

  return {
    visibleColumnIds,
    visibleSpecialColumnIds,
  };
}

function toRuntimeColumnVisibility(visibility) {
  return {
    visibleColumnIds: new Set(visibility.visibleColumnIds),
    visibleSpecialColumnIds: new Set(visibility.visibleSpecialColumnIds),
  };
}

function toPersistedColumnVisibility(visibility) {
  return {
    visibleColumnIds: Array.from(visibility.visibleColumnIds),
    visibleSpecialColumnIds: Array.from(visibility.visibleSpecialColumnIds),
  };
}

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function toNumberOrBlank(value) {
  return typeof value === "number" ? value : "";
}

function normalizeHeader(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildCardNumber(card) {
  const localId = card?.localId ?? "";
  const officialCount = card?.set?.cardCount?.official ?? card?.set?.cardCount?.total ?? "";
  if (!localId) return "";
  if (String(localId).includes("/")) return String(localId);
  if (!officialCount) return String(localId);
  return `${localId}/${officialCount}`;
}

function buildRowId(row) {
  return [row.card_id, row.source, row.variant, row.card_number, row.set_code, row.currency].join("|");
}

function normalizeRow(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const normalized = { ...row };
  normalized.id = typeof normalized.id === "string" && normalized.id ? normalized.id : buildRowId(normalized);
  normalized.card_id = normalized.card_id ?? "";
  normalized.name = normalized.name ?? "";
  normalized.card_number = normalized.card_number ?? "";
  normalized.set_name = normalized.set_name ?? "";
  normalized.set_code = normalized.set_code ?? "";
  normalized.source = normalized.source ?? "";
  normalized.variant = normalized.variant ?? "";
  normalized.market_price = normalized.market_price ?? "";
  normalized.low_price = normalized.low_price ?? "";
  normalized.mid_price = normalized.mid_price ?? "";
  normalized.high_price = normalized.high_price ?? "";
  normalized.avg_price = normalized.avg_price ?? "";
  normalized.trend_price = normalized.trend_price ?? "";
  normalized.currency = normalized.currency ?? "";
  normalized.updated = normalized.updated ?? "";
  return normalized;
}

function normalizeTab(tab, fallbackVisibility) {
  if (!tab || typeof tab !== "object") {
    return null;
  }

  const colorIndex = Number.isInteger(tab.colorIndex) && tab.colorIndex >= 0 && tab.colorIndex < TAB_COLORS.length ? tab.colorIndex : 0;

  const rows = Array.isArray(tab.rows) ? tab.rows.map(normalizeRow).filter(Boolean) : [];

  return {
    id: typeof tab.id === "string" && tab.id ? tab.id : createId(),
    name: typeof tab.name === "string" && tab.name.trim() ? tab.name.trim() : "New Tab",
    colorIndex,
    rows,
    columnVisibility: normalizeColumnVisibility(tab?.columnVisibility, fallbackVisibility),
  };
}

function normalizeThemePreference(value) {
  return THEME_PREFERENCES.has(value) ? value : "system";
}

function normalizeTabGridState(tabGridState) {
  const filterText = typeof tabGridState?.filterText === "string" ? tabGridState.filterText : "";
  const sortColumnId = typeof tabGridState?.sortColumnId === "string" ? tabGridState.sortColumnId : "";
  const sortDirection = tabGridState?.sortDirection === "desc" ? "desc" : "asc";

  return {
    filterText,
    sortColumnId,
    sortDirection,
  };
}

function loadPersistedState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaultColumnVisibility = {
        visibleColumnIds: [...DEFAULT_VISIBLE_COLUMN_IDS],
        visibleSpecialColumnIds: [...DEFAULT_VISIBLE_SPECIAL_COLUMN_IDS],
      };
      return {
        tabs: [],
        activeTabId: "search",
        defaultColumnVisibility,
        searchColumnVisibility: { ...defaultColumnVisibility },
        exportColumnIds: DEFAULT_EXPORT_COLUMN_IDS,
        allowedSourceIds: DEFAULT_ALLOWED_SOURCE_IDS,
        keepSelectedOnSearch: DEFAULT_KEEP_SELECTED_ON_SEARCH,
        clearSearchInputsOnSearch: DEFAULT_CLEAR_SEARCH_INPUTS_ON_SEARCH,
        sortSettingsBySelected: DEFAULT_SORT_SETTINGS_BY_SELECTED,
        themePreference: "system",
        searchGridState: { ...DEFAULT_SEARCH_GRID_STATE },
        tabGridStates: {},
        columnOrderIds: DEFAULT_COLUMN_ORDER_IDS,
        columnWidths: {},
      };
    }

    const parsed = JSON.parse(raw);
    const defaultColumnVisibility = normalizeColumnVisibility(
      {
        visibleColumnIds: parsed?.settings?.defaultVisibleColumnIds ?? parsed?.settings?.visibleColumnIds,
        visibleSpecialColumnIds: parsed?.settings?.defaultVisibleSpecialColumnIds ?? parsed?.settings?.visibleSpecialColumnIds,
      },
      {
        visibleColumnIds: DEFAULT_VISIBLE_COLUMN_IDS,
        visibleSpecialColumnIds: DEFAULT_VISIBLE_SPECIAL_COLUMN_IDS,
      }
    );

    const searchColumnVisibility = normalizeColumnVisibility(
      {
        visibleColumnIds: parsed?.settings?.searchVisibleColumnIds ?? parsed?.settings?.visibleColumnIds,
        visibleSpecialColumnIds: parsed?.settings?.searchVisibleSpecialColumnIds ?? parsed?.settings?.visibleSpecialColumnIds,
      },
      defaultColumnVisibility
    );

    const inputTabs = Array.isArray(parsed?.tabs) ? parsed.tabs : [];
    const tabs = [];

    for (const rawTab of inputTabs) {
      const tab = normalizeTab(rawTab, defaultColumnVisibility);
      if (!tab) {
        continue;
      }

      tabs.push(tab);
    }

    const exportColumnIds = Array.isArray(parsed?.settings?.exportColumnIds)
      ? parsed.settings.exportColumnIds.filter((columnId) => DATA_COLUMNS.some((column) => column.id === columnId))
      : DEFAULT_EXPORT_COLUMN_IDS;

    const allowedSourceIds = Array.isArray(parsed?.settings?.allowedSourceIds)
      ? parsed.settings.allowedSourceIds.filter((sourceId) => SOURCE_OPTIONS.some((source) => source.id === sourceId))
      : DEFAULT_ALLOWED_SOURCE_IDS;

    const keepSelectedOnSearch = typeof parsed?.settings?.keepSelectedOnSearch === "boolean"
      ? parsed.settings.keepSelectedOnSearch
      : DEFAULT_KEEP_SELECTED_ON_SEARCH;

    const clearSearchInputsOnSearch = typeof parsed?.settings?.clearSearchInputsOnSearch === "boolean"
      ? parsed.settings.clearSearchInputsOnSearch
      : DEFAULT_CLEAR_SEARCH_INPUTS_ON_SEARCH;

    const sortSettingsBySelected = typeof parsed?.settings?.sortSettingsBySelected === "boolean"
      ? parsed.settings.sortSettingsBySelected
      : DEFAULT_SORT_SETTINGS_BY_SELECTED;

    const searchGridState = normalizeTabGridState(parsed?.settings?.searchGridState);

    const columnOrderIds = normalizeColumnOrderIds(parsed?.settings?.columnOrderIds);
    const columnWidths = normalizeColumnWidths(parsed?.settings?.columnWidths);

    const themePreference = normalizeThemePreference(parsed?.settings?.themePreference);

    const rawTabGridStates = parsed?.settings?.tabGridStates && typeof parsed.settings.tabGridStates === "object"
      ? parsed.settings.tabGridStates
      : {};
    const tabGridStates = {};

    tabs.forEach((tab) => {
      tabGridStates[tab.id] = normalizeTabGridState(rawTabGridStates[tab.id]);
    });

    return {
      tabs,
      activeTabId: typeof parsed?.activeTabId === "string" ? parsed.activeTabId : "search",
      defaultColumnVisibility,
      searchColumnVisibility,
      exportColumnIds: exportColumnIds.length ? exportColumnIds : DEFAULT_EXPORT_COLUMN_IDS,
      allowedSourceIds: allowedSourceIds.length ? allowedSourceIds : DEFAULT_ALLOWED_SOURCE_IDS,
      keepSelectedOnSearch,
      clearSearchInputsOnSearch,
      sortSettingsBySelected,
      themePreference,
      searchGridState,
      tabGridStates,
      columnOrderIds,
      columnWidths,
    };
  } catch {
    const defaultColumnVisibility = {
      visibleColumnIds: [...DEFAULT_VISIBLE_COLUMN_IDS],
      visibleSpecialColumnIds: [...DEFAULT_VISIBLE_SPECIAL_COLUMN_IDS],
    };
    return {
      tabs: [],
      activeTabId: "search",
      defaultColumnVisibility,
      searchColumnVisibility: { ...defaultColumnVisibility },
      exportColumnIds: DEFAULT_EXPORT_COLUMN_IDS,
      allowedSourceIds: DEFAULT_ALLOWED_SOURCE_IDS,
      keepSelectedOnSearch: DEFAULT_KEEP_SELECTED_ON_SEARCH,
      clearSearchInputsOnSearch: DEFAULT_CLEAR_SEARCH_INPUTS_ON_SEARCH,
      sortSettingsBySelected: DEFAULT_SORT_SETTINGS_BY_SELECTED,
      themePreference: "system",
      searchGridState: { ...DEFAULT_SEARCH_GRID_STATE },
      tabGridStates: {},
      columnOrderIds: DEFAULT_COLUMN_ORDER_IDS,
      columnWidths: {},
    };
  }
}

const persistedState = loadPersistedState();

const state = {
  searchRows: [],
  tabs: persistedState.tabs,
  activeTabId: persistedState.activeTabId,
  defaultVisibleColumnIds: new Set(persistedState.defaultColumnVisibility.visibleColumnIds),
  defaultVisibleSpecialColumnIds: new Set(persistedState.defaultColumnVisibility.visibleSpecialColumnIds),
  searchVisibleColumnIds: new Set(persistedState.searchColumnVisibility.visibleColumnIds),
  searchVisibleSpecialColumnIds: new Set(persistedState.searchColumnVisibility.visibleSpecialColumnIds),
  exportColumnIds: new Set(persistedState.exportColumnIds),
  allowedSourceIds: new Set(persistedState.allowedSourceIds),
  keepSelectedOnSearch: persistedState.keepSelectedOnSearch,
  clearSearchInputsOnSearch: persistedState.clearSearchInputsOnSearch,
  sortSettingsBySelected: persistedState.sortSettingsBySelected,
  themePreference: persistedState.themePreference,
  searchGridState: persistedState.searchGridState,
  tabGridStates: persistedState.tabGridStates,
  columnOrderIds: persistedState.columnOrderIds,
  columnWidths: persistedState.columnWidths,
  selectedRows: {
    search: new Set(),
    tabs: {},
  },
  isLoading: false,
};

state.tabs.forEach((tab) => {
  tab.columnVisibility = toRuntimeColumnVisibility(
    normalizeColumnVisibility(tab.columnVisibility, {
      visibleColumnIds: Array.from(state.defaultVisibleColumnIds),
      visibleSpecialColumnIds: Array.from(state.defaultVisibleSpecialColumnIds),
    })
  );
});

const el = {
  cardName: document.getElementById("cardName"),
  setName: document.getElementById("setName"),
  cardNumber: document.getElementById("cardNumber"),
  setCode: document.getElementById("setCode"),
  maxCards: document.getElementById("maxCards"),
  fetchBtn: document.getElementById("fetchBtn"),
  exportSelectedSearchBtn: document.getElementById("exportSelectedSearchBtn"),
  moveSelectedBtn: document.getElementById("moveSelectedBtn"),
  importFileInput: document.getElementById("importFileInput"),
  importFileBtn: document.getElementById("importFileBtn"),
  importAllowMultipleNoNumber: document.getElementById("importAllowMultipleNoNumber"),
  importOptionsModal: document.getElementById("importOptionsModal"),
  importOptionsModalCloseBtn: document.getElementById("importOptionsModalCloseBtn"),
  importOptionsModalForm: document.getElementById("importOptionsModalForm"),
  importOptionsFileName: document.getElementById("importOptionsFileName"),
  importOptionsCancelBtn: document.getElementById("importOptionsCancelBtn"),
  importOptionsConfirmBtn: document.getElementById("importOptionsConfirmBtn"),
  selectAllSearchBtn: document.getElementById("selectAllSearchBtn"),
  unselectAllSearchBtn: document.getElementById("unselectAllSearchBtn"),
  addTabBtn: document.getElementById("addTabBtn"),
  refreshTabBtn: document.getElementById("refreshTabBtn"),
  exportTabBtn: document.getElementById("exportTabBtn"),
  exportSelectedTabBtn: document.getElementById("exportSelectedTabBtn"),
  moveSelectedTabBtn: document.getElementById("moveSelectedTabBtn"),
  removeSelectedBtn: document.getElementById("removeSelectedBtn"),
  clearTabBtn: document.getElementById("clearTabBtn"),
  editActiveTabBtn: document.getElementById("editActiveTabBtn"),
  duplicateActiveTabBtn: document.getElementById("duplicateActiveTabBtn"),
  deleteActiveTabBtn: document.getElementById("deleteActiveTabBtn"),
  selectAllTabBtn: document.getElementById("selectAllTabBtn"),
  unselectAllTabBtn: document.getElementById("unselectAllTabBtn"),
  clearSearchSortBtn: document.getElementById("clearSearchSortBtn"),
  tabModal: document.getElementById("tabModal"),
  tabModalTitle: document.getElementById("tabModalTitle"),
  tabModalCloseBtn: document.getElementById("tabModalCloseBtn"),
  tabModalCancelBtn: document.getElementById("tabModalCancelBtn"),
  tabModalForm: document.getElementById("tabModalForm"),
  tabModalNote: document.getElementById("tabModalNote"),
  tabModalName: document.getElementById("tabModalName"),
  tabModalCreateBtn: document.getElementById("tabModalCreateBtn"),
  tabColorList: document.getElementById("tabColorList"),
  moveModal: document.getElementById("moveModal"),
  moveModalCloseBtn: document.getElementById("moveModalCloseBtn"),
  moveModalCancelBtn: document.getElementById("moveModalCancelBtn"),
  moveModalForm: document.getElementById("moveModalForm"),
  moveModalSelect: document.getElementById("moveModalSelect"),
  moveModalCount: document.getElementById("moveModalCount"),
  moveModalNewTabBtn: document.getElementById("moveModalNewTabBtn"),
  moveModalMoveBtn: document.getElementById("moveModalMoveBtn"),
  addRowModal: document.getElementById("addRowModal"),
  addRowModalCloseBtn: document.getElementById("addRowModalCloseBtn"),
  addRowModalCancelBtn: document.getElementById("addRowModalCancelBtn"),
  addRowModalNote: document.getElementById("addRowModalNote"),
  addRowModalTabButtons: document.getElementById("addRowModalTabButtons"),
  moveRowModal: document.getElementById("moveRowModal"),
  moveRowModalCloseBtn: document.getElementById("moveRowModalCloseBtn"),
  moveRowModalCancelBtn: document.getElementById("moveRowModalCancelBtn"),
  moveRowModalNote: document.getElementById("moveRowModalNote"),
  moveRowModalTabButtons: document.getElementById("moveRowModalTabButtons"),
  deleteModal: document.getElementById("deleteModal"),
  deleteModalCloseBtn: document.getElementById("deleteModalCloseBtn"),
  deleteModalCancelBtn: document.getElementById("deleteModalCancelBtn"),
  deleteModalForm: document.getElementById("deleteModalForm"),
  deleteModalNote: document.getElementById("deleteModalNote"),
  deleteModalDeleteBtn: document.getElementById("deleteModalDeleteBtn"),
  clearDataModal: document.getElementById("clearDataModal"),
  clearDataModalCloseBtn: document.getElementById("clearDataModalCloseBtn"),
  clearDataModalCancelBtn: document.getElementById("clearDataModalCancelBtn"),
  clearDataModalForm: document.getElementById("clearDataModalForm"),
  clearDataModalConfirmBtn: document.getElementById("clearDataModalConfirmBtn"),
  themeSystemBtn: document.getElementById("themeSystemBtn"),
  themeLightBtn: document.getElementById("themeLightBtn"),
  themeDarkBtn: document.getElementById("themeDarkBtn"),
  tabFilterInput: document.getElementById("tabFilterInput"),
  clearTabFilterBtn: document.getElementById("clearTabFilterBtn"),
  resetSettingsModal: document.getElementById("resetSettingsModal"),
  resetSettingsModalCloseBtn: document.getElementById("resetSettingsModalCloseBtn"),
  resetSettingsModalCancelBtn: document.getElementById("resetSettingsModalCancelBtn"),
  resetSettingsModalForm: document.getElementById("resetSettingsModalForm"),
  resetSettingsModalConfirmBtn: document.getElementById("resetSettingsModalConfirmBtn"),
  statusText: document.getElementById("statusText"),
  searchCountText: document.getElementById("searchCountText"),
  searchFunctionalColumnList: document.getElementById("searchFunctionalColumnList"),
  searchDisplayColumnList: document.getElementById("searchDisplayColumnList"),
  searchColumnsSelectAllBtn: document.getElementById("searchColumnsSelectAllBtn"),
  searchColumnsResetBtn: document.getElementById("searchColumnsResetBtn"),
  searchFilterInput: document.getElementById("searchFilterInput"),
  clearSearchFilterBtn: document.getElementById("clearSearchFilterBtn"),
  loadingWrap: document.getElementById("loadingWrap"),
  loadingText: document.getElementById("loadingText"),
  tabSearch: document.getElementById("tabSearch"),
  tabHelp: document.getElementById("tabHelp"),
  tabSettings: document.getElementById("tabSettings"),
  dynamicTabs: document.getElementById("dynamicTabs"),
  statusRow: document.querySelector(".status-row"),
  searchPanel: document.getElementById("searchPanel"),
  tabPanel: document.getElementById("tabPanel"),
  helpPanel: document.getElementById("helpPanel"),
  settingsPanel: document.getElementById("settingsPanel"),
  activeTabTitle: document.getElementById("activeTabTitle"),
  activeTabMeta: document.getElementById("activeTabMeta"),
  clearTabSortBtn: document.getElementById("clearTabSortBtn"),
  resultsHead: document.getElementById("resultsHead"),
  resultsBody: document.getElementById("resultsBody"),
  tabHead: document.getElementById("tabHead"),
  tabBody: document.getElementById("tabBody"),
  tabFoot: document.getElementById("tabFoot"),
  tabFunctionalColumnList: document.getElementById("tabFunctionalColumnList"),
  tabDisplayColumnList: document.getElementById("tabDisplayColumnList"),
  tabColumnsSelectAllBtn: document.getElementById("tabColumnsSelectAllBtn"),
  tabColumnsResetBtn: document.getElementById("tabColumnsResetBtn"),
  settingsFunctionalColumnList: document.getElementById("settingsFunctionalColumnList"),
  settingsDisplayColumnList: document.getElementById("settingsDisplayColumnList"),
  settingsExportColumnList: document.getElementById("settingsExportColumnList"),
  settingsSourceList: document.getElementById("settingsSourceList"),
  settingsBehaviorList: document.getElementById("settingsBehaviorList"),
  functionalSelectAllBtn: document.getElementById("functionalSelectAllBtn"),
  functionalResetBtn: document.getElementById("functionalResetBtn"),
  displaySelectAllBtn: document.getElementById("displaySelectAllBtn"),
  displayResetBtn: document.getElementById("displayResetBtn"),
  exportCopyFromDisplayBtn: document.getElementById("exportCopyFromDisplayBtn"),
  exportSelectAllBtn: document.getElementById("exportSelectAllBtn"),
  exportResetBtn: document.getElementById("exportResetBtn"),
  sourceSelectAllBtn: document.getElementById("sourceSelectAllBtn"),
  sourceResetBtn: document.getElementById("sourceResetBtn"),
  behaviorSelectAllBtn: document.getElementById("behaviorSelectAllBtn"),
  behaviorResetBtn: document.getElementById("behaviorResetBtn"),
  resetDefaultSettingsBtn: document.getElementById("resetDefaultSettingsBtn"),
  clearLocalDataBtn: document.getElementById("clearLocalDataBtn"),
};

el.fetchBtn.addEventListener("click", onFetch);
el.importFileBtn.addEventListener("click", onImportButtonClick);
el.importFileInput.addEventListener("change", onImportFileSelected);
el.exportSelectedSearchBtn.addEventListener("click", exportSelectedSearchRows);
el.moveSelectedBtn.addEventListener("click", moveSelectedSearchRows);
el.selectAllSearchBtn.addEventListener("click", selectAllSearchRows);
el.unselectAllSearchBtn.addEventListener("click", unselectAllSearchRows);
el.clearSearchSortBtn.addEventListener("click", () => clearGridSort("search"));
el.searchColumnsSelectAllBtn.addEventListener("click", () => selectAllColumnsForScope("search"));
el.searchColumnsResetBtn.addEventListener("click", () => resetColumnsForScope("search"));
el.importOptionsModalCloseBtn.addEventListener("click", closeImportOptionsModal);
el.importOptionsCancelBtn.addEventListener("click", closeImportOptionsModal);
el.importOptionsModalForm.addEventListener("submit", submitImportOptionsModal);
el.importOptionsModal.addEventListener("click", (event) => {
  if (event.target === el.importOptionsModal) {
    closeImportOptionsModal();
  }
});
el.addTabBtn.addEventListener("click", addNewTab);
el.refreshTabBtn.addEventListener("click", refreshActiveTab);
el.exportTabBtn.addEventListener("click", exportActiveTab);
el.exportSelectedTabBtn.addEventListener("click", exportSelectedTabRows);
el.moveSelectedTabBtn.addEventListener("click", moveSelectedActiveTabRows);
el.removeSelectedBtn.addEventListener("click", removeSelectedRowsFromActiveTab);
el.clearTabBtn.addEventListener("click", clearActiveTab);
el.editActiveTabBtn.addEventListener("click", openEditActiveTabModal);
el.duplicateActiveTabBtn.addEventListener("click", duplicateActiveTab);
el.deleteActiveTabBtn.addEventListener("click", openDeleteActiveTabModal);
el.selectAllTabBtn.addEventListener("click", selectAllActiveTabRows);
el.unselectAllTabBtn.addEventListener("click", unselectAllActiveTabRows);
el.clearTabSortBtn.addEventListener("click", () => {
  const activeTab = getActiveTab();
  if (activeTab) {
    clearGridSort(activeTab.id);
  }
});
el.tabColumnsSelectAllBtn.addEventListener("click", () => {
  const activeTab = getActiveTab();
  if (activeTab) {
    selectAllColumnsForScope(activeTab.id);
  }
});
el.tabColumnsResetBtn.addEventListener("click", () => {
  const activeTab = getActiveTab();
  if (activeTab) {
    resetColumnsForScope(activeTab.id);
  }
});
el.tabModalCloseBtn.addEventListener("click", closeTabModal);
el.tabModalCancelBtn.addEventListener("click", closeTabModal);
el.tabModalForm.addEventListener("submit", submitTabModal);
el.tabModal.addEventListener("click", (event) => {
  if (event.target === el.tabModal) {
    closeTabModal();
  }
});
el.moveModalCloseBtn.addEventListener("click", closeMoveModal);
el.moveModalCancelBtn.addEventListener("click", closeMoveModal);
el.moveModalForm.addEventListener("submit", submitMoveModal);
el.moveModalNewTabBtn.addEventListener("click", openNewTabFromMoveModal);
el.moveModal.addEventListener("click", (event) => {
  if (event.target === el.moveModal) {
    closeMoveModal();
  }
});
el.addRowModalCloseBtn.addEventListener("click", closeAddRowModal);
el.addRowModalCancelBtn.addEventListener("click", closeAddRowModal);
el.addRowModal.addEventListener("click", (event) => {
  if (event.target === el.addRowModal) {
    closeAddRowModal();
  }
});
el.moveRowModalCloseBtn.addEventListener("click", closeMoveRowModal);
el.moveRowModalCancelBtn.addEventListener("click", closeMoveRowModal);
el.moveRowModal.addEventListener("click", (event) => {
  if (event.target === el.moveRowModal) {
    closeMoveRowModal();
  }
});
el.deleteModalCloseBtn.addEventListener("click", closeDeleteModal);
el.deleteModalCancelBtn.addEventListener("click", closeDeleteModal);
el.deleteModalForm.addEventListener("submit", submitDeleteModal);
el.deleteModal.addEventListener("click", (event) => {
  if (event.target === el.deleteModal) {
    closeDeleteModal();
  }
});
el.tabSearch.addEventListener("click", () => setActiveTab("search"));
el.tabHelp.addEventListener("click", () => setActiveTab("help"));
el.tabSettings.addEventListener("click", () => setActiveTab("settings"));
el.themeSystemBtn.addEventListener("click", () => setThemePreference("system"));
el.themeLightBtn.addEventListener("click", () => setThemePreference("light"));
el.themeDarkBtn.addEventListener("click", () => setThemePreference("dark"));
el.searchFilterInput.addEventListener("input", onSearchFilterInput);
el.clearSearchFilterBtn.addEventListener("click", clearSearchFilterInput);
el.tabFilterInput.addEventListener("input", onTabFilterInput);
el.clearTabFilterBtn.addEventListener("click", clearTabFilterInput);
el.functionalSelectAllBtn.addEventListener("click", selectAllFunctionalColumns);
el.functionalResetBtn.addEventListener("click", resetFunctionalColumns);
el.displaySelectAllBtn.addEventListener("click", selectAllDisplayColumns);
el.displayResetBtn.addEventListener("click", resetDisplayColumns);
el.exportCopyFromDisplayBtn.addEventListener("click", copyExportColumnsFromDisplayColumns);
el.exportSelectAllBtn.addEventListener("click", selectAllExportColumns);
el.exportResetBtn.addEventListener("click", resetExportColumns);
el.sourceSelectAllBtn.addEventListener("click", selectAllSources);
el.sourceResetBtn.addEventListener("click", resetSources);
el.behaviorSelectAllBtn.addEventListener("click", selectAllBehaviorSettings);
el.behaviorResetBtn.addEventListener("click", resetBehaviorSettings);
el.resetDefaultSettingsBtn.addEventListener("click", resetDefaultSettings);
el.clearLocalDataBtn.addEventListener("click", openClearDataModal);
el.clearDataModalCloseBtn.addEventListener("click", closeClearDataModal);
el.clearDataModalCancelBtn.addEventListener("click", closeClearDataModal);
el.clearDataModalForm.addEventListener("submit", submitClearDataModal);
el.clearDataModal.addEventListener("click", (event) => {
  if (event.target === el.clearDataModal) {
    closeClearDataModal();
  }
});
el.resetSettingsModalCloseBtn.addEventListener("click", closeResetSettingsModal);
el.resetSettingsModalCancelBtn.addEventListener("click", closeResetSettingsModal);
el.resetSettingsModalForm.addEventListener("submit", submitResetSettingsModal);
el.resetSettingsModal.addEventListener("click", (event) => {
  if (event.target === el.resetSettingsModal) {
    closeResetSettingsModal();
  }
});

[el.cardName, el.setName, el.cardNumber, el.setCode, el.maxCards].forEach((input) => {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      el.fetchBtn.click();
    }
  });
});

const tabModalState = {
  isOpen: false,
  colorIndex: 0,
  mode: "create",
  editTabId: null,
};

const moveModalState = {
  isOpen: false,
  resolve: null,
  sourceScope: null,
};

const pendingMoveState = {
  isActive: false,
  sourceScope: null,
  sourceTabId: null,
  sourceTabName: "",
  rows: [],
};

function resetPendingMoveState() {
  pendingMoveState.isActive = false;
  pendingMoveState.sourceScope = null;
  pendingMoveState.sourceTabId = null;
  pendingMoveState.sourceTabName = "";
  pendingMoveState.rows = [];
}

const deleteModalState = {
  isOpen: false,
  tabId: null,
};

const clearDataModalState = {
  isOpen: false,
};

const resetSettingsModalState = {
  isOpen: false,
};

const importOptionsModalState = {
  isOpen: false,
  pendingFile: null,
};

const addRowModalState = {
  isOpen: false,
  row: null,
};

const moveRowModalState = {
  isOpen: false,
  row: null,
  sourceTabId: null,
};

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

function getSelectionSet(scope) {
  if (scope === "search") {
    return state.selectedRows.search;
  }

  if (!state.selectedRows.tabs[scope]) {
    state.selectedRows.tabs[scope] = new Set();
  }

  return state.selectedRows.tabs[scope];
}

function getActiveTab() {
  return state.tabs.find((tab) => tab.id === state.activeTabId) ?? null;
}

function setLoading(isLoading, message = "") {
  state.isLoading = isLoading;
  el.loadingWrap.classList.toggle("active", isLoading);
  el.loadingText.textContent = message || "Loading...";
  syncButtons();
}

function syncButtons() {
  const activeTab = getActiveTab();
  const activeSelection = activeTab ? getSelectionSet(activeTab.id).size : 0;

  el.fetchBtn.disabled = state.isLoading;
  el.importFileBtn.disabled = state.isLoading;
  el.importOptionsConfirmBtn.disabled = state.isLoading || !importOptionsModalState.pendingFile;
  el.exportSelectedSearchBtn.disabled = state.isLoading || !state.selectedRows.search.size;
  el.moveSelectedBtn.disabled = state.isLoading || !state.selectedRows.search.size;
  el.selectAllSearchBtn.disabled = state.isLoading || !state.searchRows.length;
  el.unselectAllSearchBtn.disabled = state.isLoading || !state.selectedRows.search.size;
  el.refreshTabBtn.disabled = state.isLoading || !activeTab || !activeTab.rows.length;
  el.exportTabBtn.disabled = state.isLoading || !activeTab || !activeTab.rows.length;
  el.exportSelectedTabBtn.disabled = state.isLoading || !activeTab || !activeSelection;
  el.moveSelectedTabBtn.disabled = state.isLoading || !activeTab || !activeSelection;
  el.removeSelectedBtn.disabled = state.isLoading || !activeTab || !activeSelection;
  el.clearTabBtn.disabled = state.isLoading || !activeTab || !activeTab.rows.length;
  el.addTabBtn.disabled = state.isLoading;
  el.duplicateActiveTabBtn.disabled = state.isLoading || !activeTab;
  el.deleteActiveTabBtn.disabled = state.isLoading || !activeTab;
  el.selectAllTabBtn.disabled = state.isLoading || !activeTab || !activeTab.rows.length;
  el.unselectAllTabBtn.disabled = state.isLoading || !activeTab || !activeSelection;
}

function onImportButtonClick() {
  if (state.isLoading) {
    return;
  }

  el.importFileInput.click();
}

function openImportOptionsModal(file) {
  importOptionsModalState.pendingFile = file;
  importOptionsModalState.isOpen = true;
  el.importOptionsFileName.textContent = `File: ${file.name}`;
  el.importOptionsModal.classList.add("open");
  el.importOptionsModal.setAttribute("aria-hidden", "false");
  syncButtons();
}

function closeImportOptionsModal() {
  if (!importOptionsModalState.isOpen) {
    return;
  }

  importOptionsModalState.isOpen = false;
  importOptionsModalState.pendingFile = null;
  el.importOptionsModal.classList.remove("open");
  el.importOptionsModal.setAttribute("aria-hidden", "true");
  el.importFileInput.value = "";
  syncButtons();
}

function findHeaderKey(headers, aliases) {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  return headers.find((header) => normalizedAliases.has(normalizeHeader(header))) ?? null;
}

function parseImportRows(rawRows) {
  const headers = rawRows.length ? Object.keys(rawRows[0]) : [];

  const nameKey = findHeaderKey(headers, [
    "card name",
    "name",
    "pokemon",
    "pokemon name",
  ]);
  const numberKey = findHeaderKey(headers, [
    "card number",
    "number",
    "card #",
    "card no",
    "card_no",
    "cardnumber",
    "local id",
    "localid",
    "collector number",
  ]);
  const setNameKey = findHeaderKey(headers, ["set", "set name"]);
  const setCodeKey = findHeaderKey(headers, ["set code", "set id"]);

  if (!nameKey) {
    throw new Error("Import file must include a card name column.");
  }

  const parsedRows = rawRows
    .map((row) => ({
      cardName: String(row[nameKey] ?? "").trim(),
      cardNumber: numberKey ? String(row[numberKey] ?? "").trim() : "",
      setName: setNameKey ? String(row[setNameKey] ?? "").trim() : "",
      setCode: setCodeKey ? String(row[setCodeKey] ?? "").trim() : "",
    }))
    .filter((row) => row.cardName);

  const dedupedMap = new Map();
  parsedRows.forEach((row) => {
    const key = [normalize(row.cardName), normalize(row.cardNumber), normalize(row.setName), normalize(row.setCode)].join("|");
    if (!dedupedMap.has(key)) {
      dedupedMap.set(key, row);
    }
  });

  return Array.from(dedupedMap.values());
}

function pickSingleBestCard(cards, cardName) {
  if (!cards.length) {
    return [];
  }

  const normalizedName = normalize(cardName);
  const exact = cards.find((card) => normalize(card?.name) === normalizedName);
  return [exact ?? cards[0]];
}

async function fetchImportedCards(importRows, maxCards, includeMultipleWhenNoNumber) {
  const matchedCards = [];

  for (let index = 0; index < importRows.length; index += 1) {
    const importRow = importRows[index];
    el.loadingText.textContent = `Import search ${index + 1}/${importRows.length}...`;

    const params = new URLSearchParams();
    if (importRow.cardName) {
      params.set("name", importRow.cardName);
    }
    if (importRow.setCode) {
      params.set("set", importRow.setCode);
    } else if (importRow.setName) {
      params.set("set", importRow.setName);
    } else if (importRow.cardNumber) {
      params.set("localId", importRow.cardNumber);
    }

    if (!params.toString()) {
      continue;
    }

    const summaries = await fetchJson(`${API_BASE}?${params.toString()}`);
    if (!Array.isArray(summaries) || !summaries.length) {
      continue;
    }

    const cardIds = summaries.slice(0, maxCards).map((item) => item.id).filter(Boolean);
    if (!cardIds.length) {
      continue;
    }

    const cards = await fetchCardDetails(cardIds);
    let filteredCards = filterCards(cards, {
      cardName: normalize(importRow.cardName),
      setName: normalize(importRow.setName),
      cardNumber: normalize(importRow.cardNumber),
      setCode: normalize(importRow.setCode),
    });

    if (!importRow.cardNumber && !includeMultipleWhenNoNumber) {
      filteredCards = pickSingleBestCard(filteredCards, importRow.cardName);
    }

    matchedCards.push(...filteredCards);
  }

  return matchedCards;
}

async function onImportFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  openImportOptionsModal(file);
}

async function submitImportOptionsModal(event) {
  event.preventDefault();

  const file = importOptionsModalState.pendingFile;
  if (!file) {
    return;
  }

  let maxCards;
  try {
    maxCards = parseMaxCards(el.maxCards.value);
  } catch (err) {
    alert(err.message);
    return;
  }

  const includeMultipleWhenNoNumber = Boolean(el.importAllowMultipleNoNumber.checked);
  closeImportOptionsModal();
  await importSearchFile(file, maxCards, includeMultipleWhenNoNumber);
}

async function importSearchFile(file, maxCards, includeMultipleWhenNoNumber) {

  setActiveTab("search");
  setLoading(true, "Importing file...");
  setStatus(`Reading ${file.name}...`);

  try {
    const fileBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error("No sheet found in the imported file.");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    if (!Array.isArray(rawRows) || !rawRows.length) {
      throw new Error("The imported file is empty.");
    }

    const importRows = parseImportRows(rawRows);
    if (!importRows.length) {
      throw new Error("No rows with a card name were found in the file.");
    }

    setStatus(`Running ${importRows.length} imported search row${importRows.length === 1 ? "" : "s"}...`);
    const importedCards = await fetchImportedCards(importRows, maxCards, includeMultipleWhenNoNumber);

    const importedRows = flattenMarketRows(importedCards, state.allowedSourceIds);
    const dedupedRows = Array.from(new Map(importedRows.map((row) => [row.id, row])).values());

    if (state.keepSelectedOnSearch) {
      state.searchRows = mergeSearchRowsKeepingSelectedFirst(dedupedRows);
    } else {
      state.searchRows = dedupedRows;
      clearSelection("search");
    }

    renderSearchTable();

    if (!state.searchRows.length) {
      setStatus("Import finished but no market rows matched the imported data.");
    } else {
      setStatus(`Import complete: ${state.searchRows.length} market row${state.searchRows.length === 1 ? "" : "s"} loaded.`);
    }
  } catch (err) {
    setStatus("Import failed.");
    alert(`Import error: ${err.message}`);
  } finally {
    setLoading(false);
    el.importFileInput.value = "";
  }
}

function persistTabs() {
  try {
    const serializedTabs = state.tabs.map((tab) => ({
      ...tab,
      columnVisibility: toPersistedColumnVisibility(getColumnVisibilityForScope(tab.id)),
    }));

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tabs: serializedTabs,
        activeTabId: state.activeTabId,
        settings: {
          defaultVisibleColumnIds: Array.from(state.defaultVisibleColumnIds),
          defaultVisibleSpecialColumnIds: Array.from(state.defaultVisibleSpecialColumnIds),
          searchVisibleColumnIds: Array.from(state.searchVisibleColumnIds),
          searchVisibleSpecialColumnIds: Array.from(state.searchVisibleSpecialColumnIds),
          exportColumnIds: Array.from(state.exportColumnIds),
          allowedSourceIds: Array.from(state.allowedSourceIds),
          keepSelectedOnSearch: state.keepSelectedOnSearch,
          clearSearchInputsOnSearch: state.clearSearchInputsOnSearch,
          sortSettingsBySelected: state.sortSettingsBySelected,
          themePreference: state.themePreference,
          searchGridState: state.searchGridState,
          tabGridStates: state.tabGridStates,
          columnOrderIds: Array.isArray(state.columnOrderIds) ? state.columnOrderIds : DEFAULT_COLUMN_ORDER_IDS,
          columnWidths: state.columnWidths,
        },
      })
    );
  } catch {
    // Ignore storage failures so the app still works in constrained browser modes.
  }
}

function setActiveTab(tabId) {
  if (tabId !== "search" && tabId !== "help" && tabId !== "settings" && !state.tabs.some((tab) => tab.id === tabId)) {
    return;
  }

  state.activeTabId = tabId;
  persistTabs();
  renderTabs();
  renderPanels();
}

function getNextTabName() {
  return `Tab ${state.tabs.length + 1}`;
}

function getFirstUnusedColorIndex() {
  return TAB_COLORS.findIndex((_, index) => !state.tabs.some((tab) => tab.colorIndex === index));
}

function getTabById(tabId) {
  return state.tabs.find((tab) => tab.id === tabId) ?? null;
}

function getOrderedDataColumns() {
  const orderedIds = Array.isArray(state.columnOrderIds) ? state.columnOrderIds : DEFAULT_COLUMN_ORDER_IDS;
  return orderedIds.map((columnId) => DATA_COLUMNS.find((column) => column.id === columnId)).filter(Boolean);
}

function createDefaultScopeColumnVisibility() {
  return {
    visibleColumnIds: new Set(state.defaultVisibleColumnIds),
    visibleSpecialColumnIds: new Set(state.defaultVisibleSpecialColumnIds),
  };
}

function getColumnVisibilityForScope(scope) {
  if (scope === "search") {
    return {
      visibleColumnIds: state.searchVisibleColumnIds,
      visibleSpecialColumnIds: state.searchVisibleSpecialColumnIds,
    };
  }

  const tab = getTabById(scope);
  if (!tab) {
    return createDefaultScopeColumnVisibility();
  }

  if (!tab.columnVisibility) {
    tab.columnVisibility = createDefaultScopeColumnVisibility();
  }

  return tab.columnVisibility;
}

function getAllowedSpecialColumnIdsForScope(scope) {
  if (scope === "search") {
    return ["select", "add", "copy", "index"];
  }

  if (getTabById(scope)) {
    return ["select", "remove", "move", "copy", "index"];
  }

  return SPECIAL_COLUMNS.map((column) => column.id);
}

function getVisibleDataColumns(scope) {
  const visibility = getColumnVisibilityForScope(scope);
  return getOrderedDataColumns().filter((column) => visibility.visibleColumnIds.has(column.id));
}

function getColumnWidth(columnId) {
  const width = state.columnWidths[columnId];
  return Number.isFinite(width) ? width : null;
}

function setColumnWidth(columnId, width) {
  const nextWidth = Math.max(80, Math.min(600, Math.round(width)));
  state.columnWidths[columnId] = nextWidth;
  persistTabs();
  renderPanels();
}

function moveColumn(columnId, targetColumnId) {
  if (columnId === targetColumnId) {
    return;
  }

  const nextOrder = Array.isArray(state.columnOrderIds) ? [...state.columnOrderIds] : [...DEFAULT_COLUMN_ORDER_IDS];
  const fromIndex = nextOrder.indexOf(columnId);
  const toIndex = nextOrder.indexOf(targetColumnId);
  if (fromIndex < 0 || toIndex < 0) {
    return;
  }

  const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  nextOrder.splice(fromIndex, 1);
  nextOrder.splice(adjustedToIndex, 0, columnId);
  state.columnOrderIds = nextOrder;
  persistTabs();
  renderPanels();
}

function getTabGridState(tabId) {
  if (!state.tabGridStates[tabId]) {
    state.tabGridStates[tabId] = { ...DEFAULT_TAB_GRID_STATE };
  }

  return state.tabGridStates[tabId];
}

function getGridState(scope) {
  if (scope === "search") {
    return state.searchGridState;
  }

  return getTabGridState(scope);
}

function getGridRows(scope) {
  if (scope === "search") {
    return state.searchRows;
  }

  const tab = getTabById(scope);
  return tab?.rows ?? [];
}

function setGridFilterText(scope, filterText) {
  const gridState = getGridState(scope);
  gridState.filterText = filterText;
}

function clearGridFilterText(scope) {
  setGridFilterText(scope, "");
}

function getFilteredGridRows(scope, rows = getGridRows(scope)) {
  const gridState = getGridState(scope);
  const filterText = normalize(gridState.filterText);

  const filteredRows = !filterText
    ? [...rows]
    : rows.filter((row) => Object.values(row).some((value) => normalize(value).includes(filterText)));

  if (!gridState.sortColumnId) {
    return filteredRows;
  }

  const sortMultiplier = gridState.sortDirection === "desc" ? -1 : 1;
  return filteredRows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = left.row[gridState.sortColumnId] ?? "";
      const rightValue = right.row[gridState.sortColumnId] ?? "";

      let comparison = 0;
      if (NUMERIC_SORT_COLUMN_IDS.has(gridState.sortColumnId)) {
        const leftNumber = Number.parseFloat(leftValue);
        const rightNumber = Number.parseFloat(rightValue);
        const leftIsNumber = Number.isFinite(leftNumber);
        const rightIsNumber = Number.isFinite(rightNumber);

        if (leftIsNumber && rightIsNumber) {
          comparison = leftNumber - rightNumber;
        } else if (leftIsNumber !== rightIsNumber) {
          comparison = leftIsNumber ? -1 : 1;
        } else {
          comparison = String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" });
        }
      } else {
        comparison = String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" });
      }

      if (comparison !== 0) {
        return comparison * sortMultiplier;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.row);
}

function toggleGridSort(scope, columnId) {
  const gridState = getGridState(scope);
  if (gridState.sortColumnId !== columnId) {
    gridState.sortColumnId = columnId;
    gridState.sortDirection = "asc";
  } else if (gridState.sortDirection === "asc") {
    gridState.sortDirection = "desc";
  } else {
    gridState.sortColumnId = "";
    gridState.sortDirection = "asc";
  }

  persistTabs();

  const activeTab = getActiveTab();
  if (scope === "search" || (activeTab && activeTab.id === scope)) {
    renderPanels();
  }
}

function clearGridSort(scope) {
  const gridState = getGridState(scope);
  if (!gridState.sortColumnId) {
    return;
  }

  gridState.sortColumnId = "";
  gridState.sortDirection = "asc";
  persistTabs();

  const activeTab = getActiveTab();
  if (scope === "search" || (activeTab && activeTab.id === scope)) {
    renderPanels();
  }
}

function getResolvedTheme() {
  if (state.themePreference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return state.themePreference;
}

function updateThemeButtons() {
  const isSystem = state.themePreference === "system";
  const isLight = state.themePreference === "light";
  const isDark = state.themePreference === "dark";

  el.themeSystemBtn.classList.toggle("active", isSystem);
  el.themeLightBtn.classList.toggle("active", isLight);
  el.themeDarkBtn.classList.toggle("active", isDark);

  el.themeSystemBtn.setAttribute("aria-pressed", String(isSystem));
  el.themeLightBtn.setAttribute("aria-pressed", String(isLight));
  el.themeDarkBtn.setAttribute("aria-pressed", String(isDark));
}

function applyThemePreference() {
  document.documentElement.dataset.theme = getResolvedTheme();
  updateThemeButtons();
}

function setThemePreference(preference) {
  state.themePreference = normalizeThemePreference(preference);
  persistTabs();
  applyThemePreference();
}

function onSearchFilterInput() {
  setGridFilterText("search", el.searchFilterInput.value);
  persistTabs();
  renderSearchTable();
}

function clearSearchFilterInput() {
  const gridState = getGridState("search");
  if (!gridState.filterText) {
    return;
  }

  clearGridFilterText("search");
  el.searchFilterInput.value = "";
  persistTabs();
  renderSearchTable();
}

function onTabFilterInput() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    return;
  }

  setGridFilterText(activeTab.id, el.tabFilterInput.value);
  persistTabs();
  renderTabTable(activeTab);
}

function clearTabFilterInput() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    return;
  }

  const tabGridState = getGridState(activeTab.id);
  if (!tabGridState.filterText) {
    return;
  }

  clearGridFilterText(activeTab.id);
  el.tabFilterInput.value = "";
  persistTabs();
  renderTabTable(activeTab);
}

function serializeRowForClipboard(row) {
  const columns = getOrderedDataColumns();
  const headerLine = columns.map((column) => column.label).join("\t");
  const valueLine = columns.map((column) => String(row[column.id] ?? "")).join("\t");
  return `${headerLine}\n${valueLine}`;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Clipboard copy failed.");
  }
}

async function copyRowToClipboard(row) {
  await copyTextToClipboard(serializeRowForClipboard(row));
  setStatus(`Copied ${row.name || "row"} to the clipboard.`);
}

function isSourceAllowed(sourceId) {
  return state.allowedSourceIds.has(sourceId);
}

function sortSettingsItemsBySelected(items, selectedSet) {
  if (!state.sortSettingsBySelected) {
    return items;
  }

  return [...items].sort((left, right) => {
    const leftVisible = selectedSet.has(left.id);
    const rightVisible = selectedSet.has(right.id);

    if (leftVisible !== rightVisible) {
      return leftVisible ? -1 : 1;
    }

    return items.findIndex((item) => item.id === left.id) - items.findIndex((item) => item.id === right.id);
  });
}

function getSettingsColumnsInDisplayOrder() {
  return sortSettingsItemsBySelected(DATA_COLUMNS, state.defaultVisibleColumnIds);
}

function getSettingsExportColumnsInDisplayOrder() {
  return sortSettingsItemsBySelected(DATA_COLUMNS, state.exportColumnIds);
}

function getSettingsSpecialColumnsInDisplayOrder() {
  return sortSettingsItemsBySelected(SPECIAL_COLUMNS, state.defaultVisibleSpecialColumnIds);
}

function isSpecialColumnVisible(columnId, scope) {
  return getColumnVisibilityForScope(scope).visibleSpecialColumnIds.has(columnId);
}

function getVisibleColumnSettingCount(scope) {
  const visibility = getColumnVisibilityForScope(scope);
  const allowedSpecialColumnIds = getAllowedSpecialColumnIdsForScope(scope);
  const visibleAllowedSpecialCount = allowedSpecialColumnIds.filter((columnId) => visibility.visibleSpecialColumnIds.has(columnId)).length;
  return visibility.visibleColumnIds.size + visibleAllowedSpecialCount;
}

function renderTableHead(headElement, actionLabels = [], options = {}) {
  const row = document.createElement("tr");
  const sortState = options.sortState ?? DEFAULT_TAB_GRID_STATE;
  const onSort = typeof options.onSort === "function" ? options.onSort : null;
  const sortableColumns = Boolean(options.sortableColumns);
  const scope = options.scope ?? "search";

  if (isSpecialColumnVisible("select", scope)) {
    const selectHead = document.createElement("th");
    selectHead.className = "select-head";
    selectHead.textContent = "Select";
    row.appendChild(selectHead);
  }

  actionLabels.forEach((actionLabel) => {
    if (!isSpecialColumnVisible(actionLabel.id, scope)) {
      return;
    }

    const actionHead = document.createElement("th");
    actionHead.className = `action-head ${actionLabel.id}-head`;
    actionHead.textContent = actionLabel.label;
    row.appendChild(actionHead);
  });

  if (isSpecialColumnVisible("index", scope)) {
    const indexHead = document.createElement("th");
    indexHead.className = "index-head";
    indexHead.textContent = "#";
    row.appendChild(indexHead);
  }

  getVisibleDataColumns(scope).forEach((column) => {
    const th = document.createElement("th");
    const width = getColumnWidth(column.id);
    if (width) {
      th.style.width = `${width}px`;
      th.style.minWidth = `${width}px`;
    }
    th.dataset.columnId = column.id;

    const labelSpan = document.createElement("span");
    labelSpan.className = "column-label";
    labelSpan.textContent = column.label;
    th.appendChild(labelSpan);

    if (sortableColumns) {
      th.classList.add("sortable-head");
      th.setAttribute("draggable", "true");
      th.tabIndex = 0;
      th.setAttribute("role", "button");
      th.setAttribute("aria-label", `Sort by ${column.label}`);
      if (sortState.columnId === column.id) {
        th.classList.add("sorted-head");
      }
      th.addEventListener("click", () => onSort?.(column.id));
      th.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSort?.(column.id);
        }
      });

      th.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/plain", column.id);
        event.dataTransfer?.setDragImage(th, 0, 0);
      });

      th.addEventListener("dragover", (event) => {
        event.preventDefault();
      });

      th.addEventListener("drop", (event) => {
        event.preventDefault();
        const sourceColumnId = event.dataTransfer?.getData("text/plain");
        if (sourceColumnId && sourceColumnId !== column.id) {
          moveColumn(sourceColumnId, column.id);
        }
      });

      const resizeHandle = document.createElement("span");
      resizeHandle.className = "column-resize-handle";
      resizeHandle.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const startX = event.clientX;
        const startWidth = th.getBoundingClientRect().width;

        const onPointerMove = (moveEvent) => {
          setColumnWidth(column.id, startWidth + (moveEvent.clientX - startX));
        };

        const onPointerUp = () => {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      });
      th.appendChild(resizeHandle);
    }

    row.appendChild(th);
  });

  headElement.replaceChildren(row);
}

function rerenderScopeAfterColumnChange(scope) {
  persistTabs();
  if (scope === "search") {
    renderSearchTable();
  } else {
    const tab = getTabById(scope);
    if (tab) {
      renderTabTable(tab);
    }
  }
}

function renderScopeColumnChooser(scope, functionalContainer, displayContainer) {
  const visibility = getColumnVisibilityForScope(scope);
  const allowedSpecialColumnIds = new Set(getAllowedSpecialColumnIdsForScope(scope));
  const functionalFragment = document.createDocumentFragment();
  const displayFragment = document.createDocumentFragment();

  SPECIAL_COLUMNS.filter((column) => allowedSpecialColumnIds.has(column.id)).forEach((column) => {
    const label = document.createElement("label");
    label.className = "setting-toggle";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = visibility.visibleSpecialColumnIds.has(column.id);
    input.addEventListener("change", () => {
      if (input.checked) {
        visibility.visibleSpecialColumnIds.add(column.id);
      } else {
        visibility.visibleSpecialColumnIds.delete(column.id);
        if (!getVisibleColumnSettingCount(scope)) {
          visibility.visibleSpecialColumnIds.add(column.id);
          input.checked = true;
          alert("At least one column must stay visible.");
          return;
        }
      }

      rerenderScopeAfterColumnChange(scope);
    });

    const text = document.createElement("span");
    text.textContent = column.label;
    label.appendChild(input);
    label.appendChild(text);
    functionalFragment.appendChild(label);
  });

  DATA_COLUMNS.forEach((column) => {
    const label = document.createElement("label");
    label.className = "setting-toggle";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = visibility.visibleColumnIds.has(column.id);
    input.addEventListener("change", () => {
      if (input.checked) {
        visibility.visibleColumnIds.add(column.id);
      } else {
        visibility.visibleColumnIds.delete(column.id);
        if (!getVisibleColumnSettingCount(scope)) {
          visibility.visibleColumnIds.add(column.id);
          input.checked = true;
          alert("At least one column must stay visible.");
          return;
        }
      }

      rerenderScopeAfterColumnChange(scope);
    });

    const text = document.createElement("span");
    text.textContent = column.label;
    label.appendChild(input);
    label.appendChild(text);
    displayFragment.appendChild(label);
  });

  functionalContainer.replaceChildren(functionalFragment);
  displayContainer.replaceChildren(displayFragment);
}

function selectAllColumnsForScope(scope) {
  const visibility = getColumnVisibilityForScope(scope);
  const allowedSpecialColumnIds = getAllowedSpecialColumnIdsForScope(scope);
  visibility.visibleColumnIds.clear();
  DATA_COLUMNS.forEach((column) => visibility.visibleColumnIds.add(column.id));
  visibility.visibleSpecialColumnIds.clear();
  allowedSpecialColumnIds.forEach((columnId) => visibility.visibleSpecialColumnIds.add(columnId));
  rerenderScopeAfterColumnChange(scope);
}

function resetColumnsForScope(scope) {
  const visibility = getColumnVisibilityForScope(scope);
  const allowedSpecialColumnIds = new Set(getAllowedSpecialColumnIdsForScope(scope));
  visibility.visibleColumnIds.clear();
  state.defaultVisibleColumnIds.forEach((columnId) => visibility.visibleColumnIds.add(columnId));
  visibility.visibleSpecialColumnIds.clear();
  state.defaultVisibleSpecialColumnIds.forEach((columnId) => {
    if (allowedSpecialColumnIds.has(columnId)) {
      visibility.visibleSpecialColumnIds.add(columnId);
    }
  });

  if (!visibility.visibleColumnIds.size && !visibility.visibleSpecialColumnIds.size) {
    const firstAllowedSpecial = getAllowedSpecialColumnIdsForScope(scope)[0];
    if (firstAllowedSpecial) {
      visibility.visibleSpecialColumnIds.add(firstAllowedSpecial);
    }
  }
  rerenderScopeAfterColumnChange(scope);
}

function renderSettingsPanel() {
  const functionalFragment = document.createDocumentFragment();
  const displayFragment = document.createDocumentFragment();
  const exportFragment = document.createDocumentFragment();

  getSettingsSpecialColumnsInDisplayOrder().forEach((column) => {
    const label = document.createElement("label");
    label.className = "setting-toggle";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.defaultVisibleSpecialColumnIds.has(column.id);
    input.addEventListener("change", () => {
      if (input.checked) {
        state.defaultVisibleSpecialColumnIds.add(column.id);
      } else {
        state.defaultVisibleSpecialColumnIds.delete(column.id);
        if (!state.defaultVisibleColumnIds.size && !state.defaultVisibleSpecialColumnIds.size) {
          state.defaultVisibleSpecialColumnIds.add(column.id);
          input.checked = true;
          alert("At least one column must stay visible.");
          return;
        }
      }

      persistTabs();
      renderSettingsPanel();
    });

    const text = document.createElement("span");
    text.textContent = column.label;

    label.appendChild(input);
    label.appendChild(text);
    functionalFragment.appendChild(label);
  });

  getSettingsColumnsInDisplayOrder().forEach((column) => {
    const label = document.createElement("label");
    label.className = "setting-toggle";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.defaultVisibleColumnIds.has(column.id);
    input.addEventListener("change", () => {
      if (input.checked) {
        state.defaultVisibleColumnIds.add(column.id);
      } else {
        state.defaultVisibleColumnIds.delete(column.id);
        if (!state.defaultVisibleColumnIds.size && !state.defaultVisibleSpecialColumnIds.size) {
          state.defaultVisibleColumnIds.add(column.id);
          input.checked = true;
          alert("At least one column must stay visible.");
          return;
        }
      }

      persistTabs();
      renderSettingsPanel();
    });

    const text = document.createElement("span");
    text.textContent = column.label;

    label.appendChild(input);
    label.appendChild(text);
    displayFragment.appendChild(label);
  });

  getSettingsExportColumnsInDisplayOrder().forEach((column) => {
    const label = document.createElement("label");
    label.className = "setting-toggle";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.exportColumnIds.has(column.id);
    input.addEventListener("change", () => {
      if (input.checked) {
        state.exportColumnIds.add(column.id);
      } else {
        state.exportColumnIds.delete(column.id);
        if (!state.exportColumnIds.size) {
          state.exportColumnIds.add(column.id);
          input.checked = true;
          alert("At least one export column must stay selected.");
          return;
        }
      }

      persistTabs();
      renderSettingsPanel();
    });

    const text = document.createElement("span");
    text.textContent = column.label;

    label.appendChild(input);
    label.appendChild(text);
    exportFragment.appendChild(label);
  });

  el.settingsFunctionalColumnList.replaceChildren(functionalFragment);
  el.settingsDisplayColumnList.replaceChildren(displayFragment);
  el.settingsExportColumnList.replaceChildren(exportFragment);

  const sourceFragment = document.createDocumentFragment();

  SOURCE_OPTIONS.forEach((source) => {
    const label = document.createElement("label");
    label.className = "setting-toggle";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.allowedSourceIds.has(source.id);
    input.addEventListener("change", () => {
      if (input.checked) {
        state.allowedSourceIds.add(source.id);
      } else {
        state.allowedSourceIds.delete(source.id);
        if (!state.allowedSourceIds.size) {
          state.allowedSourceIds.add(source.id);
          input.checked = true;
          alert("At least one source must stay allowed.");
          return;
        }
      }

      persistTabs();
      renderSettingsPanel();
    });

    const text = document.createElement("span");
    text.textContent = source.label;

    label.appendChild(input);
    label.appendChild(text);
    sourceFragment.appendChild(label);
  });

  el.settingsSourceList.replaceChildren(sourceFragment);

  const behaviorFragment = document.createDocumentFragment();

  const keepSelectedLabel = document.createElement("label");
  keepSelectedLabel.className = "setting-toggle";
  const keepSelectedInput = document.createElement("input");
  keepSelectedInput.type = "checkbox";
  keepSelectedInput.checked = state.keepSelectedOnSearch;
  keepSelectedInput.addEventListener("change", () => {
    state.keepSelectedOnSearch = keepSelectedInput.checked;
    persistTabs();
    renderSettingsPanel();
  });
  const keepSelectedText = document.createElement("span");
  keepSelectedText.textContent = "Keep selected on new search";
  keepSelectedLabel.appendChild(keepSelectedInput);
  keepSelectedLabel.appendChild(keepSelectedText);
  behaviorFragment.appendChild(keepSelectedLabel);

  const clearInputsLabel = document.createElement("label");
  clearInputsLabel.className = "setting-toggle";
  const clearInputsInput = document.createElement("input");
  clearInputsInput.type = "checkbox";
  clearInputsInput.checked = state.clearSearchInputsOnSearch;
  clearInputsInput.addEventListener("change", () => {
    state.clearSearchInputsOnSearch = clearInputsInput.checked;
    persistTabs();
    renderSettingsPanel();
  });
  const clearInputsText = document.createElement("span");
  clearInputsText.textContent = "Clear search boxes on search";
  clearInputsLabel.appendChild(clearInputsInput);
  clearInputsLabel.appendChild(clearInputsText);
  behaviorFragment.appendChild(clearInputsLabel);

  const sortSettingsLabel = document.createElement("label");
  sortSettingsLabel.className = "setting-toggle";
  const sortSettingsInput = document.createElement("input");
  sortSettingsInput.type = "checkbox";
  sortSettingsInput.checked = state.sortSettingsBySelected;
  sortSettingsInput.addEventListener("change", () => {
    state.sortSettingsBySelected = sortSettingsInput.checked;
    persistTabs();
    renderSettingsPanel();
  });
  const sortSettingsText = document.createElement("span");
  sortSettingsText.textContent = "Sort settings options by selected first";
  sortSettingsLabel.appendChild(sortSettingsInput);
  sortSettingsLabel.appendChild(sortSettingsText);
  behaviorFragment.appendChild(sortSettingsLabel);

  el.settingsBehaviorList.replaceChildren(behaviorFragment);
}

function formatCurrencyTotal(value) {
  if (!Number.isFinite(value)) {
    return "";
  }

  return value.toFixed(2);
}

function summarizeTabRows(rows) {
  const totals = {
    market_price: 0,
    low_price: 0,
    mid_price: 0,
    high_price: 0,
    avg_price: 0,
    trend_price: 0,
  };

  const counts = {
    market_price: 0,
    low_price: 0,
    mid_price: 0,
    high_price: 0,
    avg_price: 0,
    trend_price: 0,
  };

  rows.forEach((row) => {
    ["market_price", "low_price", "mid_price", "high_price", "avg_price", "trend_price"].forEach((columnId) => {
      const numeric = Number.parseFloat(row[columnId]);
      if (Number.isFinite(numeric)) {
        totals[columnId] += numeric;
        counts[columnId] += 1;
      }
    });
  });

  return { totals, counts };
}

function renderTabFooter(tab, rows = tab.rows) {
  const scope = tab.id;
  const footerRow = document.createElement("tr");
  footerRow.className = "tab-footer-row";

  const leadingSpecialColumnCount = ["select", "remove", "move", "index"].filter((columnId) => isSpecialColumnVisible(columnId, scope)).length;

  const selectCell = document.createElement("td");
  selectCell.colSpan = Math.max(leadingSpecialColumnCount, 1);
  selectCell.textContent = "Totals";
  footerRow.appendChild(selectCell);

  const columns = getVisibleDataColumns(scope);
  const summary = summarizeTabRows(rows);

  columns.forEach((column) => {
    const cell = document.createElement("td");
    const total = summary.totals[column.id];
    if (Object.prototype.hasOwnProperty.call(summary.totals, column.id)) {
      cell.textContent = formatCurrencyTotal(total);
      cell.className = "tab-footer-total";
    } else {
      cell.textContent = "";
    }
    footerRow.appendChild(cell);
  });

  el.tabFoot.replaceChildren(footerRow);
}

function openClearDataModal() {
  if (clearDataModalState.isOpen) {
    return;
  }

  clearDataModalState.isOpen = true;
  el.clearDataModal.classList.add("open");
  el.clearDataModal.setAttribute("aria-hidden", "false");
  window.requestAnimationFrame(() => {
    el.clearDataModalConfirmBtn.focus();
  });
}

function closeClearDataModal() {
  if (!clearDataModalState.isOpen) {
    return;
  }

  clearDataModalState.isOpen = false;
  el.clearDataModal.classList.remove("open");
  el.clearDataModal.setAttribute("aria-hidden", "true");
}

function submitClearDataModal(event) {
  event.preventDefault();

  if (!clearDataModalState.isOpen) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  state.searchRows = [];
  state.tabs = [];
  state.activeTabId = "search";
  state.defaultVisibleColumnIds = new Set(DEFAULT_VISIBLE_COLUMN_IDS);
  state.defaultVisibleSpecialColumnIds = new Set(DEFAULT_VISIBLE_SPECIAL_COLUMN_IDS);
  state.searchVisibleColumnIds = new Set(DEFAULT_VISIBLE_COLUMN_IDS);
  state.searchVisibleSpecialColumnIds = new Set(DEFAULT_VISIBLE_SPECIAL_COLUMN_IDS);
  state.exportColumnIds = new Set(DEFAULT_EXPORT_COLUMN_IDS);
  state.allowedSourceIds = new Set(DEFAULT_ALLOWED_SOURCE_IDS);
  state.keepSelectedOnSearch = DEFAULT_KEEP_SELECTED_ON_SEARCH;
  state.clearSearchInputsOnSearch = DEFAULT_CLEAR_SEARCH_INPUTS_ON_SEARCH;
  state.sortSettingsBySelected = DEFAULT_SORT_SETTINGS_BY_SELECTED;
  state.columnOrderIds = [...DEFAULT_COLUMN_ORDER_IDS];
  state.columnWidths = {};
  state.themePreference = "system";
  state.tabGridStates = {};
  state.selectedRows.search.clear();
  state.selectedRows.tabs = {};

  closeClearDataModal();
  renderTabs();
  renderPanels();
}

function resetDefaultSettings() {
  openResetSettingsModal();
}

function openResetSettingsModal() {
  if (resetSettingsModalState.isOpen) {
    return;
  }

  resetSettingsModalState.isOpen = true;
  el.resetSettingsModal.classList.add("open");
  el.resetSettingsModal.setAttribute("aria-hidden", "false");
  window.requestAnimationFrame(() => {
    el.resetSettingsModalConfirmBtn.focus();
  });
}

function closeResetSettingsModal() {
  if (!resetSettingsModalState.isOpen) {
    return;
  }

  resetSettingsModalState.isOpen = false;
  el.resetSettingsModal.classList.remove("open");
  el.resetSettingsModal.setAttribute("aria-hidden", "true");
}

function applyDefaultSettings() {

  state.defaultVisibleColumnIds = new Set(DEFAULT_VISIBLE_COLUMN_IDS);
  state.defaultVisibleSpecialColumnIds = new Set(DEFAULT_VISIBLE_SPECIAL_COLUMN_IDS);
  state.searchVisibleColumnIds = new Set(DEFAULT_VISIBLE_COLUMN_IDS);
  state.searchVisibleSpecialColumnIds = new Set(DEFAULT_VISIBLE_SPECIAL_COLUMN_IDS);
  state.tabs.forEach((tab) => {
    tab.columnVisibility = createDefaultScopeColumnVisibility();
  });
  state.exportColumnIds = new Set(DEFAULT_EXPORT_COLUMN_IDS);
  state.allowedSourceIds = new Set(DEFAULT_ALLOWED_SOURCE_IDS);
  state.keepSelectedOnSearch = DEFAULT_KEEP_SELECTED_ON_SEARCH;
  state.clearSearchInputsOnSearch = DEFAULT_CLEAR_SEARCH_INPUTS_ON_SEARCH;
  state.sortSettingsBySelected = DEFAULT_SORT_SETTINGS_BY_SELECTED;
  state.columnOrderIds = [...DEFAULT_COLUMN_ORDER_IDS];
  state.columnWidths = {};
  state.themePreference = "system";
  state.tabGridStates = Object.fromEntries(state.tabs.map((tab) => [tab.id, { ...DEFAULT_TAB_GRID_STATE }]));

  persistTabs();
  renderTabs();
  renderPanels();
  setStatus("Reset settings to defaults.");
}

function submitResetSettingsModal(event) {
  event.preventDefault();

  if (!resetSettingsModalState.isOpen) {
    return;
  }

  applyDefaultSettings();
  closeResetSettingsModal();
}

function rerenderSettingsAfterDefaultColumnChange() {
  persistTabs();
  renderSettingsPanel();
}

function selectAllFunctionalColumns() {
  state.defaultVisibleSpecialColumnIds = new Set(SPECIAL_COLUMNS.map((column) => column.id));
  rerenderSettingsAfterDefaultColumnChange();
}

function resetFunctionalColumns() {
  state.defaultVisibleSpecialColumnIds = new Set(DEFAULT_VISIBLE_SPECIAL_COLUMN_IDS);
  rerenderSettingsAfterDefaultColumnChange();
}

function selectAllDisplayColumns() {
  state.defaultVisibleColumnIds = new Set(DATA_COLUMNS.map((column) => column.id));
  rerenderSettingsAfterDefaultColumnChange();
}

function resetDisplayColumns() {
  state.defaultVisibleColumnIds = new Set(DEFAULT_VISIBLE_COLUMN_IDS);
  rerenderSettingsAfterDefaultColumnChange();
}

function selectAllExportColumns() {
  state.exportColumnIds = new Set(DATA_COLUMNS.map((column) => column.id));
  persistTabs();
  renderSettingsPanel();
}

function copyExportColumnsFromDisplayColumns() {
  state.exportColumnIds = new Set(state.defaultVisibleColumnIds);
  persistTabs();
  renderSettingsPanel();
}

function resetExportColumns() {
  state.exportColumnIds = new Set(DEFAULT_EXPORT_COLUMN_IDS);
  persistTabs();
  renderSettingsPanel();
}

function selectAllSources() {
  state.allowedSourceIds = new Set(SOURCE_OPTIONS.map((source) => source.id));
  persistTabs();
  renderSettingsPanel();
}

function resetSources() {
  state.allowedSourceIds = new Set(DEFAULT_ALLOWED_SOURCE_IDS);
  persistTabs();
  renderSettingsPanel();
}

function selectAllBehaviorSettings() {
  state.keepSelectedOnSearch = true;
  state.clearSearchInputsOnSearch = true;
  state.sortSettingsBySelected = true;
  persistTabs();
  renderSettingsPanel();
}

function resetBehaviorSettings() {
  state.keepSelectedOnSearch = DEFAULT_KEEP_SELECTED_ON_SEARCH;
  state.clearSearchInputsOnSearch = DEFAULT_CLEAR_SEARCH_INPUTS_ON_SEARCH;
  state.sortSettingsBySelected = DEFAULT_SORT_SETTINGS_BY_SELECTED;
  persistTabs();
  renderSettingsPanel();
}

function openTabModal(mode = "create", tabId = null) {
  tabModalState.mode = mode;
  tabModalState.editTabId = tabId;

  if (mode === "edit") {
    const tab = getTabById(tabId);
    if (!tab) {
      return;
    }

    tabModalState.colorIndex = tab.colorIndex;
    el.tabModalTitle.textContent = "Edit tab";
    el.tabModalCreateBtn.textContent = "Save Changes";
    el.tabModalName.value = tab.name;
    el.tabModalNote.textContent = "";
  } else {
    const defaultColorIndex = getFirstUnusedColorIndex();
    tabModalState.colorIndex = defaultColorIndex >= 0 ? defaultColorIndex : 0;
    el.tabModalTitle.textContent = "Create a tab";
    el.tabModalCreateBtn.textContent = "Create Tab";
    el.tabModalName.value = getNextTabName();
    el.tabModalNote.textContent = pendingMoveState.isActive
      ? `This new tab will receive ${pendingMoveState.rows.length} moved row${pendingMoveState.rows.length === 1 ? "" : "s"}.`
      : "";
  }

  renderTabColorPicker();
  el.tabModal.classList.add("open");
  el.tabModal.setAttribute("aria-hidden", "false");
  tabModalState.isOpen = true;
        state.searchGridState = { ...DEFAULT_SEARCH_GRID_STATE };
  window.requestAnimationFrame(() => {
    el.tabModalName.focus();
    el.tabModalName.select();
  });
}

function closeTabModal() {
  if (pendingMoveState.isActive) {
        state.searchGridState = { ...DEFAULT_SEARCH_GRID_STATE };
    resetPendingMoveState();
  }

  el.tabModal.classList.remove("open");
  el.tabModal.setAttribute("aria-hidden", "true");
  tabModalState.isOpen = false;
  tabModalState.mode = "create";
  tabModalState.editTabId = null;
  el.tabModalNote.textContent = "";
}

function renderTabColorPicker() {
  el.tabColorList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  TAB_COLORS.forEach((color, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-swatch";
    button.style.background = color.bg;
    button.style.borderColor = color.border;
    button.title = `Color ${index + 1}`;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-label", `Tab color ${index + 1}`);
    button.setAttribute("aria-checked", String(tabModalState.colorIndex === index));
    button.classList.toggle("selected", tabModalState.colorIndex === index);
    button.addEventListener("click", () => {
      tabModalState.colorIndex = index;
      renderTabColorPicker();
    });
    fragment.appendChild(button);
  });

  el.tabColorList.appendChild(fragment);
}

function submitTabModal(event) {
  event.preventDefault();

  const name = el.tabModalName.value.trim() || getNextTabName();
  if (!name) {
    alert("Tab name is required.");
    return;
  }

  const nameExists = state.tabs.some((tab) => tab.name.toLowerCase() === name.toLowerCase() && tab.id !== tabModalState.editTabId);
  if (nameExists) {
    alert("That tab name already exists.");
    return;
  }

  const colorIndex = tabModalState.colorIndex;
  if (colorIndex < 0 || colorIndex >= TAB_COLORS.length) {
    alert("Choose a tab color.");
    return;
  }

  if (tabModalState.mode === "edit") {
    const tab = getTabById(tabModalState.editTabId);
    if (!tab) {
      closeTabModal();
      return;
    }

    tab.name = name;
    tab.colorIndex = colorIndex;
    persistTabs();
    renderTabs();
    renderPanels();
    closeTabModal();
    setStatus(`Updated tab "${name}".`);
    return;
  }

  const tab = {
    id: createId(),
    name,
    colorIndex,
    rows: [],
    columnVisibility: createDefaultScopeColumnVisibility(),
  };

  state.tabs.push(tab);
  const movedWithNewTab = pendingMoveState.isActive;
  if (pendingMoveState.isActive) {
    const movedRows = pendingMoveState.rows.map((row) => ({ ...row }));
    tab.rows = movedRows;
    if (pendingMoveState.sourceScope === "search") {
      clearSelection("search");
    } else if (pendingMoveState.sourceTabId) {
      const sourceTab = getTabById(pendingMoveState.sourceTabId);
      if (sourceTab) {
        const movedIds = new Set(pendingMoveState.rows.map((row) => row.id));
        sourceTab.rows = sourceTab.rows.filter((row) => !movedIds.has(row.id));
        const selection = getSelectionSet(pendingMoveState.sourceTabId);
        selection.clear();
      }
    }
    state.activeTabId = tab.id;
    resetPendingMoveState();
  } else {
    state.activeTabId = tab.id;
  }
  persistTabs();
  renderTabs();
  renderPanels();
  closeTabModal();
  setStatus(movedWithNewTab ? `Created tab "${name}" and moved selected rows into it.` : `Created tab "${name}".`);
}

function renderTabs() {
  el.tabSearch.classList.toggle("active", state.activeTabId === "search");
  el.tabHelp.classList.toggle("active", state.activeTabId === "help");
  el.tabSettings.classList.toggle("active", state.activeTabId === "settings");

  el.dynamicTabs.innerHTML = "";
  const fragment = document.createDocumentFragment();

  state.tabs.forEach((tab) => {
    const color = TAB_COLORS[tab.colorIndex] ?? TAB_COLORS[0];

    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab-btn dynamic-tab";
    button.textContent = tab.name;
    button.style.setProperty("--tab-bg", color.bg);
    button.style.setProperty("--tab-border", color.border);
    button.style.setProperty("--tab-ink", color.text);
    button.classList.toggle("active", state.activeTabId === tab.id);
    button.title = `${tab.name} (${tab.rows.length} rows)`;
    button.addEventListener("click", () => setActiveTab(tab.id));
    fragment.appendChild(button);
  });

  el.dynamicTabs.appendChild(fragment);
  syncButtons();
}

function renderPanels() {
  const searchActive = state.activeTabId === "search";
  const helpActive = state.activeTabId === "help";
  const settingsActive = state.activeTabId === "settings";
  el.searchPanel.classList.toggle("active", searchActive);
  el.tabPanel.classList.toggle("active", !searchActive && !helpActive && !settingsActive);
  el.helpPanel.classList.toggle("active", helpActive);
  el.settingsPanel.classList.toggle("active", settingsActive);
  el.statusRow.classList.toggle("hidden", !searchActive);

  if (searchActive) {
    renderSearchTable();
    return;
  }

  if (settingsActive) {
    renderSettingsPanel();
    return;
  }

  const activeTab = getActiveTab();
  if (!activeTab) {
    el.activeTabTitle.textContent = "No tab selected";
    el.activeTabMeta.textContent = "";
    el.tabBody.innerHTML = "";
    el.tabFoot.innerHTML = "";
    syncButtons();
    return;
  }

  el.activeTabTitle.textContent = activeTab.name;
  el.activeTabMeta.textContent = `${activeTab.rows.length} cards`;

  renderTabTable(activeTab);
}

function renderSearchTable() {
  const visibleRows = getFilteredGridRows("search", state.searchRows);
  const gridState = getGridState("search");

  el.searchFilterInput.value = gridState.filterText;
  el.clearSearchFilterBtn.disabled = !gridState.filterText;
  el.clearSearchSortBtn.disabled = !gridState.sortColumnId;
  el.searchCountText.textContent = visibleRows.length === state.searchRows.length
    ? `${state.searchRows.length} cards`
    : `${visibleRows.length} of ${state.searchRows.length} cards`;

  renderMarketTable(el.resultsBody, visibleRows, "search", "add");
  renderTableHead(el.resultsHead, [
    { id: "add", label: "Add" },
    { id: "copy", label: "Copy" },
  ], {
    sortableColumns: true,
    sortState: gridState,
    scope: "search",
    onSort: (columnId) => toggleGridSort("search", columnId),
  });
  renderScopeColumnChooser("search", el.searchFunctionalColumnList, el.searchDisplayColumnList);
  syncButtons();
}

function renderTabTable(tab) {
  const tabGridState = getGridState(tab.id);
  const visibleRows = getFilteredGridRows(tab.id, tab.rows);

  el.tabFilterInput.value = tabGridState.filterText;
  el.clearTabFilterBtn.disabled = !tabGridState.filterText;
  el.clearTabSortBtn.disabled = !tabGridState.sortColumnId;
  el.activeTabMeta.textContent = visibleRows.length === tab.rows.length
    ? `${tab.rows.length} cards`
    : `${visibleRows.length} of ${tab.rows.length} cards`;

  renderMarketTable(el.tabBody, visibleRows, tab.id, "removeMove");
  renderTableHead(el.tabHead, [
    { id: "remove", label: "Remove" },
    { id: "move", label: "Move" },
    { id: "copy", label: "Copy" },
  ], {
    sortableColumns: true,
    sortState: tabGridState,
    scope: tab.id,
    onSort: (columnId) => toggleGridSort(tab.id, columnId),
  });
  renderTabFooter(tab, visibleRows);
  renderScopeColumnChooser(tab.id, el.tabFunctionalColumnList, el.tabDisplayColumnList);
  syncButtons();
}

function renderMarketTable(tbody, rows, scope, actionMode = null) {
  tbody.innerHTML = "";

  const fragment = document.createDocumentFragment();
  const selected = getSelectionSet(scope);

  rows.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.classList.toggle("selected-row", selected.has(row.id));

    if (isSpecialColumnVisible("select", scope)) {
      const selectTd = document.createElement("td");
      selectTd.className = "select-cell";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selected.has(row.id);
      checkbox.addEventListener("change", () => toggleRowSelection(scope, row.id, checkbox.checked));
      selectTd.appendChild(checkbox);
      tr.appendChild(selectTd);
    }

    if (actionMode === "add") {
      if (isSpecialColumnVisible("add", scope)) {
        const actionTd = document.createElement("td");
        actionTd.className = "action-cell add-cell";
        const actionBtn = document.createElement("button");
        actionBtn.type = "button";
        actionBtn.className = "row-action-btn";
        actionBtn.textContent = "Add";
        actionBtn.addEventListener("click", () => openAddRowModal(row));
        actionTd.appendChild(actionBtn);
        tr.appendChild(actionTd);
      }

      if (isSpecialColumnVisible("copy", scope)) {
        const copyTd = document.createElement("td");
        copyTd.className = "action-cell copy-cell";
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "row-action-btn copy";
        copyBtn.textContent = "Copy";
        copyBtn.addEventListener("click", () => {
          copyRowToClipboard(row).catch((err) => alert(`Copy failed: ${err.message}`));
        });
        copyTd.appendChild(copyBtn);
        tr.appendChild(copyTd);
      }
    } else if (actionMode === "removeMove") {
      if (isSpecialColumnVisible("remove", scope)) {
        const removeTd = document.createElement("td");
        removeTd.className = "action-cell remove-cell";
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "row-action-btn remove";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => removeRowFromActiveTab(row.id));
        removeTd.appendChild(removeBtn);
        tr.appendChild(removeTd);
      }

      if (isSpecialColumnVisible("move", scope)) {
        const moveTd = document.createElement("td");
        moveTd.className = "action-cell move-cell";
        const moveBtn = document.createElement("button");
        moveBtn.type = "button";
        moveBtn.className = "row-action-btn move";
        moveBtn.textContent = "Move";
        moveBtn.addEventListener("click", () => openMoveRowModal(row, scope));
        moveTd.appendChild(moveBtn);
        tr.appendChild(moveTd);
      }

      if (isSpecialColumnVisible("copy", scope)) {
        const copyTd = document.createElement("td");
        copyTd.className = "action-cell copy-cell";
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "row-action-btn copy";
        copyBtn.textContent = "Copy";
        copyBtn.addEventListener("click", () => {
          copyRowToClipboard(row).catch((err) => alert(`Copy failed: ${err.message}`));
        });
        copyTd.appendChild(copyBtn);
        tr.appendChild(copyTd);
      }
    }

    if (isSpecialColumnVisible("index", scope)) {
      const indexTd = document.createElement("td");
      indexTd.className = "index-cell";
      indexTd.textContent = index + 1;
      tr.appendChild(indexTd);
    }

    for (const column of getVisibleDataColumns(scope)) {
      const td = document.createElement("td");
      const width = getColumnWidth(column.id);
      if (width) {
        td.style.width = `${width}px`;
        td.style.minWidth = `${width}px`;
      }
      td.textContent = row[column.id] ?? "";
      tr.appendChild(td);
    }

    fragment.appendChild(tr);
  });

  tbody.appendChild(fragment);
}

function toggleRowSelection(scope, rowId, isSelected) {
  const selection = getSelectionSet(scope);
  if (isSelected) {
    selection.add(rowId);
  } else {
    selection.delete(rowId);
  }

  syncButtons();
  if (scope === "search") {
    renderSearchTable();
    return;
  }

  const activeTab = getActiveTab();
  if (activeTab && activeTab.id === scope) {
    renderTabTable(activeTab);
  }
}

function clearSelection(scope) {
  const selection = getSelectionSet(scope);
  selection.clear();
}

function selectAllSearchRows() {
  selectAllRowsForScope("search");
}

function unselectAllSearchRows() {
  unselectAllRowsForScope("search");
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

function flattenMarketRows(cards, allowedSourceIds = null) {
  const rows = [];

  const isAllowed = (sourceId) => !allowedSourceIds || allowedSourceIds.has(sourceId);

  for (const card of cards) {
    const setName = card?.set?.name ?? "";
    const setCode = card?.set?.id ?? "";
    const cardNumber = buildCardNumber(card);
    const pricing = card?.pricing ?? {};

    const cardmarket = pricing.cardmarket;
    if (cardmarket && typeof cardmarket === "object" && isAllowed("cardmarket")) {
      const row = normalizeRow({
        id: buildRowId({
          card_id: card.id ?? "",
          source: "cardmarket",
          variant: "standard",
          card_number: cardNumber,
          set_code: setCode,
          currency: cardmarket.unit ?? "",
        }),
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
      if (row) {
        rows.push(row);
      }
    }

    const tcgplayer = pricing.tcgplayer;
    if (tcgplayer && typeof tcgplayer === "object" && isAllowed("tcgplayer")) {
      const currency = tcgplayer.unit ?? "";
      const updated = tcgplayer.updated ?? "";

      for (const [variantName, variantData] of Object.entries(tcgplayer)) {
        if (variantName === "unit" || variantName === "updated") {
          continue;
        }

        if (!variantData || typeof variantData !== "object") {
          continue;
        }

        const row = normalizeRow({
          id: buildRowId({
            card_id: card.id ?? "",
            source: "tcgplayer",
            variant: variantName,
            card_number: cardNumber,
            set_code: setCode,
            currency,
          }),
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
        if (row) {
          rows.push(row);
        }
      }
    }
  }

  return rows;
}

function mergeSearchRowsKeepingSelectedFirst(nextRows) {
  const selectedIds = state.selectedRows.search;
  if (!selectedIds.size) {
    return nextRows;
  }

  const pinnedRows = state.searchRows.filter((row) => selectedIds.has(row.id));
  const pinnedIdSet = new Set(pinnedRows.map((row) => row.id));
  const mergedRows = [...pinnedRows, ...nextRows.filter((row) => !pinnedIdSet.has(row.id))];

  state.selectedRows.search = new Set(pinnedRows.map((row) => row.id));
  return mergedRows;
}

function createModalTabButton(tab, onClick) {
  const color = TAB_COLORS[tab.colorIndex] ?? TAB_COLORS[0];
  const button = document.createElement("button");
  button.type = "button";
  button.className = "modal-tab-btn";
  button.textContent = tab.name;
  button.style.background = color.bg;
  button.style.border = `1px solid ${color.border}`;
  button.style.color = color.text;
  button.addEventListener("click", onClick);
  return button;
}

function openAddRowModal(row) {
  if (!row) {
    return;
  }

  addRowModalState.row = row;
  addRowModalState.isOpen = true;

  el.addRowModalTabButtons.innerHTML = "";
  el.addRowModalNote.textContent = `Add ${row.name || "this card"} to a tab.`;

  const fragment = document.createDocumentFragment();

  if (!state.tabs.length) {
    const empty = document.createElement("p");
    empty.className = "modal-note";
    empty.textContent = "No tabs available. Create a tab first.";
    fragment.appendChild(empty);
  } else {
    state.tabs.forEach((tab) => {
      const button = createModalTabButton(tab, () => addSearchRowToTab(tab.id));
      fragment.appendChild(button);
    });
  }

  el.addRowModalTabButtons.appendChild(fragment);
  el.addRowModal.classList.add("open");
  el.addRowModal.setAttribute("aria-hidden", "false");

  window.requestAnimationFrame(() => {
    const firstButton = el.addRowModalTabButtons.querySelector("button");
    (firstButton ?? el.addRowModalCancelBtn).focus();
  });
}

function closeAddRowModal() {
  if (!addRowModalState.isOpen) {
    return;
  }

  addRowModalState.isOpen = false;
  addRowModalState.row = null;
  el.addRowModal.classList.remove("open");
  el.addRowModal.setAttribute("aria-hidden", "true");
}

function openMoveRowModal(row, sourceTabId) {
  if (!row || !sourceTabId) {
    return;
  }

  const sourceTab = getTabById(sourceTabId);
  if (!sourceTab) {
    return;
  }

  moveRowModalState.row = row;
  moveRowModalState.sourceTabId = sourceTabId;
  moveRowModalState.isOpen = true;

  el.moveRowModalTabButtons.innerHTML = "";
  el.moveRowModalNote.textContent = `Move ${row.name || "this card"} from ${sourceTab.name}.`;

  const destinationTabs = state.tabs.filter((tab) => tab.id !== sourceTabId);
  const fragment = document.createDocumentFragment();

  if (!destinationTabs.length) {
    const empty = document.createElement("p");
    empty.className = "modal-note";
    empty.textContent = "No destination tabs available. Create another tab first.";
    fragment.appendChild(empty);
  } else {
    destinationTabs.forEach((tab) => {
      const button = createModalTabButton(tab, () => moveTabRowToTab(tab.id));
      fragment.appendChild(button);
    });
  }

  el.moveRowModalTabButtons.appendChild(fragment);
  el.moveRowModal.classList.add("open");
  el.moveRowModal.setAttribute("aria-hidden", "false");

  window.requestAnimationFrame(() => {
    const firstButton = el.moveRowModalTabButtons.querySelector("button");
    (firstButton ?? el.moveRowModalCancelBtn).focus();
  });
}

function closeMoveRowModal() {
  if (!moveRowModalState.isOpen) {
    return;
  }

  moveRowModalState.isOpen = false;
  moveRowModalState.row = null;
  moveRowModalState.sourceTabId = null;
  el.moveRowModal.classList.remove("open");
  el.moveRowModal.setAttribute("aria-hidden", "true");
}

function moveTabRowToTab(targetTabId) {
  const row = moveRowModalState.row;
  const sourceTabId = moveRowModalState.sourceTabId;
  if (!row || !sourceTabId) {
    closeMoveRowModal();
    return;
  }

  const sourceTab = getTabById(sourceTabId);
  const targetTab = getTabById(targetTabId);
  if (!sourceTab || !targetTab || sourceTab.id === targetTab.id) {
    return;
  }

  const existsInTarget = targetTab.rows.some((existing) => existing.id === row.id);
  if (!existsInTarget) {
    targetTab.rows.push({ ...row });
  }

  sourceTab.rows = sourceTab.rows.filter((existing) => existing.id !== row.id);
  const sourceSelection = getSelectionSet(sourceTab.id);
  sourceSelection.delete(row.id);

  persistTabs();
  renderTabs();
  renderPanels();

  setStatus(
    existsInTarget
      ? `Removed 1 row from ${sourceTab.name}; ${targetTab.name} already had that card.`
      : `Moved 1 row from ${sourceTab.name} to ${targetTab.name}.`
  );

  closeMoveRowModal();
}

function addSearchRowToTab(tabId) {
  const row = addRowModalState.row;
  if (!row) {
    closeAddRowModal();
    return;
  }

  const targetTab = getTabById(tabId);
  if (!targetTab) {
    return;
  }

  const exists = targetTab.rows.some((existing) => existing.id === row.id);
  if (!exists) {
    targetTab.rows.push({ ...row });
    persistTabs();
    renderTabs();
    renderPanels();
    setStatus(`Added 1 row to ${targetTab.name}.`);
  } else {
    setStatus(`${targetTab.name} already has that card.`);
  }

  closeAddRowModal();
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
      if (card) {
        cards.push(card);
      }
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

  setActiveTab("search");
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

    const fetchedRows = flattenMarketRows(filteredCards, state.allowedSourceIds);
    if (state.keepSelectedOnSearch) {
      state.searchRows = mergeSearchRowsKeepingSelectedFirst(fetchedRows);
    } else {
      state.searchRows = fetchedRows;
      clearSelection("search");
    }

    if (state.clearSearchInputsOnSearch) {
      el.cardName.value = "";
      el.setName.value = "";
      el.cardNumber.value = "";
      el.setCode.value = "";
    }

    renderSearchTable();

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

function onExport(rows, fileName, sheetName) {
  if (!rows.length) {
    alert("There are no rows to export.");
    return;
  }

  const selectedExportColumns = getOrderedDataColumns().filter((column) => state.exportColumnIds.has(column.id));
  if (!selectedExportColumns.length) {
    alert("Select at least one export column in Settings > Export settings.");
    return;
  }

  const exportRows = rows.map((row) => {
    const exportRow = {};
    selectedExportColumns.forEach((column) => {
      exportRow[column.id] = row[column.id] ?? "";
    });
    return exportRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

function addNewTab() {
  openTabModal("create");
}

function duplicateActiveTab() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    return;
  }

  let duplicateName = `${activeTab.name} Copy`;
  let suffix = 2;
  while (state.tabs.some((tab) => tab.name.toLowerCase() === duplicateName.toLowerCase())) {
    duplicateName = `${activeTab.name} Copy ${suffix}`;
    suffix += 1;
  }

  const duplicateTab = {
    id: createId(),
    name: duplicateName.slice(0, 32),
    colorIndex: activeTab.colorIndex,
    rows: activeTab.rows.map((row) => ({ ...row })),
    columnVisibility: {
      visibleColumnIds: new Set(getColumnVisibilityForScope(activeTab.id).visibleColumnIds),
      visibleSpecialColumnIds: new Set(getColumnVisibilityForScope(activeTab.id).visibleSpecialColumnIds),
    },
  };

  state.tabs.push(duplicateTab);
  state.tabGridStates[duplicateTab.id] = { ...DEFAULT_TAB_GRID_STATE };
  setActiveTab(duplicateTab.id);
  setStatus(`Duplicated ${activeTab.name} to ${duplicateTab.name}.`);
}

function openEditActiveTabModal() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    return;
  }

  openTabModal("edit", activeTab.id);
}

function openDeleteActiveTabModal() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    return;
  }

  deleteModalState.tabId = activeTab.id;
  el.deleteModalNote.textContent = `Delete "${activeTab.name}"? This will remove the tab and all of its cards. This cannot be undone.`;
  el.deleteModal.classList.add("open");
  el.deleteModal.setAttribute("aria-hidden", "false");
  deleteModalState.isOpen = true;
  window.requestAnimationFrame(() => {
    el.deleteModalDeleteBtn.focus();
  });
}

function closeDeleteModal() {
  el.deleteModal.classList.remove("open");
  el.deleteModal.setAttribute("aria-hidden", "true");
  deleteModalState.isOpen = false;
  deleteModalState.tabId = null;
}

function submitDeleteModal(event) {
  event.preventDefault();

  if (!deleteModalState.isOpen) {
    return;
  }

  const tabId = deleteModalState.tabId;
  const tab = getTabById(tabId);
  if (!tab) {
    closeDeleteModal();
    return;
  }

  state.tabs = state.tabs.filter((candidate) => candidate.id !== tabId);
  delete state.selectedRows.tabs[tabId];
  delete state.tabGridStates[tabId];
  if (state.activeTabId === tabId) {
    state.activeTabId = "search";
  }

  persistTabs();
  renderTabs();
  renderPanels();
  closeDeleteModal();
}

function exportSelectedSearchRows() {
  const selectedRows = state.searchRows.filter((row) => state.selectedRows.search.has(row.id));
  if (!selectedRows.length) {
    alert("Select one or more search rows first.");
    return;
  }

  onExport(selectedRows, "selected_search_rows.xlsx", "SelectedSearch");
}

function exportSelectedTabRows() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    return;
  }

  const selection = getSelectionSet(activeTab.id);
  const selectedRows = activeTab.rows.filter((row) => selection.has(row.id));
  if (!selectedRows.length) {
    alert("Select one or more rows in the current tab first.");
    return;
  }

  const safeName = activeTab.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "tab";

  onExport(selectedRows, `${safeName}_selected_rows.xlsx`, `${activeTab.name.slice(0, 31) || "Tab"}Sel`);
}

function selectAllRowsForScope(scope) {
  const rows = getFilteredGridRows(scope);
  const selection = getSelectionSet(scope);
  selection.clear();
  rows.forEach((row) => selection.add(row.id));
  if (scope === "search") {
    renderSearchTable();
    return;
  }

  const activeTab = getActiveTab();
  if (activeTab) {
    renderTabTable(activeTab);
  }
}

function unselectAllRowsForScope(scope) {
  const selection = getSelectionSet(scope);
  selection.clear();
  if (scope === "search") {
    renderSearchTable();
    return;
  }

  const activeTab = getActiveTab();
  if (activeTab) {
    renderTabTable(activeTab);
  }
}

function selectAllActiveTabRows() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    return;
  }

  selectAllRowsForScope(activeTab.id);
}

function unselectAllActiveTabRows() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    return;
  }

  unselectAllRowsForScope(activeTab.id);
}

function openMoveModal(selectedCount, sourceScope = "search") {
  const availableTabs = state.tabs.filter((tab) => tab.id !== sourceScope);
  if (moveModalState.isOpen) {
    return Promise.resolve(null);
  }

  moveModalState.sourceScope = sourceScope;
  el.moveModalCount.textContent = `${selectedCount} selected row${selectedCount === 1 ? "" : "s"} will be moved.`;
  el.moveModalSelect.innerHTML = "";

  if (availableTabs.length) {
    const fragment = document.createDocumentFragment();
    availableTabs.forEach((tab) => {
      const option = document.createElement("option");
      option.value = tab.id;
      option.textContent = tab.name;
      fragment.appendChild(option);
    });
    el.moveModalSelect.appendChild(fragment);
    el.moveModalSelect.value = availableTabs[0].id;
    el.moveModalSelect.disabled = false;
    el.moveModalMoveBtn.disabled = false;
  } else {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No tabs yet";
    option.disabled = true;
    option.selected = true;
    el.moveModalSelect.appendChild(option);
    el.moveModalSelect.disabled = true;
    el.moveModalMoveBtn.disabled = true;
    el.moveModalCount.textContent = `No tabs exist yet. Create a new tab to move ${selectedCount} selected row${selectedCount === 1 ? "" : "s"}.`;
  }

  el.moveModal.classList.add("open");
  el.moveModal.setAttribute("aria-hidden", "false");
  moveModalState.isOpen = true;

  return new Promise((resolve) => {
    moveModalState.resolve = resolve;
    window.requestAnimationFrame(() => {
      el.moveModalSelect.focus();
    });
  });
}

function closeMoveModal() {
  if (!moveModalState.isOpen) {
    return;
  }

  el.moveModal.classList.remove("open");
  el.moveModal.setAttribute("aria-hidden", "true");
  moveModalState.isOpen = false;

  if (moveModalState.resolve) {
    moveModalState.resolve(null);
    moveModalState.resolve = null;
  }

  moveModalState.sourceScope = null;
}

function preparePendingMoveState(sourceScope) {
  const sourceTab = sourceScope === "search" ? null : getTabById(sourceScope);
  const rows = sourceScope === "search"
    ? state.searchRows.filter((row) => state.selectedRows.search.has(row.id))
    : (sourceTab?.rows ?? []).filter((row) => getSelectionSet(sourceScope).has(row.id));

  if (!rows.length) {
    return false;
  }

  pendingMoveState.isActive = true;
  pendingMoveState.sourceScope = sourceScope;
  pendingMoveState.sourceTabId = sourceTab?.id ?? null;
  pendingMoveState.sourceTabName = sourceTab?.name ?? "Search";
  pendingMoveState.rows = rows;
  return true;
}

function openNewTabFromMoveModal() {
  if (!moveModalState.sourceScope) {
    return;
  }

  const prepared = preparePendingMoveState(moveModalState.sourceScope);
  if (!prepared) {
    alert("Select one or more rows first.");
    return;
  }

  closeMoveModal();
  openTabModal("create");
}

function submitMoveModal(event) {
  event.preventDefault();

  if (!moveModalState.isOpen) {
    return;
  }

  const targetTab = state.tabs.find((tab) => tab.id === el.moveModalSelect.value) ?? null;
  if (!targetTab) {
    alert("Choose a destination tab.");
    return;
  }

  if (moveModalState.resolve) {
    moveModalState.resolve(targetTab);
    moveModalState.resolve = null;
  }

  closeMoveModal();
}

async function moveSelectedSearchRows() {
  if (!state.selectedRows.search.size) {
    alert("Select one or more search rows first.");
    return;
  }

  const targetTab = await openMoveModal(state.selectedRows.search.size, "search");
  if (!targetTab) {
    return;
  }

  const selectedRows = state.searchRows.filter((row) => state.selectedRows.search.has(row.id));
  const existingIds = new Set(targetTab.rows.map((row) => row.id));
  const additions = selectedRows.filter((row) => !existingIds.has(row.id)).map((row) => ({ ...row }));

  if (!additions.length) {
    setStatus(`All selected rows are already in ${targetTab.name}.`);
    clearSelection("search");
    renderSearchTable();
    syncButtons();
    return;
  }

  targetTab.rows = [...targetTab.rows, ...additions];
  clearSelection("search");
  persistTabs();
  renderTabs();
  renderPanels();
  setStatus(`Moved ${additions.length} row${additions.length === 1 ? "" : "s"} to ${targetTab.name}.`);
}

async function moveSelectedActiveTabRows() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    return;
  }

  const selection = getSelectionSet(activeTab.id);
  if (!selection.size) {
    alert("Select one or more rows in the current tab first.");
    return;
  }

  const targetTab = await openMoveModal(selection.size, activeTab.id);
  if (!targetTab) {
    return;
  }

  const selectedRows = activeTab.rows.filter((row) => selection.has(row.id));
  const existingIds = new Set(targetTab.rows.map((row) => row.id));
  const additions = selectedRows.filter((row) => !existingIds.has(row.id)).map((row) => ({ ...row }));

  if (!additions.length) {
    setStatus(`All selected rows are already in ${targetTab.name}.`);
    return;
  }

  targetTab.rows = [...targetTab.rows, ...additions];
  activeTab.rows = activeTab.rows.filter((row) => !selection.has(row.id));
  selection.clear();
  persistTabs();
  renderTabs();
  renderPanels();
  setStatus(`Moved ${additions.length} row${additions.length === 1 ? "" : "s"} to ${targetTab.name}.`);
}

function removeRowFromActiveTab(rowId) {
  const activeTab = getActiveTab();
  if (!activeTab) {
    return;
  }

  activeTab.rows = activeTab.rows.filter((row) => row.id !== rowId);
  getSelectionSet(activeTab.id).delete(rowId);
  persistTabs();
  renderTabs();
  renderPanels();
  setStatus(`Removed a row from ${activeTab.name}.`);
}

function removeSelectedRowsFromActiveTab() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    return;
  }

  const selection = getSelectionSet(activeTab.id);
  if (!selection.size) {
    alert("Select one or more rows in the current tab first.");
    return;
  }

  activeTab.rows = activeTab.rows.filter((row) => !selection.has(row.id));
  selection.clear();
  persistTabs();
  renderTabs();
  renderPanels();
  setStatus(`Removed selected rows from ${activeTab.name}.`);
}

function clearActiveTab() {
  const activeTab = getActiveTab();
  if (!activeTab || !activeTab.rows.length) {
    return;
  }

  const confirmed = window.confirm(`Clear all rows from ${activeTab.name}?`);
  if (!confirmed) {
    return;
  }

  activeTab.rows = [];
  getSelectionSet(activeTab.id).clear();
  persistTabs();
  renderTabs();
  renderPanels();
  setStatus(`Cleared ${activeTab.name}.`);
}

async function refreshActiveTab() {
  const activeTab = getActiveTab();
  if (!activeTab || !activeTab.rows.length) {
    return;
  }

  setLoading(true, `Refreshing ${activeTab.name}...`);

  try {
    const cardIds = [...new Set(activeTab.rows.map((row) => row.card_id).filter(Boolean))];
    const cards = await fetchCardDetails(cardIds);
    const refreshedRows = flattenMarketRows(cards);
    const refreshedById = new Map(refreshedRows.map((row) => [row.id, row]));

    activeTab.rows = activeTab.rows.map((row) => refreshedById.get(row.id) ?? row);
    persistTabs();
    renderTabs();
    renderPanels();
    setStatus(`Refreshed ${activeTab.name}.`);
  } catch (err) {
    setStatus(`Refresh failed for ${activeTab.name}.`);
    alert(`Refresh error: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

function exportActiveTab() {
  const activeTab = getActiveTab();
  if (!activeTab) {
    return;
  }

  const safeName = activeTab.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "tab";

  onExport(activeTab.rows, `${safeName}_market_data.xlsx`, activeTab.name.slice(0, 31) || "TabData");
}

renderTabs();

applyThemePreference();

const themeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
if (typeof themeMediaQuery.addEventListener === "function") {
  themeMediaQuery.addEventListener("change", () => {
    if (state.themePreference === "system") {
      applyThemePreference();
    }
  });
}

state.activeTabId = "search";

renderPanels();
syncButtons();

if (el.tabModal) {
  el.tabModal.setAttribute("aria-hidden", "true");
}

if (el.moveModal) {
  el.moveModal.setAttribute("aria-hidden", "true");
}

if (el.importOptionsModal) {
  el.importOptionsModal.setAttribute("aria-hidden", "true");
}
