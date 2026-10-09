import schedule from 'node-schedule';
import waiterReminderCheck from '../service/schedules/waiter-reminder-check.js';
import overdueReportCheck from '../service/schedules/overdue-report-check.js';
import newYearTrackerRollover from '../service/schedules/new-year-tracker-rollover.js';
import { refreshEventTracker } from '../service/utils/event-tracker.js';
import { getReminderDate } from '../service/utils/reporting-periods.js';

export default function scheduleEventTracking(now = new Date()) {
  function scheduleReminder(year, period) {
    schedule.scheduleJob(`event-reminder-${period}`, getReminderDate(year, period), async () => {
      try {
        await waiterReminderCheck(period);
      } finally {
        scheduleReminder(year + 1, period);
      }
    });
  }

  for (let period = 1; period <= 6; period++) {
    const year = now.getUTCFullYear();
    const nextYear = getReminderDate(year, period) <= now ? year + 1 : year;
    scheduleReminder(nextYear, period);
  }

  schedule.scheduleJob('event-period-end', {
    rule: '0 0 1 1,3,5,7,9,11 *', tz: 'Etc/UTC',
  }, async () => {
    try {
      if (new Date().getUTCMonth() === 0) {
        await newYearTrackerRollover();
      } else {
        await refreshEventTracker();
      }
      await overdueReportCheck();
    } catch (error) {
      console.error('Event period-end processing failed:', error);
    }
  });
}
