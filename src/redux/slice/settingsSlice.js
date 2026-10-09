
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  generalSettings: {},
  barcodeAlignmentSettings: {},
  financeSettings: {},
  inventorySettings: {},
  purchaseSettings: {},
  saleSettings: {},
  zatcaSettings: {},
  printSettings: {},
  loading: false,
  loaded: false,
  error: null,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setSettings: (state, action) => {
      state.generalSettings = action.payload.generalSettings || {};
      state.barcodeAlignmentSettings = action.payload.barcodeAlignmentSettings || {};
      state.financeSettings = action.payload.financeSettings || {};
      state.inventorySettings = action.payload.inventorySettings || {};
      state.purchaseSettings = action.payload.purchaseSettings || {};
      state.saleSettings = action.payload.saleSettings || {};
      state.zatcaSettings = action.payload.zatcaSettings || {};
      state.printSettings = action.payload.printSettings || {};
      state.loaded = true;
      state.loading = false;
      state.error = null;
    },
    setPrintSettings: (state, action) => {
      state.printSettings = action.payload;
    },
    resetSettings: (state) => {
      state.generalSettings = {};
      state.barcodeAlignmentSettings = {};
      state.financeSettings = {};
      state.inventorySettings = {};
      state.purchaseSettings = {};
      state.saleSettings = {};
      state.zatcaSettings = {};
      state.printSettings = {};
      state.loaded = false;
      state.loading = false;
      state.error = null;
    },
    updateGeneralSettings: (state, action) => {
      state.generalSettings = { ...state.generalSettings, ...action.payload }
    },
    updateInventorySettings: (state, action) => {
      state.inventorySettings = { ...state.inventorySettings, ...action.payload }
    },
    updateFinanceSettings: (state, action) => {
      state.financeSettings = { ...state.financeSettings, ...action.payload }
    },
    updatePurchaseSettings: (state, action) => {
      state.purchaseSettings = { ...state.purchaseSettings, ...action.payload }
    },
    updateSalesSettings: (state, action) => {
      state.saleSettings = { ...state.saleSettings, ...action.payload }
    },
    updateZatcaSettings: (state, action) => {
      state.zatcaSettings = { ...state.zatcaSettings, ...action.payload }
    },
    updatePrintSettings: (state, action) => {
      state.printSettings = { ...state.printSettings, ...action.payload }
    },
    updateBarcodeAlignmentSettings: (state, action) => {
      state.barcodeAlignmentSettings = { ...state.barcodeAlignmentSettings, ...action.payload }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setSettings, resetSettings,setPrintSettings, setLoading, setError, updateGeneralSettings, updateInventorySettings, updateFinanceSettings, updateSalesSettings, updatePurchaseSettings, zatcaSettings, updateZatcaSettings, updatePrintSettings, updateBarcodeAlignmentSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
