import { ButtonStyle, ButtonBuilder, ActionRowBuilder } from 'discord.js';
import NewMember from '../../../models/NewMember.js';
import config from '../../../config/index.js';
import {
  COLORS,
  GENERAL_CHANNELS,
  LANGUAGE_CHANNELS,
  RECREATIONAL_CHANNELS,
  COMMUNITY_CHANNELS,
} from '../../../constants/index.js';

const { SERVER_ID: serverId } = config;

function buildRoleChannelList(roleNames, channelMap) {
  const lines = [];

  for (const roleName in channelMap) {
    if (!roleNames.has(roleName)) continue;
    lines.push(`**${roleName}**: ${channelLink(channelMap[roleName])}`);
  }

  return lines;
}

function channelLink(channelId) {
  return `https://discord.com/channels/${serverId}/${channelId}`;
}

export default async (interaction) => {
  await interaction.deferUpdate().catch((error) => {
    const UNKNOWN_INTERACTION = 10062;
    const UNKNOWN_MESSAGE = 10008;
    if (error?.code !== UNKNOWN_INTERACTION && error?.code !== UNKNOWN_MESSAGE) throw error;
  });

  if (interaction.customId === 'dm-server-tutorial-start') {
    await interaction.message.edit({
      content: `# Welcome to the Language Cafe Discord Server!

This guide contains links to channels, roles, and other server features that may be useful to you.

*Note: To make sure this guide is visible, turn on "Show embeds and link previews" via \`Settings > Chat / Appearance > Show embeds and link previews\` to see the tutorial.*`,
      components: [],
    });
  }

  const user = await NewMember.findOne({ id: interaction.user.id });
  if (!user) return;

  let { tutorialStep } = user;

  const nextStepButton = new ButtonBuilder()
    .setCustomId('dm-server-tutorial-next-step')
    .setLabel('Next')
    .setStyle(ButtonStyle.Primary);
  // Note that this button doesn't do anything; it just lets the bot go through all the
  // code until it arrives at the `interaction.message.edit` instruction at the bottom.
  const refreshButton = new ButtonBuilder()
    .setCustomId('dm-server-tutorial-refresh')
    .setLabel('Refresh')
    .setStyle(ButtonStyle.Secondary);
  const buttonsRow = new ActionRowBuilder();

  const stepContent = {
    roles: `## Roles

Choose or update the languages you're fluent in and studying, along with your interests in [Channels & Roles](${channelLink(GENERAL_CHANNELS.customize)}).`,
    languageLearning: `## Language Learning

Looking for study partners or learning resources? Start here:
1. ${channelLink(GENERAL_CHANNELS.findExchangePartner)} — find a 1-on-1 language partner.
2. ${channelLink(GENERAL_CHANNELS.resourceDrawer)} — learning resources recommended by the community.
3. ${channelLink(GENERAL_CHANNELS.journal)} — practice writing in your target language(s).

`,
    interests: `## Explore Your Interests

`,
    community: `## Community & Language Activities

`,
    events: `## Events

Want to join language and community events? Check the calendar in ${channelLink(GENERAL_CHANNELS.eventCalendar)}.

Picking event roles lets you choose which activities you'd like to be notified about. Examples include **@VC Talking**, **@Event Reminders**, **@Study Table**, **@Read Together**, and **@Study Together**.
`,
    help: `## Need Help?

Make sure to check ${channelLink(GENERAL_CHANNELS.faq)}.

For non-urgent help, please ask in ${channelLink(GENERAL_CHANNELS.publicServerHelp)}, or open a ticket in ${channelLink(GENERAL_CHANNELS.privateServerHelp)}.

For more immediate assistance, don't hesitate to ping the **@Staff**.`,
    complete: `## Getting Started

You're all set!

If you haven't already, feel free to introduce yourself in ${channelLink(GENERAL_CHANNELS.introductions)}, then check out ${channelLink(GENERAL_CHANNELS.generalTable)} or one of the channels mentioned earlier in this guide.

And, if you ever change your roles, please press the refresh button below to make sure the above messages are up to date with your roles.

Enjoy your stay, and happy language learning!
`,
  };

  const stepOrder = [
    'roles',
    'languageLearning',
    'interests',
    'community',
    'events',
    'help',
    'complete',
  ];

  const numOfSteps = Object.keys(stepContent).length;

  if (stepOrder.length !== numOfSteps) {
    throw new Error('stepOrder and stepContent are out of sync.');
  }
  for (const step of stepOrder) {
    if (!(step in stepContent)) {
      throw new Error(`Unknown tutorial step: ${step}`);
    }
  }

  const guild = await interaction.client.guilds.fetch(serverId);
  const member = await guild.members.fetch(interaction.user.id);
  const roleNames = new Set(member.roles.cache.map((role) => role.name));

  const languageChannels = buildRoleChannelList(roleNames, LANGUAGE_CHANNELS);
  const recreationalChannels = buildRoleChannelList(roleNames, RECREATIONAL_CHANNELS);
  const communityChannels = buildRoleChannelList(roleNames, COMMUNITY_CHANNELS);

  stepContent.languageLearning += languageChannels.length
    ? 'And here are your language channels:\n' +
      languageChannels.map((line, i) => `${i + 1}. ${line}`).join('\n')
    : `**Before I can show your language channels, you'll first need to finish the server onboarding in [Channels & Roles](${channelLink(GENERAL_CHANNELS.customize)}). Once you've finished, return here and press Refresh.**`;
  stepContent.interests += recreationalChannels.length
    ? `If you're looking for activities and discussions beyond language learning, check out:\n${recreationalChannels
        .map((line, i) => `${i + 1}. ${line}`)
        .join('\n')}`
    : `If you add interest roles in "Other Roles" inside [Channels & Roles](${channelLink(GENERAL_CHANNELS.customize)}), relevant channels will appear here.`;
  stepContent.community += communityChannels.length
    ? `You also selected roles for the following community and language-related channels:\n${communityChannels
        .map((line, i) => `${i + 1}. ${line}`)
        .join('\n')}`
    : `You haven't selected any community roles. Select them in "Other Roles" inside [Channels & Roles](${channelLink(GENERAL_CHANNELS.customize)}) if you'd like.`;

  const maxStep = numOfSteps - 1;
  if (interaction.customId === 'dm-server-tutorial-next-step') {
    tutorialStep = Math.min(tutorialStep + 1, maxStep);
  }

  await NewMember.updateOne({ id: interaction.user.id }, { tutorialStep });

  if (tutorialStep === maxStep || (tutorialStep > 0 && languageChannels.length === 0)) {
    refreshButton.setStyle(ButtonStyle.Primary);
    refreshButton.setLabel('Refresh');
    buttonsRow.addComponents(refreshButton);
  } else if (tutorialStep > 0) {
    buttonsRow.addComponents(refreshButton, nextStepButton);
  } else {
    buttonsRow.addComponents(nextStepButton);
  }

  const currentAllStepsEmbed = [];
  for (let i = 0; i < tutorialStep + 1; i++) {
    const content = `Step ${i + 1} of ${numOfSteps}\n` + stepContent[stepOrder[i]];
    const stepEmbed = {
      color: COLORS.PRIMARY,
      description: content,
    };
    currentAllStepsEmbed.push(stepEmbed);
  }

  if (tutorialStep > 0) {
    await interaction.message.edit({
      components: [buttonsRow],
      embeds: currentAllStepsEmbed,
    });
  } else {
    await interaction.user.send({
      components: [buttonsRow],
      embeds: currentAllStepsEmbed,
    });
  }
};
