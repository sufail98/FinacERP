// src/hooks/useDateFormat.js

import { useSelector } from "react-redux";
import { 
  formatDate, 
  parseDate, 
  apiDateToDisplay, 
  getTodayForInput, 
  getTodayFormatted,
  formatDateWithMonthName,
  normalizeDateForInput
} from "@/lib/dateFormat";

/**
 * Custom hook to handle date formatting based on user settings
 */
const useDateFormat = () => {
  const { generalSettings } = useSelector((state) => state.settings);
  const dateFormat = generalSettings?.dateformat || "dd-MM-yyyy";

  return {
    // The current date format setting
    dateFormat,

    // Format a date for display
    format: (date) => formatDate(date, dateFormat),

    // Format with month name (for prints)
    formatWithMonthName: (date) => formatDateWithMonthName(date, dateFormat),

    // Parse a formatted date back to yyyy-MM-dd
    parse: (dateString) => parseDate(dateString, dateFormat),

    // Convert API date to display format
    fromApi: (apiDate) => apiDateToDisplay(apiDate, dateFormat),

    // Get today formatted
    today: () => getTodayFormatted(dateFormat),

    // Get today for input (always yyyy-MM-dd)
    todayForInput: getTodayForInput,

    // Normalize date for input
    normalizeForInput: normalizeDateForInput,

    // Raw formatDate function with custom format
    formatWithCustom: formatDate,
  };
};

export default useDateFormat;