// src/redux/slices/userGroupSlice.js
import axiosInstance from "@/lib/axiosConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// API call
export const fetchUserGroups = createAsyncThunk("userGroup/fetchAll", async () => {
  const response = await axiosInstance.get("active-user-groups"); 
  
  return response.data.data;
});

const userGroupSlice = createSlice({
  name: "userGroup",
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchUserGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default userGroupSlice.reducer;
