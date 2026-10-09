import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import { iconMap, getFilteredMenuData } from '../../../public/assets/js/menuData';
import { setQuickAccessAvailable } from '../../lib/hooks/useQuickAccessAvailable';
import { useLocation } from 'react-router-dom';

// ============================================
// Helper: flatten the (already privilege-filtered) menu tree
// into a flat lookup of { labelEn -> { url, icon, svgLogo, labelEn, labelAr } }
// Only leaf items (items with a url) are kept — group headers / parents
// with children are skipped since they aren't directly navigable.
// ============================================
const flattenMenuItems = (menuItems = []) => {
    const flat = [];

    const walk = (items) => {
        items.forEach((item) => {
            if (!item || item.isGroupHeader) return;

            if (item.url) {
                flat.push({
                    id: item.id,
                    labelEn: item.labelEn,
                    labelAr: item.labelAr,
                    icon: item.icon,
                    svgLogo: item.svgLogo,
                    url: item.url,
                });
            }

            if (item.children && item.children.length > 0) {
                walk(item.children);
            }
        });
    };

    walk(menuItems);
    return flat;
};

const normalize = (str = '') => str.trim().toLowerCase();

// Max number of quick-access items shown in a single vertical column
// before overflow starts a new column.
const MAX_ITEMS_PER_COLUMN = 7;

// -------- Helper: does this quick-access entry belong to the given usergroup? --------
// Matches on UserGroups[].usergroupId === userGroupId AND activeStatus is truthy (1 or true).
const isAllowedForUserGroup = (qaItem, userGroupId) => {
    if (userGroupId === undefined || userGroupId === null) return false;
    if (!Array.isArray(qaItem.UserGroups)) return false;

    return qaItem.UserGroups.some((ug) => {
        const sameGroup = Number(ug.usergroupId) === Number(userGroupId);
        const isActive = ug.activeStatus === 1 || ug.activeStatus === true || ug.activeStatus === '1';
        return sameGroup && isActive;
    });
};

