import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, User, Settings, LogOut, Calendar, X, Download, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuth from "@/redux/hook/auth/useAuth";
import axiosInstance from '@/lib/axiosConfig';
import { clearMenuData } from '../../../public/assets/js/menuData';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { formatDate } from '@/lib/dateFormat';
import { logout as logoutAction } from '@/redux/slice/auth/authSlice';

// ✅ Check if running in Electron
const isElectron = !!(window.electronAPI || window.electron || (typeof process !== 'undefined' && process.versions && process.versions.electron));

// ✅ Conditionally import useAppUpdate only for Electron
let useAppUpdate = null;
if (isElectron) {
    try {
        useAppUpdate = require('@/hooks/useAppUpdate').default;
    } catch (e) {
        console.error('useAppUpdate not available');
    }
}

const UserDropdown = ({ isOpen, onToggle }) => {
    const dropdownRef = useRef(null);
    const { user, currentFinancialYear } = useAuth();
    const { generalSettings } = useSelector((state) => state.settings);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useDispatch();

    // ✅ Only use update hook in Electron
    const updateState = isElectron && useAppUpdate ? useAppUpdate() : {
        updateAvailable: false,
        downloaded: false,
        updateInfo: null,
        installUpdate: () => {}
    };
    
    const { updateAvailable, downloaded, updateInfo, installUpdate } = updateState;

    const handleLogout = async () => {
        if (onToggle) onToggle();

        const result = await Swal.fire({
            title: t("logout.title"),
            text: "",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: t("logout.confirmButtonText"),
            cancelButtonText: t("logout.cancelButtonText"),
        });

        if (!result.isConfirmed) return;

        Swal.fire({
            title: t("loadingText") || "Logging out...",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            await axiosInstance.post('logout');
        } catch (error) {
            console.error('Logout API error:', error);
        }

        dispatch(logoutAction());
        // localStorage.clear();
        // sessionStorage.clear();
        clearMenuData();
        
        Swal.close();

        window.location.href = window.location.origin + window.location.pathname + '#/login';
    };

    const handleMenuItemClick = (action) => {
        if (onToggle) onToggle();
        if (action) action();
    };

    const handleDropdownClick = (e) => {
        e.stopPropagation();
    };

    // ✅ Handle update click (only works in Electron)
    const handleUpdateClick = () => {
        if (!isElectron) return;
        
        if (onToggle) onToggle();
        if (downloaded) {
            installUpdate();
        } else {
            navigate('/update');
        }
    };

    const menuItems = [
        {
            icon: User,
            label: 'Account',
            action: () => navigate('/account')
        },
        {
            icon: LogOut,
            label: 'Log Out',
            action: handleLogout,
            className: 'text-red-600 hover:text-red-700 hover:bg-red-50'
        }
    ];

    return (
        <>
            <style>{`
                /* Dropdown animations */
                @keyframes dropdownSlideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                        visibility: hidden;
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                        visibility: visible;
                    }
                }

                @keyframes dropdownSlideUp {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-10px);
                        visibility: hidden;
                    }
                }

                @keyframes chevronRotate {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(180deg);
                    }
                }

                @keyframes chevronRotateBack {
                    from {
                        transform: rotate(180deg);
                    }
                    to {
                        transform: rotate(0deg);
                    }
                }

                @keyframes profilePulse {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.05);
                    }
                }

                /* Animation classes */
                .dropdown-enter {
                    animation: dropdownSlideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }

                .dropdown-exit {
                    animation: dropdownSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }

                .chevron-enter {
                    animation: chevronRotate 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }

                .chevron-exit {
                    animation: chevronRotateBack 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }

                .profile-hover:hover {
                    animation: profilePulse 0.4s ease-in-out;
                }

                /* Smooth transitions for menu items */
                .menu-item-enter {
                    animation: menuItemSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }

                @keyframes menuItemSlideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                /* Smooth scale animation */
                .dropdown-scale-enter {
                    animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }

                .dropdown-scale-exit {
                    animation: scaleOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }

                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }

                @keyframes scaleOut {
                    from {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: scale(0.95) translateY(-10px);
                    }
                }

                /* Staggered animation for menu items */
                .menu-item {
                    animation: menuItemSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) backwards;
                }

                .menu-item:nth-child(1) { animation-delay: 0ms; }
                .menu-item:nth-child(2) { animation-delay: 50ms; }
                .menu-item:nth-child(3) { animation-delay: 100ms; }
            `}</style>

            <div className="relative z-50 cursor-pointer" ref={dropdownRef}>
                <div
                    className="flex gap-2 items-center transition-all duration-200"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onToggle) onToggle();
                    }}
                >
                    {/* Profile with Red Dot */}
                    <div className="relative">
                        <div className="w-[30px] h-[30px] overflow-hidden rounded-full flex-shrink-0 profile-hover">
                            {user?.profilePhoto ? (
                                <img
                                    src={user.profilePhoto}
                                    alt={user?.userName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                                    <User className='text-white w-4 h-4' />
                                </div>
                            )}
                        </div>
                        
                        {/* ✅ Red Dot - Shows when update available (Electron only) */}
                        {isElectron && updateAvailable && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                        )}
                    </div>
                    
                    <ChevronDown
                        className={`text-white w-4 h-4 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>

                {/* Dropdown Drawer */}
                {isOpen && (
                    <div
                        className={`absolute top-full right-0 mt-2 w-70 bg-white border border-gray-200 rounded-xl shadow-2xl dropdown-scale-enter`}
                        onClick={handleDropdownClick}
                    >
                        {/* User Profile Section */}
                        <div className="p-4 border-b border-gray-100 relative">
                            <div className='flex justify-end text-gray-400 mb-3'>
                                <X 
                                    onClick={() => {
                                        if (onToggle) onToggle();
                                    }} 
                                    className="cursor-pointer hover:text-gray-600 transition-colors duration-200" 
                                />
                            </div>
                            <div className="flex flex-col justify-center items-center space-x-3 mb-3">
                                <div className="w-12 h-12 overflow-hidden rounded-full flex-shrink-0 block mx-auto profile-hover">
                                    {user?.profilePhoto ? (
                                        <img
                                            src={user.profilePhoto}
                                            alt={user?.userName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                                            <User className='text-white w-6 h-6' />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800 truncate">
                                        Hello, {user?.userName}
                                    </h3>
                                </div>
                            </div>

                            {/* Financial Year Section */}
                            {currentFinancialYear && (
                                <div className="bg-blue-50 rounded-lg p-3 transition-all duration-300 hover:bg-blue-100">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Calendar className="w-4 h-4 text-blue-600 transition-transform duration-300" />
                                        <span className="text-sm font-medium text-blue-800">Current Financial Year</span>
                                    </div>
                                    <div className="text-xs text-blue-700">
                                        <div className="flex justify-between items-center">
                                            <span>
                                                From: {formatDate(currentFinancialYear.fromDate, generalSettings.dateformat)}
                                            </span>
                                            <span>
                                                To: {formatDate(currentFinancialYear.toDate, generalSettings.dateformat)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ✅ Update Button - Shows when update available (Electron only) */}
                        {isElectron && updateAvailable && (
                            <div className="px-2 py-2 border-b border-gray-100 menu-item">
                                <button
                                    onClick={handleUpdateClick}
                                    className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:shadow-md"
                                >
                                    <div className="flex items-center gap-2">
                                        {downloaded ? (
                                            <RefreshCw className="w-4 h-4 text-green-600 transition-transform duration-300 group-hover:rotate-180" />
                                        ) : (
                                            <Download className="w-4 h-4 text-blue-600 transition-transform duration-300" />
                                        )}
                                        <span className="text-sm font-medium text-gray-700">
                                            {downloaded ? 'Restart to Update' : 'Update Available'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-blue-600 font-medium">
                                            v{updateInfo?.version}
                                        </span>
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Menu Items */}
                        <div className="py-2">
                            {menuItems.map((item, index) => {
                                const IconComponent = item.icon;
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleMenuItemClick(item.action)}
                                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-all duration-150 menu-item ${item.className || 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                    >
                                        <IconComponent className="w-4 h-4 flex-shrink-0 transition-transform duration-300" />
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default UserDropdown;