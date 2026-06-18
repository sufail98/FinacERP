import React from "react";

const AddNewBtn = ({
  onClick,
  icon: Icon,
  label,
  type = "button",
  className = "",
}) => {
  return (
    <button
      type={type}
      className={`h-6 rounded-[3px] px-3 main-bg text-white  hover:main-bg transition-colors flex items-center justify-center flex-shrink-0 ${className}`}
      onClick={onClick}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label && <span className="ml-1">{label}</span>}
    </button>
  );
};

export default AddNewBtn;
