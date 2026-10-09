import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

const BalanceCard = ({ title, amount, type = 'receivable', icon: Icon }) => {
  const isReceivable = type === 'receivable';
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-6.5 hover:shadow-md transition-shadow">
      {/* Icon and Title */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
        <div className={` rounded-full `}>
          {Icon && (
           <img src={Icon} alt="" className="w-6 h-6 sm:w-auto sm:h-auto" />
          )}
        </div>
        <h3 className="text-sm sm:text-lg font-bold text-gray-600 dark:text-gray-400">{title}</h3>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-2">
        <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          {amount}
        </p>
        {isReceivable ? (
          <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-green-500" />
        ) : (
          <TrendingDown className="w-4 h-4 sm:w-6 sm:h-6 text-red-500" />
        )}
      </div>
    </div>
  );
};

export default BalanceCard;