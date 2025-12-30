import { SlashCommandBuilder, bold, time, userMention } from 'discord.js';
import { COLORS } from '../../constants/index.js';
import StudyCheckIn from '../../models/StudyCheckIn.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';

export default {
  data: new SlashCommandBuilder()
    .setName('all-time-streak-leaderboard')
    .setDescription("Check #study-check-in's highest streak leaderboard."),
  async execute(interaction) {
    channelLog(generateInteractionCreateLogContent(interaction));

    const allUsers = await StudyCheckIn.find({ highestPoint: { $gt: 0 } });

    const userList = allUsers
      .filter((user) => interaction.guild.members.cache.has(user.userId))
      .map((user) => ({
        id: user.userId,
        lastAttendanceTimestamp: user.lastAttendanceTimestamp,
        expiredTimestamp: user.expiredTimestamp,
        highestPoint: user.highestPoint,
      }));

    const rankedUserList = [...userList].sort(
      (a, b) =>
        Number(b.highestPoint) - Number(a.highestPoint) ||
        Number(b.lastAttendanceTimestamp) - Number(a.lastAttendanceTimestamp),
    );

    const slicedRankedUserList = rankedUserList.slice(0, 10);

    let content = slicedRankedUserList
      .map(
        (user, index) =>
          `${bold(index + 1)}. ${userMention(user.id)} (Streak: ${bold(
            user.highestPoint,
          )}, Last check in: ${time(+user.lastAttendanceTimestamp.toString().slice(0, 10), 'R')})`,
      )
      .join('\n');

    if (content) content = `## All-time Study-Check-In Leaderboard (Top 10)\n\n${content}`;

    const currentUser = userList.find((user) => user.id === interaction.user.id);

    if (currentUser) {
      content += `\n\n${userMention(currentUser.id)}, you are rank #${bold(
        rankedUserList.indexOf(currentUser) + 1,
      )} with a ${bold(currentUser.highestPoint)} day streak.`;
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
