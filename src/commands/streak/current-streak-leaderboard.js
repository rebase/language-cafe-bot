import { SlashCommandBuilder, bold, time, userMention } from 'discord.js';
import { COLORS } from '../../constants/index.js';
import StudyCheckIn from '../../models/StudyCheckIn.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';

export default {
  data: new SlashCommandBuilder()
    .setName('current-streak-leaderboard')
    .setDescription("Check #study-check-in's streak leaderboard."),
  async execute(interaction) {
    channelLog(generateInteractionCreateLogContent(interaction));

    const allUsers = await StudyCheckIn.find({ point: { $gt: 0 } });

    const userList = allUsers.map((user) => ({
      id: user.userId,
      point: user.point,
      lastAttendanceTimestamp: user.lastAttendanceTimestamp,
      expiredTimestamp: user.expiredTimestamp,
      freezePoint: user.freezePoint || 0,
    }));

    const currentTimestamp = Date.now();

    const calculatedUserList = userList
      .map((user) => {
        if (user.expiredTimestamp < currentTimestamp) {
          const differenceDays = Math.ceil(
            (currentTimestamp - user.expiredTimestamp) / (1000 * 60 * 60 * 24),
          );

          const freezePoint = user.freezePoint - differenceDays;

          if (freezePoint < 0) {
            return {
              ...user,
              point: 0,
              freezePoint: 0,
            };
          }
        }

        return user;
      })
      .filter((user) => user.point > 0);

    const rankedUserList = [...calculatedUserList].sort(
      (a, b) =>
        Number(b.point) - Number(a.point) ||
        Number(b.lastAttendanceTimestamp) - Number(a.lastAttendanceTimestamp),
    );

    const slicedRankedUserList = rankedUserList.slice(0, 10);

    let content = slicedRankedUserList
      .map(
        (user, index) =>
          `${bold(index + 1)}. ${userMention(user.id)} (Streak: ${bold(
            user.point,
          )}, Last check in: ${time(+user.lastAttendanceTimestamp.toString().slice(0, 10), 'R')})`,
      )
      .join('\n');

    if (content) content = `## Current Study-Check-In Leaderboard (Top 10)\n\n${content}`;

    const currentUser = calculatedUserList.find((user) => user.id === interaction.user.id);

    if (currentUser) {
      content += `\n\n${userMention(currentUser.id)}, you are rank #${bold(
        rankedUserList.indexOf(currentUser) + 1,
      )} with a ${bold(currentUser.point)} day streak.`;
    }

    if (!content) content = 'No one has an active streak yet.';

    const embed = {
      color: COLORS.PRIMARY,
      description: content,
    };

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};
