// authSelector.js

// ✅ Get current branch object
export const selectCurrentBranch = (state) => {
  const { branches, selectedBranchId } = state.auth;
  if (!branches || !selectedBranchId) return null;
  return branches.find(branch => branch.branchId === selectedBranchId) || null;
};

// ✅ Get current branch DB name
export const selectCurrentBranchDbName = (state) => {
  const currentBranch = selectCurrentBranch(state);
  return currentBranch?.dbNameEncrypted || null;
};

// ✅ Get main DB from current branch
export const selectCurrentBranchMainDb = (state) => {
  const currentBranch = selectCurrentBranch(state);
  return currentBranch?.maindb || null;
};

// ✅ Get all default data
export const selectDefaultData = (state) => {
  return state.auth.defaultData || null;
};

// ✅ Get current branch data (financial year, currency, etc.)
export const selectCurrentBranchData = (state) => {
  return state.auth.currentBranchData || null;
};

// ✅ Get current financial year
export const selectCurrentFinancialYear = (state) => {
  return state.auth.currentBranchData?.financialYear || null;
};

// ✅ Get current currency
export const selectCurrentCurrency = (state) => {
  return state.auth.currentBranchData?.currency || null;
};

// ✅ Get current currency conversion
export const selectCurrentCurrencyConversion = (state) => {
  return state.auth.currentBranchData?.currencyConversion || null;
};

// ✅ Get financial year details
export const selectFinancialYearDetails = (state) => {
  const financialYear = selectCurrentFinancialYear(state);
  if (!financialYear) return null;
  
  return {
    yearId: financialYear.yearId,
    fromDate: financialYear.fromDate,
    toDate: financialYear.toDate,
    closed: financialYear.closed,
    createdDate: financialYear.CreatedDate,
    createdUser: financialYear.CreatedUser,
    modifiedDate: financialYear.ModifiedDate,
    modifiedUser: financialYear.ModifiedUser,
  };
};

// ✅ Get currency details
export const selectCurrencyDetails = (state) => {
  const currency = selectCurrentCurrency(state);
  if (!currency) return null;
  
  return {
    currencyId: currency.currencyId,
    currencySymbol: currency.currencySymbol,
    currencyName: currency.currencyName,
    subunitName: currency.subunitName,
    noOfDecimalPlace: currency.noOfDecimalPlace,
    narration: currency.narration,
    default: currency.default,
    branchId: currency.branchId,
    createdDate: currency.CreatedDate,
    createdUser: currency.CreatedUser,
    modifiedDate: currency.ModifiedDate,
    modifiedUser: currency.ModifiedUser,
  };
};

// ✅ Get currency conversion details
export const selectCurrencyConversionDetails = (state) => {
  const currencyConversion = selectCurrentCurrencyConversion(state);
  if (!currencyConversion) return null;
  
  return {
    currencyConversionId: currencyConversion.currencyConversionId,
    currencyId: currencyConversion.currencyId,
    date: currencyConversion.date,
    rate: currencyConversion.rate,
    narration: currencyConversion.narration,
    branchId: currencyConversion.branchId,
    createdDate: currencyConversion.CreatedDate,
    createdUser: currencyConversion.CreatedUser,
    modifiedDate: currencyConversion.ModifiedDate,
    modifiedUser: currencyConversion.ModifiedUser,
  };
};

// ✅ Get current branch complete data (branch + financial + currency)
export const selectCurrentBranchCompleteData = (state) => {
  const currentBranch = selectCurrentBranch(state);
  const currentBranchData = selectCurrentBranchData(state);
  
  if (!currentBranch) return null;
  
  return {
    branch: currentBranch,
    financialYear: currentBranchData?.financialYear || null,
    currency: currentBranchData?.currency || null,
    currencyConversion: currentBranchData?.currencyConversion || null,
  };
};

// ✅ Check if financial year is closed
export const selectIsFinancialYearClosed = (state) => {
  const financialYear = selectCurrentFinancialYear(state);
  return financialYear?.closed || false;
};

// ✅ Get currency symbol for display
export const selectCurrentCurrencySymbol = (state) => {
  const currency = selectCurrentCurrency(state);
  return currency?.currencySymbol || null;
};

// ✅ Get currency decimal places
export const selectCurrentCurrencyDecimalPlaces = (state) => {
  const currency = selectCurrentCurrency(state);
  return currency?.noOfDecimalPlace || 2;
};

// ✅ Get current conversion rate
export const selectCurrentConversionRate = (state) => {
  const currencyConversion = selectCurrentCurrencyConversion(state);
  return currencyConversion?.rate || null;
};