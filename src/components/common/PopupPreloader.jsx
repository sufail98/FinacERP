import { useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

/**
 * PopupPreloader
 *
 * Props:
 *  isOpen       {boolean}  — show/hide the overlay
 *  state        {'loading'|'success'|'error'}  — visual state
 *  title        {string}   — main heading
 *  subtitle     {string}   — helper text beneath the heading
 *  progress     {number|null} — 0-100 fills progress bar; null hides it
 *  dismissable  {boolean}  — allow clicking the backdrop to close
 *  onClose      {Function} — called when backdrop is clicked (if dismissable)
 *  autoClosems  {number|null} — auto-dismiss after N ms on success/error
 *
 * Usage in SalesInvoiceSkin:
 *   <PopupPreloader
 *     isOpen={isSaving}
 *     state="loading"
 *     title="Saving invoice..."
 *     subtitle="Please wait while we process your request."
 *     progress={saveProgress}
 *   />
 */

const STATE_CONFIG = {
  loading: {
    iconBg: 'bg-blue-50 dark:bg-blue-900/30',
    progressColor: 'bg-blue-500',
    icon: null, // rendered separately (animated spinner)
  },
  success: {
    iconBg: 'bg-green-50 dark:bg-green-900/30',
    progressColor: 'bg-green-500',
    icon: CheckCircle2,
    iconColor: 'text-green-600 dark:text-green-400',
  },
  error: {
    iconBg: 'bg-red-50 dark:bg-red-900/30',
    progressColor: 'bg-red-500',
    icon: XCircle,
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

const PopupPreloader = ({
  isOpen = false,
  state = 'loading',
  title = 'Saving...',
  subtitle = 'Please wait while we process your request.',
  progress = null,
  dismissable = false,
  onClose,
  autoClosems = null,
}) => {
  const autoCloseTimer = useRef(null);
  const config = STATE_CONFIG[state] || STATE_CONFIG.loading;

  // Auto-close after success / error
  useEffect(() => {
    if (isOpen && autoClosems && (state === 'success' || state === 'error')) {
      autoCloseTimer.current = setTimeout(() => {
        onClose?.();
      }, autoClosems);
    }
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    };
  }, [isOpen, state, autoClosems, onClose]);

  // Trap focus inside the modal while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement;
    return () => prev?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (dismissable) onClose?.();
  };

  const Icon = config.icon;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[99] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(2px)' }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Card — stop propagation so clicks inside don't close */}
      <div
        className="
          bg-white dark:bg-gray-900
          border border-gray-200 dark:border-gray-700
          rounded-2xl shadow-xl
          p-8 flex flex-col items-center gap-4
          min-w-[260px] max-w-[340px] w-full mx-4
          animate-[popIn_0.2s_ease]
        "
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'popIn 0.2s ease' }}
      >
        {/* Icon area */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${config.iconBg}`}>
          {state === 'loading' ? (
            <Loader2
              className="w-8 h-8 text-[#652d5c] dark:text-blue-400 animate-spin"
              strokeWidth={2}
            />
          ) : (
            Icon && (
              <Icon className={`w-8 h-8 ${config.iconColor}`} strokeWidth={2} />
            )
          )}
        </div>

        {/* Text */}
        <div className="text-center space-y-1">
          <p className="text-base font-medium text-gray-900 dark:text-gray-100 leading-snug">
            {title}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Progress bar */}
        {progress !== null && (
          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${config.progressColor}`}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        )}

        {/* Dismiss hint */}
        {dismissable && (
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            Click anywhere to close
          </p>
        )}
      </div>

      {/* Keyframe injection (one-time) */}
      <style>{`
        @keyframes popIn {
          from { transform: translateY(10px) scale(0.97); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PopupPreloader;