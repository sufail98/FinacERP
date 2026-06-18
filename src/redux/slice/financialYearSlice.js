import { createSlice } from "@reduxjs/toolkit";

const financialYearSlice = createSlice({
  name: "financialYear",
  initialState: {
    financialYears: [],
    activeFinancialYearId: null,
    activeFinancialYear: null, // store full object
    loading: false,
    error: null,
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setFinancialYears: (state, action) => {
      state.financialYears = action.payload || [];

      // Pick first open year (closed === false)
      const openYear = action.payload.find((y) => y.closed === false);

      state.activeFinancialYearId = openYear ? openYear.yearId : null;
      state.activeFinancialYear = openYear || null;
      state.loading = false;
      state.error = null;
    },
    // Manual update when user changes active year
    setActiveFinancialYearId: (state, action) => {
      state.activeFinancialYearId = action.payload;
      state.activeFinancialYear =
        state.financialYears.find((y) => y.yearId === action.payload) || null;
    },
  },
});

export const {
  setLoading,
  setError,
  setFinancialYears,
  setActiveFinancialYearId,
} = financialYearSlice.actions;

export default financialYearSlice.reducer;
