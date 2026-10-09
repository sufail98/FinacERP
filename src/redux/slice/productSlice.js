import axiosInstance from '@/lib/axiosConfig';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ============================
// Helper: resolve API name
// ============================
const getApiName = (settings) => {
  const showStock =
    settings?.saleSettings?.showStockInproductLookUp || false;
  return showStock
    ? 'products-grid-fill'
    : 'products-grid-fill';
};

// ============================
// Fetch All Products (by type)
// ============================
export const fetchAllProducts = createAsyncThunk(
  'products/fetchAllProducts',
  async (_, { rejectWithValue, getState }) => {
    const apiName = getApiName(getState().settings);

    try {
      const branchId = localStorage.getItem('selectedBranchId');

      const [salesRes, purchaseRes, inventoryRes] = await Promise.all([
        axiosInstance.get(`${apiName}?type=sales&branchId=${branchId}`),
        axiosInstance.get(`${apiName}?type=purchase&branchId=${branchId}`),
        axiosInstance.get(`${apiName}?type=inventory&branchId=${branchId}`),
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
// Fetch All Products (no type)
// ============================
export const fetchAllProductsNoType = createAsyncThunk(
  'products/fetchAllProductsNoType',
  async (_, { rejectWithValue, getState }) => {
    const apiName = getApiName(getState().settings);

    try {
      const branchId = localStorage.getItem('selectedBranchId');
      const res = await axiosInstance.get(
        `${apiName}?branchId=${branchId}`
      );
      return res.data || {};
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
  async (type, { rejectWithValue, getState }) => {
    const apiName = getApiName(getState().settings);

    try {
      const branchId = localStorage.getItem('selectedBranchId');
      const res = await axiosInstance.get(
        `${apiName}?type=${type}&branchId=${branchId}`
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
    allProducts: [],       // populated by fetchAllProductsNoType
    loading: false,
    error: null,
    lastUpdated: null,
  },

  reducers: {
    clearProducts: (state) => {
      state.salesProducts = [];
      state.purchaseProducts = [];
      state.inventoryProducts = [];
      state.allProducts = [];
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
      // FETCH ALL (NO TYPE)
      // ======================
      .addCase(fetchAllProductsNoType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllProductsNoType.fulfilled, (state, action) => {
        state.loading = false;
        state.allProducts = action.payload?.data || [];
        state.lastUpdated = Date.now();
      })
      .addCase(fetchAllProductsNoType.rejected, (state, action) => {
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