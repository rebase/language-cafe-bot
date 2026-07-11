import { time, userMention } from 'discord.js';
import client from '../../client/index.js';
import config from '../../config/index.js';

const { LOG_SERVER_ID: logServerId, LOG_CHANNEL_ID: logChannelId } = config;

export default (content) => {
  client.guilds.cache
    .get(logServerId)
    .channels.cache.get(logChannelId)
    .send({
      embeds: [
        {
          description: content,
        },
      ],
    });
};

export const channelLogWithoutEmbeds = (content) => {
  client.guilds.cache.get(logServerId).channels.cache.get(logChannelId).send(content);
};

export const generateInteractionCreateLogContent = (interaction, additionalMessage) => {
  const guildName = interaction.guild == null ? '`undefined`' : interaction.guild.name;
  return `### Interaction Message\ntime: ${time(+Date.now().toString().slice(0, 10), 'F')}\nserver: ${
    guildName
  }\nchannel: \`#${interaction.channel.name}\`\ncommand: \`/${
    interaction.commandName
  }\`\nuser: ${userMention(interaction.user.id)}${
    additionalMessage ? `\n\`\`\`${additionalMessage.replaceAll('`', '')}\`\`\`` : ''
  }`;
};

export const generateMessageCreateLogContent = (message, additionalMessage) =>
  `### Create Message\ntime: ${time(+Date.now().toString().slice(0, 10), 'F')}\nserver: ${
    message.guild.name
  }\nchannel: \`#${message.channel.name}\`\nuser: ${userMention(message.author.id)}
${additionalMessage ? `\n\`\`\`${additionalMessage.replaceAll('`', '')}\`\`\`` : ''}`;
