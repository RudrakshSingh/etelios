/**
 * Date utility functions for HRMS
 * Handles date formatting, calculations, and timezone operations
 */

const moment = require('moment-timezone');

// Default timezone
const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Get current date in specified timezone
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} Current date
 */
function getCurrentDate(timezone = DEFAULT_TIMEZONE) {
  return moment().tz(timezone);
}

/**
 * Format date for display
 * @param {Date|string|moment.Moment} date - Date to format
 * @param {string} format - Format string (default: 'DD/MM/YYYY')
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {string} Formatted date
 */
function formatDate(date, format = 'DD/MM/YYYY', timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).format(format);
}

/**
 * Format date and time for display
 * @param {Date|string|moment.Moment} date - Date to format
 * @param {string} format - Format string (default: 'DD/MM/YYYY HH:mm:ss')
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {string} Formatted date and time
 */
function formatDateTime(date, format = 'DD/MM/YYYY HH:mm:ss', timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).format(format);
}

/**
 * Get start of day
 * @param {Date|string|moment.Moment} date - Date
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} Start of day
 */
function getStartOfDay(date, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).startOf('day');
}

/**
 * Get end of day
 * @param {Date|string|moment.Moment} date - Date
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} End of day
 */
function getEndOfDay(date, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).endOf('day');
}

/**
 * Get start of week
 * @param {Date|string|moment.Moment} date - Date
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} Start of week
 */
function getStartOfWeek(date, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).startOf('week');
}

/**
 * Get end of week
 * @param {Date|string|moment.Moment} date - Date
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} End of week
 */
function getEndOfWeek(date, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).endOf('week');
}

/**
 * Get start of month
 * @param {Date|string|moment.Moment} date - Date
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} Start of month
 */
function getStartOfMonth(date, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).startOf('month');
}

/**
 * Get end of month
 * @param {Date|string|moment.Moment} date - Date
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} End of month
 */
function getEndOfMonth(date, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).endOf('month');
}

/**
 * Get start of year
 * @param {Date|string|moment.Moment} date - Date
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} Start of year
 */
function getStartOfYear(date, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).startOf('year');
}

/**
 * Get end of year
 * @param {Date|string|moment.Moment} date - Date
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} End of year
 */
function getEndOfYear(date, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).endOf('year');
}

/**
 * Add days to date
 * @param {Date|string|moment.Moment} date - Date
 * @param {number} days - Number of days to add
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} New date
 */
function addDays(date, days, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).add(days, 'days');
}

/**
 * Subtract days from date
 * @param {Date|string|moment.Moment} date - Date
 * @param {number} days - Number of days to subtract
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} New date
 */
function subtractDays(date, days, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).subtract(days, 'days');
}

/**
 * Add months to date
 * @param {Date|string|moment.Moment} date - Date
 * @param {number} months - Number of months to add
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} New date
 */
function addMonths(date, months, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).add(months, 'months');
}

/**
 * Subtract months from date
 * @param {Date|string|moment.Moment} date - Date
 * @param {number} months - Number of months to subtract
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} New date
 */
function subtractMonths(date, months, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).subtract(months, 'months');
}

/**
 * Add years to date
 * @param {Date|string|moment.Moment} date - Date
 * @param {number} years - Number of years to add
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} New date
 */
function addYears(date, years, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).add(years, 'years');
}

/**
 * Subtract years from date
 * @param {Date|string|moment.Moment} date - Date
 * @param {number} years - Number of years to subtract
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} New date
 */
function subtractYears(date, years, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).subtract(years, 'years');
}

/**
 * Get difference between two dates in days
 * @param {Date|string|moment.Moment} date1 - First date
 * @param {Date|string|moment.Moment} date2 - Second date
 * @returns {number} Difference in days
 */
function getDifferenceInDays(date1, date2) {
  return moment(date1).diff(moment(date2), 'days');
}

/**
 * Get difference between two dates in hours
 * @param {Date|string|moment.Moment} date1 - First date
 * @param {Date|string|moment.Moment} date2 - Second date
 * @returns {number} Difference in hours
 */
