import React from 'react';

export const SidebarLoadingPlaceholder = ({
  isLoading = true,
  menuItems = 13,
  showLogo = true
}) => {
  if (isLoading) {
    return (
      <div className="w-full h-[70vh] sidebar-bg border-r border-gray-200 dark:border-gray-700 p-4">
        {/* Menu items skeleton */}
        <div className="space-y-4">
          {Array.from({ length: menuItems }).map((_, index) => (
            <div key={index} className="flex items-center space-x-3">
              {/* Icon placeholder */}
              <div className="w-5 h-5 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
              
              {/* Text placeholder with varying widths */}
              {/* <div 
                className={`h-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse ${
                  index % 3 === 0 ? 'w-20' : 
                  index % 3 === 1 ? 'w-24' : 'w-16'
                }`}
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              ></div> */}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};