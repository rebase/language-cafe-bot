import backfillEventHistory from './backfill-event-history.js';
import newYearTrackerRollover from './new-year-tracker-rollover.js';
import overdueReportCheck from './overdue-report-check.js';
import waiterReminderCheck from './waiter-reminder-check.js';
import { getPeriodForDate } from '../utils/reporting-periods.js';

let running;
async function recoverDueWork() {
  await backfillEventHistory();
  const now = new Date();
  const tasks = [
    () => newYearTrackerRollover(),
    () => overdueReportCheck(now),
    () => waiterReminderCheck(getPeriodForDate(now).period, now),
  ];
  for (const task of tasks) {
    try {
      await task();
    } catch (error) {
      console.error('Event tracking startup recovery failed:', error);
    }
  }
}

export default function recoverEventTracking() {
  if (!running) {
    running = recoverDueWork().catch((error) => {
      console.error('Event history startup reconciliation failed:', error);
    }).finally(() => { running = null; });
  }
  return running;
}
