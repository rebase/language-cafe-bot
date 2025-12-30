import { PermissionFlagsBits, SlashCommandBuilder, userMention } from 'discord.js';
import { COLORS } from '../../constants/index.js';
import NewMember from '../../models/NewMember.js';
import channelLog, {
  generateInteractionCreateLogContent,
} from '../../service/utils/channel-log.js';
import { checkMaxContentLength } from '../../utils/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('extract-new-members')
    .setDescription('Extract new members')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  execute: async (interaction) => {
    const members = await NewMember.find();
    let content = '';

    if (members.length === 0) {
      content = 'There are no new members.';
    } else {
      content += members.map((member) => userMention(member.id)).join(' ');
    }

    let contentWithCodeBlock = `\`\`\`${content}\`\`\``;

    contentWithCodeBlock = checkMaxContentLength({ length: 4096, content: contentWithCodeBlock });

    await interaction.reply({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Extract New Members',
          description: contentWithCodeBlock,
          footer: {
            text: 'Click copy icon to copy the content.',
          },
        },
      ],
      ephemeral: true,
    });

    await NewMember.deleteMany({});

    channelLog(
      generateInteractionCreateLogContent(interaction, `content: ${contentWithCodeBlock}`),
    );
  },
};
