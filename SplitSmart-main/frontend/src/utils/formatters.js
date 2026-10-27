/**
 * Formatting utilities for SplitSmart
 */

export function toMajorUnits(amountMinor) {
  if (amountMinor === undefined || amountMinor === null || isNaN(amountMinor)) return 0;
  return amountMinor / 100;
}

export function toMinorUnits(amountMajor) {
  if (amountMajor === undefined || amountMajor === null || isNaN(amountMajor)) return 0;
  return Math.round(Number(amountMajor) * 100);
}

export function formatCurrency(amountMinor, currency = 'INR') {
  const major = toMajorUnits(amountMinor);
  const cur = (currency || 'INR').toUpperCase();

  try {
    const symbolMap = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: 'C$',
      AUD: 'A$'
    };

    const symbol = symbolMap[cur] || `${cur} `;
    const formattedNumber = Math.abs(major).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const sign = major < 0 ? '-' : '';
    return `${sign}${symbol}${formattedNumber}`;
  } catch (e) {
    return `${cur} ${major.toFixed(2)}`;
  }
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
