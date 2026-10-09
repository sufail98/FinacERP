import { useEffect, useState, useMemo } from 'react';

const INTERVAL_MS = 5 * 60 * 1000; // reappear every 5 minutes
const VISIBLE_MS = 30 * 1000;      // how long each appearance lasts
const WARNING_DAYS = 30;           // show only within 1 month of expiry

// Handles "2026-10-16 00:00:00", "2026-10-16T00:00:00.000Z", Date objects, etc.
const parseExpiry = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (d) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
};

const PlanExpiryMarquee = ({ expDate }) => {
  const [visible, setVisible] = useState(false);

  // Compute days left (based on calendar days, ignoring time of day)
  const { daysLeft, expiry } = useMemo(() => {
    const expiry = parseExpiry(expDate);
    if (!expiry) return { daysLeft: null, expiry: null };

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfExpiry = new Date(expiry);
    startOfExpiry.setHours(0, 0, 0, 0);

    const diff = Math.round((startOfExpiry - startOfToday) / (1000 * 60 * 60 * 24));
    return { daysLeft: diff, expiry };
  }, [expDate]);

  const shouldShow = daysLeft !== null && daysLeft >= 0 && daysLeft <= WARNING_DAYS;

  useEffect(() => {
    if (!shouldShow) {
      setVisible(false);
      return;
    }

    let hideTimer;

    const show = () => {
      setVisible(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setVisible(false), VISIBLE_MS);
    };

    show(); // show once on load
    const intervalId = setInterval(show, INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      clearTimeout(hideTimer);
    };
  }, [shouldShow]);

  if (!shouldShow || !visible) return null;

  const daysText =
    daysLeft === 0 ? 'today' : daysLeft === 1 ? 'in 1 day' : `in ${daysLeft} days`;

  const message = `Your plan is expiring on ${formatDate(expiry)} (${daysText}). Please contact administration to renew.`;
  if (daysLeft < 0) {
    return null;
  }
  return (
    <>
      <style>{`
        @keyframes plan-marquee {
          0%   { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        .plan-marquee-text {
          animation: plan-marquee 15s linear infinite;
        }
      `}</style>
      <div className="fixed bottom-0 inset-x-0 z-[9998] bg-red-600 text-white py-2 text-sm font-semibold overflow-hidden pointer-events-none">
        <span className="plan-marquee-text inline-block whitespace-nowrap">
          ⚠️ {message}
        </span>
      </div>
    </>
  );
};

export default PlanExpiryMarquee;