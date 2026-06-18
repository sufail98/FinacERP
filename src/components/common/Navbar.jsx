// components/Navbar.jsx
import { useEffect, useState } from 'react';
import { User, Menu as MenuIcon, X, RefreshCw } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '@/redux/hook/auth/useAuth';
import LanguageDropdown from './LanguageDropdown';
import NavSearchBar from './NavSearchBar';
import BranchDropdown from './branchDropdown';
import UserDropdown from './UserDropdown';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import axiosInstance from '@/lib/axiosConfig';
import { clearMenuData } from '../../../public/assets/js/menuData';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isElectron, setIsElectron] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(true);
  const { t } = useTranslation();
  const { user } = useAuth();

  // ✅ Check if running in Electron
  useEffect(() => {
    const checkElectron = () => {
      return !!(
        window.navigator.userAgent.includes('Electron') ||
        window.process?.type ||
        window.electron
      );
    };
    setIsElectron(checkElectron());
  }, []);

  useEffect(() => {
    const path = location.pathname.split('/').slice(0, 2).join('/');
    if (path === '/login') {
      setShow(false);
    } else {
      setShow(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!show) {
    return null;
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setActiveDropdown(null);
  };

  const handleDropdownToggle = (dropdownName) => {
    setActiveDropdown((prev) => (prev === dropdownName ? null : dropdownName));
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  // ✅ Handle refresh action
  const handleRefresh = () => {
    setIsRefreshing(true);
    
    if (window.electron) {
      // If Electron API is available
      window.electron.reload();
    } else {
      // Fallback to window reload
      window.location.reload();
    }
    
    // Reset refreshing state after animation
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <>
      {/* Main Navbar */}
      <div
        style={{ zIndex: '999999999999999999999999999999' }}
        className="main-bg h-[50px] md:h-[45px] flex justify-between items-center px-2 md:pr-2 sticky top-0 w-full"
      >
        {/* Logo Section */}
        <div className="flex items-center flex-shrink-0">
          <Link to="/">
            <img
              src="https://i.ibb.co/gZgrXrYT/finac-splashlogo.png"
              className="w-[80px] sm:w-[90px] md:w-[140px] ml-5"
              alt="finac_splashlogo"
            />
          </Link>
        </div>

        {/* Desktop Navigation - Hidden on mobile */}
        <div className="hidden lg:flex items-center flex-1 justify-center max-w-md mx-4">
          <NavSearchBar />
        </div>

        {/* Desktop Right Side Items */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          <div className="hidden lg:block">
            <BranchDropdown
              isOpen={activeDropdown === 'branch'}
              onToggle={() => handleDropdownToggle('branch')}
              onClose={closeDropdown}
            />
          </div>

          {/* ✅ Refresh Button - Only in Electron */}
          {isElectron && (
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 text-white"
              title={t('navbar.refresh') || 'Refresh'}
              disabled={isRefreshing}
            >
              <RefreshCw 
                size={20} 
                className={`${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          )}

          {/* ✅ Theme Toggle Button */}
          <ThemeToggle />
          
          <LanguageDropdown
            isOpen={activeDropdown === 'language'}
            onToggle={() => handleDropdownToggle('language')}
          />

          {/* 🔔 Notification Bell */}
          <NotificationBell />

          <UserDropdown
            isOpen={activeDropdown === 'user'}
            onToggle={() => handleDropdownToggle('user')}
          />
        </div>

        {/* Mobile Menu Button - Only visible on mobile */}
        <div className="md:hidden flex items-center gap-1">
          {/* ✅ Refresh Button for Mobile - Only in Electron */}
          {isElectron && (
            <button
              onClick={handleRefresh}
              className="p-1 text-white"
              aria-label="Refresh"
              disabled={isRefreshing}
            >
              <RefreshCw 
                size={20} 
                className={`${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          )}

          {/* 🔔 Notification Bell for Mobile */}
          <NotificationBell />

          <button
            onClick={toggleMobileMenu}
            className="text-white p-1"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-[#00000075] z-[9999999999998]"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="main-bg w-full max-w-sm ml-auto h-full shadow-lg transform transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Menu Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-600">
              <h3 className="text-white font-semibold">Menu</h3>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Menu Content */}
            <div className="p-4 space-y-4">
              {/* User Profile */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-600">
                <div className="w-[40px] h-[40px] overflow-hidden rounded-full flex-shrink-0">
                  {user?.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt={user?.userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                      <User className="text-white w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="text-white">
                  <div className="font-medium">{user?.userName}</div>
                  <div className="text-sm text-gray-300">View Profile</div>
                </div>
              </div>

              {/* Search Bar for Mobile */}
              <div className="pb-4">
                <NavSearchBar />
              </div>

              {/* Branch Dropdown for Mobile */}
              <div className="flex items-center">
                <div className="pb-4">
                  <BranchDropdown
                    isOpen={activeDropdown === 'branch'}
                    onToggle={() => handleDropdownToggle('branch')}
                    onClose={closeDropdown}
                  />
                </div>
                {/* Language Dropdown for Mobile */}
                <div className="pb-4">
                  <LanguageDropdown
                    isOpen={activeDropdown === 'language'}
                    onToggle={() => handleDropdownToggle('language')}
                  />
                </div>
              </div>

              {/* ✅ Theme Toggle for Mobile */}
              <div className="pb-4 flex items-center justify-between border-b border-gray-600">
                <span className="text-white text-sm font-medium">
                  {t('theme.label') || 'Theme'}
                </span>
                <ThemeToggle />
              </div>

              {/* ✅ Refresh Button for Mobile Menu - Only in Electron */}
              {isElectron && (
                <div className="pb-4">
                  <button
                    onClick={handleRefresh}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors duration-200 text-white"
                    disabled={isRefreshing}
                  >
                    <RefreshCw 
                      size={20} 
                      className={`${isRefreshing ? 'animate-spin' : ''}`}
                    />
                    <span>{t('navbar.refresh') || 'Refresh App'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;