function getDifferenceInHours(date1, date2) {
  return moment(date1).diff(moment(date2), 'hours');
}

/**
 * Get difference between two dates in minutes
 * @param {Date|string|moment.Moment} date1 - First date
 * @param {Date|string|moment.Moment} date2 - Second date
 * @returns {number} Difference in minutes
 */
function getDifferenceInMinutes(date1, date2) {
  return moment(date1).diff(moment(date2), 'minutes');
}

/**
 * Check if date is today
 * @param {Date|string|moment.Moment} date - Date to check
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {boolean} True if date is today
 */
function isToday(date, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).isSame(moment().tz(timezone), 'day');
}

/**
 * Check if date is yesterday
 * @param {Date|string|moment.Moment} date - Date to check
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {boolean} True if date is yesterday
 */
function isYesterday(date, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).isSame(moment().tz(timezone).subtract(1, 'day'), 'day');
}

/**
 * Check if date is tomorrow
 * @param {Date|string|moment.Moment} date - Date to check
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {boolean} True if date is tomorrow
 */
function isTomorrow(date, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).isSame(moment().tz(timezone).add(1, 'day'), 'day');
}

/**
 * Check if date is in the past
 * @param {Date|string|moment.Moment} date - Date to check
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {boolean} True if date is in the past
 */
function isPast(date, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).isBefore(moment().tz(timezone));
}

/**
 * Check if date is in the future
 * @param {Date|string|moment.Moment} date - Date to check
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {boolean} True if date is in the future
 */
function isFuture(date, timezone = DEFAULT_TIMEZONE) {
  return moment(date).tz(timezone).isAfter(moment().tz(timezone));
}

/**
 * Check if date is weekend
 * @param {Date|string|moment.Moment} date - Date to check
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {boolean} True if date is weekend
 */
