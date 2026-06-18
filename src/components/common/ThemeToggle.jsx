import { Moon, Sun } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toggleTheme } from "@/redux/slice/theme/themeSlice";
import { selectIsDarkMode } from "@/redux/slice/theme/themeSelectors";
import { Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";

const ThemeToggle = () => {
  const dispatch = useDispatch();
  const isDark = useSelector(selectIsDarkMode);
  const { t } = useTranslation();

  const handleToggle = () => {
    dispatch(toggleTheme());
  };

  return (
    <Tooltip title={isDark ? t("theme.light") : t("theme.dark")} placement="bottom">
      <button
        onClick={handleToggle}
        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun size={20} className="text-yellow-400" />
        ) : (
          <Moon size={20} className="text-gray-600" />
        )}
      </button>
    </Tooltip>
  );
};

export default ThemeToggle;