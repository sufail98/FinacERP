// src/redux/slices/currencySlice.js
import { createSlice } from "@reduxjs/toolkit";

const currencySlice = createSlice({
  name: "currency",
  initialState: {
    baseCurrency: "USD",
    targetCurrency: "INR",
    currentConversionRate: null,
    convertedAmount: 0,
  },
  reducers: {
    setBaseCurrency: (state, action) => {
      state.baseCurrency = action.payload;
    },
    setTargetCurrency: (state, action) => {
      state.targetCurrency = action.payload;
    },
    setCurrencyConversion: (state, action) => {
      // store the whole object from API
      state.currentConversionRate = action.payload;
    },
    convertAmount: (state, action) => {
      const amount = action.payload;
      if (state.currentConversionRate?.rate) {
        state.convertedAmount = amount * parseFloat(state.currentConversionRate.rate);
      } else {
        state.convertedAmount = amount;
      }
    },
  },
});

export const {
  setBaseCurrency,
  setTargetCurrency,
  setCurrencyConversion,
  convertAmount,
} = currencySlice.actions;

export default currencySlice.reducer;
