import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import axiosInstance from '@/lib/axiosConfig';

const AUTH_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

const PrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const intervalRef = useRef(null);

  const showNetworkAlert = () => {
    let styleElement;

    Swal.fire({
      text: 'Connect internet for better performance',
      confirmButtonText: 'Ok',
      allowOutsideClick: false,
      customClass: {
        popup: 'network-alert-popup',
        confirmButton: 'network-alert-button'
      },
      didOpen: () => {
        styleElement = document.createElement('style');
        styleElement.setAttribute('data-network-alert', 'true');
        styleElement.textContent = `
          .network-alert-popup {
            width: 400px !important;
            height: 120px !important;
            padding: 10px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
          }
          .network-alert-button {
            background-color: #2b216a !important;
            border: none !important;
            padding: 8px 24px !important;
            font-size: 14px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
          }
          .network-alert-button:hover {
            background-color: #3b2d94 !important;
          }
          .network-alert-popup .swal2-actions {
            justify-content: flex-end !important;
            margin-top: auto !important;
            width: 100% !important;
          }
          .network-alert-popup .swal2-html-container {
            text-align: left !important;
            overflow-y: hidden !important;
            padding: 10px !important;
          }
        `;
        document.head.appendChild(styleElement);
      },
      willClose: () => {
        // Cleanup: remove the style element when alert closes
        if (styleElement && styleElement.parentNode) {
          styleElement.parentNode.removeChild(styleElement);
        }
      }
    });
  };
const checkAuth = async () => {
  try {
    const response = await axiosInstance.get('check-auth');
    if (response.status === 200 && response.data.data?.isLoggedIn === true) {
      setIsAuthenticated(true);
    } else if (response.status === 200 && response.data.data?.isLoggedIn === false) {
      handleLogout();
    }
    // else: unexpected shape/status — don't logout, just skip this cycle
  } catch (error) {
    console.error('Authentication check failed:', error);
    // Only logout on actual auth failure (401/403), not network errors
    if (error.response && [401, 403].includes(error.response.status)) {
      handleLogout();
    }
    // network/timeout errors: silently retry next interval, don't kick the user out
  }
};

const handleLogout = () => {
  setIsAuthenticated(false);
  clearInterval(intervalRef.current);

  // Give active forms a chance to auto-hold their data
  window.dispatchEvent(new CustomEvent('app:force-logout'));

  // Delay navigation slightly so listeners can synchronously hold data
  setTimeout(() => {
    localStorage.removeItem('authToken');
    navigate('/login');
  }, 50);
};

  useEffect(() => {
    if (!token) {
      setIsAuthenticated(false);
      navigate('/login');
      return;
    }

    // Run immediately on mount
    checkAuth();

    // Then run every 5 minutes
    intervalRef.current = setInterval(checkAuth, AUTH_CHECK_INTERVAL);

    return () => clearInterval(intervalRef.current); // Cleanup on unmount
  }, []);

  return isAuthenticated ? children : null;
};

export default PrivateRoute;

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};