import { COLORS } from '../../constants/index.js';

export const STUDY_HELP_TITLE = 'How to Use Study Streak';
const oldTitle = 'How to Use the study-check-in Bot';
const pending = new Map();

function command(name, id) {
  return /^\d{17,20}$/.test(id || '') ? `</${name}:${id}>` : `\`${name.startsWith('/') ? name : `/${name}`}\``;
}

export function studyHelp(config = {}) {
  const current = command('current-streak-leaderboard', config.CURRENT_STREAK_LEADERBOARD_COMMAND_ID);
  const highest = command('all-time-streak-leaderboard', config.ALL_TIME_STREAK_LEADERBOARD_COMMAND_ID);
  return {
    allowedMentions: { parse: [] },
    embeds: [{
      color: COLORS.PRIMARY,
      title: STUDY_HELP_TITLE,
      description: [
        '**Choose how you check in**',
        '• `!lc-streak <your study plan>` — write your own free-form post.',
        '• `/study start` — create an interactive plan, fresh or from a template.',
        'Both use the **same streak**: checking in both ways counts only once per UTC day. Completing items is optional for maintaining your streak.',
        '',
        '**Your interactive plan**',
        'Use **Update** to complete, abandon or uncheck items, and **Manage** to edit your plan.',
        '• `/study plan` — find your latest post; add a `date` to open an earlier one.',
        '• `/study template` — create and manage reusable templates.',
        '• `/study goals` — set optional weekly goals; progress appears on your daily post.',
        '• `/study stats` — share your streak and completion statistics.',
        '',
        '**UTC day and editing window**',
        'The day changes at **00:00 UTC** (<t:946684800:t> your time). After midnight, the previous interactive plan cannot have items added, edited or removed.',
        'You can still update existing item statuses until **12:00 UTC** (<t:946728000:t> your time), then that plan locks. Unchecked items stay unchecked.',
        'The extra editing window does **not** extend the daily check-in deadline.',
        '',
        `**Leaderboards:** ${current} · ${highest}`,
      ].join('\n'),
    }],
  };
}

export function refreshStudyHelp(channel, botId, config = {}) {
  if (!channel?.messages?.fetch || !botId) return Promise.resolve(null);
  // Serialize refreshes so simultaneous posts cannot leave duplicate stickies.
  const previous = pending.get(channel.id) || Promise.resolve();
  const job = previous.then(async () => {
    const messages = await channel.messages.fetch({ limit: 100 });
    const list = [...messages.values()];
    const stickies = list.filter((message) => message.author?.id === botId
      && [STUDY_HELP_TITLE, oldTitle].includes(message.embeds?.[0]?.title));
    const newest = list.reduce((latest, message) =>
      (!latest || BigInt(message.id) > BigInt(latest.id) ? message : latest), null);
    const current = stickies.find((message) => message.id === newest?.id);
    const data = studyHelp(config);
    // Update in place when already last. Otherwise send first so a failed send
    // never deletes the only help message, then remove old copies.
    const posted = current ? await current.edit(data) : await channel.send(data);
    for (const sticky of stickies) {
      if (sticky.id !== posted.id) await sticky.delete();
    }
    return posted;
  }).catch((error) => {
    console.error('Could not refresh Study Streak help:', error.message);
    return null;
  });
  pending.set(channel.id, job);
  job.then(() => { if (pending.get(channel.id) === job) pending.delete(channel.id); });
  return job;
}