const QuickAccessMenu = () => {
    const { selectedBranchId, user } = useAuth();
    const userGroupId = user?.UserRoleId;
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const location = useLocation();
    const currentLang = i18n.language;
    const isLoginRoute = location.pathname.includes('login');

    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [quickAccessItems, setQuickAccessItems] = useState([]); // raw API response (Status===true only)
    const [privilegedFlatMenu, setPrivilegedFlatMenu] = useState([]); // flattened, privilege-filtered menu

    const containerRef = useRef(null);
    const fabRef = useRef(null);

    // -------- Fetch quick access list (Status flags per window) --------
    const fetchQuickAccess = useCallback(async () => {
        if (!selectedBranchId) return;
        setLoading(true);
        try {
            const response = await axiosInstance.get(`get-all-quickaccess/${selectedBranchId}`);
            const data = response?.data?.data || [];
            setQuickAccessItems(data.filter((item) => item.Status === true || item.Status === 'true'));
        } catch (error) {
            console.error('Error fetching quick access data:', error);
            setQuickAccessItems([]);
        } finally {
            setLoading(false);
        }
    }, [selectedBranchId]);

    // -------- Fetch privilege-filtered menu (reuses sidebar's own logic) --------
    const fetchPrivilegedMenu = useCallback(async () => {
        try {
            const filteredMenuData = await getFilteredMenuData();
            setPrivilegedFlatMenu(flattenMenuItems(filteredMenuData?.menuItems || []));
        } catch (error) {
            console.error('Error fetching privileged menu for quick access:', error);
            setPrivilegedFlatMenu([]);
        }
    }, []);

    useEffect(() => {
        fetchQuickAccess();
        fetchPrivilegedMenu();
    }, [fetchQuickAccess, fetchPrivilegedMenu]);

    // -------- Cross reference: quick-access ON + privilege-allowed + user's usergroup allowed --------
    const visibleItems = useMemo(() => {
        if (quickAccessItems.length === 0 || privilegedFlatMenu.length === 0) return [];

        const menuByLabel = new Map(
            privilegedFlatMenu.map((m) => [normalize(m.labelEn), m])
        );

        return quickAccessItems
            .map((qa) => {
                // Must be assigned to the logged-in user's usergroup and active
                if (!isAllowedForUserGroup(qa, userGroupId)) return null;

                const match = menuByLabel.get(normalize(qa.WindowName));
                if (!match) return null;

                return {
                    id: qa.Id,
                    windowName: qa.WindowName,
                    url: match.url,
                    icon: match.icon,
                    svgLogo: match.svgLogo,
                    labelEn: match.labelEn,
                    labelAr: match.labelAr,
                };
            })
            .filter(Boolean);
    }, [quickAccessItems, privilegedFlatMenu, userGroupId]);

    // -------- Report availability so other floating buttons (e.g. Help) can
    // reposition themselves into this button's spot when it isn't rendered --------
    useEffect(() => {
        // Only report once loading has settled, so we don't briefly report
        // "unavailable" while data is still being fetched.
        if (loading) return;
        setQuickAccessAvailable(visibleItems.length > 0);
    }, [loading, visibleItems]);

    // If this component unmounts entirely (e.g. on the login route), make sure
    // dependents know the spot is free.
    useEffect(() => {
        return () => setQuickAccessAvailable(false);
    }, []);

    // -------- Chunk visible items into columns of MAX_ITEMS_PER_COLUMN --------
    const itemColumns = useMemo(() => {
        const chunks = [];
        for (let i = 0; i < visibleItems.length; i += MAX_ITEMS_PER_COLUMN) {
            chunks.push(visibleItems.slice(i, i + MAX_ITEMS_PER_COLUMN));
        }
        return chunks;
    }, [visibleItems]);

    const getLabel = useCallback(
        (item) => (currentLang === 'ar' ? item.labelAr || item.windowName : item.labelEn || item.windowName),
        [currentLang]
    );

    // Renders the svgLogo (preferred) with a fallback to the lucide icon from iconMap.
    // svgLogo may be a raw svg markup string OR an already-valid react node/component.
    const renderMenuIcon = useCallback((item) => {
        if (item.svgLogo) {
            if (typeof item.svgLogo === 'string') {
                return (
                    <span
                        className="w-10 h-10 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full"
                        dangerouslySetInnerHTML={{ __html: item.svgLogo }}
                    />
                );
            }
            const SvgComp = item.svgLogo;
            return (
                <span className="w-10 h-10 flex items-center justify-center">
                    {typeof SvgComp === 'function' ? <SvgComp /> : SvgComp}
                </span>
            );
        }

        const IconComponent = iconMap[item.icon];
        return IconComponent ? (
            <IconComponent size={29} className="flex-shrink-0" />
        ) : null;
    }, []);

    // -------- Open / close handlers --------
    const toggleDrawer = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    const closeDrawer = useCallback(() => setIsOpen(false), []);

    const handleItemClick = useCallback(
        (item) => {
            if (item.url) {
                navigate(item.url);
            }
            closeDrawer();
        },
        [navigate, closeDrawer]
    );

    // -------- Close on outside click --------
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!isOpen) return;
            const clickedInsideContainer = containerRef.current && containerRef.current.contains(event.target);
            const clickedInsideFab = fabRef.current && fabRef.current.contains(event.target);
            if (!clickedInsideContainer && !clickedInsideFab) {
                closeDrawer();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, closeDrawer]);

    // -------- Close on Escape --------
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') closeDrawer();
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [closeDrawer]);

    if (isLoginRoute || !user) {
        return null;
    }
    return (
        <>
            <style>{`
        @keyframes qaRowAppear {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .qa-row-anim {
          animation: qaRowAppear 0.22s cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        .qa-fab-icon {
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

            {isOpen && (
                <div
                    ref={containerRef}
                    className="fixed bottom-24 right-6 z-[99998] flex flex-row-reverse items-end gap-4 bg-transparent"
                >
                    {loading ? (
                        <span className="text-xs font-medium text-gray-600 drop-shadow whitespace-nowrap">
                            {currentLang === 'ar' ? 'جار التحميل...' : 'Loading...'}
                        </span>
                    ) : visibleItems.length === 0 ? (
                        <span className="text-xs font-medium text-gray-600 drop-shadow whitespace-nowrap">
                            {currentLang === 'ar' ? 'لا توجد عناصر' : 'No quick access items'}
                        </span>
                    ) : (
                        itemColumns.map((column, colIndex) => (
                            <div
                                key={colIndex}
                                className="flex flex-col-reverse items-center gap-4 w-14"
                            >
                                {column.map((item, index) => {
                                    const globalIndex = colIndex * MAX_ITEMS_PER_COLUMN + index;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleItemClick(item)}
                                            style={{ animationDelay: `${globalIndex * 45}ms` }}
                                            className="qa-row-anim w-14 flex flex-col items-center gap-1 bg-transparent cursor-pointer focus:outline-none group"
                                        >
                                            <span className="w-14 flex items-center justify-center text-[#2b216a] group-hover:scale-110 transition-transform duration-150 drop-shadow-md">
                                                {renderMenuIcon(item)}
                                            </span>
                                            <span className="w-full text-[11px] font-semibold text-gray-800 drop-shadow-sm leading-tight text-center">
                                                {getLabel(item)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            )}

            {visibleItems.length > 0 && (
                <button
                    ref={fabRef}
                    onClick={toggleDrawer}
                    aria-label={isOpen ? 'Close quick access menu' : 'Open quick access menu'}
                    className={`fixed bottom-6 right-6 z-[99999]
      w-12 h-12 rounded-full border
      flex items-center justify-center
      transition-colors duration-200
      group
      ${isOpen ? 'bg-[#652d5c]' : 'bg-[#652d5c7f] hover:bg-[#652d5c]'}
    `}
                >
                    <span
                        className={`qa-fab-icon ${isOpen ? 'text-white' : 'text-black'} group-hover:text-white transition-colors duration-200 flex items-center justify-center`}
                        style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
                    >
                        <Plus size={26} />
                    </span>
                </button>
            )}
        </>
    );
};

export default QuickAccessMenu;