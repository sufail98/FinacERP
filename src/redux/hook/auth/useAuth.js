import { checkAuth, logout, setSelectedBranch, updateCurrentFinancialYear, updateCurrentCurrency, updateCurrentCurrencyConversion } from "@/redux/slice/auth/authSlice";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

const useAuth = () => {
  const dispatch = useDispatch();
  const { isLoggedIn, user, loading, error, message, branches, selectedBranchId, defaultData, currentBranchData } = useSelector((state) => state.auth);

  useEffect(() => {
    // Only dispatch if we haven't checked yet (initial state)
    // and we're not already loading
    if (isLoggedIn === false && user === null && !loading) {
      dispatch(checkAuth());
    }
  }, []);

  // Get selected branch details from branches array
  const selectedBranchDetails = useMemo(() => {
    return branches?.find(branch => branch.branchId === selectedBranchId) || null;
  }, [branches, selectedBranchId]);

  return {
    // Basic auth data
    isLoggedIn,
    user,
    branches,
    selectedBranchId,
    selectedBranchDetails,
    userLoading: loading,
    userError: error,
    message,
    userId: user?.userId,

    // Branch default data
    defaultData,
    currentBranchData,

    // Current branch specific data
    currentFinancialYear: currentBranchData?.financialYear,
    currentCurrency: currentBranchData?.currency,
    currentCurrencyConversion: currentBranchData?.currencyConversion,

    // Actions
    logout: () => dispatch(logout()),
    setBranch: (branchId) => dispatch(setSelectedBranch(branchId)),
    setFinancialYear: (financialYear) => dispatch(updateCurrentFinancialYear(financialYear)),
    setCurrency: (currency) => dispatch(updateCurrentCurrency(currency)),
    setCurrencyConversion: (currencyConversion) => dispatch(updateCurrentCurrencyConversion(currencyConversion)),
  };
};

export default useAuth;