import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@/lib/axiosConfig"; // Your axios setup file

// Async thunk to fetch privileges
export const fetchPrivileges = createAsyncThunk(
  "privileges/fetchPrivileges",
  async (userGroupId, { rejectWithValue }) => {
    
    try {
      const response = await axiosInstance.get(`get-privileges-byId/${userGroupId}`);
      
      return response.data.data; // we only need the `data` array
    } catch (error) {
      return rejectWithValue(error.response?.data || "Something went wrong");
    }
  }
);

const privilegesSlice = createSlice({
  name: "privileges",
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearPrivileges: (state) => {
      state.data = [];
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPrivileges.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPrivileges.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchPrivileges.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearPrivileges } = privilegesSlice.actions;
export default privilegesSlice.reducer;
