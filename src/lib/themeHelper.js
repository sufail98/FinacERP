// Initialize theme from localStorage or system preference
export const initializeTheme = () => {
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  const theme = savedTheme || (systemPrefersDark ? "dark" : "light");
  
  document.documentElement.classList.toggle("dark", theme === "dark");
  return theme;
};

// Apply theme to document
export const applyTheme = (theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
};