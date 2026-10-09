// src/redux/slice/organizationSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  organizationData: null, // full response stored as-is
  loading: false,
  error: null,
};

const organizationSlice = createSlice({
  name: "organization",
  initialState,
  reducers: {
    setOrganizationData: (state, action) => {
      state.organizationData = action.payload;
      state.error = null;
    },
    clearOrganizationData: (state) => {
      state.organizationData = null;
      state.error = null;
    },
    setOrganizationLoading: (state, action) => {
      state.loading = action.payload;
    },
    setOrganizationError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setOrganizationData,
  clearOrganizationData,
  setOrganizationLoading,
  setOrganizationError,
} = organizationSlice.actions;

export default organizationSlice.reducer;