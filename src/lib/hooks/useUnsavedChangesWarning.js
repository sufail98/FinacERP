import { useEffect, useCallback, useContext } from 'react';
import { useLocation, useNavigate, UNSAFE_NavigationContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

/**
 * Hook to warn user about unsaved changes before navigating away
 * @param {boolean} hasUnsavedChanges - Whether form has unsaved changes
 * @param {boolean} isSubmitting - Whether form is currently submitting
 */
const useUnsavedChangesWarning = (hasUnsavedChanges, isSubmitting = false) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Access the navigator from React Router's context
  const navigator = useContext(UNSAFE_NavigationContext).navigator;

  // Block navigation when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || isSubmitting) return;

    // Store the original push method
    const originalPush = navigator.push;
    const originalReplace = navigator.replace;

    // Override push method to show confirmation
    navigator.push = async (...args) => {
      const result = await Swal.fire({
        title: t('unsavedChanges.title') || 'Unsaved Changes',
        text: t('unsavedChanges.text') || 'You have unsaved changes. Do you want to discard them?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: t('unsavedChanges.discard') || 'Discard Changes',
        cancelButtonText: t('unsavedChanges.keepWriting') || 'Keep Writing',
        reverseButtons: true,
      });

      if (result.isConfirmed) {
        // User confirmed, allow navigation
        originalPush.apply(navigator, args);
      }
      // else: User cancelled, do nothing (stay on page)
    };

    // Override replace method
    navigator.replace = async (...args) => {
      const result = await Swal.fire({
        title: t('unsavedChanges.title') || 'Unsaved Changes',
        text: t('unsavedChanges.text') || 'You have unsaved changes. Do you want to discard them?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: t('unsavedChanges.discard') || 'Discard Changes',
        cancelButtonText: t('unsavedChanges.keepWriting') || 'Keep Writing',
        reverseButtons: true,
      });

      if (result.isConfirmed) {
        originalReplace.apply(navigator, args);
      }
    };

    // Cleanup: restore original methods
    return () => {
      navigator.push = originalPush;
      navigator.replace = originalReplace;
    };
  }, [hasUnsavedChanges, isSubmitting, navigator, t]);

  // Handle browser back/forward/refresh
  useEffect(() => {
    if (!hasUnsavedChanges || isSubmitting) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
      return ''; // Some browsers need return value
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, isSubmitting]);
};

export default useUnsavedChangesWarning;