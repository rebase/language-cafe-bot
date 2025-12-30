import { bold, time, userMention } from 'discord.js';
import config from '../../config/index.js';
import { COLORS } from '../../constants/index.js';
import StudyCheckIn from '../../models/StudyCheckIn.js';
import channelLog, { generateMessageCreateLogContent } from '../utils/channel-log.js';

const sendNewStickyMessage = async (message) => {
  const title = 'How to Use the study-check-in Bot';

  const description = `Write **!lc-streak** at the beginning of your study plans to start/continue your streak (same message)\n\nUse </current-streak-leaderboard:${config.CURRENT_STREAK_LEADERBOARD_COMMAND_ID}> to see the current streak leaderboard and </all-time-streak-leaderboard:${config.ALL_TIME_STREAK_LEADERBOARD_COMMAND_ID}> for the all-time streak leaderboard\n\nPlease keep in mind that this bot is set to GMT/UTC so all streaks will refresh/expire each day at <t:946684800:t> your time`;

  const currentMessages = await message.channel.messages.fetch({ limit: 50 });

  const stickyMessages = currentMessages.filter(
    (currentMessage) =>
      currentMessage?.author?.id === config.CLIENT_ID && currentMessage?.embeds[0]?.title === title,
  );

  await Promise.all(stickyMessages.map((stickyMessage) => stickyMessage.delete().catch(() => {})));

  await message.channel.send({
    embeds: [
      {
        color: COLORS.PRIMARY,
        title,
        description,
      },
    ],
  });
};

