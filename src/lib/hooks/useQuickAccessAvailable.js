// src/hooks/useQuickAccessAvailable.js
//
// Tiny pub/sub store (not React Context) so components anywhere in the tree
// can know whether the QuickAccessMenu FAB is currently rendered, without
// needing a shared provider wrapping the whole app.

import { useEffect, useState } from 'react';

let currentValue = null; // null = not determined yet, boolean once QuickAccessMenu reports
const listeners = new Set();

/**
 * Call this from QuickAccessMenu whenever it knows whether it has
 * visible items (i.e. whether its FAB is rendered).
 */
export const setQuickAccessAvailable = (value) => {
    if (currentValue === value) return;
    currentValue = value;
    listeners.forEach((listener) => listener(value));
};

/**
 * Call this from any component (e.g. HelpShortcuts) that needs to know
 * whether the Quick Access FAB is currently occupying its usual spot.
 * Returns: null (unknown yet) | true | false
 */
export const useQuickAccessAvailable = () => {
    const [value, setValue] = useState(currentValue);

    useEffect(() => {
        listeners.add(setValue);
        return () => listeners.delete(setValue);
    }, []);

    return value;
};