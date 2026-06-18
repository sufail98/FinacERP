// ShadCnSelect.jsx
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import PropTypes from "prop-types";

const ShadCnSelect = ({
  label,
  name,
  placeholder = "Select an option",
  options = [],
  value,
  onChange,
  error,
  required = false,
  className = "",
  optionLabelKey = "label", // allows flexible object keys
  optionValueKey = "value",
}) => {
  return (
    <div>
      {label && (
        <Label className="text-xs font-medium mb-1 block">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger
          className={`w-full ${error ? "border-red-500" : ""} ${className}`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt[optionValueKey]} value={opt[optionValueKey]}>
              {opt[optionLabelKey]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

ShadCnSelect.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string,
  placeholder: PropTypes.string,
  options: PropTypes.array.isRequired, // expects [{label, value}, ...]
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
  optionLabelKey: PropTypes.string,
  optionValueKey: PropTypes.string,
};

export default ShadCnSelect;