function isWeekend(date, timezone = DEFAULT_TIMEZONE) {
  const day = moment(date).tz(timezone).day();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Check if date is weekday
 * @param {Date|string|moment.Moment} date - Date to check
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {boolean} True if date is weekday
 */
function isWeekday(date, timezone = DEFAULT_TIMEZONE) {
  return !isWeekend(date, timezone);
}

/**
 * Get working days between two dates
 * @param {Date|string|moment.Moment} startDate - Start date
 * @param {Date|string|moment.Moment} endDate - End date
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {number} Number of working days
 */
function getWorkingDays(startDate, endDate, timezone = DEFAULT_TIMEZONE) {
  let count = 0;
  const start = moment(startDate).tz(timezone);
  const end = moment(endDate).tz(timezone);
  
  while (start.isSameOrBefore(end, 'day')) {
    if (isWeekday(start, timezone)) {
      count++;
    }
    start.add(1, 'day');
  }
  
  return count;
}

/**
 * Get next working day
 * @param {Date|string|moment.Moment} date - Date
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} Next working day
 */
function getNextWorkingDay(date, timezone = DEFAULT_TIMEZONE) {
  let nextDay = moment(date).tz(timezone).add(1, 'day');
  
  while (isWeekend(nextDay, timezone)) {
    nextDay.add(1, 'day');
  }
  
  return nextDay;
}

/**
 * Get previous working day
 * @param {Date|string|moment.Moment} date - Date
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment} Previous working day
 */
function getPreviousWorkingDay(date, timezone = DEFAULT_TIMEZONE) {
  let prevDay = moment(date).tz(timezone).subtract(1, 'day');
  
  while (isWeekend(prevDay, timezone)) {
    prevDay.subtract(1, 'day');
  }
  
  return prevDay;
}

/**
 * Parse date string with multiple formats
 * @param {string} dateString - Date string
 * @param {Array} formats - Array of format strings
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {moment.Moment|null} Parsed date or null
 */
function parseDate(dateString, formats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'], timezone = DEFAULT_TIMEZONE) {
  for (const format of formats) {
    const parsed = moment(dateString, format, true);
    if (parsed.isValid()) {
      return parsed.tz(timezone);
    }
  }
  return null;
}

/**
 * Get date range for a period
 * @param {string} period - Period (today, yesterday, this_week, last_week, this_month, last_month, this_year, last_year)
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {Object} Date range with start and end
 */
function getDateRange(period, timezone = DEFAULT_TIMEZONE) {
  const now = moment().tz(timezone);
  
  switch (period) {
    case 'today':
      return {
        start: now.clone().startOf('day'),
        end: now.clone().endOf('day')
      };
    case 'yesterday':
      return {
        start: now.clone().subtract(1, 'day').startOf('day'),
        end: now.clone().subtract(1, 'day').endOf('day')
      };
    case 'this_week':
      return {
        start: now.clone().startOf('week'),
        end: now.clone().endOf('week')
      };
    case 'last_week':
      return {
        start: now.clone().subtract(1, 'week').startOf('week'),
        end: now.clone().subtract(1, 'week').endOf('week')
      };
    case 'this_month':
      return {
        start: now.clone().startOf('month'),
        end: now.clone().endOf('month')
      };
    case 'last_month':
      return {
        start: now.clone().subtract(1, 'month').startOf('month'),
        end: now.clone().subtract(1, 'month').endOf('month')
      };
    case 'this_year':
      return {
        start: now.clone().startOf('year'),
        end: now.clone().endOf('year')
      };
    case 'last_year':
      return {
        start: now.clone().subtract(1, 'year').startOf('year'),
        end: now.clone().subtract(1, 'year').endOf('year')
      };
    default:
      throw new Error(`Invalid period: ${period}`);
  }
}

/**
 * Convert time to different timezone
 * @param {Date|string|moment.Moment} date - Date to convert
 * @param {string} fromTimezone - Source timezone
 * @param {string} toTimezone - Target timezone
 * @returns {moment.Moment} Converted date
 */
function convertTimezone(date, fromTimezone, toTimezone) {
  return moment.tz(date, fromTimezone).tz(toTimezone);
}

/**
 * Get age from birth date
 * @param {Date|string|moment.Moment} birthDate - Birth date
 * @param {string} timezone - Timezone (default: Asia/Kolkata)
 * @returns {number} Age in years
 */
function getAge(birthDate, timezone = DEFAULT_TIMEZONE) {
  return moment().tz(timezone).diff(moment(birthDate).tz(timezone), 'years');
}

/**
 * Check if year is leap year
 * @param {number} year - Year to check
 * @returns {boolean} True if leap year
 */
function isLeapYear(year) {
  return moment([year]).isLeapYear();
}

/**
 * Get days in month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {number} Number of days in month
 */
function getDaysInMonth(year, month) {
  return moment([year, month - 1]).daysInMonth();
}

/**
 * Format duration in human readable format
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(duration) {
  const durationObj = moment.duration(duration);
  
  if (durationObj.asDays() >= 1) {
    return `${Math.floor(durationObj.asDays())}d ${durationObj.hours()}h ${durationObj.minutes()}m`;
  } else if (durationObj.asHours() >= 1) {
    return `${durationObj.hours()}h ${durationObj.minutes()}m`;
  } else if (durationObj.asMinutes() >= 1) {
    return `${durationObj.minutes()}m ${durationObj.seconds()}s`;
  } else {
    return `${durationObj.seconds()}s`;
  }
}

module.exports = {
  getCurrentDate,
  formatDate,
  formatDateTime,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfYear,
  getEndOfYear,
  addDays,
  subtractDays,
  addMonths,
  subtractMonths,
  addYears,
  subtractYears,
  getDifferenceInDays,
  getDifferenceInHours,
  getDifferenceInMinutes,
  isToday,
  isYesterday,
  isTomorrow,
  isPast,
  isFuture,
  isWeekend,
  isWeekday,
  getWorkingDays,
  getNextWorkingDay,
  getPreviousWorkingDay,
  parseDate,
  getDateRange,
  convertTimezone,
  getAge,
  isLeapYear,
  getDaysInMonth,
  formatDuration
};
