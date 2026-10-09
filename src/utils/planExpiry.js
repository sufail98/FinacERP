// true if expiry date is today or earlier (date-only comparison)
export const isPlanExpired = (expDate) => {
  if (!expDate) return false;

  const exp = new Date(expDate);
  if (isNaN(exp.getTime())) return false;

  const now = new Date();
  const expDay = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return expDay <= today;
};