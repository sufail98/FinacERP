// src/lib/dateFormat.js

/**
 * Format date according to the selected format
 * @param {string|Date} dateValue - Date string or Date object
 * @param {string} format - Format pattern (e.g., "dd-MM-yyyy", "MM-dd-yyyy")
 * @returns {string} Formatted date string
 */
export const formatDate = (dateValue, format = "dd-MM-yyyy") => {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return dateValue;

  const dd = String(date.getDate()).padStart(2, "0");
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  return format
    .replace("dd", dd)
    .replace("MM", MM)
    .replace("yyyy", yyyy);
};

/**
 * Format date with month name (for prints)
 * @param {string|Date} dateValue
 * @param {string} format - e.g., "dd-MMM-yyyy" or settings format
 * @returns {string}
 */
export const formatDateWithMonthName = (dateValue, format = "dd-MM-yyyy") => {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return dateValue;

  const dd = String(date.getDate()).padStart(2, "0");
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MMM = monthNames[date.getMonth()];

  // If format contains MMM, use month name
  if (format.includes("MMM")) {
    return format
      .replace("dd", dd)
      .replace("MMM", MMM)
      .replace("yyyy", yyyy);
  }

  // Otherwise use the standard format
  return format
    .replace("dd", dd)
    .replace("MM", MM)
    .replace("yyyy", yyyy);
};

/**
 * Parse date string according to format and return yyyy-MM-dd for API/input
 * @param {string} dateString - Formatted date string
 * @param {string} format - The format the date is in
 * @returns {string} Date in yyyy-MM-dd format
 */
export const parseDate = (dateString, format = "dd-MM-yyyy") => {
  if (!dateString) return "";

  // If already in yyyy-MM-dd format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // Handle ISO date strings
  if (dateString.includes("T")) {
    return dateString.split("T")[0];
  }

  const separator = dateString.includes("/") ? "/" : "-";
  const parts = dateString.split(separator);
  const formatParts = format.split("-");

  if (parts.length !== 3) return dateString;

  let day, month, year;

  formatParts.forEach((part, index) => {
    if (part === "dd") day = parts[index];
    else if (part === "MM") month = parts[index];
    else if (part === "yyyy") year = parts[index];
  });

  if (!day || !month || !year) return dateString;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

/**
 * Get today's date in yyyy-MM-dd format (for input value)
 * @returns {string}
 */
export const getTodayForInput = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Get today's date formatted according to user preference
 * @param {string} format
 * @returns {string}
 */
export const getTodayFormatted = (format = "dd-MM-yyyy") => {
  return formatDate(new Date(), format);
};

/**
 * Convert API date (ISO/yyyy-MM-dd) to display format
 * @param {string} apiDate - Date from API
 * @param {string} format - Display format
 * @returns {string}
 */
export const apiDateToDisplay = (apiDate, format = "dd-MM-yyyy") => {
  if (!apiDate) return "";

  // Handle ISO date strings (2024-01-15T00:00:00.000Z)
  const dateOnly = apiDate.split("T")[0];
  return formatDate(dateOnly, format);
};

/**
 * Normalize date to yyyy-MM-dd format for inputs
 * @param {string|Date} value
 * @returns {string}
 */
export const normalizeDateForInput = (value) => {
  if (!value) return "";

  // If value is already yyyy-MM-dd
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // Handle ISO strings
  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }

  const d = new Date(value);
  if (isNaN(d)) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};





export const parseLocalDate = (value) => {
  if (!value) return new Date().toISOString().split('T')[0];

  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  // return YYYY-MM-DD (perfect for input[type="date"] & date pickers)
  return date.toISOString().split('T')[0];
};

   export const parseDateFromAPI = (dateString) => {
    if (!dateString) return "";
    
    // If already a Date object, return as-is
    if (dateString instanceof Date) {
        return dateString;
    }
    
    // Handle API format: "2026-01-23 00:00:00" or "2026-01-23"
    const dateStr = String(dateString).split(' ')[0]; // Get "2026-01-23"
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Create date at noon to avoid timezone issues
    const date = new Date(year, month - 1, day, 12, 0, 0);
    
    return date;
};

export const formatDateWithTime = (date) => {
    if (!date) return null;
    const d = new Date(date);
    // Format as YYYY-MM-DD 00:00:00
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00:00`;
};