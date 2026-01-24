import { ActionRowBuilder, ButtonBuilder, ButtonStyle, time, userMention } from 'discord.js';
import client from '../../../client/index.js';
import { COLORS } from '../../../constants/index.js';
import ExchangePartner from '../../../models/ExchangePartner.js';

export default async (interaction) => {
  const clientTargetLanguage = await ExchangePartner.findOne(
    { id: interaction.user.id },
    'targetLanguage offeredLanguage',
  );

  if (!clientTargetLanguage) {
    await interaction.update({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Get Language Exchange Partner Listing',
          description: `${userMention(
            interaction.user.id,
          )}, you have not registered your language exchange partner listing yet.`,
        },
      ],
      components: [],
      ephemeral: true,
    });
    return;
  }

  const clientTargetLanguageArray = clientTargetLanguage.targetLanguage.split(', ');
  const clientOfferedLanguageArray = clientTargetLanguage.offeredLanguage.split(', ');

  const offeredLanguageRegex = clientTargetLanguageArray
    .map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const targetLanguageRegex = clientOfferedLanguageArray
    .map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const searchCondition = {
    offeredLanguage: { $regex: offeredLanguageRegex, $options: 'i' },
    targetLanguage: { $regex: targetLanguageRegex, $options: 'i' },
  };

  const partnerListLength = await ExchangePartner.countDocuments(searchCondition);

  if (partnerListLength === 0) {
    await interaction.update({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Get Language Exchange Partner Listing',
          description: `${userMention(
            interaction.user.id,
          )}, there are no exchange partner matches.`,
        },
      ],
      components: [],
      ephemeral: true,
    });

    return;
  }

  const { customId } = interaction;
  const previous = interaction.message;
  const currentPage = previous.embeds[0].title.split('/')[0];

  let offset;
  if (customId === 'get-exchange-partner-first') {
    offset = 0;
  } else if (customId === 'get-exchange-partner-previous') {
    offset = currentPage - 2;
  } else if (customId === 'get-exchange-partner-next') {
    offset = currentPage;
  } else if (customId === 'get-exchange-partner-last') {
    offset = partnerListLength - 1;
  }

  const page = +offset + 1;

  const partner = await ExchangePartner.findOne(searchCondition)
    .sort({ updatedAt: -1 })
    .skip(offset);

  if (!partner) {
    await interaction.update({
      embeds: [
        {
          color: COLORS.PRIMARY,
          title: 'Get Language Exchange Partner Listing',
          description: `${userMention(
            interaction.user.id,
          )}, there are no exchange partner matches.`,
        },
      ],
      components: [],
      ephemeral: true,
    });

    return;
  }

  const partnerObject = await client.users.fetch(partner.id);

  await interaction.update({
    embeds: [
      {
        color: COLORS.PRIMARY,
        title: `${page}/${partnerListLength} Partner`,
        description: `${userMention(partnerObject.id)}`,
        fields: [
          {
            name: 'Target Language(s) - (Language(s) You Are Learning)',
            value: `\`\`\`${partner.targetLanguage}\`\`\``,
          },
          {
            name: 'Offered Language(s) - (Your Fluent/Native Languages)',
            value: `\`\`\`${partner.offeredLanguage}\`\`\``,
          },
          {
            name: 'Introduction',
            value: `\`\`\`${partner.introduction}\`\`\``,
          },
          {
            name: 'Last updated',
            value: `${time(partner.updatedAt, 'F')}`,
          },
        ],
        author: {
          name: `${partnerObject?.globalName}(${partnerObject?.username}#${partnerObject?.discriminator})`,
          icon_url: partnerObject?.avatarURL(),
        },
      },
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('get-exchange-partner-first')
          .setLabel('<<')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('get-exchange-partner-previous')
          .setLabel('<')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('get-exchange-partner-next')
          .setLabel('>')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === partnerListLength),
        new ButtonBuilder()
          .setCustomId('get-exchange-partner-last')
          .setLabel('>>')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === partnerListLength),
      ),
    ],
    ephemeral: true,
  });
};
