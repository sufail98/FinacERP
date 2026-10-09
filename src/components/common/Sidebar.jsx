import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { selectedLang } from '@/lib/LanguageHelper';
import { clearMenuData, iconMap, getFilteredMenuData } from '../../../public/assets/js/menuData';
import axiosInstance from '@/lib/axiosConfig';
import Swal from 'sweetalert2';
import { useTranslation } from "react-i18next";
import { selectCurrentBranchMainDb } from '@/redux/selectors/authSelectors';
import { useSelector } from 'react-redux';
import { SidebarLoadingPlaceholder } from './SidebarPlaceHolder';
import { Tooltip } from '@mui/material';
import useAppUpdate from '@/hooks/useAppUpdate';
import { useSidebar } from '@/contexts/SidebarContext';
import CreateFinancialYear from '../pages/Master/multiMasterForms/FinancialYear/CreateFinancialYear';
import useAuth from '@/redux/hook/auth/useAuth';

// ============================================
// COMPACT MEGA MENU ITEM (for multi-column layout)
// darkBg=true  → mobile sidebar (dark bg, light text)
// darkBg=false → desktop panel  (light bg, dark text)
// ============================================
const MegaMenuItemCompact = memo(({
  item,
  currentLang,
  onItemClick,
  getLabel,
  renderIcon,
  activeItem,
  darkBg = false   // ← NEW prop
}) => {
  const isActive = activeItem === item.id;
  const hasChildren = item.children && item.children.length > 0 &&
    item.children.some(c => !c.isGroupHeader);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasChildren) {
      setIsExpanded(prev => !prev);
    } else {
      onItemClick(item);
    }
  }, [hasChildren, item, onItemClick]);

  // Colours vary by background context
  const rowCls = isActive
    ? 'bg-[#6e2e66] text-white'
    : darkBg
      ? 'text-gray-200 hover:bg-[#6e2e66] hover:text-white'   // dark sidebar
      : 'text-[#000000] hover:bg-[#652d5c] hover:text-white'; // light panel

  const iconCls = isActive
    ? 'text-white'
    : darkBg
      ? 'text-gray-400 group-hover:text-white'
      : 'text-black group-hover:text-gray-300';

  const textCls = isActive
    ? 'text-white'
    : darkBg
      ? 'text-gray-200 group-hover:text-white'
      : 'text-black';

  const chevronCls = darkBg ? 'text-gray-500' : 'text-gray-500';
  const borderCls = darkBg ? 'border-gray-600/50' : 'border-gray-300/50';

  return (
    <div>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={handleClick}
        className={`ml-4 flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all duration-150 group ${rowCls}`}
      >
        <div className={`flex-shrink-0 transition-colors duration-150 ${iconCls}`}>
          {renderIcon(item.icon)}
        </div>
        <span className={`text-sm flex gap-2 items-end font-medium truncate flex-1 ${textCls}`} title={getLabel(item)}>
          {getLabel(item)}
          {item.shortKey && (
            <span className="text-[11px] text-orange-400 px-1 py-0.5 rounded flex-shrink-0 hidden lg:inline">
              {item.shortKey}
            </span>
          )}
        </span>

        {hasChildren && (
          <ChevronRight
            size={12}
            className={`${chevronCls} transition-transform duration-150 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
          />
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className={`ml-3 mt-0.5 pl-2 border-l ${borderCls}`}>
          {item.children
            .filter(c => !c.isGroupHeader)
            .map((child) => (
              <MegaMenuItemCompact
                key={child.id}
                item={child}
                currentLang={currentLang}
                onItemClick={onItemClick}
                getLabel={getLabel}
                renderIcon={renderIcon}
                activeItem={activeItem}
                darkBg={darkBg}   // ← pass down
              />
            ))}
        </div>
      )}
    </div>
  );
});

MegaMenuItemCompact.displayName = 'MegaMenuItemCompact';

// ============================================
// MEGA MENU FLOATING PANEL
// ============================================
const MegaMenuPanel = memo(({
  item,
  isVisible,
  currentLang,
  onItemClick,
  getLabel,
  renderIcon,
  activeItem,
  panelPosition,
  panelRef
}) => {
  if (!isVisible || !item) return null;

  const hasChildren = item.children && item.children.length > 0;
  if (!hasChildren) return null;

  const groupHeaders = item.children.filter(child => child.isGroupHeader);
  const hasCategories = groupHeaders.length > 0;

  const getCategoryItems = (categoryId) => {
    return item.children.filter(child =>
      !child.isGroupHeader && child.group === categoryId
    );
  };

  const ungroupedItems = item.children.filter(child =>
    !child.isGroupHeader && !child.group
  );

  const columnWidth = 190;

  const panelWidth = hasCategories ? window.innerWidth * 0.7 : 280;

  return (
    <div
      ref={panelRef}
      className="fixed z-[10000] sidebar-secondary-bg shadow-2xl flex flex-col"
      style={{
        left: currentLang === 'ar' ? 'auto' : `${panelPosition.left}px`,
        right: currentLang === 'ar' ? `${panelPosition.left}px` : 'auto',
        top: '45px',
        height: 'calc(100vh - 45px)',
        width: `${panelWidth}px`,
        minWidth: `70vw`,
        animation: 'megaMenuSlideIn 0.2s ease-out forwards'
      }}
    >
      {hasCategories ? (
        <div className="p-3 overflow-y-auto custom-scrollbar" style={{ height: '100%' }}>
          <div
            className="flex flex-wrap gap-15"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2.5rem'
            }}
          >
            {groupHeaders.map((group) => {
              const categoryId = group.id.replace('-group', '');
              const categoryItems = getCategoryItems(categoryId);

              if (categoryItems.length === 0) return null;

              return (
                <div key={group.id}>
                  <div className="py-1 mb-1 border-b border-[#000000] w-[80%]">
                    <h4 className="text-[18px] font-bold text-[#291426] tracking-wide truncate flex items-center gap-2">
                      {group.icon && (
                        <span className="text-[#291426]">
                          {renderIcon(group.icon)}
                        </span>
                      )}
                      {getLabel(group)}
                    </h4>
                  </div>

                  <div className="space-y-0.5">
                    {categoryItems.map((child) => (
                      <MegaMenuItemCompact
                        key={child.id}
                        item={child}
                        currentLang={currentLang}
                        onItemClick={onItemClick}
                        getLabel={getLabel}
                        renderIcon={renderIcon}
                        activeItem={activeItem}
                        darkBg={false}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {ungroupedItems.length > 0 && (
            <>
              <div className="border-t border-gray-700/50 my-3" />
              <div className="flex gap-2 flex-wrap">
                {ungroupedItems.map((child) => (
                  <div key={child.id} style={{ width: `${columnWidth}px` }} className="flex-shrink-0">
                    <MegaMenuItemCompact
                      item={child}
                      currentLang={currentLang}
                      onItemClick={onItemClick}
                      getLabel={getLabel}
                      renderIcon={renderIcon}
                      activeItem={activeItem}
                      darkBg={false}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="p-2 overflow-y-auto custom-scrollbar" style={{ height: '100%' }}>
          <div className="grid grid-cols-1 gap-0.5">
            {item.children.filter(c => !c.isGroupHeader).map((child) => (
              <MegaMenuItemCompact
                key={child.id}
                item={child}
                currentLang={currentLang}
                onItemClick={onItemClick}
                getLabel={getLabel}
                renderIcon={renderIcon}
                activeItem={activeItem}
                darkBg={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

MegaMenuPanel.displayName = 'MegaMenuPanel';

// ============================================
// SIDEBAR MENU ITEM (main nav items)
// ============================================
const SidebarMenuItem = memo(({
  item,
  activeItem,
  isCollapsed,
  currentLang,
  onMenuClick,
  onHoverEnter,
  onHoverLeave,
  getLabel,
  renderIcon,
  isHovered,
  isMobile = false
}) => {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = activeItem === item.id;
  const isLogout = item.id === 'logout';

  // ← FIX: local state to track mobile accordion open/closed
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const hasActiveChild = item.children && item.children.some(child =>
    activeItem === child?.id ||
    (child?.children && child?.children?.some(grandchild => activeItem === grandchild.id))
  );

  const getTooltipTitle = () => {
    const label = getLabel(item);
    const shortKey = item.shortKey;
    if (shortKey && isCollapsed) {
      return (
        <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
          <div style={{ fontWeight: 600 }}>{label}</div>
          <div style={{ opacity: 0.8, marginTop: '2px' }}>({shortKey})</div>
        </div>
      );
    }
    return isCollapsed ? label : '';
  };

  const handleMouseEnter = useCallback((e) => {
    if (!isMobile && onHoverEnter) {
      onHoverEnter(item, e);
    }
  }, [isMobile, onHoverEnter, item]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile && onHoverLeave) {
      onHoverLeave();
    }
  }, [isMobile, onHoverLeave]);

  // ← FIX: unified click handler — mobile with children toggles accordion,
  //         everything else delegates to onMenuClick as before
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (isMobile && hasChildren) {
      setMobileExpanded(prev => !prev);
    } else {
      onMenuClick(item);
    }
  }, [isMobile, hasChildren, onMenuClick, item]);

  const menuItemContent = (
    <li
      className="w-full relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`flex items-center w-full px-3 cursor-pointer transition-all duration-200
          ${isCollapsed && !isMobile ? 'justify-center py-[10px]' : 'justify-between py-[8px]'}
          ${isLogout
            ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300'
            : isActive
              ? 'bg-[#6e2e66] text-white'
              : isHovered
                ? 'bg-[#6e2e66] text-white'
                : hasActiveChild
                  ? 'bg-[#6e2e66] text-gray-200'
                  : 'text-gray-300 hover:bg-[#210f1e] hover:text-white'
          }`}
        onClick={handleClick}
      >
        <div className={`flex items-center gap-2 
          ${isCollapsed && !isMobile ? 'justify-center' : ''} 
          ${currentLang === 'ar' ? 'flex-row-reverse' : ''}`}
        >
          <div className={`transition-colors duration-200 flex items-center justify-center flex-shrink-0
            ${isLogout ? 'text-red-400'
              : isActive ? 'text-white'
                : hasActiveChild ? 'text-gray-200'
                  : 'text-gray-400'
            }`}>
            {renderIcon(item.icon)}
          </div>

          {(!isCollapsed || isMobile) && (
            <span className={`text-sm font-medium transition-colors duration-200 whitespace-nowrap
              ${isLogout ? 'text-red-400 font-semibold'
                : isActive ? 'text-white font-semibold'
                  : hasActiveChild ? 'text-gray-200'
                    : 'text-gray-300'
              }`}>
              {getLabel(item)}
            </span>
          )}
        </div>

        {hasChildren && (!isCollapsed || isMobile) && (
          <div className={`flex-shrink-0 ${currentLang === 'ar' ? 'mr-2' : 'ml-2'}`}>
            <ChevronRight
              size={16}
              className={`transition-all duration-300 ease-in-out text-gray-500
                ${isMobile
                  ? mobileExpanded ? 'rotate-90' : ''
                  : isHovered ? 'translate-x-1 text-gray-300' : ''
                }
                ${currentLang === 'ar' ? 'rotate-180' : ''}`}
            />
          </div>
        )}

        {hasChildren && isCollapsed && !isMobile && (
          <div className={`absolute ${currentLang === 'ar' ? 'left-1' : 'right-1'} 
            top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full 
            ${isHovered ? 'bg-[#8b5cf6]' : 'bg-gray-600'}
            transition-colors duration-200`}
          />
        )}
      </div>

      {isMobile && hasChildren && mobileExpanded && (
        <div className="ml-2 border-l border-gray-600/50 pl-1 pb-1 animate-slide-down">
          {item.children
            .filter(c => !c.isGroupHeader)
            .map((child) => (
              <MegaMenuItemCompact
                key={child.id}
                item={child}
                currentLang={currentLang}
                onItemClick={onMenuClick}
                getLabel={getLabel}
                renderIcon={renderIcon}
                activeItem={activeItem}
                darkBg={true}
              />
            ))}
        </div>
      )}
    </li>
  );

  if (isCollapsed && !isMobile && !hasChildren) {
    return (
      <Tooltip
        key={item.id}
        title={getTooltipTitle()}
        placement={currentLang === 'ar' ? 'left' : 'right'}
        arrow
        enterDelay={100}
        leaveDelay={0}
        PopperProps={{
          modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
        }}
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: isLogout ? '#dc2626' : '#1f2937',
              color: 'white',
              fontSize: '12px',
              fontWeight: 500,
              padding: '8px 12px',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              '& .MuiTooltip-arrow': { color: isLogout ? '#dc2626' : '#1f2937' },
            },
          },
        }}
      >
        {menuItemContent}
      </Tooltip>
    );
  }

  return menuItemContent;
});

SidebarMenuItem.displayName = 'SidebarMenuItem';

// ============================================
// MAIN SIDEBAR COMPONENT
// ============================================
const Sidebar = () => {
  const {
    isCollapsed,
    isMobileOpen,
    openMenus,
    openGroups,
    activeItem,
    toggleSidebar,
    toggleMobileMenu,
    closeMobileMenu,
    toggleMenu,
    toggleGroup,
    collapseSidebar,
    expandSidebar,
    expandWithMenu,
    setActiveMenuItem,
  } = useSidebar();

  const [menuData, setMenuData] = useState({ menuItems: [] });
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });

  const hoverTimeoutRef = useRef(null);
  const leaveTimeoutRef = useRef(null);

  const sidebarHoverTimeoutRef = useRef(null);
  const isMouseOverSidebarRef = useRef(false);
  const isMouseOverPanelRef = useRef(false);

  const { generalSettings } = useSelector(state => state.settings);
  const { saleSettings, financeSettings } = useSelector(state => state.settings);

  const [addFinancialYearOpen, setAddFinancialYearOpen] = useState(false);
  const [editFinancialYearOpen, setEditFinancialYearOpen] = useState(false);
  const { currentFinancialYear } = useAuth();
  const hasFetched = useRef(false);
  const sidebarRef = useRef(null);
  const megaPanelRef = useRef(null);
  const burgerButtonRef = useRef(null);
  const navRef = useRef(null);

  const mainDb = useSelector(selectCurrentBranchMainDb);
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;

  const navigate = useNavigate();
  const location = useLocation();

  const { currentVersion, isElectron } = useAppUpdate();

  const sidebarWidth = isCollapsed ? 50 : 220;

  const checkAndCollapse = useCallback(() => {
    setTimeout(() => {
      if (!isMouseOverSidebarRef.current && !isMouseOverPanelRef.current) {
        collapseSidebar();
        setHoveredItem(null);
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
      }
    }, 250);
  }, [collapseSidebar]);

  const handleMenuHover = useCallback((item, event) => {
    if (isCollapsed) return;

    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    if (item.children && item.children.length > 0) {
      const target = event?.currentTarget;
      if (target) {
        setPanelPosition({
          top: 0,
          left: 220,
        });
      }

      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredItem(item);
      }, 80);
    } else {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setHoveredItem(null);
    }
  }, [isCollapsed]);

  const handleMenuLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    leaveTimeoutRef.current = setTimeout(() => {
      if (!isMouseOverPanelRef.current) {
        setHoveredItem(null);
      }
    }, 200);
  }, []);

  const handlePanelMouseEnter = useCallback(() => {
    isMouseOverPanelRef.current = true;
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  }, []);

  const handlePanelMouseLeave = useCallback(() => {
    isMouseOverPanelRef.current = false;
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 200);
    checkAndCollapse();
  }, [checkAndCollapse]);

  const findActiveItemWithParents = useCallback((items, currentPath) => {
    const result = {
      activeId: null,
      parentMenus: new Set(),
      parentGroups: new Set()
    };

    const searchInItems = (items, parentChain = []) => {
      for (const item of items) {
        if (item.url === currentPath) {
          result.activeId = item.id;
          parentChain.forEach(parentId => result.parentMenus.add(parentId));
          return true;
        }

        if (item.children && item.children.length > 0) {
          for (const child of item.children) {
            if (child.isGroupHeader) continue;

            if (child.url === currentPath) {
              result.activeId = child.id;
              result.parentMenus.add(item.id);
              if (child.group) {
                result.parentGroups.add(`${child.group}-group`);
              }
              return true;
            }

            if (child.children && child.children.length > 0) {
              const newParentChain = [...parentChain, item.id];
              if (child.group) {
                result.parentGroups.add(`${child.group}-group`);
              }
              if (searchInItems([{ ...child, children: child.children }], newParentChain)) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };

    searchInItems(items);
    return result;
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (window.innerWidth >= 768) {
      isMouseOverSidebarRef.current = true;

      if (sidebarHoverTimeoutRef.current) {
        clearTimeout(sidebarHoverTimeoutRef.current);
      }

      sidebarHoverTimeoutRef.current = setTimeout(() => {
        if (isMouseOverSidebarRef.current) {
          expandSidebar();
        }
      }, 200);
    }
  }, [expandSidebar]);

  const handleMouseLeave = useCallback(() => {
    if (window.innerWidth >= 768) {
      isMouseOverSidebarRef.current = false;

      if (sidebarHoverTimeoutRef.current) {
        clearTimeout(sidebarHoverTimeoutRef.current);
        sidebarHoverTimeoutRef.current = null;
      }

      checkAndCollapse();
    }
  }, [checkAndCollapse]);

  useEffect(() => {
    return () => {
      if (sidebarHoverTimeoutRef.current) {
        clearTimeout(sidebarHoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (window.innerWidth >= 768 && !isCollapsed) {
        const clickedInsideSidebar = sidebarRef.current && sidebarRef.current.contains(event.target);
        const clickedInsideBurger = burgerButtonRef.current && burgerButtonRef.current.contains(event.target);
        const clickedInsidePanel = megaPanelRef.current && megaPanelRef.current.contains(event.target);

        if (!clickedInsideSidebar && !clickedInsideBurger && !clickedInsidePanel) {
          collapseSidebar();
          setHoveredItem(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCollapsed, collapseSidebar]);

  const filterMenuBySetting = useCallback((menuData) => {
    if (!menuData || !menuData.menuItems) return { menuItems: [] };

    const filteredItems = menuData.menuItems.map(parentItem => {
      if (!parentItem.children) return parentItem;

      const filteredChildren = parentItem.children
        .filter(child => {
          if (child.isGroupHeader) return true;
          if (child.requiresSetting) {
            if (child.requiresSetting === 'ActiveGodown') {
              return saleSettings?.[child.requiresSetting] === true;
            }
            if (child.requiresSetting === 'multiCurrency') {
              return financeSettings?.[child.requiresSetting] === true;
            }
            return generalSettings?.[child.requiresSetting] === true;
          }
          return true;
        })
        .filter((child, index, array) => {
          if (!child.isGroupHeader) return true;
          const groupId = child.id.replace('-group', '');
          const hasVisibleItems = array.some(
            item => item.group === groupId && !item.isGroupHeader
          );
          return hasVisibleItems;
        });

      return { ...parentItem, children: filteredChildren };
    }).filter(item => {
      if (item.children) return item.children.length > 0;
      return true;
    });

    return { menuItems: filteredItems };
  }, [generalSettings, saleSettings]);

  useEffect(() => {
    if (!mainDb || hasFetched.current) return;
    hasFetched.current = true;

    const loadFilteredMenu = async () => {
      setIsLoadingMenu(true);
      try {
        const filteredMenuData = await getFilteredMenuData();

        const settingsFilteredMenu = filterMenuBySetting(filteredMenuData);
        setMenuData(settingsFilteredMenu);
      } catch (error) {
        console.error("Error loading filtered menu:", error);
        setMenuData({ menuItems: [] });
      } finally {
        setIsLoadingMenu(false);
      }
    };

    loadFilteredMenu();
  }, [mainDb, filterMenuBySetting]);

  useEffect(() => {
    if (!hasFetched.current) return;

    const reFilterMenu = async () => {
      try {
        const filteredMenuData = await getFilteredMenuData();
        const settingsFilteredMenu = filterMenuBySetting(filteredMenuData);
        setMenuData(settingsFilteredMenu);
      } catch (error) {
        console.error("Error re-filtering menu:", error);
      }
    };

    reFilterMenu();
  }, [generalSettings, filterMenuBySetting]);

  useEffect(() => {
    document.documentElement.setAttribute("dir", currentLang === "ar" ? "rtl" : "ltr");
  }, [currentLang]);

  useEffect(() => {
    closeMobileMenu();
    setHoveredItem(null);
  }, [location.pathname, closeMobileMenu]);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileOpen]);

  useEffect(() => {
    const completeMenu = [
      { id: "home", url: "/" },
      { id: "dashboard", url: "/dashboard" },
      ...(menuData.menuItems || [])
    ];

    const result = findActiveItemWithParents(completeMenu, location.pathname);
    setActiveMenuItem(result.activeId, result.parentMenus, result.parentGroups);
  }, [location.pathname, menuData.menuItems, findActiveItemWithParents, setActiveMenuItem]);

  const getLabel = useCallback((item) => {
    return currentLang === "ar" ? item.labelAr : item.labelEn;
  }, [currentLang]);

  const renderIcon = useCallback((iconName) => {
    if (!iconName) return null;
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent size={16} className="flex-shrink-0" /> : null;
  }, []);

  const handleLogout = useCallback(async () => {
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

    try {
      const response = await axiosInstance.post('logout');
      if (!response.data.error) {
        localStorage.clear();
        clearMenuData();
        navigate('/login', { replace: true });
      }
    } catch (error) {
      console.error('Error during logout:', error);
      localStorage.clear();
      clearMenuData();
      navigate('/login', { replace: true });
    }
  }, [t, navigate]);

  const CloseFinancialYear = async () => {
    try {
      axiosInstance.get(`toggle-financial-year-status/${currentFinancialYear.yearId}`);
    } catch (error) {
      console.error('Error during closing financial year:', error);
    }
  };

  const handleMenuItemClick = useCallback((item) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);

    if (item.id === 'logout') {
      handleLogout();
      closeMobileMenu();
      setHoveredItem(null);
      return;
    }

    if (item.id === 'financialYearNew') {
      setAddFinancialYearOpen(true);
      setHoveredItem(null);
      return;
    }
    if (item.id === 'financialYearEdit') {
      setEditFinancialYearOpen(true);
      setHoveredItem(null);
      return;
    }
    if (item.id === 'financialYearClose') {
      setHoveredItem(null);
      Swal.fire({
        title: 'Are you sure?',
        text: 'Closing the financial year cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Close it',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
      }).then((result) => {
        if (result.isConfirmed) {
          CloseFinancialYear();
        }
      });
      return;
    }

    const hasChildren = item.children && item.children.length > 0 &&
      item.children.some(c => !c.isGroupHeader);

    if (!hasChildren && item.url) {
      navigate(item.url);
      setHoveredItem(null);
      isMouseOverSidebarRef.current = false;
      isMouseOverPanelRef.current = false;
      closeMobileMenu();
      if (window.innerWidth >= 768) {
        setTimeout(() => collapseSidebar(), 50);
      }
    } else if (!hasChildren && !item.url) {
      setHoveredItem(null);
    }
  }, [navigate, closeMobileMenu, collapseSidebar, handleLogout]);

  const handleGroupClick = useCallback((groupId) => {
    toggleGroup(groupId);
  }, [toggleGroup]);

  const staticMenuItems = {
    home: {
      id: "home",
      labelEn: "Home",
      labelAr: "الصفحة الرئيسية",
      icon: "Home",
      url: "/",
    },
    dashboard: {
      id: "dashboard",
      labelEn: "Dashboard",
      labelAr: "لوحة التحكم",
      icon: "LayoutDashboard",
      url: "/dashboard",
      shortKey: "Ctrl+D"
    },
    logout: {
      id: "logout",
      labelEn: "Logout",
      labelAr: "تسجيل الخروج",
      icon: "Power",
      shortKey: "Ctrl+Q"
    }
  };

  const LoadingState = () => (
    <SidebarLoadingPlaceholder isLoading={isLoadingMenu} menuItems={13} showLogo={true} />
  );

  const NoMenuState = () => (
    <div className="p-4 text-center text-gray-400">
      <div className="text-sm">No menu items available</div>
      <div className="text-xs mt-2">Please contact administrator</div>
    </div>
  );

  const renderMenuList = useCallback((isMobile = false) => (
    <ul className="space-y-0">
      <SidebarMenuItem
        item={staticMenuItems.home}
        activeItem={activeItem}
        isCollapsed={isMobile ? false : isCollapsed}
        currentLang={currentLang}
        onMenuClick={handleMenuItemClick}
        onHoverEnter={isMobile ? null : handleMenuHover}
        onHoverLeave={isMobile ? null : handleMenuLeave}
        getLabel={getLabel}
        renderIcon={renderIcon}
        isHovered={hoveredItem?.id === staticMenuItems.home.id}
        isMobile={isMobile}
      />

      <SidebarMenuItem
        item={staticMenuItems.dashboard}
        activeItem={activeItem}
        isCollapsed={isMobile ? false : isCollapsed}
        currentLang={currentLang}
        onMenuClick={handleMenuItemClick}
        onHoverEnter={isMobile ? null : handleMenuHover}
        onHoverLeave={isMobile ? null : handleMenuLeave}
        getLabel={getLabel}
        renderIcon={renderIcon}
        isHovered={hoveredItem?.id === staticMenuItems.dashboard.id}
        isMobile={isMobile}
      />

      {menuData?.menuItems && menuData.menuItems.length > 0 ? (
        menuData.menuItems
          .filter(item => item && typeof item === 'object')
          .map((item) => (
            <SidebarMenuItem
              key={item.id}
              item={item}
              activeItem={activeItem}
              isCollapsed={isMobile ? false : isCollapsed}
              currentLang={currentLang}
              onMenuClick={handleMenuItemClick}
              onHoverEnter={isMobile ? null : handleMenuHover}
              onHoverLeave={isMobile ? null : handleMenuLeave}
              getLabel={getLabel}
              renderIcon={renderIcon}
              isHovered={hoveredItem?.id === item.id}
              isMobile={isMobile}
            />
          ))
      ) : (
        !isLoadingMenu && <NoMenuState />
      )}
    </ul>
  ), [activeItem, isCollapsed, currentLang, handleMenuItemClick, handleMenuHover, handleMenuLeave, getLabel, renderIcon, menuData, isLoadingMenu, hoveredItem]);

  const renderLogoutButton = useCallback((isMobile = false) => (
    <div className="border-t border-gray-800">
      <ul className="space-y-0">
        <SidebarMenuItem
          item={staticMenuItems.logout}
          activeItem={activeItem}
          isCollapsed={isMobile ? false : isCollapsed}
          currentLang={currentLang}
          onMenuClick={handleMenuItemClick}
          onHoverEnter={null}
          onHoverLeave={null}
          getLabel={getLabel}
          renderIcon={renderIcon}
          isHovered={false}
          isMobile={isMobile}
        />
      </ul>
    </div>
  ), [activeItem, isCollapsed, currentLang, handleMenuItemClick, getLabel, renderIcon]);

  return (
    <>
      <style>{`
        /* Sidebar animations */
        @keyframes sidebarSlideIn {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes sidebarSlideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(-100%);
            opacity: 0;
          }
        }

        @keyframes sidebarExpandWidth {
          from {
            width: 50px;
          }
          to {
            width: 220px;
          }
        }

        @keyframes sidebarCollapseWidth {
          from {
            width: 220px;
          }
          to {
            width: 50px;
          }
        }

        @keyframes megaMenuSlideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes backdropFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 0.8;
          }
        }

        @keyframes backdropFadeOut {
          from {
            opacity: 0.8;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
            max-height: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            max-height: 1500px;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Smooth transitions */
        .sidebar-transition {
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .mobile-menu-transition {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .backdrop-transition {
          animation: backdropFadeIn 0.3s ease-out forwards;
        }

        .backdrop-transition-out {
          animation: backdropFadeOut 0.3s ease-out forwards;
        }

        .animate-slide-down {
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>

      {/* Mobile Burger Button */}
      <div
        ref={burgerButtonRef}
        onClick={toggleMobileMenu}
        className="md:hidden fixed top-0 z-[9999999999999999] left-0 bg-gray-200 opacity-80 rounded-tr-2xl rounded-br-2xl text-black w-[30px] flex justify-center items-center h-[50px] border-gray-700 transition-all duration-300"
      >
        <button
          className="rounded-lg transition-colors duration-200"
          aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside
        ref={sidebarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          hidden md:flex md:flex-col 
          h-[calc(100vh-45px)] 
          sidebar-bg text-gray-200 
          border-r border-gray-800 
          fixed top-[45px] left-0 
          z-[9999]
          sidebar-transition
        `}
        style={{
          width: isCollapsed ? '50px' : '220px',
        }}
      >
        {/* Header */}
        <div className="px-2 h-[41px] border-b border-gray-800 flex items-center justify-between flex-shrink-0 overflow-hidden">
          {!isCollapsed && (
            <h2 className="text-xl font-bold text-gray-200 whitespace-nowrap animate-fade-in">
              {t("SideBarHeading")}
            </h2>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSidebar();
              setHoveredItem(null);
            }}
            className={`p-1 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors duration-200 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <X size={20} />}
          </button>
        </div>

        {/* Nav */}
        <nav
          ref={navRef}
          className="mt-2 flex-1 custom-scrollbar overflow-x-hidden"
          style={{
            overflowY: 'auto',
            overscrollBehavior: 'contain'
          }}
        >
          {isLoadingMenu ? <LoadingState /> : renderMenuList(false)}
        </nav>

        {/* Logout */}
        <div className="flex-shrink-0">
          {renderLogoutButton(false)}
        </div>

        {/* Version */}
        {isElectron && currentVersion && (
          <div className="flex-shrink-0 border-t border-gray-800 py-2 px-2">
            <Tooltip
              title={`Finac ERP v${currentVersion}`}
              placement={currentLang === 'ar' ? 'left' : 'right'}
              arrow
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: '#1f2937',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    '& .MuiTooltip-arrow': { color: '#1f2937' },
                  },
                },
              }}
            >
              <div
                onClick={() => navigate('/update')}
                className={`text-gray-500 text-[10px] cursor-pointer select-none transition-opacity duration-300 ${isCollapsed ? 'text-center' : 'text-left pl-2'}`}
              >
                {isCollapsed ? `v${currentVersion}` : `Version ${currentVersion}`}
              </div>
            </Tooltip>
          </div>
        )}
      </aside>

      {/* ── MEGA MENU FLOATING PANEL ── */}
      {hoveredItem && hoveredItem.children && hoveredItem.children.length > 0 && (
        <div
          onMouseEnter={handlePanelMouseEnter}
          onMouseLeave={handlePanelMouseLeave}
        >
          <MegaMenuPanel
            item={hoveredItem}
            isVisible={!!hoveredItem}
            currentLang={currentLang}
            onItemClick={handleMenuItemClick}
            getLabel={getLabel}
            renderIcon={renderIcon}
            activeItem={activeItem}
            panelPosition={panelPosition}
            panelRef={megaPanelRef}
          />
        </div>
      )}

      {/* Mobile Overlay Backdrop */}
      {isMobileOpen && (
        <div
          className={`md:hidden fixed inset-0 bg-black z-[9998] ${isMobileOpen ? 'backdrop-transition' : 'backdrop-transition-out'
            }`}
          onClick={toggleMobileMenu}
        />
      )}

      {/* Mobile Off-Canvas Sidebar */}
      <aside
        className={`
          md:hidden fixed top-0 left-0 h-full w-[280px] 
          bg-gray-900 shadow-lg 
          mobile-menu-transition
          z-[9999] 
          flex flex-col
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="px-4 h-[70px] border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-200">
            {selectedLang === 'Arabic' ? 'الإدارة المالية' : 'Finac Admin'}
          </h2>
          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors duration-200"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav
          className="mt-2 flex-1 overflow-y-auto overflow-x-hidden"
          style={{ overscrollBehavior: 'contain' }}
        >
          {isLoadingMenu ? <LoadingState /> : renderMenuList(true)}
        </nav>

        <div className="flex-shrink-0">
          {renderLogoutButton(true)}
        </div>

        {isElectron && currentVersion && (
          <div className="flex-shrink-0 border-t border-gray-800 py-3 px-4 sidebar-bg">
            <div className="text-gray-500 text-[11px] text-center">
              Finac ERP v{currentVersion}
            </div>
          </div>
        )}
      </aside>

      <CreateFinancialYear open={addFinancialYearOpen} handleClose={() => setAddFinancialYearOpen(false)} onSuccess={() => setAddFinancialYearOpen(false)} />
      <CreateFinancialYear open={editFinancialYearOpen} handleClose={() => setEditFinancialYearOpen(false)} selectedId={currentFinancialYear?.yearId} onSuccess={() => setEditFinancialYearOpen(false)} />
    </>
  );
};

export default Sidebar;