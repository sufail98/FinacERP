import { useEffect } from 'react';

/**
 * Custom hook to handle Ctrl+S keyboard shortcut for form submission
 * @param {Function} onSave - Callback function to execute when Ctrl+S is pressed
 * @param {Array} dependencies - Dependencies array (similar to useEffect dependencies)
 * @param {boolean} disabled - Whether the shortcut should be disabled (e.g., when loading)
 * @param {Object} options - Additional options
 * @param {boolean} options.preventDefault - Whether to prevent browser's default save behavior (default: true)
 * @param {boolean} options.stopPropagation - Whether to stop event propagation (default: false)
 */
const useCtrlSave = (onSave, dependencies = [], disabled = false, options = {}) => {
    const { 
        preventDefault = true, 
        stopPropagation = false 
    } = options;

    useEffect(() => {
        if (disabled || typeof onSave !== 'function') {
            return;
        }

        const handleKeyDown = (event) => {
            // Check if Ctrl+S is pressed (Cmd+S on Mac)
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                if (preventDefault) {
                    event.preventDefault();
                }
                
                if (stopPropagation) {
                    event.stopPropagation();
                }
                
                // Call the save function
                onSave(event);
            }
        };

        // Add event listener to document
        document.addEventListener('keydown', handleKeyDown);

        // Cleanup function to remove event listener
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onSave, disabled, preventDefault, stopPropagation, ...dependencies]);
};

export default useCtrlSave;