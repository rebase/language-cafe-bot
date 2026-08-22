import schedule from 'node-schedule';
import checkIfPassTheCoffeeCupLastMessageIsValid from '../service/schedules/check-if-pass-the-coffee-cup-last-message-is-valid.js';
import sendANewMatchMatchMessage from '../service/schedules/send-a-new-match-match-message.js';
import initializePoint from '../service/schedules/initialize-point.js';
import checkAndSendReminders from '../service/schedules/check-and-send-reminders.js';
import trackerDailyMaintenance from '../service/schedules/tracker-daily-maintenance.js';
import trackerWeeklySnapshots from '../service/schedules/tracker-weekly-snapshots.js';
import trackerDailyReminders from '../service/schedules/tracker-daily-reminders.js';
import eventLifecycle from '../service/schedules/event-lifecycle.js';
import { refreshEventCalendar } from '../service/utils/event-calendar.js';

export default function schedules() {
  // every 10 seconds
  // schedule.scheduleJob('*/10 * * * * *', async () => {

  // });

  // Run immediately on startup to catch any state changes while the bot was down
  eventLifecycle();
  refreshEventCalendar();

  // every hour
  schedule.scheduleJob('0 * * * *', () => {
    checkIfPassTheCoffeeCupLastMessageIsValid();
    checkAndSendReminders();
    eventLifecycle();
  });

  // every day at 00:00
  schedule.scheduleJob('0 0 * * *', () => {
    sendANewMatchMatchMessage();
    trackerDailyMaintenance();
    trackerDailyReminders();
    // Refresh calendar daily so date headings stay current
    refreshEventCalendar();
  });

  // every Sunday at 01:00 (weekly snapshots)
  schedule.scheduleJob('0 1 * * 0', () => {
    trackerWeeklySnapshots();
  });

  // every month on the first day at 00:00
  schedule.scheduleJob('0 0 1 * *', async () => {
    await initializePoint();
  });
}
