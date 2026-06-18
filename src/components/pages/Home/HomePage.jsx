import React, { useState, useEffect, useMemo } from 'react';
import Preloader from '@/components/common/Preloader';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getFilteredMenuData, iconMap } from '../../../../public/assets/js/menuData';
import axiosInstance from '@/lib/axiosConfig';
import { useSelector } from 'react-redux';

const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [menuData, setMenuData] = useState({ menuItems: [] });

  const { generalSettings } = useSelector(state => state.settings);
const { saleSettings } = useSelector(state => state.settings);

  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const isItemVisible = (item) => {
    if (!item.requiresSetting) return true;
    if (item.requiresSetting === 'ActiveGodown') {
        return saleSettings?.[item.requiresSetting] === true;
    }
    return generalSettings?.[item.requiresSetting] === true;
};

const filterMenuByHomeAccess = (menuData, privileges) => {
    const filteredMenuItems = menuData.menuItems
      .map(parentItem => {
        const filteredChildren = parentItem.children?.filter(child => {
          if (child.isGroupHeader) return true;

          // 👇 skip items hidden by settings (e.g. CostCenter, ActiveGodown)
          if (!isItemVisible(child)) return false;

          const privilege = privileges.find(p => p.window_name === child.labelEn);
          return privilege?.can_home === true;
        }) || [];

        const finalChildren = filteredChildren.filter(child => {
          if (!child.isGroupHeader) return true;
          const groupItems = filteredChildren.filter(
            item => item.group === child.id.replace('-group', '')
          );
          return groupItems.length > 0;
        });

        if (finalChildren.length > 0) {
          return {
            ...parentItem,
            children: finalChildren
          };
        }
        return null;
      })
      .filter(item => item !== null);

    return { menuItems: filteredMenuItems };
};

  useEffect(() => {
    const loadMenuData = async () => {
      try {
        setLoading(true);
        const userId = Number(localStorage.getItem('userId'));
        const filteredData = await getFilteredMenuData();

        // if (userId !== 1) {
        const userGroupId = localStorage.getItem('userRole');
        const response = await axiosInstance.get(`get-privileges-byId/${userGroupId}`);
        const privileges = response.data.data;
        const homeFilteredData = filterMenuByHomeAccess(filteredData, privileges);
        setMenuData(homeFilteredData);
        // } else {
        //   setMenuData(filteredData);
        // }
      } catch (error) {
        console.error('Error loading menu data:', error);
      } finally {
        setLoading(false);
        setTimeout(() => setIsAnimating(true), 50);
      }
    };

    loadMenuData();
  }, []);

  // Color palette for category underlines
  const colorPalette = [
    { gradient: 'from-blue-500 to-blue-600' },
    { gradient: 'from-purple-500 to-purple-600' },
    { gradient: 'from-emerald-500 to-emerald-600' },
    { gradient: 'from-orange-500 to-orange-600' },
    { gradient: 'from-teal-500 to-teal-600' },
    { gradient: 'from-rose-500 to-rose-600' },
    { gradient: 'from-indigo-500 to-indigo-600' },
    { gradient: 'from-pink-500 to-pink-600' },
    { gradient: 'from-cyan-500 to-cyan-600' },
    { gradient: 'from-lime-500 to-lime-600' },
    { gradient: 'from-amber-500 to-amber-600' },
    { gradient: 'from-fuchsia-500 to-fuchsia-600' },
    { gradient: 'from-sky-500 to-sky-600' },
    { gradient: 'from-violet-500 to-violet-600' },
    { gradient: 'from-red-500 to-red-600' }
  ];

  const colorAssignments = useMemo(() => {
    const assignments = {};
    let colorIndex = 0;

    menuData.menuItems.forEach((category) => {
      assignments[`category-${category.id}`] = colorPalette[colorIndex % colorPalette.length];
      colorIndex++;
    });

    return assignments;
  }, [menuData.menuItems]);

  const renderMenuItem = (item, index, prefix, globalIndex) => {
    
    if (!item.url) return null;

    const animationDelay = globalIndex * 50;
    const cardKey = `${prefix}-${index}`;
    const isHovered = hoveredCard === cardKey;

    // Get the icon component from iconMap
    const IconComponent = iconMap[item.icon];

    return (
      <div
        key={cardKey}
        className="group cursor-pointer"
        onClick={() => navigate(item.url)}
        onMouseEnter={() => setHoveredCard(cardKey)}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          animation: isAnimating ? `fadeInUp 0.6s ease-out ${animationDelay}ms both` : 'none',
        }}
      >
        <div className={`
        relative transition-all duration-300 
        ${isHovered ? 'scale-105' : 'scale-100'}
      `}>
          <div className="flex flex-col items-center gap-2">
            {/* SVG Logo Container */}
            <div
              className={`
              relative w-[60px] h-[60px] rounded-md
              transition-all duration-300
              ${isHovered ? 'shadow-lg shadow-gray-300 dark:shadow-gray-800' : ''}
            `}
              style={{
                animation: isAnimating ? `scaleIn 0.5s ease-out ${animationDelay + 100}ms both` : 'none',
              }}
            >
              {/* Render SVG if available */}
              {item.svgLogo ? (
                <div
                  className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                  dangerouslySetInnerHTML={{ __html: item.svgLogo }}
                />
              ) : (
                // Fallback placeholder if no SVG
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center rounded-md">
                  {IconComponent ? (
                    <IconComponent className="w-7 h-7 text-gray-400" />
                  ) : (
                    // Default fallback icon if icon not found in iconMap
                    <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-black dark:text-gray-400 text-md font-medium">
                        {item.labelEn?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Menu Name Text */}
            <div className="text-center max-w-[110px]">
              <p className={`
              text-sm font-medium leading-tight
              transition-colors duration-300
              ${isHovered
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-950 dark:text-gray-400'
                }
            `}>
                {item.labelEn}
              </p>
              {item.shortKey && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block">
                  {item.shortKey}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCategory = (category, categoryIndex, startGlobalIndex) => {
    if (category.id === 'company') return null;

    const categoryColor = colorAssignments[`category-${category.id}`] || colorPalette[0];
    const menuItems = category.children?.filter(child => !child.isGroupHeader && child.url) || [];

    if (menuItems.length === 0) return null;

    return (
      <div
        key={category.id}
        className="mb-8"
        style={{
          animation: isAnimating ? `fadeInDown 0.5s ease-out ${categoryIndex * 150}ms both` : 'none',
        }}
      >
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {category.labelEn}
          </h2>
          <div
            className={`h-1 bg-gradient-to-r ${categoryColor.gradient} to-transparent rounded-full mt-2 w-24`}
            style={{
              animation: isAnimating ? `expandWidth 0.8s ease-out ${categoryIndex * 150 + 200}ms both` : 'none',
            }}
          ></div>
        </div>

        <div className=" grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-4">
          {menuItems.map((item, index) =>
            renderMenuItem(item, index, `${category.id}-${categoryIndex}`, startGlobalIndex + index)
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className='min-h-[calc(100vh-45px)] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0a0a0a] dark:to-[#111111]'>
        <Preloader />
      </div>
    );
  }

  const hasAnyMenuItems = menuData.menuItems.some(
    category => category.children?.some(child => !child.isGroupHeader && child.url)
  );

  let globalIndex = 0;

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes expandWidth {
          from {
            width: 0;
            opacity: 0;
          }
          to {
            width: 6rem;
            opacity: 1;
          }
        }
      `}</style>

      <div className='min-h-[calc(100vh-45px)]  bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0a0a0a] dark:to-[#111111] relative overflow-hidden'>
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 dark:bg-blue-900/20 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 dark:bg-purple-900/20 rounded-full blur-3xl opacity-20"></div>

        <div className="relative z-10 px-4 py-6 max-w-6xl mx-auto">
          {hasAnyMenuItems ? (
            <>
              {menuData.menuItems.map((category, index) => {
                const menuItems = category.children?.filter(child => !child.isGroupHeader && child.url) || [];
                const currentGlobalIndex = globalIndex;
                globalIndex += menuItems.length;
                return renderCategory(category, index, currentGlobalIndex);
              })}
            </>
          ) : (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center bg-white dark:bg-[#1a1a1a] rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-800">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <iconMap.Package className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('homePage.noAccess') || 'No modules available. Please contact your administrator.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HomePage;