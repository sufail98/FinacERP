import axiosInstance from '@/lib/axiosConfig';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ============================
// Fetch All Products
// ============================
export const fetchAllProducts = createAsyncThunk(
  'products/fetchAllProducts',
  async (_, { rejectWithValue }) => {
    try {
      const [salesRes, purchaseRes, inventoryRes] = await Promise.all([
        axiosInstance.get(`products-grid-fill?type=sales&branchId=${localStorage.getItem('selectedBranchId')}`),
        axiosInstance.get(`products-grid-fill?type=purchase&branchId=${localStorage.getItem('selectedBranchId')}`),
        axiosInstance.get(`products-grid-fill?type=inventory&branchId=${localStorage.getItem('selectedBranchId')}`),
      ]);

      return {
        sales: salesRes.data || {},
        purchase: purchaseRes.data || {},
        inventory: inventoryRes.data || {},
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ============================
// Refresh Single Type
// ============================
export const refreshProductsByType = createAsyncThunk(
  'products/refreshProductsByType',
  async (type, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(
        `products-grid-fill?type=${type}&branchId=${localStorage.getItem('selectedBranchId')}`
      );

      return {
        type,
        data: res.data || {},
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ============================
// Slice
// ============================
const productSlice = createSlice({
  name: 'products',

  initialState: {
    salesProducts: [],
    purchaseProducts: [],
    inventoryProducts: [],
    loading: false,
    error: null,
    lastUpdated: null,
  },

  reducers: {
    clearProducts: (state) => {
      state.salesProducts = [];
      state.purchaseProducts = [];
      state.inventoryProducts = [];
      state.lastUpdated = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // ======================
      // FETCH ALL PRODUCTS
      // ======================
      .addCase(fetchAllProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.salesProducts = action.payload.sales?.data || [];
        state.purchaseProducts = action.payload.purchase?.data || [];
        state.inventoryProducts = action.payload.inventory?.data || [];
        state.lastUpdated = Date.now();
      })
      .addCase(fetchAllProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ======================
      // REFRESH SINGLE TYPE
      // ======================
      .addCase(refreshProductsByType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshProductsByType.fulfilled, (state, action) => {
        state.loading = false;
        const { type, data } = action.payload;
        if (type === 'sales') state.salesProducts = data?.data || [];
        if (type === 'purchase') state.purchaseProducts = data?.data || [];
        if (type === 'inventory') state.inventoryProducts = data?.data || [];
        state.lastUpdated = Date.now();
      })
      .addCase(refreshProductsByType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearProducts } = productSlice.actions;

export default productSlice.reducer;