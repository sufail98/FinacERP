// src/lib/axiosConfig.js
import axios from 'axios';
import { DEFAULT_API_BASE_URL, getApiBaseUrlBySlno } from './baseUrl';
import { selectCurrentBranchDbName, selectCurrentBranchMainDb } from '../redux/selectors/authSelectors';
import { store } from '@/redux/store';

// Create axios instance with dynamic base URL
const axiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use((config) => {
  // Get stored slno and set dynamic base URL
  const customerSlno = localStorage.getItem('customerSlno');
  const baseURL = getApiBaseUrlBySlno(customerSlno);
  config.baseURL = baseURL;

  // Get auth token
  const token = localStorage.getItem('authToken');
  const dbNameEncrypted = localStorage.getItem("dbNameEncrypted");
  const mainDb = selectCurrentBranchMainDb(store.getState());

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Define all conditions where mainDb should be used
  const mainDbConditions = [
    // Uncomment as needed
    // () => window.location.href.includes('/user-group/set-privilege/'),
    // () => config.url?.includes('get-privileges-byId'),
    // () => config.url?.includes('get-branch-byId'),
    // () => config.url?.includes('branches'), 
    // () => config.url?.includes('save-branch'),
    // () => config.url?.includes('update-branch'),
    // () => config.url?.includes('toggle-branch-status'),
    // () => config.url?.includes('delete-branch'),
    // () => config.url?.includes('company'),
    // () => config.url?.includes('update-company'),
    // () => config.url?.includes('user-groups'),
    // () => config.url?.includes('active-user-groups'),
    // () => config.url?.includes('save-user-group'),
    // () => config.url?.includes('get-user-group-byId'),
    // () => config.url?.includes('update-user-group'),
    // () => config.url?.includes('toggle-user-group-status'),
    // () => config.url?.includes('delete-user-group'),
    // () => config.url?.includes('users'),
    // () => config.url?.includes('get-user-byId'),
    // () => config.url?.includes('update-user'),
    // () => config.url?.includes('save-user'),
    // () => config.url?.includes('toggle-user-status'),
    // () => config.url?.includes('delete-use'),
    // () => config.url?.includes('change-password'),
  ];

  // Check if any condition is true
  const shouldUseMainDb = mainDbConditions.some(condition => condition());

  if (shouldUseMainDb) {
    config.headers['X-Database-Name'] = mainDb;
  } else if (dbNameEncrypted) {
    config.headers['X-Database-Name'] = dbNameEncrypted;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default axiosInstance;