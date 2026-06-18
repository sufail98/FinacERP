import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const TableSearchBar = ({ value, onChange, onClear }) => {
  const { t } = useTranslation();
  
  return (
    <div className="relative w-full">
      {/* Search Icon */}
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />

      {/* Input Field */}
      <Input
        type="text"
        placeholder={t("search")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10 
          bg-white dark:bg-gray-800 
          text-gray-900 dark:text-gray-100
          border-gray-300 dark:border-gray-600
          placeholder:text-gray-400 dark:placeholder:text-gray-500
          focus:border-blue-500 dark:focus:border-blue-400
          focus:ring-blue-500 dark:focus:ring-blue-400"
      />

      {/* Clear Button */}
      {value && (
        <button
          onClick={onClear}
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 
            text-gray-400 dark:text-gray-500 
            hover:text-gray-600 dark:hover:text-gray-300 
            transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

TableSearchBar.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

export default TableSearchBar;