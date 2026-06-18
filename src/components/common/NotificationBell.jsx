import { useState, useEffect, useRef, memo } from 'react';
import {
  Bell, X, CheckCheck, Clock, Plus, ArrowRight,
  AlertCircle, AlertTriangle, Info, CheckCircle2,
  Package, ChevronRight, Check, AlarmClock, Timer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';

// ── Snooze Options ──
const SNOOZE_OPTIONS = [
  { value: 5, label: '5 min', description: 'Quick follow-up' },
  { value: 10, label: '10 min', description: 'Short break' },
  { value: 15, label: '15 min', description: 'After a call' },
  { value: 30, label: '30 min', description: 'Half hour' },
  { value: 60, label: '1 hour', description: 'Next hour' },
  { value: 120, label: '2 hours', description: 'After lunch' },
  { value: 240, label: '4 hours', description: 'Half day' },
  { value: 480, label: '8 hours', description: 'End of day' },
  { value: 1440, label: 'Tomorrow', description: 'Next working day' },
  { value: 10080, label: 'Next week', description: '7 days later' },
];

/* ──────────────────────────────────────────────
   Single Notification Item (Memoized to prevent flicker)
   ────────────────────────────────────────────── */
const NotificationItem = memo(({
  reminder,
  isMarking,
  isSnoozing,
  isSnoozeOpen,
  onMarkAsRead,
  onSnoozeClick,
  getPriorityIcon,
  getPriorityConfig,
  getStatusConfig,
  formatDate,
  isOverdue,
}) => {
  const isAnimatingOut = isMarking || isSnoozing;
  const pConfig = getPriorityConfig(reminder.priority);
  const sConfig = getStatusConfig(reminder.status);
  const overdue = isOverdue(reminder.start_date);
  const isPending = reminder.status?.toLowerCase() === 'pending';

  return (
    <li
      className={`relative group border-l-[3px] ${pConfig.border}
        ${isPending ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-900'}
        hover:bg-gray-50 dark:hover:bg-gray-800/50
        transition-all duration-300 ease-in-out
        ${isAnimatingOut ? 'opacity-0 max-h-0 !py-0 overflow-hidden border-l-0' : 'opacity-100 max-h-[200px]'}`}
    >
      <div className={`px-4 py-2.5 transition-all duration-300 ${isAnimatingOut ? 'py-0' : ''}`}>
        {/* Single row: Icon + Title + Status + Actions */}
        <div className="flex items-center gap-2">
          {/* Priority Icon */}
          <div className="flex-shrink-0">
            {getPriorityIcon(reminder.priority)}
          </div>

          {/* Title + Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-[13px] truncate ${
                  isPending
                    ? 'font-semibold text-gray-900 dark:text-white'
                    : 'font-medium text-gray-700 dark:text-gray-200'
                }`}
              >
                {reminder.title}
              </span>
              {isPending && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
              )}
            </div>
            {/* Compact meta line */}
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`flex items-center gap-1 text-[10px] ${
                  overdue
                    ? 'text-red-500 dark:text-red-400 font-medium'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <Clock size={9} />
                {overdue && '⚠ '}
                {formatDate(reminder.start_date)}
                {reminder.start_time && ` · ${reminder.start_time?.substring(0, 5)}`}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0 rounded-full ${sConfig.class}`}>
                {sConfig.label}
              </span>
            </div>
          </div>

          {/* Action buttons — always visible, compact */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Snooze */}
            <button
              onClick={(e) => onSnoozeClick(e, reminder.id)}
              disabled={isSnoozing}
              className={`p-1.5 rounded-md transition-all duration-200
                ${
                  isSnoozing
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 cursor-not-allowed'
                    : isSnoozeOpen
                      ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
                      : 'text-gray-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                }`}
              title={isSnoozing ? 'Snoozed' : 'Snooze'}
            >
              <AlarmClock size={14} />
            </button>

            {/* Mark as Read */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(reminder);
              }}
              disabled={isMarking}
              className={`p-1.5 rounded-md transition-all duration-200
                ${
                  isMarking
                    ? 'text-green-500 bg-green-50 dark:bg-green-900/20 cursor-not-allowed'
                    : 'text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
              title={isMarking ? 'Done' : 'Mark as read'}
            >
              {isMarking ? <CheckCheck size={14} /> : <Check size={14} />}
            </button>
          </div>
        </div>

        {/* Description — only show if exists, single line */}
        {reminder.description && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-1 pl-[23px]">
            {reminder.description}
          </p>
        )}
      </div>
    </li>
  );
});

NotificationItem.displayName = 'NotificationItem';

/* ──────────────────────────────────────────────
   Main NotificationBell Component
   ────────────────────────────────────────────── */
const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [allReminders, setAllReminders] = useState([]);
  const [reorderCount, setReorderCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingIds, setMarkingIds] = useState([]);
  const [markingAll, setMarkingAll] = useState(false);
  const [snoozeOpenId, setSnoozeOpenId] = useState(null);
  const [snoozePosition, setSnoozePosition] = useState({ top: 0, left: 0 });
  const [snoozingIds, setSnoozingIds] = useState([]);
  const [snoozedItems, setSnoozedItems] = useState([]);
  const snoozeDropdownRef = useRef(null);
  const snoozeTimersRef = useRef({});
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedBranchId, userId } = useAuth();

  const visibleReminders = allReminders.filter(
    (r) =>
      (r.status?.toLowerCase() === 'pending' || r.status?.toLowerCase() === 'active') &&
      !snoozedItems.includes(r.id)
  );
  const unreadCount = visibleReminders.length;
  const snoozedCount = snoozedItems.length;
  const totalAlertCount = unreadCount + reorderCount;

  // ── Load snoozed items from localStorage ──
  useEffect(() => {
    const stored = localStorage.getItem('snoozedReminders');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        const stillSnoozed = [];

        parsed.forEach((item) => {
          if (item.wakeUpTime > now) {
            stillSnoozed.push(item.id);
            const remaining = item.wakeUpTime - now;
            snoozeTimersRef.current[item.id] = setTimeout(() => {
              unsnoozeReminder(item.id);
            }, remaining);
          }
        });

        setSnoozedItems(stillSnoozed);
        localStorage.setItem(
          'snoozedReminders',
          JSON.stringify(parsed.filter((item) => item.wakeUpTime > now))
        );
      } catch (e) {
        localStorage.removeItem('snoozedReminders');
      }
    }

    return () => {
      Object.values(snoozeTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  // ── Close snooze on outside click ──
  useEffect(() => {
    if (!snoozeOpenId) return;
    const handler = (e) => {
      if (snoozeDropdownRef.current && !snoozeDropdownRef.current.contains(e.target)) {
        setSnoozeOpenId(null);
      }
    };
    // Use setTimeout to avoid closing immediately on the same click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [snoozeOpenId]);

  // ── Fetch ──
  const fetchReminders = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`general-reminder/${selectedBranchId}`);
      setAllReminders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReorderCount = async () => {
    try {
      const response = await axiosInstance.post('notifications/reorder', {
        branchid: selectedBranchId || 1,
      });
      setReorderCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching reorder count:', error);
    }
  };

  // ── Panel ──
  const openPanel = () => {
    setIsMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsOpen(true));
    });
  };

  const closePanel = () => {
    setIsOpen(false);
    setSnoozeOpenId(null);
    setTimeout(() => setIsMounted(false), 320);
  };

  const toggleOffcanvas = () => {
    if (isOpen) closePanel();
    else openPanel();
  };

  useEffect(() => {
    if (isOpen) {
      fetchReminders();
      fetchReorderCount();
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (snoozeOpenId) setSnoozeOpenId(null);
        else closePanel();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, selectedBranchId, snoozeOpenId]);

  // ── Snooze click — capture position instantly ──
  const handleSnoozeClick = (e, reminderId) => {
    e.stopPropagation();

    if (snoozeOpenId === reminderId) {
      setSnoozeOpenId(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownWidth = 220;
    const dropdownHeight = 340;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const margin = 8;

    let left = rect.right - dropdownWidth;
    if (left < margin) left = margin;
    if (left + dropdownWidth > viewportWidth - margin) {
      left = viewportWidth - dropdownWidth - margin;
    }

    const spaceBelow = viewportHeight - rect.bottom;
    let top;
    if (spaceBelow >= dropdownHeight + margin) {
      top = rect.bottom + 4;
    } else {
      top = rect.top - dropdownHeight - 4;
      if (top < margin) top = margin;
    }

    setSnoozePosition({ top, left });
    setSnoozeOpenId(reminderId);
  };

  // ── Mark as Read ──
  const markAsRead = async (reminder) => {
    try {
      setMarkingIds((prev) => [...prev, reminder.id]);
      setSnoozeOpenId(null);

      const payload = {
        title: reminder.title,
        description: reminder.description || '',
        start_date: reminder.start_date || '',
        start_time: reminder.start_time || '',
        end_date: reminder.end_date || '',
        end_time: reminder.end_time || '',
        all_day: reminder.all_day || false,
        recurrence: reminder.recurrence || 'none',
        reminder_before: reminder.reminder_before || 30,
        priority: reminder.priority || 'Medium',
        status: 'Completed',
        userId: reminder.userId || userId,
        branchId: reminder.branchId || selectedBranchId,
        ModifiedUser: userId,
      };

      await axiosInstance.post(`general-reminder/update/${reminder.id}`, payload);

      setTimeout(() => {
        setAllReminders((prev) =>
          prev.map((r) => (r.id === reminder.id ? { ...r, status: 'Completed' } : r))
        );
        setMarkingIds((prev) => prev.filter((mid) => mid !== reminder.id));
      }, 300);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setMarkingIds((prev) => prev.filter((mid) => mid !== reminder.id));
    }
  };

  // ── Mark All as Read ──
  const markAllAsRead = async () => {
    if (visibleReminders.length === 0) return;

    try {
      setMarkingAll(true);
      setSnoozeOpenId(null);

      await Promise.all(
        visibleReminders.map((reminder) => {
          const payload = {
            title: reminder.title,
            description: reminder.description || '',
            start_date: reminder.start_date || '',
            start_time: reminder.start_time || '',
            end_date: reminder.end_date || '',
            end_time: reminder.end_time || '',
            all_day: reminder.all_day || false,
            recurrence: reminder.recurrence || 'none',
            reminder_before: reminder.reminder_before || 30,
            priority: reminder.priority || 'Medium',
            status: 'Completed',
            userId: reminder.userId || userId,
            branchId: reminder.branchId || selectedBranchId,
            ModifiedUser: userId,
          };
          return axiosInstance.post(`general-reminder/update/${reminder.id}`, payload);
        })
      );

      setTimeout(() => {
        setAllReminders((prev) =>
          prev.map((r) => {
            const isVisible =
              r.status?.toLowerCase() === 'pending' || r.status?.toLowerCase() === 'active';
            return isVisible && !snoozedItems.includes(r.id)
              ? { ...r, status: 'Completed' }
              : r;
          })
        );
        setMarkingAll(false);
      }, 300);
    } catch (error) {
      console.error('Error marking all as read:', error);
      setMarkingAll(false);
    }
  };

  // ── Snooze ──
  const snoozeReminder = (reminderId, minutes) => {
    setSnoozingIds((prev) => [...prev, reminderId]);
    setSnoozeOpenId(null);

    const wakeUpTime = Date.now() + minutes * 60 * 1000;

    const stored = JSON.parse(localStorage.getItem('snoozedReminders') || '[]');
    const filtered = stored.filter((item) => item.id !== reminderId);
    filtered.push({ id: reminderId, wakeUpTime, minutes });
    localStorage.setItem('snoozedReminders', JSON.stringify(filtered));

    setTimeout(() => {
      setSnoozedItems((prev) => [...prev, reminderId]);
      setSnoozingIds((prev) => prev.filter((id) => id !== reminderId));

      if (snoozeTimersRef.current[reminderId]) {
        clearTimeout(snoozeTimersRef.current[reminderId]);
      }
      snoozeTimersRef.current[reminderId] = setTimeout(() => {
        unsnoozeReminder(reminderId);
      }, minutes * 60 * 1000);
    }, 300);
  };

  const unsnoozeReminder = (reminderId) => {
    setSnoozedItems((prev) => prev.filter((id) => id !== reminderId));

    const stored = JSON.parse(localStorage.getItem('snoozedReminders') || '[]');
    localStorage.setItem(
      'snoozedReminders',
      JSON.stringify(stored.filter((item) => item.id !== reminderId))
    );

    if (snoozeTimersRef.current[reminderId]) {
      delete snoozeTimersRef.current[reminderId];
    }
  };

  // ── Helpers ──
  const getPriorityConfig = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return { border: 'border-l-red-500' };
      case 'medium': return { border: 'border-l-amber-500' };
      case 'low': return { border: 'border-l-emerald-500' };
      default: return { border: 'border-l-blue-500' };
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return <AlertCircle size={14} className="text-red-500" />;
      case 'medium': return <AlertTriangle size={14} className="text-amber-500" />;
      case 'low': return <CheckCircle2 size={14} className="text-emerald-500" />;
      default: return <Info size={14} className="text-blue-500" />;
    }
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return {
          label: 'Pending',
          class: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 ring-1 ring-yellow-200 dark:ring-yellow-800',
        };
      case 'active':
        return {
          label: 'Active',
          class: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800',
        };
      default:
        return {
          label: status || 'Unknown',
          class: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-600',
        };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays}d`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}d ago`;

    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const isOverdueCheck = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  return (
    <>
      {/* ── Bell Button ── */}
      <button
        onClick={toggleOffcanvas}
        className="relative p-2 text-white hover:bg-white/10 rounded-full transition-colors duration-200"
        aria-label="Open notifications"
      >
        <Bell size={20} />
        {totalAlertCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-lg animate-pulse">
            {totalAlertCount > 99 ? '99+' : totalAlertCount}
          </span>
        )}
      </button>

      {/* ── Backdrop ── */}
      {isMounted && (
        <div
          onClick={closePanel}
          style={{ zIndex: 99998 }}
          className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* ── Side Panel ── */}
      {isMounted && (
        <div
          style={{ zIndex: 99999 }}
          className={`fixed top-0 right-0 h-full w-full sm:w-[380px] flex flex-col
            bg-white dark:bg-gray-900 shadow-2xl
            transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {/* ── Header ── */}
          <div className="main-bg flex-shrink-0 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <Bell size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white leading-tight">Notifications</h2>
                <p className="text-[10px] text-white/70 mt-0.5">
                  {totalAlertCount} {totalAlertCount === 1 ? 'alert' : 'alerts'}
                  {snoozedCount > 0 && ` · ${snoozedCount} snoozed`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => { closePanel(); navigate('/general-reminder/create'); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-white/15 hover:bg-white/25 rounded-md transition-colors"
              >
                <Plus size={12} />
                New
              </button>
              <button
                onClick={closePanel}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-md transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Toolbar ── */}
          {unreadCount > 0 && (
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {unreadCount} active
              </span>
              <button
                onClick={markAllAsRead}
                disabled={markingAll}
                className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors
                  ${markingAll
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
              >
                {markingAll ? (
                  <><div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" /> Marking...</>
                ) : (
                  <><CheckCheck size={12} /> Mark all read</>
                )}
              </button>
            </div>
          )}

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Stock Reorder */}
            {reorderCount > 0 && (
              <button
                onClick={() => { closePanel(); navigate('/notifications/stock-reorder'); }}
                className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800
                  hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/25 flex items-center justify-center flex-shrink-0">
                    <Package size={15} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white">Stock Reorder</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{reorderCount} items</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-gray-400" />
              </button>
            )}

            {/* Snoozed Banner */}
            {snoozedCount > 0 && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20 flex items-center gap-1.5">
                <AlarmClock size={12} className="text-amber-500 flex-shrink-0" />
                <span className="text-[10px] text-amber-700 dark:text-amber-400">
                  {snoozedCount} snoozed — will reappear automatically
                </span>
              </div>
            )}

            {/* Reminders List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs">Loading…</span>
              </div>
            ) : visibleReminders.length === 0 && reorderCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-400 dark:text-gray-500 px-6">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <Bell size={22} strokeWidth={1.5} className="opacity-50" />
                </div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                  {snoozedCount > 0 ? 'All reminders snoozed' : 'No notifications'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-0.5">
                  {snoozedCount > 0
                    ? `${snoozedCount} snoozed — they'll come back!`
                    : "You're all caught up!"}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleReminders.map((reminder) => (
                  <NotificationItem
                    key={reminder.id}
                    reminder={reminder}
                    isMarking={markingIds.includes(reminder.id)}
                    isSnoozing={snoozingIds.includes(reminder.id)}
                    isSnoozeOpen={snoozeOpenId === reminder.id}
                    onMarkAsRead={markAsRead}
                    onSnoozeClick={handleSnoozeClick}
                    getPriorityIcon={getPriorityIcon}
                    getPriorityConfig={getPriorityConfig}
                    getStatusConfig={getStatusConfig}
                    formatDate={formatDate}
                    isOverdue={isOverdueCheck}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* ── Footer ── */}
          {(visibleReminders.length > 0 || reorderCount > 0 || snoozedCount > 0) && (
            <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 bg-white dark:bg-gray-900">
              <button
                onClick={() => { closePanel(); navigate('/general/reminders'); }}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg
                  text-xs font-medium text-blue-600 dark:text-blue-400
                  bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30
                  border border-blue-200 dark:border-blue-800 transition-colors"
              >
                View all reminders
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Snooze Dropdown (fixed position, outside panel) ── */}
      {snoozeOpenId && (
        <div
          ref={snoozeDropdownRef}
          style={{
            position: 'fixed',
            top: `${snoozePosition.top}px`,
            left: `${snoozePosition.left}px`,
            zIndex: 100001,
            width: '220px',
          }}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
            rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50
            dark:from-amber-900/20 dark:to-orange-900/20
            border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Timer size={12} className="text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  Snooze for...
                </span>
              </div>
              <button
                onClick={() => setSnoozeOpenId(null)}
                className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          </div>

          {/* Options — compact */}
          <div className="max-h-60 overflow-y-auto py-0.5 custom-scrollbar">
            {SNOOZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => snoozeReminder(snoozeOpenId, option.value)}
                className="w-full flex items-center justify-between px-3 py-[7px]
                  hover:bg-amber-50 dark:hover:bg-amber-900/15 transition-colors text-left group/snooze"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700
                    group-hover/snooze:bg-amber-100 dark:group-hover/snooze:bg-amber-900/30
                    flex items-center justify-center transition-colors">
                    <Clock size={10} className="text-gray-400 group-hover/snooze:text-amber-600 dark:group-hover/snooze:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-gray-800 dark:text-gray-200 leading-tight">
                      {option.label}
                    </p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-tight">
                      {option.description}
                    </p>
                  </div>
                </div>
                <ChevronRight size={10} className="text-gray-300 group-hover/snooze:text-amber-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;