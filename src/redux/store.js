// E:\Users\Roshan\Finac\Web-FinacERP\src\redux\store.js

import { configureStore } from "@reduxjs/toolkit";
import branchReducer from "./slice/branch/fetchBranchSlice";
import userGroupReducer from "./slice/userGroup/fetchUserGroupSlice";
import authReducer from "./slice/auth/authSlice";
import privilegesReducer from "./slice/privilegesSlice";
import settingsReducer from './slice/settingsSlice';
import financialYearReducer from './slice/financialYearSlice';
import currencyConvertionReducer from './slice/currencyConversion';
import themeReducer from './slice/theme/themeSlice';
import updateReducer from './slice/updateSlice'; // ✅ ADD THIS
import productReducer from './slice/productSlice';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import organizationReducer from "./slice/organizationSlice";

import { combineReducers } from 'redux';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'settings','organization'], // Only persist auth, NOT update state
};

const rootReducer = combineReducers({
  branches: branchReducer,
  userGroups: userGroupReducer,
  auth: authReducer,
  privileges: privilegesReducer,
  settings: settingsReducer,
  financialYear: financialYearReducer,
  currencyConvertion: currencyConvertionReducer,
  theme: themeReducer,
  update: updateReducer,
  products: productReducer,
  organization: organizationReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);