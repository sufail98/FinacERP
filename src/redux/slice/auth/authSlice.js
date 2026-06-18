import axiosInstance from "@/lib/axiosConfig";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const checkAuth = createAsyncThunk("auth/checkAuth", async () => {
  const response = await axiosInstance.get("check-auth");
  
  return response.data;
});

// Helper function to get saved branch from localStorage
const getSavedBranchId = () => {
  try {
    return localStorage.getItem('selectedBranchId');
  } catch (error) {
    return null;
  }
};

// Helper function to save branch to localStorage
const saveBranchId = (branchId) => {
  try {
    if (branchId) {
      localStorage.setItem('selectedBranchId', branchId);
    } else {
      localStorage.removeItem('selectedBranchId');
    }
  } catch (error) {
    console.warn('Failed to save branch to localStorage:', error);
  }
};

// Helper function to get saved dbNameEncrypted from localStorage
const getSavedDbNameEncrypted = () => {
  try {
    return localStorage.getItem('dbNameEncrypted');
  } catch (error) {
    return null;
  }
};

// Helper function to save dbNameEncrypted to localStorage
// const saveDbNameEncrypted = (dbNameEncrypted) => {
//   try {
//     if (dbNameEncrypted) {
//       localStorage.setItem('dbNameEncrypted', dbNameEncrypted);
//     } else {
//       localStorage.removeItem('dbNameEncrypted');
//     }
//   } catch (error) {
//     console.warn('Failed to save dbNameEncrypted to localStorage:', error);
//   }
// };

// Helper function to get branch default data (financial year, currency, etc.)
const getBranchDefaultData = (defaultData, branchId) => {
  if (!defaultData || !branchId) return null;
  return defaultData.find(data => data.branchId === branchId) || null;
};

const authSlice = createSlice({
  name: "auth",
  initialState: {
    isLoggedIn: false,
    user: null,
    loading: true,
    error: null,
    message: "",
    branches: null,
    selectedBranchId: getSavedBranchId(),
    // dbNameEncrypted: getSavedDbNameEncrypted(), 
    defaultData: null,
    currentBranchData: {
      financialYear: null,
      currency: null,
      currencyConversion: null,
    }
  },
  reducers: {
logout: (state) => {
  state.isLoggedIn = false;
  state.user = null;
  state.branches = null;
  state.selectedBranchId = null;
  state.defaultData = null;
  state.currentBranchData = {
    financialYear: null,
    currency: null,
    currencyConversion: null,
  };
  state.message = "Logged out successfully";

  // ✅ Clear only auth-related keys — preserve remember_* keys
  localStorage.removeItem("authToken");
  localStorage.removeItem("customerSlno");
  localStorage.removeItem("dbNameEncrypted");
  localStorage.removeItem("selectedBranchId");
  localStorage.removeItem("userBranches");
  localStorage.removeItem("userData");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
  localStorage.removeItem("userRole");

  saveBranchId(null);
},
    setSelectedBranch: (state, action) => {
      const branchId = action.payload;
      state.selectedBranchId = branchId;
      
      // Find and update dbNameEncrypted for the selected branch
      if (state.branches) {
        const selectedBranch = state.branches.find(branch => branch.branchId === branchId);
       
      }
      
      // Update current branch data when branch changes
      const branchDefaultData = getBranchDefaultData(state.defaultData, branchId);
      if (branchDefaultData) {
        state.currentBranchData = {
          financialYear: branchDefaultData.financialYear || null,
          currency: branchDefaultData.currency || null,
          currencyConversion: branchDefaultData.currencyConversion || null,
        };
      } else {
        // Reset if no data found for the branch
        state.currentBranchData = {
          financialYear: null,
          currency: null,
          currencyConversion: null,
        };
      }
      
      // Save to localStorage whenever branch changes
      saveBranchId(branchId);
    },
    // Action to update financial year for current branch
    updateCurrentFinancialYear: (state, action) => {
      state.currentBranchData.financialYear = action.payload;
    },
    // Action to update currency for current branch
    updateCurrentCurrency: (state, action) => {
      state.currentBranchData.currency = action.payload;
    },
    // Action to update currency conversion for current branch
    updateCurrentCurrencyConversion: (state, action) => {
      state.currentBranchData.currencyConversion = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;

        if (action.payload?.data?.isLoggedIn) {
          state.isLoggedIn = true;
          state.user = action.payload.data.user;
          state.branches = action.payload.data.branches || null;
          state.defaultData = action.payload.data.defaultdata || null;

          // Check if saved branch is still valid
          const savedBranchId = getSavedBranchId();
          const branches = action.payload.data.branches || [];
          
          let finalBranchId = null;
          
          if (savedBranchId && branches.some(branch => branch.branchId === savedBranchId)) {
            // Use saved branch if it's still valid
            finalBranchId = savedBranchId;
          } else if (!state.selectedBranchId && branches.length > 0) {
            // Set default branch (first branch) if no valid saved branch
            finalBranchId = branches[0].branchId;
          } else if (savedBranchId && !branches.some(branch => branch.branchId === savedBranchId)) {
            // Clear invalid saved branch
            finalBranchId = branches.length > 0 ? branches[0].branchId : null;
          }
          
          state.selectedBranchId = finalBranchId;
          saveBranchId(finalBranchId);
          
          // Set dbNameEncrypted based on selected branch
          if (finalBranchId && branches.length > 0) {
            const selectedBranch = branches.find(branch => branch.branchId === finalBranchId);
            if (selectedBranch && selectedBranch.dbNameEncrypted) {
              // state.dbNameEncrypted = selectedBranch.dbNameEncrypted;
              // saveDbNameEncrypted(selectedBranch.dbNameEncrypted);
            }
          }
          
          // Set current branch data based on selected branch
          if (finalBranchId) {
            const branchDefaultData = getBranchDefaultData(state.defaultData, finalBranchId);
            if (branchDefaultData) {
              state.currentBranchData = {
                financialYear: branchDefaultData.financialYear || null,
                currency: branchDefaultData.currency || null,
                currencyConversion: branchDefaultData.currencyConversion || null,
              };
            }
          }
          
        } else {
          state.isLoggedIn = false;
          state.user = null;
          state.branches = null;
          state.selectedBranchId = null;
          // state.dbNameEncrypted = null;
          state.defaultData = null;
          state.currentBranchData = {
            financialYear: null,
            currency: null,
            currencyConversion: null,
          };
          saveBranchId(null);
          // saveDbNameEncrypted(null);
        }
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        state.isLoggedIn = false;
        state.user = null;
        state.branches = null;
        state.selectedBranchId = null;
        // state.dbNameEncrypted = null;
        state.defaultData = null;
        state.currentBranchData = {
          financialYear: null,
          currency: null,
          currencyConversion: null,
        };
        saveBranchId(null);
        // saveDbNameEncrypted(null);
      });
  },
});

export const { 
  logout, 
  setSelectedBranch, 
  updateCurrentFinancialYear,
  updateCurrentCurrency,
  updateCurrentCurrencyConversion
} = authSlice.actions;

export default authSlice.reducer;