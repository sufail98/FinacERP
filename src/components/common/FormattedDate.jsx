// src/components/common/FormattedDate.jsx

import { useSelector } from "react-redux";
import { formatDate } from "@/lib/dateFormat";
import PropTypes from "prop-types";

/**
 * Component to display dates in the user's preferred format
 * Use this in tables, cards, reports, etc.
 */
const FormattedDate = ({ 
  value, 
  fallback = "-",
  className = "",
  showTime = false 
}) => {
  const { generalSettings } = useSelector((state) => state.settings);
  const dateFormat = generalSettings?.dateformat || "dd-MM-yyyy";

  if (!value) return <span className={className}>{fallback}</span>;

  const formattedDate = formatDate(value, dateFormat);

  // Optionally add time
  let displayValue = formattedDate;
  if (showTime && value) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const time = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
      displayValue = `${formattedDate} ${time}`;
    }
  }

  return <span className={className}>{displayValue || fallback}</span>;
};

FormattedDate.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  fallback: PropTypes.string,
  className: PropTypes.string,
  showTime: PropTypes.bool,
};

export default FormattedDate;