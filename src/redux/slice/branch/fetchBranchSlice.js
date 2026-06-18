import axiosInstance from "@/lib/axiosConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// API call
export const fetchBranches = createAsyncThunk("branches/fetchAll", async () => {
  const response = await axiosInstance.get("branches"); 
  return response.data.data;
});

const branchSlice = createSlice({
  name: "branches",
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranches.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchBranches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default branchSlice.reducer;
