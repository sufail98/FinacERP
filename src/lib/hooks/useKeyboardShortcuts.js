import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Custom Hook: useKeyboardShortcuts
 * ---------------------------------
 * Easily register global keyboard shortcuts across your app.
 *
 * Example usage:
 * useKeyboardShortcuts({
 *   "Ctrl+F8": () => navigate("/transaction/sales-invoice"),
 *   "Ctrl+F9": () => navigate("/transaction/sales-order"),
 * });
 */
const useKeyboardShortcuts = (shortcuts = {}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toUpperCase();
      const combo = [
        e.ctrlKey || e.metaKey ? "CTRL" : null,
        e.shiftKey ? "SHIFT" : null,
        e.altKey ? "ALT" : null,
        key,
      ]
        .filter(Boolean)
        .join("+");

      // Check if the combo matches a registered shortcut
      const action = shortcuts[combo];
      if (action) {
        e.preventDefault();
        action(navigate);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, navigate]);
};

export default useKeyboardShortcuts;
