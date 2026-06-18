import { useEffect } from 'react';

/**
 * useSaveShortcut
 * @param {function} onSave - Function to call when Ctrl+S / Cmd+S is pressed
 * @param {boolean} active - Enable/disable the shortcut
 */
const useSaveShortcut = (onSave, active = true) => {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault(); // prevent browser's save dialog
        onSave({ preventDefault: () => {} });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave, active]);
};

export default useSaveShortcut;
