import config from '../../../config/index.js';
import { COLORS } from '../../../constants/index.js';
import MatchMatchMessage from '../../../models/match-match-message.js';
import MatchMatchTopic, { TOPIC_ORDER } from '../../../models/match-match-topic.js';

const { CLIENT_ID: clientId, MATCH_MATCH_COMMAND_ID: matchMatchCommandId } = config;

export default async (interaction) => {
  try {
    await interaction.deferReply({ ephemeral: true });

    const currentMatchMatchTopic = await MatchMatchTopic.findOne().sort(TOPIC_ORDER);

    if (!currentMatchMatchTopic) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            description:
              "There's no match-match topic left.\nPlease ping the moderator to create a new topic.",
          },
        ],
      });
      return;
    }

    const submissionInTargetLanguage = interaction.fields.getTextInputValue(
      'submissionInTargetLanguage',
    );
    const submission = interaction.fields.getTextInputValue('submission');

    const isCompound = submission
      .toUpperCase()
      .includes(currentMatchMatchTopic.topic.toUpperCase());

    if (!isCompound) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            description:
              '**Submission has to be a compound word in English.**\n\nSubmission must include the topic word of the day and be a compound word (ex. topic word is water. submissions include: waterfall, saltwater, water bottle, etc)',
          },
        ],
      });
      return;
    }

    const res = await MatchMatchMessage.findOneAndUpdate(
      {
        id: interaction.user.id,
      },
      {
        submissionInTargetLanguage,
        submission,
      },
      {
        upsert: true,
        new: true,
      },
    );

    if (res) {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            description: `Submission ${
              res.createdAt.toString() === res.updatedAt.toString() ? 'received' : 'updated'
            } successfully\n\nSubmission in English:\`\`\`\n${submission}\n\`\`\`\nTranslation of Submission in Target Language:\`\`\`\n${submissionInTargetLanguage}\n\`\`\``,
          },
        ],
      });
    } else {
      await interaction.editReply({
        embeds: [
          {
            color: COLORS.PRIMARY,
            description: 'Failed to create category',
          },
        ],
      });

      return;
    }

    await interaction.channel.send({
      embeds: [
        {
          color: COLORS.PRIMARY,
          footer: {
            icon_url: interaction.user.displayAvatarURL(),
            text: `${interaction.user.globalName}(${interaction.user.username}#${
              interaction.user.discriminator
            }) ${
              res.createdAt.toString() === res.updatedAt.toString() ? 'sent in' : 'updated'
            } their submission`,
          },
        },
      ],
    });

    const stickyMessageTitle = 'Match-match';
    const currentMessges = await interaction.channel.messages.fetch(20);
    const stickyMessages = currentMessges.filter(
      (currentMessage) =>
        currentMessage?.author?.id === clientId &&
        currentMessage?.embeds[0]?.title === stickyMessageTitle,
    );

    await Promise.all(
      stickyMessages.map((stickyMessage) => stickyMessage.delete().catch(() => {})),
    );

    const numberOfSubmissions = await MatchMatchMessage.countDocuments();

    await interaction.channel.send({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: stickyMessageTitle,
          description: `Topic\n\`\`\`\n${
            currentMatchMatchTopic.topic
          }\n\`\`\`\nNumber of participants: \`${numberOfSubmissions}\`\n\n**Submission period ends **<t:${Math.floor(
            (() => {
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              if (now.getTime() <= Date.now()) now.setDate(now.getDate() + 1);
              return now;
            })().getTime() / 1000,
          )}:R>\n\nClick </match-match:${matchMatchCommandId}> here and send it to participate\n\nHow to Play: https://discord.com/channels/739911855795077282/1244836542036443217/1244923513199005758\nPoint Leaderboard: </word-games-point-leaderboard:${
            config.POINTS_LEADERBOARD_COMMAND_ID
          }>`,
        },
      ],
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    await interaction.editReply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          description: 'Failed to create category (Internal Server Error)',
        },
      ],
    });
  }
};
