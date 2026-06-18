import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

const BalanceCard = ({ title, amount, type = 'receivable', icon: Icon }) => {
  const isReceivable = type === 'receivable';
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6.5 hover:shadow-md transition-shadow">
      {/* Icon and Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className={` rounded-full `}>
          {Icon && (
           <img src={Icon} alt="" />
          )}
        </div>
        <h3 className="text-lg font-bold text-gray-600 dark:text-gray-400">{title}</h3>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-2">
        <p className="text-4xl font-bold text-gray-900 dark:text-white">
          {amount}
        </p>
        {isReceivable ? (
          <TrendingUp className="w-6 h-6 text-green-500" />
        ) : (
          <TrendingDown className="w-6 h-6 text-red-500" />
        )}
      </div>
    </div>
  );
};

export default BalanceCard;