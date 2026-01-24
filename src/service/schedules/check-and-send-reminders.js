import Reminder from '../../models/reminder.js';
import client from '../../client/index.js';
import channelLog from '../utils/channel-log.js';

export default async function checkAndSendReminders() {
  try {
    const now = new Date();

    // Find reminders that should be sent now (within the last hour to account for schedule timing)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const remindersToSend = await Reminder.find({
      reminderAt: { $gte: oneHourAgo, $lte: now },
    });

    if (remindersToSend.length === 0) {
      return;
    }

    channelLog(`Found ${remindersToSend.length} reminder(s) to send`);

    for (const reminder of remindersToSend) {
      try {
        // Get the channel
        const channel = await client.channels.fetch(reminder.channelId);
        if (!channel) {
          channelLog(`Channel ${reminder.channelId} not found for reminder ${reminder.messageId}`);
          await Reminder.findByIdAndDelete(reminder._id);
          continue;
        }

        // Get the message
        const message = await channel.messages.fetch(reminder.messageId);
        if (!message) {
          channelLog(`Message ${reminder.messageId} not found for reminder`);
          await Reminder.findByIdAndDelete(reminder._id);
          continue;
        }

        // Find the reaction with the reminder emoji
        const reaction = message.reactions.cache.find((r) => r.emoji.name === reminder.emoji);

        if (!reaction) {
          channelLog(`No reactions found for reminder ${reminder.messageId}, skipping`);
          await Reminder.findByIdAndDelete(reminder._id);
          continue;
        }

        // Fetch all users who reacted (excluding bots)
        const users = await reaction.users.fetch();
        const subscribers = users.filter((user) => !user.bot);

        if (subscribers.size === 0) {
          channelLog(`Reminder ${reminder.messageId} has no subscribers, deleting`);
          await Reminder.findByIdAndDelete(reminder._id);
          continue;
        }

        // Calculate days left
        const daysLeft = Math.ceil((reminder.endDate - now) / (1000 * 60 * 60 * 24));
        const timeText = daysLeft === 1 ? '1 day' : `${daysLeft} days`;

        // Create mention string for all subscribers
        const mentions = subscribers.map((user) => `<@${user.id}>`).join(' ');

        // Send reminder message
        const reminderMessage = `## There's ${timeText} left to participate in the event! See more details here: ${reminder.messageUrl}\n-# ${mentions}`;

        await channel.send(reminderMessage);

        channelLog(`Sent reminder for ${reminder.messageId} to ${subscribers.size} user(s)`);

        // Delete the reminder after sending
        await Reminder.findByIdAndDelete(reminder._id);
      } catch (error) {
        console.error(`Error sending reminder ${reminder.messageId}:`, error);
        // Delete the reminder to prevent retry loops
        await Reminder.findByIdAndDelete(reminder._id);
      }
    }
  } catch (error) {
    console.error('Error in checkAndSendReminders:', error);
  }
}
