/**
 * Standard Asia/Kolkata (IST) Date and Time Utilities for RetailSphere AI
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Format any date or timestamp string to standard Asia/Kolkata format.
 * Example output: "21 Oct 2026, 11:00 PM"
 */
export function formatToIST(
  dateInput: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '';
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...options,
    }).format(date);
  } catch (err) {
    return String(dateInput);
  }
}

/**
 * Format date only in IST (e.g. "Oct 21, 2026")
 */
export function formatISTDateOnly(
  dateInput: string | number | Date | null | undefined
): string {
  if (!dateInput) return '';
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return String(dateInput);
  }
}

/**
 * Format full date and time with seconds in IST
 */
export function formatISTFullDateTime(
  dateInput: string | number | Date | null | undefined
): string {
  if (!dateInput) return '';
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return String(dateInput);
  }
}
