import { createContext, useContext, useState, useRef, useCallback } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState(new Set());
  const [openGroups, setOpenGroups] = useState(new Set());
  const [activeItem, setActiveItem] = useState(null);
  
  const activeMenuStateRef = useRef({ menus: new Set(), groups: new Set() });

  // Restore active menu state
  const restoreActiveMenuState = useCallback(() => {
    setOpenMenus(prev => {
      const newSet = new Set(prev);
      activeMenuStateRef.current.menus.forEach(id => newSet.add(id));
      return newSet;
    });
    
    setOpenGroups(prev => {
      const newSet = new Set(prev);
      activeMenuStateRef.current.groups.forEach(id => newSet.add(id));
      return newSet;
    });
  }, []);

  // Collapse sidebar
  const collapseSidebar = useCallback(() => {
    setIsCollapsed(true);
    setOpenMenus(new Set());
    setOpenGroups(new Set());
  }, []);

  // Expand sidebar
  const expandSidebar = useCallback(() => {
    setIsCollapsed(false);
    restoreActiveMenuState();
  }, [restoreActiveMenuState]);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    if (isCollapsed) {
      expandSidebar();
    } else {
      collapseSidebar();
    }
  }, [isCollapsed, expandSidebar, collapseSidebar]);

  // Toggle mobile menu
  const toggleMobileMenu = useCallback(() => {
    setIsMobileOpen(prev => {
      if (!prev) {
        restoreActiveMenuState();
      }
      return !prev;
    });
  }, [restoreActiveMenuState]);

  // Close mobile menu
  const closeMobileMenu = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  // Toggle menu
  const toggleMenu = useCallback((menuId) => {
    if (isCollapsed && window.innerWidth >= 768) return;

    setOpenMenus(prev => {
      const newOpenMenus = new Set(prev);
      if (newOpenMenus.has(menuId)) {
        newOpenMenus.delete(menuId);
      } else {
        newOpenMenus.add(menuId);
      }
      return newOpenMenus;
    });
  }, [isCollapsed]);

  // Toggle group
  const toggleGroup = useCallback((groupId) => {
    if (isCollapsed && window.innerWidth >= 768) return;

    setOpenGroups(prev => {
      const newGroups = new Set(prev);
      if (newGroups.has(groupId)) {
        newGroups.delete(groupId);
      } else {
        newGroups.add(groupId);
      }
      return newGroups;
    });
  }, [isCollapsed]);

  // Set active menu item
  const setActiveMenuItem = useCallback((activeId, parentMenus, parentGroups) => {
    setActiveItem(activeId);
    
    activeMenuStateRef.current = {
      menus: parentMenus,
      groups: parentGroups
    };

    // Only add, don't replace existing open menus
    setOpenMenus(prev => {
      const newSet = new Set(prev);
      parentMenus.forEach(id => newSet.add(id));
      return newSet;
    });
    
    setOpenGroups(prev => {
      const newSet = new Set(prev);
      parentGroups.forEach(id => newSet.add(id));
      return newSet;
    });
  }, []);

  // Expand with specific menu
  const expandWithMenu = useCallback((menuId) => {
    setIsCollapsed(false);
    
    setOpenMenus(prev => {
      const newSet = new Set(prev);
      activeMenuStateRef.current.menus.forEach(id => newSet.add(id));
      newSet.add(menuId);
      return newSet;
    });
    
    setOpenGroups(prev => {
      const newSet = new Set(prev);
      activeMenuStateRef.current.groups.forEach(id => newSet.add(id));
      return newSet;
    });
  }, []);

  const value = {
    isCollapsed,
    isMobileOpen,
    openMenus,
    openGroups,
    activeItem,
    activeMenuStateRef,
    setIsCollapsed,
    setIsMobileOpen,
    setOpenMenus,
    setOpenGroups,
    setActiveItem,
    toggleSidebar,
    toggleMobileMenu,
    closeMobileMenu,
    toggleMenu,
    toggleGroup,
    collapseSidebar,
    expandSidebar,
    expandWithMenu,
    restoreActiveMenuState,
    setActiveMenuItem,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};