export default async (message) => {
  if (!message.content.startsWith('!lc-streak')) {
    sendNewStickyMessage(message);
    return;
  }

  if (message.content === '!lc-streak') {
    sendNewStickyMessage(message);

    const embad = {
      color: COLORS.PRIMARY,
      title: 'Study Check In',
      description: `${userMention(
        message.author.id,
      )}, If you want your streak to count, make sure to include your tasks for today in your streak message and not just \`!lc-streak\`! Scroll up for formatting examples if you need help!\n### This message will be deleted in 1 minute.`,
    };

    message.react('❌').catch(() => {});

    const replyMessage = await message.reply({ embeds: [embad] });
    setTimeout(() => {
      replyMessage.delete().catch(() => {});
    }, 1000 * 60);

    return;
  }

  const user = await StudyCheckIn.findOne({ userId: message.author.id });

  const currentDate = new Date();
  const nextDayTemp = new Date(currentDate);
  nextDayTemp.setDate(currentDate.getDate() + 1);
  nextDayTemp.setHours(23, 59, 59, 0);
  const nextDay = new Date(nextDayTemp);

  const expiredTimestamp = nextDay.getTime();
  const currentTimestamp = currentDate.getTime();

  // check if user.lastAttendanceTimestamp and currentTimestamp is in the same day
  const lastAttendanceDay = user?.lastAttendanceTimestamp
    ? new Date(user?.lastAttendanceTimestamp)?.toISOString().split('T')[0]
    : null;
  const currentDay = currentDate?.toISOString().split('T')[0];

  const isSameDay = lastAttendanceDay === currentDay;

  channelLog(
    generateMessageCreateLogContent(
      message,
      `command: \`!lc-streak\`\n\nlastAttendanceDay: ${lastAttendanceDay}\ncurrentDay: ${currentDay}\nisSameDay: ${isSameDay}`,
    ),
  );

  const ableToAttendDate = new Date(currentDate);
  ableToAttendDate.setDate(currentDate.getDate() + 1);
  ableToAttendDate.setHours(0, 0, 0, 0);
  const ableToAttendTimestamp = ableToAttendDate.getTime();

  if (isSameDay) {
    const embad = {
      color: COLORS.PRIMARY,
      title: 'Study Check In',
      description: `${userMention(
        message.author.id,
      )}, you have already logged your study session today.\nCome back after ${time(
        +ableToAttendTimestamp.toString().slice(0, 10),
        'F',
      )} to increase your streak!\n### This message will be deleted in 1 minute.`,
    };

    message.react('❌').catch(() => {});

    const replyMessage = await message.reply({ embeds: [embad] });
    setTimeout(() => {
      replyMessage.delete().catch(() => {});
    }, 1000 * 60);

    sendNewStickyMessage(message);

    return;
  }

  let freezePoint = user?.freezePoint ?? 0;

  if (user?.expiredTimestamp < currentTimestamp) {
    const differenceDays = Math.ceil(
      (currentTimestamp - user.expiredTimestamp) / (1000 * 60 * 60 * 24),
    );

    freezePoint -= differenceDays;

    if (freezePoint < 0) {
      freezePoint = 0;
      user.point = 0;
    }
  }

  let point = user?.point ?? 0;
  point += 1;

  const highestPoint = (user?.highestPoint ?? 0) > point ? user?.highestPoint : point;

  const isPointMultipleOf7 = point % 7 === 0;

  if (isPointMultipleOf7) {
    freezePoint = freezePoint < 3 ? freezePoint + 1 : freezePoint;
  }

  await StudyCheckIn.findOneAndUpdate(
    { userId: message.author.id },
    {
      point,
      lastAttendanceTimestamp: currentTimestamp,
      expiredTimestamp,
      highestPoint,
      freezePoint,
    },
    { upsert: true, new: true },
  );

  if (
    point <= 50
      ? point === 5 || point === 10 || point === 30 || point === 50
      : point % 25 === 0 || point % 365 === 0
  ) {
    const proverbs = [
      'Success is the sum of small efforts, repeated day in and day out.',
      "Rome wasn't built in a day, but they were laying bricks every hour.",
      'Slow and steady wins the race.',
      'Little strokes fell great oaks',
      'Success is not final, failure is not fatal: It is the courage to continue that counts. - Winston Churchill',
      'It does not matter how slowly you go as long as you do not stop. - Confucius',
      'The journey of a thousand miles begins with one step. - Lao Tzu',
      'Perseverance is not a long race; it is many short races one after the other. - Walter Elliot',
      'Success is the sum of small efforts, repeated day in and day out. - Robert Collier',
      'Patience, persistence, and perspiration make an unbeatable combination for success. - Napoleon Hill',
      'Success is no accident. It is hard work, perseverance, learning, studying, sacrifice, and most of all, love of what you are doing or learning to do. - Pelé',
      'Great works are performed not by strength but by perseverance. - Samuel Johnson',
      'The only way to do great work is to love what you do. - Steve Jobs',
      'Genius is one percent inspiration and ninety-nine percent perspiration. - Thomas Edison',
      'Fall seven times, stand up eight. - Japanese Proverb',
      'No retreat, no surrender.',
      'Keep calm and carry on.',
      'When you feel like quitting, think about why you started.',
      'It always seems impossible until it’s done. - Nelson Mandela',
      'The harder you work for something, the greater you’ll feel when you achieve it.',
      'Chop your own wood and it will warm you twice. - Old Proverb',
      'A smooth sea never made a skilled sailor.',
      'The only limit to our realization of tomorrow will be our doubts of today. - Franklin D. Roosevelt',
      'Winners never quit and quitters never win. - Vince Lombardi',
      'It’s not whether you get knocked down, it’s whether you get up. - Vince Lombardi',
      'Believe you can and you’re halfway there. - Theodore Roosevelt',
      'The best way out is always through. - Robert Frost',
      'An inch of movement will bring you closer to your goals than a mile of intention. - Steve Maraboli',
      'Continuous effort—not strength or intelligence—is the key to unlocking our potential. - Winston Churchill',
      'Hard work beats talent when talent doesn’t work hard.',
    ];

    message.reply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          description: `${userMention(message.author.id)} has just reached a streak of ${bold(
            point,
          )}. Good job!\n\n*${
            proverbs[Math.floor(Math.random() * proverbs.length)]
          }*\n\nKeep it up!`,
          thumbnail: {
            url: message.author.avatarURL(),
          },
        },
      ],
    });
  }

  const additionalEmbeds = [];

  if (point === 1 && user?.lastAttendanceTimestamp) {
    const additionalContent = `${userMention(
      message.author.id,
    )}, your streak was reset to 0 due to missing one or more days previously.\nYour streak has been updated to ${bold(
      1,
    )} after logging today's session.\n\nYour last study session was logged on ${time(
      +user.lastAttendanceTimestamp.toString().slice(0, 10),
      'F',
    )}.\n### This message will be deleted in 1 minute.`;

    const additionalEmbed = {
      color: COLORS.PRIMARY,
      title: 'Your streak has been reset',
      description: additionalContent,
    };

    additionalEmbeds.push(additionalEmbed);
  }

  let content = `${userMention(
    message.author.id,
  )}, you studied for ${point} day(s) in a row!\nStudy streak increased to ${bold(
    point,
  )} 🔥\n\nCome back after ${time(
    +ableToAttendTimestamp.toString().slice(0, 10),
    'F',
  )} to increase your streak!\nStreak expires on ${time(
    +new Date(expiredTimestamp).getTime().toString().slice(0, 10),
    'F',
  )}.\n`;

  const additionalContent = `\n${bold('Streak Freezes')}\nYou currently have ${bold(
    freezePoint,
  )} streak freezes 🧊\n\nA streak freeze will be used automatically if you miss logging your studies for a day.`;

  content += additionalContent;

  content += '\n### This message will be deleted in 3 minute.';

  const embed = {
    color: COLORS.PRIMARY,
    title: 'Study Check In',
    description: content,
  };

  message.react('🔥').catch(() => {});

  const replyMessage = await message.reply({ embeds: [embed, ...additionalEmbeds] });
  setTimeout(() => {
    replyMessage.delete().catch(() => {});
  }, 1000 * 60 * 3);

  sendNewStickyMessage(message);
};
