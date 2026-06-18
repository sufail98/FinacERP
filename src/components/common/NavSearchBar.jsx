import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { selectedLang } from '@/lib/LanguageHelper';

import { getFilteredMenuData, getMenuDataSync, filterMenuByPrivileges as menuData, } from '../../../public/assets/js/menuData';

import { ChevronRight, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { useTranslation } from "react-i18next";
import { selectCurrentBranchMainDb } from '@/redux/selectors/authSelectors';
import { useSelector } from 'react-redux';


const NavSearchBar = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const searchRef = useRef(null);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const mainDb = useSelector(selectCurrentBranchMainDb);
    const { generalSettings } = useSelector(state => state.settings);
const { saleSettings } = useSelector(state => state.settings);

    const hasFetched = useRef(false);

    const [menuData, setMenuData] = useState({ menuItems: [] });
    const [isLoadingMenu, setIsLoadingMenu] = useState(true);



    const searchResultsRef = useRef(null);
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    // Handle search result selection
    const handleSearchResultClick = (item) => {
        navigate(item.url);
        setSearchQuery('');
        setShowSearchResults(false);
    };

    // Handle search input focus
    const handleSearchFocus = () => {
        if (searchResults.length > 0) {
            setShowSearchResults(true);
        }
    };
    // Load menu data on component mount
    useEffect(() => {
        if (!mainDb || hasFetched.current) return; // ✅ Only run once per mount

        hasFetched.current = true;

        const loadFilteredMenu = async () => {
            setIsLoadingMenu(true);
            try {
                const filteredMenuData = await getFilteredMenuData();
                
                setMenuData(filteredMenuData);
            } catch (error) {
                console.error("Error loading filtered menu:", error);
                setMenuData({ menuItems: [] });
            } finally {
                setIsLoadingMenu(false);
            }
        };

        loadFilteredMenu();
    }, [mainDb]);

    // Handle keyboard navigation
    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            setShowSearchResults(false);
            setSearchQuery('');
        }
        // You can add more keyboard navigation here (arrow keys, etc.)
    };
    // Search functionality with debouncing
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery.trim() === '') {
                setSearchResults([]);
                setShowSearchResults(false);
                return;
            }

            const allMenuItems = flattenMenuItems(menuData.menuItems);
            const searchTerm = searchQuery.toLowerCase();

            const filtered = allMenuItems.filter(item =>
                item.searchableText.includes(searchTerm)
            );

            // Sort results by relevance (exact matches first, then partial matches)
            const sorted = filtered.sort((a, b) => {
                const aLabelMatch = a.label.toLowerCase().indexOf(searchTerm);
                const bLabelMatch = b.label.toLowerCase().indexOf(searchTerm);

                // Exact label matches first
                if (aLabelMatch === 0 && bLabelMatch !== 0) return -1;
                if (bLabelMatch === 0 && aLabelMatch !== 0) return 1;

                // Then by label length (shorter = more relevant)
                return a.label.length - b.label.length;
            });

            setSearchResults(sorted.slice(0, 8)); // Limit to 8 results
            setShowSearchResults(true);
        }, 200); // 200ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Handle clicking outside search results
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchResultsRef.current && !searchResultsRef.current.contains(event.target) &&
                searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // ADD THIS before flattenMenuItems ↓
const isItemVisible = (item) => {
    if (!item.requiresSetting) return true;
    if (item.requiresSetting === 'ActiveGodown') {
        return saleSettings?.[item.requiresSetting] === true;
    }
    return generalSettings?.[item.requiresSetting] === true;
};

const flattenMenuItems = (items, parentLabel = '') => {
    let flattened = [];

    items.forEach(item => {
        // 👇 skip items hidden by settings (e.g. CostCenter, ActiveGodown)
        if (!isItemVisible(item)) return;

        // 👇 pick correct label based on selected language
        const label = selectedLang === 'Arabic' ? item.labelAr : item.labelEn;
        const parent = parentLabel ? parentLabel : '';

        const fullLabel = parent ? `${parent} > ${label}` : label;

        // Add item if it has a URL (navigatable)
        if (item.url) {
            flattened.push({
                ...item,
                label,            // 👈 attach actual label
                fullLabel,
                parentLabel: parent,
                searchableText: `${label} ${fullLabel}`.toLowerCase()
            });
        }

        // Recursively add children
        if (item.children && item.children.length > 0) {
            flattened = [...flattened, ...flattenMenuItems(item.children, label)];
        }
    });

    return flattened;
};

    return (
        <div>
            <div className="flex-1 md:w-[400px] mx-4 relative" ref={searchRef}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    <Input
                        type="text"
                        placeholder={t("searchBarPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={handleSearchFocus}
                        onKeyDown={handleKeyDown}
                        className="pl-9 h-7 bg-white/10 border-white/20 text-white placeholder:text-gray-300 focus:border-white/40 focus:ring-white/20 text-sm"
                    />
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                    <div
                        ref={searchResultsRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-50"
                    >
                        {searchResults.map((item, index) => (
                            <div
                                key={`${item.id}-${index}`}
                                className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 transition-colors duration-150"
                                onClick={() => handleSearchResultClick(item)}
                            >
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">
                                        {item.label}
                                    </div>
                                    {item.parentLabel && (
                                        <div className="text-xs text-gray-500 flex items-center mt-1">
                                            <span>{item.parentLabel}</span>
                                            <ChevronRight size={10} className="mx-1" />
                                            <span className="font-medium">{item.label}</span>
                                        </div>
                                    )}
                                </div>
                                <ChevronRight size={14} className="text-gray-400" />
                            </div>
                        ))}

                        {/* Show total results if more than displayed */}
                        {flattenMenuItems(menuData.menuItems).filter(item =>
                            item.searchableText.includes(searchQuery.toLowerCase())
                        ).length > 8 && (
                                <div className="px-3 py-2 text-xs text-gray-400 text-center border-t">
                                    Showing top 8 results
                                </div>
                            )}
                    </div>
                )}

                {/* No Results Found */}
                {showSearchResults && searchQuery.trim() !== '' && searchResults.length === 0 && (
                    <div
                        ref={searchResultsRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-50"
                    >
                        <div className="px-3 py-3 text-sm text-gray-500 text-center">
                            <Search size={16} className="mx-auto mb-1 opacity-50" />
                            No menu items found for "<strong>{searchQuery}</strong>"
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default NavSearchBar
