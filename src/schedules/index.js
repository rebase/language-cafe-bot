import schedule from 'node-schedule';
import checkIfPassTheCoffeeCupLastMessageIsValid from '../service/schedules/check-if-pass-the-coffee-cup-last-message-is-valid.js';
import sendANewMatchMatchMessage from '../service/schedules/send-a-new-match-match-message.js';
import initializePoint from '../service/schedules/initialize-point.js';
import checkAndSendReminders from '../service/schedules/check-and-send-reminders.js';

export default function schedules() {
  // every 10 seconds
  // schedule.scheduleJob('*/10 * * * * *', async () => {

  // });

  // every hour
  schedule.scheduleJob('0 * * * *', () => {
    checkIfPassTheCoffeeCupLastMessageIsValid();
    checkAndSendReminders();
  });

  // every day at 00:00
  schedule.scheduleJob('0 0 * * *', () => {
    sendANewMatchMatchMessage();
  });

  // every month on the first day at 00:00
  schedule.scheduleJob('0 0 1 * *', async () => {
    await initializePoint();
  });
}
