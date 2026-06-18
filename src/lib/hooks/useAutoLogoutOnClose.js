import { useEffect } from 'react';
import { getApiBaseUrlBySlno } from '../baseUrl';

export const useAutoLogoutOnClose = () => {
    useEffect(() => {
        // On app mount, check if we should logout from previous session
        const pendingLogout = localStorage.getItem('pendingLogout');
        
        if (pendingLogout === 'true') {
            const token = localStorage.getItem('authToken');
            const customerSlno = localStorage.getItem('customerSlno');
            const dbNameEncrypted = localStorage.getItem('dbNameEncrypted');
            
            if (token) {
                const baseURL = getApiBaseUrlBySlno(customerSlno);
                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                };

                if (dbNameEncrypted) {
                    headers['X-Database-Name'] = dbNameEncrypted;
                }

                fetch(`${baseURL}/logout`, {
                    method: 'POST',
                    headers: headers,
                    credentials: 'include',
                }).catch(err => console.error('Auto-logout failed:', err));
            }
            
            // Clear everything
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirect to login
            window.location.replace(window.location.origin + window.location.pathname + '#/login');
            return;
        }

        // Mark that app is loaded
        sessionStorage.setItem('appLoaded', Date.now().toString());
        localStorage.removeItem('pendingLogout');

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                const token = localStorage.getItem('authToken');
                if (token) {
                    // Mark for logout
                    localStorage.setItem('pendingLogout', 'true');
                }
            } else if (document.visibilityState === 'visible') {
                // Page became visible again - it was a tab switch, not close
                localStorage.removeItem('pendingLogout');
            }
        };

        const handleBeforeUnload = () => {
            const token = localStorage.getItem('authToken');
            if (token) {
                localStorage.setItem('pendingLogout', 'true');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);
};