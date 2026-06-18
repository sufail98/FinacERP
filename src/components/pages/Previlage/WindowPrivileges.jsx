import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Search, Menu, X } from 'lucide-react';
import { defaultMenuData as menuData } from '../../../../public/assets/js/menuData';
import { selectedLang } from '@/lib/LanguageHelper';
import axiosInstance from '@/lib/axiosConfig';
import Preloader from '@/components/common/Preloader';
import useAuth from '@/redux/hook/auth/useAuth';

const permissions = ['add', 'edit', 'delete', 'post', 'view', 'home'];

const WindowPrivileges = forwardRef(({ userGroupId, setAlert, setSaving, setHasUnsavedChanges }, ref) => {
    const [selectedMenu, setSelectedMenu] = useState('Company');
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [privileges, setPrivileges] = useState({});
    const [modifiedPrivileges, setModifiedPrivileges] = useState({});
    const { userId } = useAuth();

    // Helper function to get label
    const getMenuLabel = (menuItem) => {
        return selectedLang === 'Arabic' ? menuItem.labelAr : menuItem.labelEn;
    };

    // Fetch privileges from API
    // KEY CHANGE: Now matches by item.id (unique) instead of labelEn (can be duplicate)
    const fetchPrivileges = async () => {
        if (!userGroupId) {
            console.error('User Group ID is required');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await axiosInstance.get(`get-privileges-byId/${userGroupId}`);
            const result = response.data;

            if (result.status === 200 && !result.error) {
                const apiPrivileges = {};

                const processMenuItems = (items, parentKey = '') => {
                    items.forEach(item => {
                        const menuKey = parentKey ? `${parentKey}.${item.id}` : item.id;
                        apiPrivileges[menuKey] = {
                            all: false,
                            add: false,
                            edit: false,
                            delete: false,
                            post: false,
                            view: false,
                            home: false
                        };

                        if (item.children && item.children.length > 0) {
                            processMenuItems(item.children, menuKey);
                        }
                    });
                };

                if (menuData && menuData.menuItems) {
                    processMenuItems(menuData.menuItems);
                    if (menuData.menuItems.length > 0) {
                        setSelectedMenu(getMenuLabel(menuData.menuItems[0]));
                    }
                }

                // Match by window_name against item.id (preferred) or labelEn/labelAr fallback
                result.data.forEach(privilege => {
                    const findAndUpdateMenuPrivilege = (items, parentKey = '') => {
                        for (const item of items) {
                            const menuKey = parentKey ? `${parentKey}.${item.id}` : item.id;
                            const itemLabelEn = item.labelEn || '';
                            const itemLabelAr = item.labelAr || '';
                            const windowName = privilege.window_name.trim();

                            // Primary match by item.id, fallback to label match
                            const idMatch = item.id === windowName;
                            const labelEnMatch = itemLabelEn.trim() === windowName.trim(); // ← primary match
                            const labelArMatch = itemLabelAr.trim().toLowerCase() === windowName.toLowerCase();

                            if (labelEnMatch || idMatch || labelArMatch) { // labelEn first
                                apiPrivileges[menuKey] = {
                                    all: privilege.can_all || false,
                                    add: privilege.can_add || false,
                                    edit: privilege.can_edit || false,
                                    delete: privilege.can_delete || false,
                                    post: privilege.can_post || false,
                                    view: privilege.can_view || false,
                                    home: privilege.can_home || false
                                };
                                return true;
                            }

                            if (item.children && item.children.length > 0) {
                                if (findAndUpdateMenuPrivilege(item.children, menuKey)) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    };

                    if (menuData && menuData.menuItems) {
                        findAndUpdateMenuPrivilege(menuData.menuItems);
                    }
                });

                setPrivileges(apiPrivileges);
                setModifiedPrivileges({});
            } else {
                console.error('Failed to fetch privileges:', result.message);
                initializeDefaultPrivileges();
            }
        } catch (error) {
            console.error('Error fetching privileges:', error);
            initializeDefaultPrivileges();
        } finally {
            setLoading(false);
        }
    };

    const initializeDefaultPrivileges = () => {
        const initialPrivileges = {};

        const processMenuItems = (items, parentKey = '') => {
            items.forEach(item => {
                const menuKey = parentKey ? `${parentKey}.${item.id}` : item.id;
                initialPrivileges[menuKey] = {
                    all: false,
                    add: false,
                    edit: false,
                    delete: false,
                    post: false,
                    view: false,
                    home: false
                };

                if (item.children && item.children.length > 0) {
                    processMenuItems(item.children, menuKey);
                }
            });
        };

        if (menuData && menuData.menuItems) {
            processMenuItems(menuData.menuItems);
            if (menuData.menuItems.length > 0) {
                setSelectedMenu(getMenuLabel(menuData.menuItems[0]));
            }
        }
        setPrivileges(initialPrivileges);
    };

    const savePrivileges = async () => {
        if (!userGroupId) {
            setAlert({ key: new Date(), type: 'error', message: 'User Group ID is required' });
            return;
        }

        try {
            setSaving(true);
            const privilegesToSave = [];

            Object.entries(privileges).forEach(([windowKey, priv]) => {
                // Save using item.id as window_name for uniqueness
                const findMenuItemByKey = (items, key, parentKey = '') => {
                    for (const item of items) {
                        const menuKey = parentKey ? `${parentKey}.${item.id}` : item.id;
                        if (menuKey === key) return item;
                        if (item.children && item.children.length > 0) {
                            const result = findMenuItemByKey(item.children, key, menuKey);
                            if (result) return result;
                        }
                    }
                    return null;
                };

                const menuItem = findMenuItemByKey(menuData.menuItems, windowKey);

                if (menuItem && !menuItem.isGroupHeader) {
                    privilegesToSave.push({
                        window_name: menuItem.labelEn, // Use id for uniqueness
                        window_label: getMenuLabel(menuItem), // Keep label for display
                        can_all: priv.all || false,
                        can_add: priv.add || false,
                        can_edit: priv.edit || false,
                        can_delete: priv.delete || false,
                        can_post: priv.post || false,
                        can_view: priv.view || false,
                        can_home: priv.home || false
                    });
                }
            });

            const payload = {
                usergroup_id: parseInt(userGroupId),
                user_id: userId,
                privileges: privilegesToSave
            };

            const response = await axiosInstance.post('save-privileges', payload);
            const result = response.data;

            if (result.status === 200 && !result.error) {
                setAlert({
                    key: new Date(),
                    type: 'success',
                    message: `Window privileges saved successfully for ${privilegesToSave.length} windows`
                });
                setModifiedPrivileges({});
                setHasUnsavedChanges(false);
                await fetchPrivileges();
            } else {
                setAlert({
                    key: new Date(),
                    type: 'error',
                    message: 'Failed to save window privileges: ' + (result.message || 'Unknown error')
                });
            }
        } catch (error) {
            console.error('Error saving privileges:', error);
            setAlert({ key: new Date(), type: 'error', message: 'Error saving window privileges. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    // Expose save method to parent
    useImperativeHandle(ref, () => ({
        save: savePrivileges
    }));

    useEffect(() => {
        fetchPrivileges();
    }, [userGroupId]);

    useEffect(() => {
        setHasUnsavedChanges(Object.keys(modifiedPrivileges).length > 0);
    }, [modifiedPrivileges]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (Object.keys(modifiedPrivileges).length > 0) {
                    savePrivileges();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [modifiedPrivileges]);

    const handlePrivilegeChange = (windowName, permissionType, checked) => {
        setPrivileges(prev => {
            const currentWindowPrivs = prev[windowName] || {
                all: false, add: false, edit: false, delete: false, post: false, view: false, home: false
            };

            let updatedPrivs = {
                ...currentWindowPrivs,
                [permissionType]: checked
            };

            if (permissionType === 'all') {
                updatedPrivs = {
                    all: checked,
                    add: checked,
                    edit: checked,
                    delete: checked,
                    post: checked,
                    view: checked,
                    home: checked
                };
            } else {
                const allIndividualChecked = updatedPrivs.add && updatedPrivs.edit &&
                    updatedPrivs.delete && updatedPrivs.post && updatedPrivs.view && updatedPrivs.home;
                updatedPrivs.all = allIndividualChecked;
            }

            setModifiedPrivileges(prevModified => ({
                ...prevModified,
                [windowName]: updatedPrivs
            }));

            return {
                ...prev,
                [windowName]: updatedPrivs
            };
        });
    };

    const toggleAllPermissions = (windowName) => {
        const currentAll = privileges[windowName]?.all || false;
        const updatedPrivs = {
            all: !currentAll,
            add: !currentAll,
            edit: !currentAll,
            delete: !currentAll,
            post: !currentAll,
            view: !currentAll,
            home: !currentAll
        };

        setPrivileges(prev => ({
            ...prev,
            [windowName]: updatedPrivs
        }));

        setModifiedPrivileges(prevModified => ({
            ...prevModified,
            [windowName]: updatedPrivs
        }));
    };

    // Get all non-header children for a column-select-all operation
    const getAllWindowsInSelectedMenu = () => {
        const selectedMenuData = getSelectedMenuData();
        if (!selectedMenuData) return [];

        if (selectedMenuData.children && selectedMenuData.children.length > 0) {
            return selectedMenuData.children.filter(child => !child.isGroupHeader);
        } else {
            return [selectedMenuData];
        }
    };

    const handleColumnSelectAll = (permissionType) => {
        const allWindows = getAllWindowsInSelectedMenu();
        const filteredWindowKeys = allWindows
            .filter(window => {
                const label = getMenuLabel(window).toLowerCase();
                return label.includes(searchTerm.toLowerCase());
            })
            .map(window => {
                const selectedMenuData = getSelectedMenuData();
                return selectedMenuData?.children && selectedMenuData.children.length > 0
                    ? `${selectedMenuData.id}.${window.id}`
                    : window.id;
            });

        const allChecked = filteredWindowKeys.every(key => privileges[key]?.[permissionType] || false);
        const newModifiedPrivileges = {};

        setPrivileges(prev => {
            const updated = { ...prev };

            filteredWindowKeys.forEach(windowKey => {
                const currentWindowPrivs = updated[windowKey] || {
                    all: false, add: false, edit: false, delete: false, post: false, view: false, home: false
                };

                let updatedPrivs = {
                    ...currentWindowPrivs,
                    [permissionType]: !allChecked
                };

                if (permissionType === 'all') {
                    updatedPrivs = {
                        all: !allChecked,
                        add: !allChecked,
                        edit: !allChecked,
                        delete: !allChecked,
                        post: !allChecked,
                        view: !allChecked,
                        home: !allChecked
                    };
                } else {
                    const allIndividualChecked = updatedPrivs.add && updatedPrivs.edit &&
                        updatedPrivs.delete && updatedPrivs.post && updatedPrivs.view && updatedPrivs.home;
                    updatedPrivs.all = allIndividualChecked;
                }

                updated[windowKey] = updatedPrivs;
                newModifiedPrivileges[windowKey] = updatedPrivs;
            });

            return updated;
        });

        setModifiedPrivileges(prev => ({
            ...prev,
            ...newModifiedPrivileges
        }));
    };

    const isColumnAllChecked = (permissionType) => {
        const allWindows = getAllWindowsInSelectedMenu();
        const filteredWindowKeys = allWindows
            .filter(window => {
                const label = getMenuLabel(window).toLowerCase();
                return label.includes(searchTerm.toLowerCase());
            })
            .map(window => {
                const selectedMenuData = getSelectedMenuData();
                return selectedMenuData?.children && selectedMenuData.children.length > 0
                    ? `${selectedMenuData.id}.${window.id}`
                    : window.id;
            });

        if (filteredWindowKeys.length === 0) return false;
        return filteredWindowKeys.every(key => privileges[key]?.[permissionType] || false);
    };

    const getSelectedMenuData = () => {
        if (!menuData || !menuData.menuItems) return null;
        return menuData.menuItems.find(item => getMenuLabel(item) === selectedMenu);
    };

    // Returns rows to render: includes group headers AND filtered data rows
    // Group headers are only shown if at least one child in that group matches the search
    const getRowsToRender = () => {
        const selectedMenuData = getSelectedMenuData();
        if (!selectedMenuData) return [];

        let sourceItems = [];
        if (selectedMenuData.children && selectedMenuData.children.length > 0) {
            sourceItems = selectedMenuData.children;
        } else {
            sourceItems = [selectedMenuData];
        }

        if (!searchTerm) {
            // No search: return everything (headers + items)
            return sourceItems.filter(item => item && typeof item === 'object');
        }

        // With search: find which non-header items match, keep their preceding group headers
        const matchingItems = new Set();
        const result = [];
        let pendingHeader = null;

        sourceItems.forEach(item => {
            if (!item || typeof item !== 'object') return;

            if (item.isGroupHeader) {
                pendingHeader = item;
            } else {
                const label = getMenuLabel(item).toLowerCase();
                if (label.includes(searchTerm.toLowerCase())) {
                    if (pendingHeader) {
                        result.push(pendingHeader);
                        pendingHeader = null;
                    }
                    result.push(item);
                }
            }
        });

        return result;
    };

    if (loading) {
        return <Preloader />;
    }

    if (!menuData || !menuData.menuItems || menuData.menuItems.length === 0) {
        return (
            <div className="p-4 text-gray-800 dark:text-gray-200">
                No menu data available
            </div>
        );
    }

    const rowsToRender = getRowsToRender();
    const hasDataRows = rowsToRender.some(r => !r.isGroupHeader);

    return (
        <div className="bg-white dark:bg-gray-800 overflow-hidden transition-colors">
            {/* Mobile Menu Button & Search Bar */}
            <div className="mb-4 space-y-3">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="lg:hidden w-full flex items-center justify-between px-4 py-2 
                        main-bg dark:bg-blue-700 text-white rounded-md 
                        hover:bg-blue-700 dark:hover:main-bg transition-colors"
                >
                    <span className="font-medium">{selectedMenu}</span>
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 
                        text-gray-400 dark:text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search windows..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 
                            bg-white dark:bg-gray-700 
                            text-gray-900 dark:text-gray-100
                            border border-gray-300 dark:border-gray-600 
                            rounded-md 
                            placeholder:text-gray-400 dark:placeholder:text-gray-500
                            focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                            focus:border-blue-500 dark:focus:border-blue-400
                            transition-colors"
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row 
                bg-white dark:bg-gray-800 
                border border-gray-200 dark:border-gray-700 
                rounded transition-colors">

                {/* Left Menu List */}
                <div className={`
                    ${isMobileMenuOpen ? 'block' : 'hidden'} 
                    lg:block lg:w-64 
                    border-b lg:border-b-0 lg:border-r 
                    border-gray-200 dark:border-gray-700
                    bg-gray-50 dark:bg-gray-900
                    absolute lg:relative
                    z-10 lg:z-auto
                    w-full lg:w-64
                    max-h-96 lg:max-h-none
                    overflow-y-auto
                    shadow-lg lg:shadow-none
                    transition-colors
                `}>
                    <div className="border-b border-gray-200 dark:border-gray-700 
                        bg-gray-100 dark:bg-gray-800 
                        px-3 flex items-center h-[40px]">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Menu
                        </span>
                    </div>
                    {menuData.menuItems.map(menu => (
                        <div
                            key={menu.id}
                            onClick={() => {
                                setSelectedMenu(getMenuLabel(menu));
                                setIsMobileMenuOpen(false);
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer 
                                border-b border-gray-200 dark:border-gray-700
                                hover:bg-blue-50 dark:hover:bg-gray-700
                                transition-colors
                                ${selectedMenu === getMenuLabel(menu)
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            {menu?.children && menu.children.length > 0 && (
                                <span className="mr-1">▶</span>
                            )}
                            {getMenuLabel(menu)}
                        </div>
                    ))}
                </div>

                {/* Permissions Grid */}
                <div className="flex-1 overflow-auto">

                    {/* ── Desktop Table View ── */}
                    <div className="hidden md:block">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10 transition-colors">
                                <tr>
                                    <th className="text-left px-3 h-[40px] 
                                        border-b border-gray-200 dark:border-gray-700 
                                        font-medium text-gray-700 dark:text-gray-300 
                                        min-w-48">
                                        Window Name
                                    </th>
                                    <th className="text-center px-2 py-2 
                                        border-b border-gray-200 dark:border-gray-700 
                                        font-medium text-gray-700 dark:text-gray-300 
                                        w-12">
                                        <div className="flex items-center justify-center gap-1">
                                            <input
                                                type="checkbox"
                                                checked={isColumnAllChecked('all')}
                                                onChange={() => handleColumnSelectAll('all')}
                                                className="w-3 h-3 cursor-pointer accent-blue-600 dark:accent-blue-500"
                                                title="Select/Deselect all rows for All column"
                                            />
                                            <span className="hidden lg:inline">All</span>
                                        </div>
                                    </th>
                                    {permissions.map(permission => (
                                        <th key={permission}
                                            className="text-center px-2 py-2 
                                                border-b border-gray-200 dark:border-gray-700 
                                                font-medium text-gray-700 dark:text-gray-300 
                                                w-12">
                                            <div className="flex items-center justify-center gap-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isColumnAllChecked(permission)}
                                                    onChange={() => handleColumnSelectAll(permission)}
                                                    className="w-3 h-3 cursor-pointer accent-blue-600 dark:accent-blue-500"
                                                    title={`Select/Deselect all rows for ${permission.charAt(0).toUpperCase() + permission.slice(1)} column`}
                                                />
                                                <span className="hidden lg:inline capitalize">
                                                    {permission.charAt(0).toUpperCase() + permission.slice(1)}
                                                </span>
                                                <span className="lg:hidden">
                                                    {permission.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="w-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rowsToRender.map((item, index) => {
                                    // ── Group Header Row ──
                                    if (item.isGroupHeader) {
                                        return (
                                            <tr key={`header-${item.id}`}>
                                                <td
                                                    colSpan={2 + permissions.length + 1}
                                                    className="px-3 py-1.5 
                                                        bg-gray-100 dark:bg-gray-700/60
                                                        border-b border-gray-200 dark:border-gray-600
                                                        text-xs font-semibold uppercase tracking-wider
                                                        text-gray-500 dark:text-gray-400"
                                                >
                                                    {getMenuLabel(item)}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // ── Data Row ──
                                    const selectedMenuData = getSelectedMenuData();
                                    const windowKey = selectedMenuData?.children && selectedMenuData.children.length > 0
                                        ? `${selectedMenuData.id}.${item.id}`
                                        : item.id;

                                    const windowPrivileges = privileges[windowKey] || {
                                        all: false, add: false, edit: false, delete: false, post: false, view: false, home: false
                                    };

                                    // Count data rows before this one to alternate stripe correctly
                                    const dataRowIndex = rowsToRender
                                        .slice(0, index)
                                        .filter(r => !r.isGroupHeader).length;

                                    return (
                                        <tr
                                            key={windowKey}
                                            className={`hover:bg-blue-50/50 dark:hover:bg-gray-700 
                                                transition-colors
                                                ${dataRowIndex % 2 === 1
                                                    ? 'bg-gray-50/70 dark:bg-gray-800/50'
                                                    : 'bg-white dark:bg-gray-800'
                                                }`}
                                        >
                                            <td className="px-3 py-2 
                                                border-b border-gray-200 dark:border-gray-700 
                                                text-gray-700 dark:text-gray-300">
                                                {getMenuLabel(item)}
                                            </td>
                                            <td className="text-center px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={windowPrivileges.all}
                                                    onChange={() => toggleAllPermissions(windowKey)}
                                                    className="w-3 h-3 cursor-pointer accent-blue-600 dark:accent-blue-500"
                                                />
                                            </td>
                                            {permissions.map(permission => (
                                                <td key={permission}
                                                    className="text-center px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={windowPrivileges[permission]}
                                                        onChange={(e) => handlePrivilegeChange(windowKey, permission, e.target.checked)}
                                                        className="w-3 h-3 cursor-pointer accent-blue-600 dark:accent-blue-500"
                                                    />
                                                </td>
                                            ))}
                                            <td className="border-b border-gray-200 dark:border-gray-700"></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Mobile Card View ── */}
                    <div className="md:hidden">
                        {rowsToRender.map((item) => {
                            // Group Header
                            if (item.isGroupHeader) {
                                return (
                                    <div
                                        key={`header-${item.id}`}
                                        className="px-4 py-2
                                            bg-gray-100 dark:bg-gray-700/60
                                            border-b border-gray-200 dark:border-gray-600
                                            text-xs font-semibold uppercase tracking-wider
                                            text-gray-500 dark:text-gray-400"
                                    >
                                        {getMenuLabel(item)}
                                    </div>
                                );
                            }

                            // Data Card
                            const selectedMenuData = getSelectedMenuData();
                            const windowKey = selectedMenuData?.children && selectedMenuData.children.length > 0
                                ? `${selectedMenuData.id}.${item.id}`
                                : item.id;

                            const windowPrivileges = privileges[windowKey] || {
                                all: false, add: false, edit: false, delete: false, post: false, view: false, home: false
                            };

                            return (
                                <div
                                    key={windowKey}
                                    className="p-4 
                                        border-b border-gray-200 dark:border-gray-700 
                                        bg-white dark:bg-gray-800 
                                        hover:bg-gray-50 dark:hover:bg-gray-700
                                        transition-colors"
                                >
                                    <div className="font-medium text-gray-800 dark:text-gray-200 mb-3">
                                        {getMenuLabel(item)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={windowPrivileges.all}
                                                onChange={() => toggleAllPermissions(windowKey)}
                                                className="w-4 h-4 cursor-pointer accent-blue-600 dark:accent-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">All</span>
                                        </label>
                                        {permissions.map(permission => (
                                            <label key={permission} className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={windowPrivileges[permission]}
                                                    onChange={(e) => handlePrivilegeChange(windowKey, permission, e.target.checked)}
                                                    className="w-4 h-4 cursor-pointer accent-blue-600 dark:accent-blue-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                                                    {permission}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {!hasDataRows && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            {searchTerm ? 'No windows found matching your search.' : 'No windows available for this menu.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

WindowPrivileges.displayName = 'WindowPrivileges';

export default WindowPrivileges;