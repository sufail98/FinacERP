// salesQuotationDateFormat.js
// Isolated date utilities for Sales Quotation — timezone-safe versions

/**
 * Parse a value to local yyyy-MM-dd string WITHOUT UTC conversion.
 * @param {string|Date} value
 * @returns {string} yyyy-MM-dd
 */
export const parseLocalDate = (value) => {
  if (!value) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // If it's a string, extract the date part directly WITHOUT creating a Date object
  if (typeof value === 'string') {
    const dateStr = value.split('T')[0].split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
  }

  // For Date objects, use LOCAL methods (not .toISOString() which converts to UTC)
  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse API date string into a local Date object safely.
 * Handles "2026-03-10 00:00:00", "2026-03-10T00:00:00.000Z", and "2026-03-10".
 * @param {string|Date} dateString
 * @returns {Date}
 */
export const parseDateFromAPI = (dateString) => {
  if (!dateString) return "";

  if (dateString instanceof Date) {
    return dateString;
  }

  const dateStr = String(dateString).split('T')[0].split(' ')[0];
  const [year, month, day] = dateStr.split('-').map(Number);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.warn("parseDateFromAPI: Invalid date string:", dateString);
    return new Date();
  }

  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date;
};