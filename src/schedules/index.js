import schedule from 'node-schedule';
import checkIfPassTheCoffeeCupLastMessageIsValid from '../service/schedules/check-if-pass-the-coffee-cup-last-message-is-valid.js';
import sendANewMatchMatchMessage from '../service/schedules/send-a-new-match-match-message.js';
import initializePoint from '../service/schedules/initialize-point.js';
import checkAndSendReminders from '../service/schedules/check-and-send-reminders.js';
import trackerDailyMaintenance from '../service/schedules/tracker-daily-maintenance.js';
import trackerWeeklySnapshots from '../service/schedules/tracker-weekly-snapshots.js';
import trackerDailyReminders from '../service/schedules/tracker-daily-reminders.js';
import eventLifecycle from '../service/schedules/event-lifecycle.js';
import recoverEventTracking from '../service/schedules/recover-event-tracking.js';
import scheduleEventTracking from './event-tracking.js';
import { refreshEventCalendar } from '../service/utils/event-calendar.js';

export default async function schedules() {
  // ── Startup ───────────────────────────────────────────────────────────────────
  eventLifecycle();
  refreshEventCalendar();
  // Recover due work after downtime; persisted delivery records prevent repeat sends.
  scheduleEventTracking();
  await recoverEventTracking();

  // ── Every 10 seconds ───────────────────────────────────────────────────────────────
  // schedule.scheduleJob('*/10 * * * * *', async () => {

  // });

  // ── Every hour ───────────────────────────────────────────────────────────────
  schedule.scheduleJob('0 * * * *', () => {
    checkIfPassTheCoffeeCupLastMessageIsValid();
    checkAndSendReminders();
    eventLifecycle();
  });

  // ── Every day at 00:00 UTC ────────────────────────────────────────────────────
  schedule.scheduleJob('0 0 * * *', () => {
    sendANewMatchMatchMessage();
    trackerDailyMaintenance();
    trackerDailyReminders();
    refreshEventCalendar();
  });

  // ── 1st of every month at 00:00 UTC ──────────────────────────────────────────
  // Existing monthly points reset.
  schedule.scheduleJob('0 0 1 * *', async () => {
    await initializePoint();
  });

  // ── Every Sunday at 01:00 UTC (weekly snapshots) ──────────────────────────────
  schedule.scheduleJob('0 1 * * 0', () => {
    trackerWeeklySnapshots();
  });
}
